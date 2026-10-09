// Actual typed scheduling, persistence, and UI contracts. Node 24+; no packages.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/i.test(specifier)) {
    for (const suffix of ['.ts', '/index.ts']) {
      const candidate = new URL(specifier + suffix, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
    }
  }
  return next(specifier, context);
} });

const M = await import('../src/lib/sm2.ts');
const C = await import('../src/content/index.ts');
const E = await import('../src/lib/engine.ts');
const S = await import('../src/lib/storage.ts');
const start = Date.UTC(2026, 9, 9, 12, 30), day = 86_400_000;
const word = C.vocabulary[0], secondWord = C.vocabulary[1], character = C.kanji[0], question = C.questions[0];
let count = 0;
function check(name, fn) { fn(); count++; console.log('PASS ' + name); }
function rate(progress, id, quality, eventId, now = start, policy = {}) { return M.rateSrsItem(progress, { type: 'vocabulary', id }, quality, eventId, now, policy); }
function series(qualities, policy = {}) {
  let state;
  return qualities.map((quality, index) => state = M.calculateNextReview(state, quality, start + index * day, policy));
}

check('all six integer qualities use the supplied EF formula and neutral initial state', () => {
  for (let quality = 0; quality <= 5; quality++) {
    const result = M.calculateNextReview(undefined, quality, start);
    assert.equal(result.easinessFactor, Math.max(1.3, 2.5 + (.1 - (5 - quality) * (.08 + (5 - quality) * .02))));
    assert.equal(result.intervalDays, 1); assert.equal(result.repetitions, quality < 3 ? 0 : 1);
    assert.equal(result.nextReviewAt, new Date(start + day).toISOString());
  }
  assert.deepEqual(M.SM2_INITIAL_STATE, { repetitions: 0, intervalDays: 0, easinessFactor: 2.5 });
});
check('quality4 produces the one, six, fifteen, thirty-eight day sequence', () => {
  const results = series([4, 4, 4, 4]);
  assert.deepEqual(results.map(result => result.intervalDays), [1, 6, 15, 38]);
  assert.ok(results.every(result => result.easinessFactor === 2.5));
});
check('quality5 uses updated EF before multiplication and rounds the interval upward', () => {
  const results = series([5, 5, 5]);
  assert.deepEqual(results.map(result => result.intervalDays), [1, 6, 17]);
  assert.equal(results[2].intervalDays, Math.ceil(6 * results[2].easinessFactor));
});
check('qualities below three reset repetitions and interval while updating EF', () => {
  for (const quality of [0, 1, 2]) {
    const result = M.calculateNextReview({ repetitions: 7, intervalDays: 120, easinessFactor: 2.5 }, quality, start);
    assert.equal(result.repetitions, 0); assert.equal(result.intervalDays, 1); assert.ok(result.easinessFactor < 2.5);
    const restarted = M.calculateNextReview(result, 4, start + day);
    assert.equal(restarted.repetitions, 1); assert.equal(restarted.intervalDays, 1);
    assert.equal(M.calculateNextReview(restarted, 4, start + 2 * day).intervalDays, 6);
  }
});
check('EF floor applies to repeated difficult recall and failures', () => {
  const results = series(Array(14).fill(3));
  assert.equal(results.at(-1).easinessFactor, 1.3);
  assert.equal(M.calculateNextReview({ repetitions: 2, intervalDays: 6, easinessFactor: 1.3 }, 0, start).easinessFactor, 1.3);
});
check('the exact default is uncapped and the annual cap is an explicit separate policy', () => {
  const prior = { repetitions: 8, intervalDays: 200, easinessFactor: 2.5 };
  assert.equal(M.calculateNextReview(prior, 4, start).intervalDays, 500);
  const capped = M.calculateNextReview(prior, 4, start, { maxIntervalDays: 365 });
  assert.equal(capped.intervalDays, 365); assert.equal(Date.parse(capped.nextReviewAt) - start, 365 * day);
});
check('scheduling is immutable and UTC-deterministic across DST and timezone changes', () => {
  const prior = { repetitions: 1, intervalDays: 1, easinessFactor: 2.5 }, before = structuredClone(prior);
  const times = [Date.UTC(2026, 2, 8, 6, 30), Date.UTC(2026, 10, 1, 5, 30), Date.UTC(2028, 1, 28, 23, 59)];
  const oldTimezone = process.env.TZ;
  try {
    for (const now of times) {
      const outputs = [];
      for (const timezone of ['UTC', 'America/New_York', 'Asia/Singapore']) { process.env.TZ = timezone; outputs.push(M.calculateNextReview(prior, 4, now)); }
      assert.deepEqual(outputs[0], outputs[1]); assert.deepEqual(outputs[1], outputs[2]);
      assert.equal(Date.parse(outputs[0].nextReviewAt) - now, 6 * day);
    }
  } finally { if (oldTimezone === undefined) delete process.env.TZ; else process.env.TZ = oldTimezone; }
  assert.deepEqual(prior, before);
});
check('number-parameter static and instance service wrappers return legacy keys and ISO UTC', () => {
  const expected = { interval: 1, repetitions: 1, easinessFactor: 2.6, nextReviewDate: new Date(start + day).toISOString() };
  assert.deepEqual(M.SM2Service.calculateNextReview(5, 0, 0, 2.5, start), expected);
  assert.deepEqual(new M.SM2Service().calculateNextReview(5, 0, 0, 2.5, start), expected);
});
check('invalid qualities, state, time, unsupported policy and overflow are rejected', () => {
  for (const quality of [-1, 6, 2.5, NaN, Infinity, '4', null]) assert.throws(() => M.calculateNextReview(null, quality, start), /quality/);
  for (const state of [{ repetitions: -1, intervalDays: 0, easinessFactor: 2.5 }, { repetitions: 1, intervalDays: 0, easinessFactor: 2.5 }, { repetitions: 1.5, intervalDays: 1, easinessFactor: 2.5 }, { repetitions: 0, intervalDays: 0, easinessFactor: 1.2 }, { repetitions: 0, intervalDays: 0, easinessFactor: Infinity }]) assert.throws(() => M.calculateNextReview(state, 4, start));
  for (const now of [NaN, Infinity, -1, start + .5, Date.UTC(2200, 0, 1)]) assert.throws(() => M.calculateNextReview(null, 4, now), /time/);
  assert.throws(() => M.calculateNextReview(null, 4, start, { maxIntervalDays: 30 }), /365/);
  assert.throws(() => M.calculateNextReview({ repetitions: 10, intervalDays: Number.MAX_SAFE_INTEGER, easinessFactor: 2.5 }, 4, start), /range/);
});
check('an explicit rating changes only SRS and duplicate event IDs are idempotent', () => {
  const progress = E.initialProgress(), before = structuredClone(progress);
  const next = rate(progress, word.id, 4, 'one');
  for (const key of Object.keys(progress)) assert.equal(next[key], progress[key]);
  assert.deepEqual(progress, before);
  assert.equal(next.srs['vocabulary:' + word.id].events.length, 1);
  assert.equal(rate(next, word.id, 0, 'one', start + day), next);
  assert.deepEqual(next.reviews, {}); assert.deepEqual(next.completedTasks, []); assert.deepEqual(next.attempts, []);
});
check('due dates order cards earliest first and before the due instant nothing is due', () => {
  let progress = rate(E.initialProgress(), word.id, 4, 'word', start);
  progress = rate(progress, secondWord.id, 4, 'second', start + 1000);
  progress = M.rateSrsItem(progress, { type: 'kanji', id: character.id }, 4, 'kanji', start + 2000);
  assert.deepEqual(M.dueSrsItems(progress, start + day - 1), []);
  assert.deepEqual(M.dueSrsItems(progress, start + day + 2000).map(record => record.id), [word.id, secondWord.id, character.id]);
  assert.deepEqual(M.dueSrsItems(progress, start + day + 2000, ['kanji']).map(record => record.id), [character.id]);
});
check('rating audit records genuine prior due evidence and policy switches without rewriting history', () => {
  let progress = rate(E.initialProgress(), word.id, 4, 'first');
  const first = structuredClone(progress.srs['vocabulary:' + word.id]);
  progress = rate(progress, word.id, 5, 'next', start + day, { maxIntervalDays: 365 });
  const record = progress.srs['vocabulary:' + word.id];
  assert.equal(record.events[0].previousNextReviewAt, undefined);
  assert.deepEqual(record.events[0], first.events[0]);
  assert.equal(record.events[1].previousNextReviewAt, first.nextReviewAt);
  assert.equal(record.events[1].maxIntervalDays, 365); assert.equal(record.maxIntervalDays, 365);
  assert.deepEqual(M.validateSrsRecord(record), record);
  assert.throws(() => rate(progress, word.id, 4, 'earlier', start), /precede/);
});
check('all supported legacy saves preserve absent SRS and old review history', () => {
  const attempt = E.createAttempt([question], 'practice', { now: start });
  const previous = E.submitAttempt({ ...E.initialProgress(), attempts: [attempt], activeAttemptId: attempt.id }, attempt.id, Object.fromEntries(C.questions.map(item => [item.id, item])), start);
  const oldReviews = JSON.stringify(previous.reviews);
  for (const contentVersion of ['2026.10.1', '2026.10.2', '2026.10.3', '2026.10.4']) {
    const backup = structuredClone(previous); backup.contentVersion = contentVersion;
    const before = structuredClone(backup), restored = S.validateProgress(backup);
    assert.equal(Object.hasOwn(restored, 'srs'), false); assert.equal(JSON.stringify(restored.reviews), oldReviews);
    assert.deepEqual(backup, before); assert.deepEqual(restored.attempts, previous.attempts);
  }
});
check('known word, kanji and question ratings survive storage and JSON backup round trips', () => {
  let progress = rate(E.initialProgress(), word.id, 3, 'word');
  progress = M.rateSrsItem(progress, { type: 'kanji', id: character.id }, 2, 'kanji', start);
  progress = M.rateSrsItem(progress, { type: 'question', id: question.id }, 4, 'question', start);
  assert.deepEqual(S.validateProgress(JSON.parse(JSON.stringify(progress))), progress);
  assert.deepEqual(S.validateProgress({ ...E.initialProgress(), srs: {} }).srs, {});
});
check('malformed imports reject unknown IDs, mismatched keys, bad state, quality and audit dates', () => {
  const valid = rate(E.initialProgress(), word.id, 4, 'one'), key = 'vocabulary:' + word.id;
  for (const mutate of [p => p.srs = null, p => p.srs = [], p => p.srs[key].id = 'missing', p => p.srs[key].type = 'grammar', p => p.srs[key].algorithm = 'other', p => p.srs[key].easinessFactor = 1.1, p => p.srs[key].intervalDays = 99, p => p.srs[key].repetitions = 7, p => p.srs[key].nextReviewAt = new Date(start + 2 * day).toISOString(), p => p.srs[key].lastReviewedAt = new Date(start + 1).toISOString(), p => p.srs[key].events = [], p => p.srs[key].events[0].quality = 2.5, p => p.srs[key].events[0].previousNextReviewAt = new Date(start).toISOString(), p => p.srs[key].events[0].eventId = '', p => p.srs[key].maxIntervalDays = 30]) {
    const bad = structuredClone(valid); mutate(bad); assert.throws(() => S.validateProgress(bad), /Invalid progress/);
  }
  const mismatch = structuredClone(valid); mismatch.srs['kanji:' + word.id] = mismatch.srs[key]; delete mismatch.srs[key];
  assert.throws(() => S.validateProgress(mismatch), /key/);
  const duplicate = rate(valid, word.id, 4, 'two', start + day); duplicate.srs[key].events[1].eventId = 'one';
  assert.throws(() => S.validateProgress(duplicate), /unique/);
});
check('failed persistence and invalid imports leave the prior stored backup intact', () => {
  const stored = new Map(), previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) } });
  try {
    const progress = rate(E.initialProgress(), word.id, 5, 'save');
    assert.deepEqual(S.saveProgress(progress), { saved: true }); assert.deepEqual(S.loadProgress().progress, progress);
    const before = stored.get(S.STORAGE_KEY), bad = structuredClone(progress); bad.srs['vocabulary:' + word.id].events[0].quality = 6;
    assert.equal(S.saveProgress(bad).saved, false); assert.equal(stored.get(S.STORAGE_KEY), before);
    stored.set(S.STORAGE_KEY, JSON.stringify(bad)); assert.ok(S.loadProgress().warning); assert.equal(stored.get(S.STORAGE_KEY), JSON.stringify(bad));
  } finally { if (previousStorage === undefined) delete globalThis.localStorage; else Object.defineProperty(globalThis, 'localStorage', previousStorage); }
});

