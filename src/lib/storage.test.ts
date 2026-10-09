import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { questions, vocabulary } from '../content';
import { createAttempt, initialProgress, markStudied, remainingSeconds, selectAnswer, submitAttempt } from './engine';
import { loadProgress, saveProgress, STORAGE_KEY, validateProgress } from './storage';
import type { Progress } from '../types';

const start = new Date(2026, 9, 9, 12, 0).getTime();
let values: Map<string, string>;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function populated(): Progress {
  const question = questions.find(item => item.skill !== 'listening')!;
  const attempt = createAttempt([question], 'mock', { now: start, durationMinutes: 5 });
  let progress: Progress = { ...initialProgress(), attempts: [attempt], activeAttemptId: attempt.id };
  progress = selectAnswer(progress, attempt.id, question.id, question.options.find(option => option.id !== question.correctOptionId)!.id);
  progress = markStudied(progress, 'vocabulary', vocabulary[0].id, start);
  return progress;
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(start);
  values = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('validated device storage', () => {
  it('round-trips canonical answers, option shuffle, study activity and absolute deadline', () => {
    const progress = populated();
    expect(saveProgress(progress)).toEqual({ saved: true });
    vi.setSystemTime(start + 120_000);
    const loaded = loadProgress();
    expect(loaded.warning).toBeUndefined();
    expect(loaded.progress).toEqual(progress);
    expect(remainingSeconds(loaded.progress.attempts[0])).toBe(180);
    expect(loaded.progress.attempts[0].optionOrders).toEqual(progress.attempts[0].optionOrders);
  });

  it('retains submitted results and missed-answer records across reload', () => {
    const progress = populated();
    const map = Object.fromEntries(questions.map(question => [question.id, question]));
    const submitted = submitAttempt(progress, progress.activeAttemptId!, map, start + 1000);
    expect(saveProgress(submitted).saved).toBe(true);
    expect(loadProgress().progress).toEqual(submitted);
    expect(Object.values(loadProgress().progress.reviews)[0].lastAnswerId).toBe(Object.values(progress.attempts[0].answers)[0]);
  });

  it.each(['{bad json', JSON.stringify({ schemaVersion: 999 }), JSON.stringify({ ...initialProgress(), contentVersion: 'unsupported' })])('keeps invalid saved data intact and falls back with a warning', invalid => {
    values.set(STORAGE_KEY, invalid);
    const loaded = loadProgress();
    expect(loaded.progress).toEqual(initialProgress());
    expect(loaded.warning).toContain('original data has been kept');
    expect(values.get(STORAGE_KEY)).toBe(invalid);
  });

  it('rejects imports with unknown content, invalid option permutations and wrong answer IDs', () => {
    const base = populated();
    const unknown = clone(base); unknown.bookmarks.push('unknown-content');
    expect(() => validateProgress(unknown)).toThrow('unknown content');
    const duplicate = clone(base);
    const questionId = duplicate.attempts[0].questionOrder[0];
    duplicate.attempts[0].optionOrders[questionId][1] = duplicate.attempts[0].optionOrders[questionId][0];
    expect(() => validateProgress(duplicate)).toThrow('duplicate');
    const badAnswer = clone(base); badAnswer.attempts[0].answers[questionId] = 'unknown-option';
    expect(() => validateProgress(badAnswer)).toThrow('unknown question or option');
    expect(base.attempts[0].answers[questionId]).not.toBe('unknown-option');
  });

  it('rejects duplicate attempts, status/date mismatches and unknown active sessions', () => {
    const base = populated();
    const duplicate = clone(base); duplicate.attempts.push(clone(duplicate.attempts[0]));
    expect(() => validateProgress(duplicate)).toThrow('attempt IDs must be unique');
    const status = clone(base); status.attempts[0].status = 'submitted';
    expect(() => validateProgress(status)).toThrow('submission date');
    const active = clone(base); active.activeAttemptId = 'missing-attempt';
    expect(() => validateProgress(active)).toThrow('active attempt');
    const infinity = clone(base); infinity.attempts[0].deadline = Infinity;
    expect(() => validateProgress(infinity)).toThrow('timestamp');
    const exam = clone(base); exam.settings.examDate = '2026-02-30';
    expect(() => validateProgress(exam)).toThrow('real calendar date');
  });

  it('rejects impossible review mastery and unknown study events before replacing saved data', () => {
    const progress = populated();
    const submitted = submitAttempt(progress, progress.activeAttemptId!, Object.fromEntries(questions.map(question => [question.id, question])), start + 1000);
    expect(saveProgress(submitted).saved).toBe(true);
    const original = values.get(STORAGE_KEY);
    const invalid = clone(submitted); Object.values(invalid.reviews)[0].mastered = true;
    expect(saveProgress(invalid)).toMatchObject({ saved: false });
    expect(values.get(STORAGE_KEY)).toBe(original);
    invalid.studyEvents[0].contentId = 'unknown';
    expect(() => validateProgress(invalid)).toThrow();
  });

  it('reports blocked reads and quota failures without claiming progress was saved', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Blocked'); },
      setItem: () => { throw new Error('Quota exceeded'); },
    });
    expect(loadProgress().warning).toContain('storage is unavailable');
    expect(saveProgress(initialProgress())).toMatchObject({ saved: false, error: expect.stringContaining('could not be saved') });
  });

  it('rebuilds imported data and discards unrelated strings rather than preserving executable markup', () => {
    const source = { ...populated(), unrelatedMarkup: '<script>alert(1)</script>' };
    const validated = validateProgress(source);
    expect(validated).not.toHaveProperty('unrelatedMarkup');
    expect(validated).not.toBe(source);
    expect(validated.settings).not.toBe(source.settings);
  });
});
