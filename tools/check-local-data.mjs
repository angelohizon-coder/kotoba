// Native source and DOM-fixture checks. No browser, network, database or dependency is started.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/i.test(specifier)) {
    for (const suffix of ['.ts', '/index.ts']) { const url = new URL(specifier + suffix, context.parentURL); if (existsSync(fileURLToPath(url))) return next(url.href, context); }
  }
  return next(specifier, context);
} });
const C = await import('../src/content/index.ts'), E = await import('../src/lib/engine.ts'), S = await import('../src/lib/storage.ts');
const L = await import('../src/lib/learnlab.ts'), M = await import('../src/lib/motivation.ts'), R = await import('../src/lib/sm2.ts');
const source = readFileSync(new URL('../web/local-data.js', import.meta.url), 'utf8');
const now = Date.UTC(2026, 9, 9, 12), day = 86400000;
const map = Object.fromEntries(C.questions.map(question => [question.id, question]));
const plain = value => JSON.parse(JSON.stringify(value));
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log('PASS ' + name); }

function fixture() {
  const qs = C.questions.filter(question => question.skill !== 'listening').slice(0, 2);
  let progress = M.enableMotivation(E.initialProgress(), {}, now - 10000);
  const before = progress, attempt = E.createAttempt(qs, 'practice', { now: now - 5000, random: () => .5 });
  progress = { ...progress, attempts: [attempt], activeAttemptId: attempt.id };
  progress = E.selectAnswer(progress, attempt.id, qs[0].id, qs[0].correctOptionId);
  progress = E.selectAnswer(progress, attempt.id, qs[1].id, qs[1].options.find(option => option.id !== qs[1].correctOptionId).id);
  progress = E.submitAttempt(progress, attempt.id, map, now);
  progress = M.reconcileMotivation(progress, before, now);
  const study = E.markStudied(progress, 'vocabulary', C.vocabulary[0].id, now + 1000);
  progress = M.reconcileMotivation(study, progress, now + 1000);
  progress = E.setTaskCompleted(progress, 'vocabulary:' + C.vocabulary[0].id, true);
  progress = R.rateSrsItem(progress, { type: 'vocabulary', id: C.vocabulary[0].id }, 4, 'local-data-rating', now + 2000, { maxIntervalDays: 365 });
  progress = { ...progress, bookmarks: [C.vocabulary[0].id], learnlab: L.createSession(L.initialLearnLab(), { mode: 'recall', level: 'n3', count: 3, now, random: () => .5 }) };
  progress.learnlab = L.saveDraft(progress.learnlab, { version: 1, id: 'draft-local-private', kind: 'vocabulary', level: 'n3', topicId: 'daily', title: 'Private personal draft', word: '予定', reading: 'よてい', meaning: 'plan', body: '明日は予定があります。', translation: 'Private translation', sourceNote: 'Private source note' });
  progress.learnlab = L.addReport(progress.learnlab, C.vocabulary[0].id, 'other', 'My private lesson comment', now);
  S.validateProgress(progress);
  return progress;
}