function uiHarness(progress, now = start) {
  const ids = new Map(), document = { activeElement: null, getElementById: id => ids.get(id) || null };
  class Node {
    constructor(tag, attrs = {}) { this.tagName = tag; this.children = []; this.listeners = {}; this.attributes = attrs; Object.assign(this, attrs); if (this.id) ids.set(this.id, this); }
    set id(value) { this._id = value; ids.set(value, this); }
    get id() { return this._id; }
    append(...children) { this.children.push(...children.flat(Infinity).filter(value => value !== null && value !== undefined && value !== false)); }
    querySelector(tag) { return this.children.filter(child => child instanceof Node).map(child => child.tagName === tag ? child : child.querySelector(tag)).find(Boolean) || null; }
    focus(options) { document.activeElement = this; this.focusOptions = options; }
  }
  const el = (tag, attrs, ...children) => { const node = new Node(tag, attrs); node.append(...children); return node; };
  const window = { KotobaUI: { el, ja: value => el('span', { lang: 'ja' }, value), button: (label, listener, className, attrs = {}) => el('button', { ...attrs, className, onClick: listener }, label) }, KotobaContent: C, KotobaSm2: M, document, scrollX: 5, scrollY: 50, scrollTo: viewport => window.scrolled = viewport };
  vm.runInNewContext(readFileSync(new URL('../web/srs.js', import.meta.url), 'utf8'), { window, Date });
  let current = progress, node, cleanup = [], mode = 'review', options;
  const ctx = { view: {}, now: () => now, progress: () => current, cleanup: listener => cleanup.push(listener), update: updater => { current = updater(current); render(); }, rerender: () => render() };
  function render() { cleanup.forEach(fn => fn()); cleanup = []; ids.clear(); node = mode === 'review' ? window.KotobaSrs.renderReview(ctx) : window.KotobaSrs.renderRatings(ctx, options); return node; }
  function ratings(next) { mode = 'ratings'; options = next; return render(); }
  function find(predicate, parent = node) { if (!parent || typeof parent !== 'object') return null; if (predicate(parent)) return parent; for (const child of parent.children || []) { const result = find(predicate, child); if (result) return result; } return null; }
  return { window, document, ctx, render, ratings, find, get progress() { return current; }, click: id => document.getElementById(id)?.onClick(), quality: value => find(child => child.attributes?.['data-srs-quality'] === value), setOptions(next) { options = next; render(); } };
}

