// Meaningful checks against the actual TypeScript state logic. Node 24+, no npm.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/i.test(specifier)) {
    for (const suffix of ['.ts', '/index.ts']) {
      const candidate = new URL(specifier + suffix, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
    }
  }
  return next(specifier, context);
} });

const C = await import('../src/content/index.ts');
const E = await import('../src/lib/engine.ts');
const S = await import('../src/lib/storage.ts');
const map = Object.fromEntries(C.questions.map(question => [question.id, question]));
const now = Date.UTC(2026, 9, 9, 12);
const day = 24 * 60 * 60 * 1000;
const random = () => 0;
const first = C.questions.find(question => question.skill === 'vocabulary');
const words = C.questions.filter(question => question.skill === 'vocabulary').slice(0, 6);
const ids = selected => selected.map(question => question.id);
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }

function outcome(progress, pool, correct, at = now, options = {}) {
  const attempt = E.createAttempt(pool, options.type ?? 'practice', { now: at, random, listeningAccess: options.access ?? (pool.some(question => question.skill === 'listening') ? 'audio' : null) });
  for (const question of pool) {
    if (correct !== null) attempt.answers[question.id] = correct ? question.correctOptionId : question.options.find(option => option.id !== question.correctOptionId).id;
  }
  attempt.excludedIds = options.excluded ?? [];
  const attached = { ...progress, attempts: [...progress.attempts, attempt], activeAttemptId: attempt.id };
  if (options.active) return attached;
  const submitted = E.submitAttempt(attached, attempt.id, map, at);
  return options.submitted ? submitted : E.markReviewed(submitted, attempt.id);
}
function select(progress, pool, count) { return E.selectPracticeQuestions(progress, pool, { count, now, random }); }
function groupBy(field) {
  const groups = new Map();
  for (const question of C.questions) {
    if (!question[field]) continue;
    const group = groups.get(question[field]) ?? [];
    group.push(question); groups.set(question[field], group);
  }
  return [...groups.values()].filter(group => group.length >= 2);
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value); Object.values(value).forEach(freeze);
  }
  return value;
}

check('completion checks cover every canonical task family and are idempotent', () => {
  const tasks = [`vocabulary:${C.vocabulary[0].id}`, `kanji:${C.kanji[0].id}`, `grammar:${C.grammar[0].id}`, `reading:${C.readings[0].id}`, `listening:${C.listening[0].id}`, `topic:${C.topics[0].id}`, 'week:1', 'week:6'];
  let progress = E.initialProgress();
  assert.deepEqual(progress.completedTasks, []);
  assert.equal(E.setTaskCompleted(progress, tasks[0], false), progress);
  for (const task of tasks) {
    progress = E.setTaskCompleted(progress, task, true);
    assert.equal(E.setTaskCompleted(progress, task, true), progress);
  }
  assert.deepEqual(progress.completedTasks, tasks);
  assert.deepEqual(S.validateProgress(progress), progress);
  const unchecked = E.setTaskCompleted(progress, tasks[0], false);
  assert.equal(unchecked.completedTasks.length, tasks.length - 1);
  assert.equal(E.setTaskCompleted(unchecked, tasks[0], false), unchecked);
  assert.throws(() => E.setTaskCompleted(progress, 'week:7', true), /Unknown completion/);
  assert.throws(() => E.setTaskCompleted(progress, tasks[0], 'yes'), /true or false/);
});

check('checkmarks do not alter quiz records, accuracy, bookmarks, or review mastery', () => {
  const progress = outcome(E.initialProgress(), [first], false, now - day);
  progress.bookmarks = [C.vocabulary[0].id];
  const accuracy = E.aggregateAccuracy(progress, map);
  const updated = E.setTaskCompleted(progress, `vocabulary:${C.vocabulary[0].id}`, true);
  for (const field of ['attempts', 'reviews', 'studyEvents', 'bookmarks', 'settings']) assert.equal(updated[field], progress[field]);
  assert.deepEqual(E.aggregateAccuracy(updated, map), accuracy);
});

check('old current and legacy schema-one backups normalize a missing completion field', () => {
  const current = E.initialProgress();
  const old = structuredClone(current); delete old.completedTasks;
  assert.deepEqual(S.validateProgress(old), current);
  assert.equal(Object.hasOwn(old, 'completedTasks'), false);
  old.contentVersion = '2026.10.1';
  assert.deepEqual(S.validateProgress(old), current);
});

