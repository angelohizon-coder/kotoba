// Dependency-free checks for the real typed content and state logic. Requires Node 24+.
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

const { CONTENT_VERSION, vocabulary, kanji, grammar, readings, listening, questions } = await import('../src/content/index.ts');
const { initialProgress, createAttempt, selectAnswer, checkAnswer, submitAttempt, gradeAttempt, remainingSeconds, aggregateAccuracy, markStudied, localDateKey } = await import('../src/lib/engine.ts');
const { STORAGE_KEY, validateProgress, saveProgress, loadProgress } = await import('../src/lib/storage.ts');
const questionMap = Object.fromEntries(questions.map(q => [q.id, q]));
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
const base = () => initialProgress();
const withAttempt = (p, a) => ({ ...p, attempts: [...p.attempts, a], activeAttemptId: a.id });
const first = questions.find(q => q.skill === 'vocabulary');
const second = questions.find(q => q.skill === 'grammar');
const now = Date.now();

check('starter content targets and unique canonical IDs', () => {
  assert.ok(vocabulary.length >= 24 && kanji.length >= 12 && grammar.length >= 5 && readings.length >= 3 && listening.length >= 2 && questions.length >= 30);
  for (const collection of [vocabulary, kanji, grammar, readings, listening, questions]) assert.equal(new Set(collection.map(x => x.id)).size, collection.length);
});
check('every option has an explanation and exactly one canonical key', () => {
  for (const q of questions) {
    assert.equal(q.options.length, 4); assert.equal(new Set(q.options.map(o => o.id)).size, 4);
    assert.equal(q.options.filter(o => o.id === q.correctOptionId).length, 1);
    for (const o of q.options) assert.ok(q.explanations[o.id]?.length > 10);
    if (q.passageId) { assert.ok(readings.find(r => r.id === q.passageId)?.questionIds.includes(q.id)); assert.ok(q.evidence); }
    if (q.listeningId) assert.ok(listening.find(l => l.id === q.listeningId)?.questionIds.includes(q.id));
  }
});
check('kanji are linked to words containing the character', () => {
  for (const k of kanji) {
    assert.ok(k.wordIds.length > 0);
    for (const id of k.wordIds) assert.ok(vocabulary.find(v => v.id === id)?.word.includes(k.character));
  }
});
check('canonical answer survives shuffled display positions', () => {
  const a = createAttempt([first, second], 'practice', { random: () => 0 });
  let p = withAttempt(base(), a); p = selectAnswer(p, a.id, first.id, first.correctOptionId);
  assert.equal(gradeAttempt(p.attempts[0], questionMap).correct, 1);
  assert.notDeepEqual(a.optionOrders[first.id], first.options.map(o => o.id));
});
check('unanswered items count as incorrect and appear separately', () => {
  const a = createAttempt([first, second], 'mock', { durationMinutes: 15 });
  const grade = gradeAttempt(a, questionMap); assert.equal(grade.correct, 0); assert.equal(grade.total, 2); assert.equal(grade.unanswered, 2);
});
check('submission counts once, including its review side effects', () => {
  const a = createAttempt([first], 'practice', { now }); const p = submitAttempt(withAttempt(base(), a), a.id, questionMap, now);
  assert.equal(submitAttempt(p, a.id, questionMap, now + 1000), p); assert.equal(Object.keys(p.reviews).length, 1);
  validateProgress(p);
});
check('absolute deadline and expiry survive JSON reload', () => {
  const a = createAttempt([first], 'mock', { now, durationMinutes: 1 });
  const restored = validateProgress(JSON.parse(JSON.stringify(withAttempt(base(), a))));
  assert.equal(restored.attempts[0].deadline, now + 60000); assert.equal(remainingSeconds(restored.attempts[0], now + 61000), 0);
  const p = submitAttempt(restored, a.id, questionMap, now + 61000); assert.equal(p.attempts[0].status, 'submitted');
  assert.equal(submitAttempt(p, a.id, questionMap, now + 62000), p);
});
check('an expired real deadline rejects late answers and remains unanswered', () => {
  const a = createAttempt([first], 'mock', { now: now - 120000, durationMinutes: 1 });
  const p = validateProgress(JSON.parse(JSON.stringify(withAttempt(base(), a))));
  assert.equal(remainingSeconds(p.attempts[0]), 0);
  assert.equal(selectAnswer(p, a.id, first.id, first.correctOptionId), p);
  const submitted = submitAttempt(p, a.id, questionMap);
  assert.equal(gradeAttempt(submitted.attempts[0], questionMap).unanswered, 1);
  validateProgress(submitted);
});
check('learning feedback locks answers while mini mock feedback stays hidden', () => {
  const a = createAttempt([first], 'practice', { now });
  let p = selectAnswer(withAttempt(base(), a), a.id, first.id, first.correctOptionId);
  p = checkAnswer(p, a.id, first.id);
  assert.deepEqual(p.attempts[0].checkedIds, [first.id]);
  assert.equal(selectAnswer(p, a.id, first.id, first.options.find(option => option.id !== first.correctOptionId).id), p);
  const b = createAttempt([first], 'mock', { now, durationMinutes: 15 });
  const mock = selectAnswer(withAttempt(base(), b), b.id, first.id, first.correctOptionId);
  assert.equal(checkAnswer(mock, b.id, first.id), mock);
});
check('question/option orders and canonical answers persist exactly', () => {
  const a = createAttempt([first, second], 'practice'); let p = withAttempt(base(), a); p = selectAnswer(p, a.id, first.id, first.correctOptionId);
  const restored = validateProgress(JSON.parse(JSON.stringify(p))); assert.deepEqual(restored, p);
});
check('invalid imports cannot replace valid progress', () => {
  assert.throws(() => validateProgress({ schemaVersion: 999 }));
  const p = base(); p.settings.dailyGoal = 0; assert.throws(() => validateProgress(p));
  const wrongContent = base(); wrongContent.contentVersion = CONTENT_VERSION + '-unknown'; assert.throws(() => validateProgress(wrongContent));
  const a = createAttempt([first], 'practice'); a.answers[first.id] = 'unknown-option'; assert.throws(() => validateProgress(withAttempt(base(), a)));
});
check('imports reject unknown content, corrupted shuffle orders and contradictory dates/status', () => {
  const valid = withAttempt(base(), createAttempt([first], 'mock', { now, durationMinutes: 15 }));
  const clone = () => JSON.parse(JSON.stringify(valid));
  const unknown = clone(); unknown.bookmarks = ['unknown-content']; assert.throws(() => validateProgress(unknown), /unknown content/);
  const duplicateOrder = clone(); duplicateOrder.attempts[0].optionOrders[first.id][1] = duplicateOrder.attempts[0].optionOrders[first.id][0]; assert.throws(() => validateProgress(duplicateOrder), /duplicate/);
  const status = clone(); status.attempts[0].status = 'submitted'; assert.throws(() => validateProgress(status), /submission date/);
  const invalidDeadline = clone(); invalidDeadline.attempts[0].deadline = Number.POSITIVE_INFINITY; assert.throws(() => validateProgress(invalidDeadline), /timestamp/);
  const backwardsDeadline = clone(); backwardsDeadline.attempts[0].deadline = now - 1; assert.throws(() => validateProgress(backwardsDeadline), /deadline/);
  const calendar = clone(); calendar.settings.examDate = '2026-02-30'; assert.throws(() => validateProgress(calendar), /real calendar date/);
});
check('script study and failed audio are excluded from listening assessment', () => {
  const q = questions.find(q => q.skill === 'listening');
  const a = createAttempt([q], 'listening', { listeningAccess: 'script' }); a.answers[q.id] = q.correctOptionId;
  assert.equal(gradeAttempt(a, questionMap).total, 0); assert.equal(gradeAttempt(a, questionMap).excluded, 1);
  const b = createAttempt([q], 'listening', { listeningAccess: 'audio' }); b.excludedIds = [q.id]; assert.equal(gradeAttempt(b, questionMap).total, 0);
});
check('fresh practice repeats are separated from first-attempt accuracy', () => {
  const a = createAttempt([first], 'practice', { now }); a.answers[first.id] = first.options.find(o => o.id !== first.correctOptionId).id;
  let p = submitAttempt(withAttempt(base(), a), a.id, questionMap, now);
  const b = createAttempt([first], 'practice', { now: now + 1000 }); b.answers[first.id] = first.correctOptionId;
  p = submitAttempt(withAttempt(p, b), b.id, questionMap, now + 1000);
  const result = aggregateAccuracy(p, questionMap); assert.equal(result.initial.correct, 0); assert.equal(result.initial.total, 1); assert.equal(result.retry.correct, 1); assert.equal(result.retry.total, 1);
});
check('early retries do not advance spaced mastery; three due successes do', () => {
  const a = createAttempt([first], 'practice', { now }); let p = submitAttempt(withAttempt(base(), a), a.id, questionMap, now);
  const retry = time => { const b = createAttempt([first], 'review', { now: time }); b.answers[first.id] = first.correctOptionId; p = submitAttempt(withAttempt(p, b), b.id, questionMap, time); };
  retry(now + 1000); assert.equal(p.reviews[first.id].streak, 0);
  for (let i = 1; i <= 3; i++) { retry(Date.parse(p.reviews[first.id].dueAt) + 1); assert.equal(p.reviews[first.id].streak, i); }
  assert.equal(p.reviews[first.id].mastered, true); validateProgress(p);
});
check('a wrong retry resets mastery, retains the miss and schedules the next local day', () => {
  const a = createAttempt([first], 'practice', { now }); let p = submitAttempt(withAttempt(base(), a), a.id, questionMap, now);
  const initialMiss = p.reviews[first.id].firstMissedAt;
  for (let i = 1; i <= 3; i++) {
    const time = Date.parse(p.reviews[first.id].dueAt);
    const b = createAttempt([first], 'review', { now: time }); b.answers[first.id] = first.correctOptionId;
    p = submitAttempt(withAttempt(p, b), b.id, questionMap, time);
  }
  assert.equal(p.reviews[first.id].mastered, true);
  const time = Date.parse(p.reviews[first.id].dueAt);
  const wrong = first.options.find(option => option.id !== first.correctOptionId).id;
  const b = createAttempt([first], 'review', { now: time }); b.answers[first.id] = wrong;
  p = submitAttempt(withAttempt(p, b), b.id, questionMap, time);
  const expectedDue = new Date(time); expectedDue.setDate(expectedDue.getDate() + 1);
  assert.equal(p.reviews[first.id].streak, 0); assert.equal(p.reviews[first.id].mastered, false);
  assert.equal(p.reviews[first.id].lastAnswerId, wrong); assert.equal(p.reviews[first.id].firstMissedAt, initialMiss);
  assert.equal(p.reviews[first.id].dueAt, expectedDue.toISOString());
  validateProgress(p);
});
check('a repeated word study counts once per local day', () => {
  const localNoon = new Date(); localNoon.setHours(12, 0, 0, 0);
  const next = new Date(localNoon); next.setDate(next.getDate() + 1);
  const p = markStudied(base(), 'vocabulary', vocabulary[0].id, localNoon.getTime());
  assert.equal(markStudied(p, 'vocabulary', vocabulary[0].id, localNoon.getTime() + 1), p);
  assert.equal(markStudied(p, 'vocabulary', vocabulary[0].id, next.getTime()).studyEvents.length, 2);
  assert.notEqual(localDateKey(localNoon), localDateKey(next));
});
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const memory = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) } });
check('storage abstraction saves and reloads validated progress including answers and shuffle orders', () => {
  const a = createAttempt([first, second], 'mock', { now, durationMinutes: 15 });
  const p = selectAnswer(withAttempt(base(), a), a.id, first.id, first.correctOptionId);
  assert.equal(saveProgress(p).saved, true); assert.deepEqual(loadProgress().progress, p);
});
check('invalid saved bytes are retained and reported', () => { memory.set(STORAGE_KEY, '{invalid'); assert.ok(loadProgress().warning); assert.equal(memory.get(STORAGE_KEY), '{invalid'); });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null, setItem() { throw new Error('Quota exceeded'); } } });
check('quota write failure reports unsaved progress and retains previous bytes', () => {
  const previous = memory.get(STORAGE_KEY);
  const result = saveProgress(base()); assert.equal(result.saved, false); assert.match(result.error, /could not be saved/);
  assert.equal(memory.get(STORAGE_KEY), previous);
});
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
check('blocked storage accurately reports unsaved session state', () => { assert.ok(loadProgress().warning); assert.equal(saveProgress(base()).saved, false); });
if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage); else delete globalThis.localStorage;
console.log(`\n${checks} core checks passed. UI build and browser checks are separate.`);