check('recall UI requires reveal, saves one explicit rating and keeps scoring/checklists unchanged', () => {
  const progress = E.initialProgress(), ui = uiHarness(progress);
  const options = { type: 'vocabulary', id: word.id, revealed: false, eventId: 'ui-word' };
  ui.ratings(options); assert.ok(ui.quality(4).disabled); ui.quality(4).onClick(); assert.equal(ui.progress, progress);
  ui.setOptions({ ...options, revealed: true }); assert.equal(ui.quality(4).disabled, false); ui.quality(4).onClick();
  assert.equal(ui.progress.srs['vocabulary:' + word.id].events.length, 1); assert.equal(ui.progress.srs['vocabulary:' + word.id].maxIntervalDays, 365);
  assert.ok(ui.quality(4).disabled); assert.equal(ui.document.activeElement.focusOptions.preventScroll, true);
  assert.deepEqual(ui.progress.reviews, progress.reviews); assert.equal(ui.progress.completedTasks, progress.completedTasks); assert.equal(ui.progress.attempts, progress.attempts);
  const after = ui.progress; ui.quality(4).onClick(); assert.equal(ui.progress, after);
});
check('direct due UI hides answers, flips without recording, rates and advances earliest due', () => {
  let progress = rate(E.initialProgress(), word.id, 4, 'old-word', start - 2 * day);
  progress = rate(progress, secondWord.id, 4, 'old-second', start - day);
  const ui = uiHarness(progress); ui.render();
  assert.equal(ui.find(child => child.attributes?.['data-srs-card']).attributes['data-srs-card'], 'vocabulary:' + word.id);
  assert.equal(ui.document.getElementById('srs-recall-answer').hidden, true); assert.equal(ui.document.getElementById('srs-recall-answer').children.length, 0);
  ui.click('srs-review-flip'); assert.equal(ui.progress, progress); assert.equal(ui.document.getElementById('srs-recall-answer').hidden, false);
  ui.quality(5).onClick(); assert.equal(ui.find(child => child.attributes?.['data-srs-card']).attributes['data-srs-card'], 'vocabulary:' + secondWord.id);
  assert.equal(ui.document.getElementById('srs-recall-answer').hidden, true); assert.deepEqual(S.validateProgress(ui.progress), ui.progress);
  const reload = uiHarness(S.validateProgress(JSON.parse(JSON.stringify(ui.progress)))); reload.render();
  assert.equal(reload.find(child => child.attributes?.['data-srs-card']).attributes['data-srs-card'], 'vocabulary:' + secondWord.id);
});
check('UI blocks active mock answers and gates question quality against canonical submitted results', () => {
  const mock = E.createAttempt([question], 'mock', { now: start });
  const locked = { ...E.initialProgress(), attempts: [mock], activeAttemptId: mock.id };
  const ui = uiHarness(locked); ui.ratings({ type: 'vocabulary', id: word.id, revealed: true, eventId: 'mock' });
  assert.ok(ui.quality(5).disabled); ui.quality(5).onClick(); assert.equal(ui.progress, locked);
  for (const correct of [false, true]) {
    const attempt = E.createAttempt([question], 'practice', { now: start });
    const answer = correct ? question.correctOptionId : question.options.find(option => option.id !== question.correctOptionId).id;
    let progress = E.selectAnswer({ ...E.initialProgress(), attempts: [attempt], activeAttemptId: attempt.id }, attempt.id, question.id, answer);
    progress = E.submitAttempt(progress, attempt.id, Object.fromEntries(C.questions.map(item => [item.id, item])), start);
    const rated = uiHarness(progress); rated.ratings({ type: 'question', id: question.id, revealed: true, eventId: 'assessed', attemptId: attempt.id });
    assert.equal(rated.quality(2).disabled, correct); assert.equal(rated.quality(4).disabled, !correct);
    rated.quality(correct ? 4 : 2).onClick(); assert.equal(rated.progress.attempts, progress.attempts); assert.equal(rated.progress.reviews, progress.reviews);
  }
});

console.log(count + ' SM-2 checks passed.');
