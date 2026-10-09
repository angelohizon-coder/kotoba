// Tests the actual typed storage migration. Requires Node 24+; no downloaded dependencies.
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
assert.equal(C.CONTENT_VERSION, '2026.10.5', 'Assemble the expanded 2026.10.5 content before testing its migration.');
const questionMap = Object.fromEntries(C.questions.map(question => [question.id, question]));
const legacyQuestions = C.questions.filter(question => /^q-(?:v|k|g|r|l)-/.test(question.id)).slice(0, 3);
assert.equal(legacyQuestions.length, 3);
const now = Date.now();
const completed = E.createAttempt(legacyQuestions, 'mock', { now, durationMinutes: 10, random: () => 0 });
let progress = { ...E.initialProgress(), attempts: [completed], activeAttemptId: completed.id };
const wrongQuestion = legacyQuestions[0];
progress = E.selectAnswer(progress, completed.id, wrongQuestion.id, wrongQuestion.options.find(option => option.id !== wrongQuestion.correctOptionId).id);
progress = E.submitAttempt(progress, completed.id, questionMap, now);
const resumable = E.createAttempt(legacyQuestions, 'mock', { now: now + 1000, durationMinutes: 15, random: () => 0 });
resumable.answers[legacyQuestions[1].id] = legacyQuestions[1].correctOptionId;
progress = { ...progress, attempts: [...progress.attempts, resumable], activeAttemptId: resumable.id };
const word = C.vocabulary.find(item => /^v-/.test(item.id));
progress = E.markStudied(progress, 'vocabulary', word.id, now);
progress.bookmarks = [word.id, C.readings.find(item => /^r-/.test(item.id)).id];
progress.settings = { ...E.initialProgress().settings, furigana: true, dailyGoal: 7, examDate: '2026-12-01', theme: 'light', soundEffects: true };
const legacy = structuredClone(progress); legacy.contentVersion = '2026.10.1'; delete legacy.settings.soundEffects;
let count = 0;
function check(name, fn) { fn(); count++; console.log('PASS ' + name); }