check('corrupt completion lists reject duplicates, wrong content kinds, and unknown tasks', () => {
  for (const tasks of [null, 'week:1', ['week:0'], ['week:7'], ['week:01'], ['topic:unknown'], [`vocabulary:${C.grammar[0].id}`], ['reading:unknown'], ['week:1', 'week:1'], [4]]) {
    assert.throws(() => S.validateProgress({ ...E.initialProgress(), completedTasks: tasks }), /Invalid progress/);
  }
});

check('due reviews outrank recent misses and strong questions without advancing schedules', () => {
  let progress = outcome(E.initialProgress(), [words[0]], false, now - 5 * day);
  progress = outcome(progress, [words[1]], false, now - 60 * 60 * 1000);
  progress = outcome(progress, [words[2]], true, now - 1000);
  const before = structuredClone(progress);
  assert.deepEqual(ids(select(progress, words.slice(0, 3), 2)), [words[0].id, words[1].id]);
  assert.deepEqual(progress, before);
  assert.ok(Date.parse(progress.reviews[words[1].id].dueAt) > now);
});

check('a strong assessed question is deprioritized even when a past miss is not yet due', () => {
  let progress = outcome(E.initialProgress(), [words[0]], false, now - 40 * day);
  progress.reviews[words[0].id].dueAt = new Date(now + day).toISOString();
  for (let index = 0; index < 4; index++) progress = outcome(progress, [words[1]], true, now - day + index);
  assert.deepEqual(ids(select(progress, words.slice(0, 2), 1)), [words[0].id]);
});

check('a mixed pool with no assessed history balances all available skills', () => {
  const pool = ['vocabulary', 'kanji', 'grammar', 'reading', 'listening'].flatMap(skill => C.questions.filter(question => question.skill === skill).slice(0, 4));
  const chosen = select(E.initialProgress(), pool, 5);
  assert.equal(chosen.length, 5);
  assert.equal(new Set(chosen.map(question => question.skill)).size, 5);
  const twoSkills = pool.filter(question => ['grammar', 'reading'].includes(question.skill));
  assert.equal(new Set(select(E.initialProgress(), twoSkills, 2).map(question => question.skill)).size, 2);
});

check('unseen coverage is retained when due mistakes would fill a larger session', () => {
  const progress = outcome(E.initialProgress(), words.slice(0, 3), false, now - 5 * day);
  const chosen = select(progress, words.slice(0, 4), 3);
  assert.equal(chosen.length, 3);
  assert.ok(chosen.some(question => question.id === words[3].id));
  assert.equal(chosen.filter(question => progress.reviews[question.id]).length, 2);
});

check('grammar weakness transfers to an unseen question using the same grammar point', () => {
  const [weak, strong] = groupBy('grammarId');
  let progress = outcome(E.initialProgress(), [weak[0]], false, now - 40 * day);
  for (let index = 0; index < 4; index++) progress = outcome(progress, [strong[0]], true, now - day + index);
  assert.deepEqual(ids(select(progress, [strong[1], weak[1]], 1)), [weak[1].id]);
});

check('vocabulary weakness transfers to another question on the same word', () => {
  const [weak, strong] = groupBy('vocabularyId');
  let progress = outcome(E.initialProgress(), [weak[0]], false, now - 40 * day);
  for (let index = 0; index < 4; index++) progress = outcome(progress, [strong[0]], true, now - day + index);
  assert.deepEqual(ids(select(progress, [strong[1], weak[1]], 1)), [weak[1].id]);
});

check('question-format weakness transfers across different grammar lessons', () => {
  const ordered = C.questions.filter(question => question.questionType === 'grammar-order');
  const forms = C.questions.filter(question => question.questionType === 'grammar-form' && !ordered.slice(0, 2).some(order => order.grammarId === question.grammarId));
  const strongCandidate = forms.find(question => question.grammarId !== forms[0].grammarId);
  let progress = outcome(E.initialProgress(), [ordered[0]], false, now - 40 * day);
  for (let index = 0; index < 4; index++) progress = outcome(progress, [forms[0]], true, now - day + index);
  assert.deepEqual(ids(select(progress, [strongCandidate, ordered[1]], 1)), [ordered[1].id]);
});