function harness(initial = fixture()) {
  let progress = initial, root = null, focus = null;
  const downloads = [], notices = [], timers = [], revoked = [];
  class Node {
    constructor(tag, attrs = {}, children = []) { this.tag = tag; this.attrs = attrs; Object.assign(this, attrs); this.children = []; this.className = attrs.className || ''; this.classList = { add: value => { this.className += ' ' + value; } }; this.append(...children); }
    append(...children) { for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) this.children.push(child); }
    focus() { focus = this.id; }
    remove() { this.removed = true; }
    click() { if (!this.disabled) { if (this.tag === 'a') downloads.push({ name: this.download, url: this.href }); this.onClick?.({ target: this, currentTarget: this }); } }
    get textContent() { return this.children.map(child => child instanceof Node ? child.textContent : String(child)).join(''); }
  }
  const find = (id, node = root) => { if (!node) return null; if (node.id === id) return node; for (const child of node.children || []) if (child instanceof Node) { const match = find(id, child); if (match) return match; } return null; };
  const blobs = new Map();
  const window = { KotobaContent: C, KotobaEngine: E, KotobaStorage: S, structuredClone, Date,
    document: { body: new Node('body'), createElement: tag => new Node(tag), getElementById: id => find(id) },
    Blob, URL: { createObjectURL: blob => { const id = 'blob:' + blobs.size; blobs.set(id, blob); return id; }, revokeObjectURL: id => revoked.push(id) },
    setTimeout: fn => { timers.push(fn); return timers.length; }, fetch: () => { throw new Error('Network must not be used.'); },
  };
  window.KotobaUI = {
    el: (tag, attrs, ...children) => new Node(tag, attrs, children),
    paragraph: text => new Node('p', {}, [text]),
    button: (label, onClick, className, attrs = {}) => new Node('button', { ...attrs, className, onClick }, [label]),
    card: (...children) => new Node('section', { className: 'card' }, children),
  };
  vm.runInNewContext(source, { window }, { filename: 'web/local-data.js' });
  const api = window.KotobaLocalData;
  const ctx = { progress: () => progress, view: {}, update(next) { progress = typeof next === 'function' ? next(progress) : next; render(); }, rerender: () => render(), notice: message => { notices.push(message); render(); } };
  function render() { root = api.render(ctx); return root; }
  return { api, ctx, render, find, setProgress: value => { progress = value; }, progress: () => progress, focus: () => focus,
    click: id => { const node = find(id); assert.ok(node, 'Missing button ' + id); node.click(); },
    toggle: (id, value) => { const node = find(id); assert.ok(node && !node.disabled, 'Unavailable checkbox ' + id); node.checked = value; node.onChange({ target: node }); },
    downloads, notices, blobs, timers, revoked, text: () => root.textContent,
  };
}