check('old imports normalize the version while preserving the full learner history', () => {
  assert.deepEqual(S.validateProgress(legacy), progress);
  assert.equal(legacy.contentVersion, '2026.10.1');
  assert.deepEqual(S.validateProgress(legacy).attempts[1].optionOrders, resumable.optionOrders);
  assert.equal(S.validateProgress(legacy).attempts[1].deadline, resumable.deadline);
});
check('2026.10.2 backups preserve saved mini mocks and gain the sound preference', () => {
  const previous = structuredClone(legacy); previous.contentVersion = '2026.10.2';
  assert.deepEqual(S.validateProgress(previous), progress);
  assert.equal(S.validateProgress(previous).attempts[1].mock, undefined);
  assert.equal(previous.contentVersion, '2026.10.2');
});
check('older saves default the new global level and path resume without mutating the backup', () => {
  for (const contentVersion of ['2026.10.1', '2026.10.2', '2026.10.3', '2026.10.4']) {
    const previous = structuredClone(legacy); previous.contentVersion = contentVersion;
    delete previous.settings.studyLevel; delete previous.settings.pathResume; delete previous.settings.dashboardWidgets;
    const before = structuredClone(previous);
    assert.deepEqual(S.validateProgress(previous), progress);
    assert.deepEqual(previous, before);
  }
});
check('2026.10.3 full mocks preserve clocks, section breaks, submitted grades, theme and sound choices', () => {
  const full = E.createFullMockAttempt('n3', C.questions, { now, random: () => 0 });
  let current = { ...E.initialProgress(), attempts: [full], activeAttemptId: full.id };
  current.settings = { ...current.settings, theme: 'dark', soundEffects: false };
  const states = [current];
  current = E.finishMockSection(current, full.id, questionMap, now + 1000); states.push(current);
  current = E.startNextMockSection(current, full.id, now + 2000); states.push(current);
  current = E.finishMockSection(current, full.id, questionMap, now + 3000);
  current = E.startNextMockSection(current, full.id, now + 4000);
  current = E.finishMockSection(current, full.id, questionMap, now + 5000); states.push(current);
  for (const state of states) {
    const previous = structuredClone(state); previous.contentVersion = '2026.10.3';
    delete previous.settings.studyLevel; delete previous.settings.pathResume; delete previous.settings.dashboardWidgets;
    assert.deepEqual(S.validateProgress(previous), state);
    assert.equal(previous.contentVersion, '2026.10.3');
    assert.equal(S.validateProgress(previous).attempts[0].mock.sections.length, 3);
  }
});
check('migrating an older full mock still rejects corrupted section clocks before replacing progress', () => {
  const full = E.createFullMockAttempt('n3', C.questions, { now, random: () => 0 });
  const previous = { ...E.initialProgress(), contentVersion: '2026.10.3', attempts: [full], activeAttemptId: full.id };
  full.mock.sections[0].deadline += 1000;
  assert.throws(() => S.validateProgress(previous), /section deadline/);
});
check('legacy migration rejects corrupted option orders and canonical answers', () => {
  const badOrder = structuredClone(legacy);
  const id = badOrder.attempts[0].questionOrder[0];
  badOrder.attempts[0].optionOrders[id][1] = badOrder.attempts[0].optionOrders[id][0];
  assert.throws(() => S.validateProgress(badOrder), /duplicate/);
  const badAnswer = structuredClone(legacy); badAnswer.attempts[0].answers[id] = 'unknown-answer';
  assert.throws(() => S.validateProgress(badAnswer), /unknown question or option/);
});
check('legacy migration still rejects inconsistent status and invalid deadlines', () => {
  const status = structuredClone(legacy); delete status.attempts[0].submittedAt;
  assert.throws(() => S.validateProgress(status), /submission date/);
  const deadline = structuredClone(legacy); deadline.attempts[1].deadline = Infinity;
  assert.throws(() => S.validateProgress(deadline), /timestamp/);
});
check('legacy migration rejects unknown bookmark and review references', () => {
  const bookmark = structuredClone(legacy); bookmark.bookmarks.push('not-a-content-id');
  assert.throws(() => S.validateProgress(bookmark), /unknown content/);
  const review = structuredClone(legacy); Object.values(review.reviews)[0].questionId = 'wrong-question';
  assert.throws(() => S.validateProgress(review), /mismatched question/);
});
check('unknown schema and content versions remain rejected', () => {
  const version = structuredClone(legacy); version.contentVersion = '2026.9.0';
  assert.throws(() => S.validateProgress(version), /content version/);
  const schema = structuredClone(legacy); schema.schemaVersion = 2;
  assert.throws(() => S.validateProgress(schema), /schema version/);
});
const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const values = new Map([[S.STORAGE_KEY, JSON.stringify(legacy)]]);
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } });
check('loading old saved data migrates without warning or deleting original bytes', () => {
  const oldBytes = values.get(S.STORAGE_KEY);
  const loaded = S.loadProgress(); assert.equal(loaded.warning, undefined); assert.deepEqual(loaded.progress, progress);
  assert.equal(values.get(S.STORAGE_KEY), oldBytes);
});
check('saving migrated data records the new version and preserves resumable state', () => {
  assert.equal(S.saveProgress(S.loadProgress().progress).saved, true);
  assert.equal(JSON.parse(values.get(S.STORAGE_KEY)).contentVersion, C.CONTENT_VERSION);
  assert.deepEqual(S.loadProgress().progress, progress);
});
check('invalid old saved data stays quarantined instead of being partly migrated', () => {
  const corrupt = structuredClone(legacy); corrupt.activeAttemptId = 'missing-attempt';
  const bytes = JSON.stringify(corrupt); values.set(S.STORAGE_KEY, bytes);
  assert.ok(S.loadProgress().warning); assert.equal(values.get(S.STORAGE_KEY), bytes);
  assert.deepEqual(S.loadProgress().progress, E.initialProgress());
});
if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
console.log(`\n${count} additive content migration checks passed.`);