check('skill weakness influences unseen formats without shared grammar or vocabulary IDs', () => {
  const grammarHistory = C.questions.find(question => question.questionType === 'grammar-form');
  const grammarCandidate = C.questions.find(question => question.questionType === 'grammar-order' && question.grammarId !== grammarHistory.grammarId);
  const readingHistory = C.questions.find(question => question.questionType === 'reading-short');
  const readingCandidate = C.questions.find(question => question.questionType === 'reading-information');
  let progress = outcome(E.initialProgress(), [grammarHistory], false, now - 40 * day);
  for (let index = 0; index < 4; index++) progress = outcome(progress, [readingHistory], true, now - day + index);
  assert.deepEqual(ids(select(progress, [readingCandidate, grammarCandidate], 1)), [grammarCandidate.id]);
});

check('script study and technically excluded audio leave selection unchanged', () => {
  const pool = C.questions.filter(question => question.skill === 'listening').slice(0, 6);
  const baseline = ids(select(E.initialProgress(), pool, 3));
  const script = outcome(E.initialProgress(), pool.slice(0, 3), false, now - day, { access: 'script' });
  assert.deepEqual(ids(select(script, pool, 3)), baseline);
  const excluded = outcome(E.initialProgress(), pool.slice(0, 3), false, now - day, { access: 'audio', excluded: ids(pool.slice(0, 3)) });
  assert.deepEqual(ids(select(excluded, pool, 3)), baseline);
});

check('unfinished checked answers are ignored while submitted unanswered items are misses', () => {
  const active = outcome(E.initialProgress(), words.slice(0, 3), false, now - day, { active: true });
  active.attempts[0].checkedIds = ids(words.slice(0, 3));
  assert.deepEqual(ids(select(active, words, 3)), ids(select(E.initialProgress(), words, 3)));
  const unanswered = outcome(E.initialProgress(), [words[0]], null, now - 2 * day, { submitted: true });
  assert.deepEqual(ids(select(unanswered, words, 1)), [words[0].id]);
});

check('selection honors caller filters, deduplicates IDs, and never mutates inputs', () => {
  const progress = outcome(E.initialProgress(), [words[0]], false, now - 5 * day);
  const pool = [words[1], words[2], words[1], words[3]];
  const before = structuredClone(progress);
  freeze(progress); freeze(pool);
  const chosen = select(progress, pool, 10);
  assert.equal(chosen.length, 3);
  assert.equal(new Set(ids(chosen)).size, 3);
  assert.ok(chosen.every(question => pool.includes(question)));
  assert.ok(!chosen.some(question => question.id === words[0].id));
  assert.deepEqual(progress, before);
  assert.deepEqual(select(progress, [], 4), []);
  assert.deepEqual(select(progress, pool, 0), []);
  assert.throws(() => select(progress, pool, -1), /valid count/);
  assert.throws(() => E.selectPracticeQuestions(progress, pool, { random: () => 1 }), /Random value/);
});

check('ordinary prioritized practice cannot advance a future review or mastery', () => {
  let progress = outcome(E.initialProgress(), [first], false, now - 1000);
  const before = structuredClone(progress.reviews);
  const chosen = select(progress, [first], 1);
  progress = outcome(progress, chosen, true, now);
  assert.deepEqual(progress.reviews, before);
  assert.equal(progress.reviews[first.id].streak, 0);
  assert.equal(progress.reviews[first.id].mastered, false);
});

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const memory = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) } });
try {
  check('completion and adaptive practice history survive validated save/load', () => {
    let progress = outcome(E.initialProgress(), [first], false, now - 2 * day);
    progress = E.setTaskCompleted(progress, 'week:2', true);
    progress = E.setTaskCompleted(progress, `grammar:${C.grammar[0].id}`, true);
    assert.equal(S.saveProgress(progress).saved, true);
    assert.deepEqual(S.loadProgress().progress, progress);
    assert.deepEqual(ids(select(S.loadProgress().progress, words, 3)), ids(select(progress, words, 3)));
    const old = structuredClone(progress); delete old.completedTasks;
    memory.set(S.STORAGE_KEY, JSON.stringify(old));
    assert.deepEqual(S.loadProgress().progress.completedTasks, []);
    const corrupted = { ...progress, completedTasks: ['week:99'] };
    memory.set(S.STORAGE_KEY, JSON.stringify(corrupted));
    assert.ok(S.loadProgress().warning);
    assert.equal(memory.get(S.STORAGE_KEY), JSON.stringify(corrupted));
  });
} finally {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage;
}

console.log(`\n${checks} completion and adaptive-learning checks passed.`);