await check('inventory reports actual local categories without altering canonical progress', () => {
  const h = harness(), before = JSON.stringify(h.progress()), counts = h.api.inventory(h.progress());
  assert.equal(counts.attempts, 1); assert.equal(counts.submittedSessions, 1); assert.equal(counts.personalDrafts, 1); assert.equal(counts.issueNotes, 1); assert.equal(counts.recallSchedules, 1); assert.equal(counts.labSessions, 1);
  assert.equal(JSON.stringify(h.progress()), before);
});
await check('shareable summary contains only aggregate evidence and excludes personal text, answers, IDs, dates and voice preferences', () => {
  const h = harness(), before = JSON.stringify(h.progress()), summary = h.api.createSummary(h.progress(), { now });
  assert.deepEqual(plain(summary.assessment.firstAnswers), { correct: 1, total: 2 });
  assert.equal(summary.studied.vocabulary, 1); assert.equal(summary.checklistMarks, 1); assert.equal(summary.recall.scheduled, 1);
  for (const secret of ['Private', 'My private', C.vocabulary[0].id, h.progress().attempts[0].id, '2026-10-09T', 'answers', 'speechVoice', 'drafts', 'reports']) assert.equal(JSON.stringify(summary).includes(secret), false, 'Leaked ' + secret);
  assert.ok(!Object.hasOwn(summary, 'optionalRewards')); assert.throws(() => S.validateProgress(summary));
  assert.equal(JSON.stringify(h.progress()), before);
});
await check('optional reward totals are included only by explicit choice and never contain reward receipts', () => {
  const h = harness(), result = h.api.createSummary(h.progress(), { includeRewards: true, now });
  assert.equal(result.optionalRewards.xp, h.progress().motivation.xp); assert.equal(result.optionalRewards.coins, h.progress().motivation.coins);
  assert.deepEqual(Object.keys(result.optionalRewards).sort(), ['coins', 'earnedBadgeCount', 'xp']);
  assert.throws(() => h.api.createSummary(h.progress(), { includeRewards: 'yes', now }));
});
await check('due count uses injected time while unfinished questions remain absent from assessment totals', () => {
  const h = harness(), p = h.progress(), fresh = E.createAttempt(C.questions.slice(2, 3), 'practice', { now: now + 3000 });
  let next = { ...p, attempts: [...p.attempts, fresh], activeAttemptId: fresh.id };
  next = E.selectAnswer(next, fresh.id, fresh.questionOrder[0], map[fresh.questionOrder[0]].correctOptionId);
  const early = h.api.createSummary(next, { now }), due = h.api.createSummary(next, { now: now + day + 2000 });
  assert.equal(early.recall.due, 0); assert.equal(due.recall.due, 1); assert.deepEqual(plain(early.assessment.firstAnswers), { correct: 1, total: 2 }); assert.equal(early.assessment.submittedSessions, 1);
});
await check('personal-text exports deliberately preserve selected content with independent copies', () => {
  const h = harness(), draft = h.api.createNotesExport(h.progress(), 'drafts'), reports = h.api.createNotesExport(h.progress(), 'reports');
  assert.equal(draft.kind, 'kotoba-local-drafts'); assert.equal(reports.kind, 'kotoba-local-issues');
  assert.deepEqual(plain(draft.drafts), h.progress().learnlab.drafts); assert.ok(!Object.hasOwn(draft, 'reports'));
  draft.drafts[0].title = 'Changed export'; reports.reports[0].message = 'Changed export';
  assert.equal(h.progress().learnlab.drafts[0].title, 'Private personal draft'); assert.equal(h.progress().learnlab.reports[0].message, 'My private lesson comment');
  assert.throws(() => h.api.createNotesExport(h.progress(), 'answers'));
});
await check('subset cleanup retains sessions, all assessment/SRS/reward data, and the unselected personal-text category exactly', () => {
  const h = harness(), p = h.progress(), before = JSON.stringify(p);
  const draftOnly = h.api.removeNotes(p, { drafts: true });
  assert.equal(draftOnly.learnlab.drafts.length, 0); assert.deepEqual(plain(draftOnly.learnlab.reports), p.learnlab.reports);
  for (const key of ['attempts', 'reviews', 'srs', 'motivation', 'settings', 'completedTasks', 'studyEvents', 'bookmarks', 'activeAttemptId']) assert.equal(JSON.stringify(draftOnly[key]), JSON.stringify(p[key]), 'Changed learning data: ' + key);
  assert.equal(JSON.stringify(draftOnly.learnlab.sessions), JSON.stringify(p.learnlab.sessions)); assert.equal(draftOnly.learnlab.activeSessionId, p.learnlab.activeSessionId);
  assert.deepEqual(plain(S.validateProgress(plain(draftOnly))), plain(draftOnly)); assert.equal(JSON.stringify(p), before);
  const both = h.api.removeNotes(p, { drafts: true, reports: true }); assert.equal(both.learnlab.drafts.length, 0); assert.equal(both.learnlab.reports.length, 0);
  assert.equal(h.api.removeNotes(both, { drafts: true, reports: true }), both);
});
await check('empty legacy progress stays byte-equivalent and cleanup does not create absent Lab/SRS/reward fields', () => {
  const h = harness(E.initialProgress()), p = h.progress(), before = JSON.stringify(p);
  assert.equal(h.api.removeNotes(p, { drafts: true, reports: true }), p); assert.equal(h.api.removeNotes(p), p);
  assert.equal(h.api.inventory(p).personalDrafts, 0); assert.equal(h.api.createNotesExport(p, 'reports').reports.length, 0);
  assert.equal(JSON.stringify(p), before); for (const key of ['learnlab', 'srs', 'motivation']) assert.equal(Object.hasOwn(p, key), false);
});
await check('malformed selections and canonical inputs fail before data mutation', () => {
  const h = harness(), p = h.progress(), before = JSON.stringify(p);
  for (const flags of [{ drafts: 1 }, { reports: 'true' }, [], null, { answers: true }]) assert.throws(() => h.api.removeNotes(p, flags));
  for (const bad of [{ ...p, schemaVersion: 99 }, { ...p, bookmarks: ['missing-id'] }]) { assert.throws(() => h.api.createSummary(bad)); assert.throws(() => h.api.removeNotes(bad, { drafts: true })); }
  assert.throws(() => h.api.createSummary(p, { now: Infinity })); assert.equal(JSON.stringify(p), before);
});
await check('active full mocks block summaries, text exports, and cleanup without revealing personal notes', () => {
  const h = harness(), attempt = E.createFullMockAttempt('n3', C.questions, { now, random: () => .5 });
  h.setProgress({ ...h.progress(), attempts: [...h.progress().attempts, attempt], activeAttemptId: attempt.id }); h.render();
  for (const run of [() => h.api.createSummary(h.progress()), () => h.api.createNotesExport(h.progress(), 'drafts'), () => h.api.removeNotes(h.progress(), { drafts: true })]) assert.throws(run, /reopen/);
  assert.equal(h.find('local-data-summary'), null); assert.equal(h.text().includes('Private personal'), false); assert.equal(h.progress().learnlab.drafts.length, 1);
});
await check('the actual removal UI requires review and confirmation, cancellation preserves progress and returns focus', () => {
  const h = harness(), before = JSON.stringify(h.progress()); h.render();
  assert.equal(h.find('local-data-review-delete').disabled, true);
  h.toggle('local-data-select-drafts', true); h.click('local-data-review-delete');
  assert.equal(JSON.stringify(h.progress()), before); assert.equal(h.focus(), 'local-data-cancel-delete');
  h.click('local-data-cancel-delete'); assert.equal(h.find('local-data-confirm-delete'), null); assert.equal(h.focus(), 'local-data-review-delete'); assert.equal(JSON.stringify(h.progress()), before);
});
await check('confirmed UI cleanup clears only selected persisted text and selected editor state, with no repeated deletion', () => {
  const h = harness(); h.ctx.view.labTools = { json: 'private unsaved editor', preview: {}, message: 'keep this comment', draftOpen: true, reportOpen: true }; h.render();
  const before = h.progress(); h.toggle('local-data-select-drafts', true); h.click('local-data-review-delete'); h.click('local-data-confirm-delete');
  assert.equal(h.progress().learnlab.drafts.length, 0); assert.equal(h.progress().learnlab.reports.length, 1);
  assert.equal(h.ctx.view.labTools.json, ''); assert.equal(h.ctx.view.labTools.preview, null); assert.equal(h.ctx.view.labTools.message, 'keep this comment');
  assert.equal(h.focus(), 'local-data-title'); assert.equal(h.find('local-data-confirm-delete'), null); assert.equal(h.find('local-data-select-drafts').disabled, true);
  assert.equal(JSON.stringify(h.progress().motivation), JSON.stringify(before.motivation)); assert.equal(JSON.stringify(h.progress().srs), JSON.stringify(before.srs));
});
await check('a stale confirmation refuses to erase notes changed after review', () => {
  const h = harness(); h.render(); h.toggle('local-data-select-reports', true); h.click('local-data-review-delete');
  const newer = { ...h.progress(), learnlab: L.addReport(h.progress().learnlab, C.vocabulary[1].id, 'typo', 'New private note', now + 1) };
  h.setProgress(newer); h.click('local-data-confirm-delete');
  assert.equal(h.progress(), newer); assert.equal(h.progress().learnlab.reports.length, 2); assert.match(h.notices.at(-1), /notes changed/); assert.equal(h.find('local-data-confirm-delete'), null);
});
await check('real module download wiring exports a minimal file, cleans its object URL, and performs no save or network request', async () => {
  const h = harness(), before = JSON.stringify(h.progress()); h.render(); h.click('local-data-summary');
  assert.equal(h.downloads.length, 1); assert.equal(h.downloads[0].name, 'kotoba-study-summary.json');
  const downloaded = JSON.parse(await h.blobs.get(h.downloads[0].url).text()); assert.equal(downloaded.kind, 'kotoba-study-summary'); assert.equal(downloaded.optionalRewards, undefined);
  assert.equal(JSON.stringify(h.progress()), before); for (const timer of h.timers) timer(); assert.deepEqual(h.revoked, [h.downloads[0].url]);
});
console.log(checks + ' local data source and DOM-fixture checks passed. No cloud service or database was used.');
