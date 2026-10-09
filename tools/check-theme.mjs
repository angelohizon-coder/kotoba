// Tests persisted themes against the actual typed sources. Node 24+, no dependencies.
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
const now = Date.UTC(2026, 9, 9, 4);
const question = C.questions.find(item => item.skill !== 'listening');
const questionMap = Object.fromEntries(C.questions.map(item => [item.id, item]));
const submitted = E.createAttempt([question], 'practice', { now, random: () => 0 });
let rich = { ...E.initialProgress(), attempts: [submitted], activeAttemptId: submitted.id };
rich = E.selectAnswer(rich, submitted.id, question.id, question.options.find(item => item.id !== question.correctOptionId).id);
rich = E.submitAttempt(rich, submitted.id, questionMap, now);
const active = E.createAttempt([question], 'mock', { now: now + 1000, durationMinutes: 15, random: () => 0 });
rich = { ...rich, attempts: [...rich.attempts, active], activeAttemptId: active.id };
rich = E.markStudied(rich, 'vocabulary', C.vocabulary[0].id, now);
rich = E.setTaskCompleted(rich, `grammar:${C.grammar[0].id}`, true);
rich.bookmarks = [C.vocabulary[0].id, C.grammar[0].id];
rich.settings = { ...E.initialProgress().settings, furigana: true, dailyGoal: 7, examDate: '2026-12-01', theme: 'dark', soundEffects: true };

let count = 0;
function check(name, fn) { fn(); count++; console.log('PASS ' + name); }

check('new progress starts in light mode without changing schema or course version', () => {
  const fresh = E.initialProgress();
  assert.equal(fresh.settings.theme, 'light');
  assert.equal(fresh.schemaVersion, 1);
  assert.equal(fresh.contentVersion, C.CONTENT_VERSION);
  assert.deepEqual(S.validateProgress(fresh), fresh);
});

check('both theme choices validate without changing learner progress', () => {
  for (const theme of ['light', 'dark']) {
    const chosen = structuredClone(rich); chosen.settings.theme = theme;
    assert.deepEqual(S.validateProgress(chosen), chosen);
  }
});

check('current progress without a theme defaults to light and stays unmodified', () => {
  const missing = structuredClone(rich); delete missing.settings.theme;
  const before = structuredClone(missing);
  const normalized = S.validateProgress(missing);
  assert.deepEqual(normalized, { ...before, settings: { ...before.settings, theme: 'light' } });
  assert.deepEqual(missing, before);
  assert.notEqual(normalized.settings, missing.settings);
});

check('legacy course backups without a theme migrate with all progress intact', () => {
  const legacy = structuredClone(rich);
  legacy.contentVersion = '2026.10.1'; delete legacy.settings.theme; delete legacy.completedTasks;
  const before = structuredClone(legacy);
  const expected = structuredClone(rich); expected.settings.theme = 'light'; expected.completedTasks = [];
  assert.deepEqual(S.validateProgress(legacy), expected);
  assert.deepEqual(legacy, before);
});

check('explicit themes survive legacy course migration', () => {
  const legacy = structuredClone(rich); legacy.contentVersion = '2026.10.1';
  assert.deepEqual(S.validateProgress(legacy), rich);
  assert.equal(legacy.contentVersion, '2026.10.1');
});

check('unsupported or malformed theme settings are rejected', () => {
  for (const theme of ['system', 'Light', '', 'sepia', null, false, 0, {}, []]) {
    const malformed = structuredClone(rich); malformed.settings.theme = theme;
    assert.throws(() => S.validateProgress(malformed), /theme setting is not supported/);
  }
});

check('JSON export and validated import retain theme, bookmarks, reviews, and resumable attempts', () => {
  const imported = S.validateProgress(JSON.parse(JSON.stringify(rich)));
  assert.deepEqual(imported, rich);
  assert.equal(imported.attempts.at(-1).deadline, active.deadline);
  assert.deepEqual(imported.attempts.at(-1).optionOrders, active.optionOrders);
  assert.equal(imported.activeAttemptId, active.id);
});

check('validation returns a clean settings object and does not mutate themed inputs', () => {
  const input = structuredClone(rich); const before = structuredClone(input);
  const normalized = S.validateProgress(input);
  assert.deepEqual(input, before);
  assert.notEqual(normalized, input);
  assert.notEqual(normalized.settings, input.settings);
  normalized.settings.theme = 'light';
  assert.equal(input.settings.theme, 'dark');
});

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const values = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
} });

try {
  check('first load without saved progress uses light mode', () => {
    const loaded = S.loadProgress();
    assert.equal(loaded.warning, undefined);
    assert.deepEqual(loaded.progress, E.initialProgress());
  });

  check('save and reload preserve dark mode and all learner data', () => {
    assert.deepEqual(S.saveProgress(rich), { saved: true });
    assert.deepEqual(JSON.parse(values.get(S.STORAGE_KEY)), rich);
    assert.deepEqual(S.loadProgress(), { progress: rich });
  });

  check('switching to light saves without losing the active test or review schedule', () => {
    const updated = { ...rich, settings: { ...rich.settings, theme: 'light' } };
    assert.equal(S.saveProgress(updated).saved, true);
    assert.deepEqual(S.loadProgress().progress, updated);
    assert.equal(rich.settings.theme, 'dark');
  });

  check('loading old settings does not overwrite bytes and a later save records the default', () => {
    const missing = structuredClone(rich); delete missing.settings.theme;
    const bytes = JSON.stringify(missing); values.set(S.STORAGE_KEY, bytes);
    const loaded = S.loadProgress();
    assert.equal(loaded.warning, undefined); assert.equal(loaded.progress.settings.theme, 'light');
    assert.equal(values.get(S.STORAGE_KEY), bytes);
    assert.equal(S.saveProgress(loaded.progress).saved, true);
    assert.equal(JSON.parse(values.get(S.STORAGE_KEY)).settings.theme, 'light');
  });

  check('invalid theme saves fail while retaining the previous valid backup', () => {
    const before = values.get(S.STORAGE_KEY);
    const invalid = structuredClone(rich); invalid.settings.theme = 'system';
    const saved = S.saveProgress(invalid);
    assert.equal(saved.saved, false); assert.match(saved.error, /theme setting/);
    assert.equal(values.get(S.STORAGE_KEY), before);
  });

  check('invalid saved themes stay recoverable and load a safe light-mode fallback', () => {
    const invalid = structuredClone(rich); invalid.settings.theme = null;
    const bytes = JSON.stringify(invalid); values.set(S.STORAGE_KEY, bytes);
    const loaded = S.loadProgress();
    assert.match(loaded.warning, /original data has been kept/);
    assert.equal(values.get(S.STORAGE_KEY), bytes);
    assert.deepEqual(loaded.progress, E.initialProgress());
  });
} finally {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
}

console.log(`\n${count} persisted theme checks passed.`);
