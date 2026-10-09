import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt, Progress, Question } from '../types';
import { aggregateAccuracy, checkAnswer, createAttempt, gradeAttempt, initialProgress, localDateKey, markReviewed, markStudied, remainingSeconds, selectAnswer, submitAttempt } from './engine';

const start = new Date(2026, 9, 9, 12, 0).getTime();
const pool: Question[] = [
  { id: 'unit-vocabulary', skill: 'vocabulary', prompt: 'Choose the word.', options: [{ id: 'v-wrong', text: 'Wrong' }, { id: 'v-right', text: 'Right' }, { id: 'v-other', text: 'Other' }], correctOptionId: 'v-right', explanations: { 'v-wrong': 'Wrong.', 'v-right': 'Right.', 'v-other': 'Other.' } },
  { id: 'unit-grammar', skill: 'grammar', prompt: 'Choose the grammar.', options: [{ id: 'g-right', text: 'Right' }, { id: 'g-wrong', text: 'Wrong' }], correctOptionId: 'g-right', explanations: { 'g-right': 'Right.', 'g-wrong': 'Wrong.' } },
  { id: 'unit-listening', skill: 'listening', prompt: 'Listen.', options: [{ id: 'l-wrong', text: 'Wrong' }, { id: 'l-right', text: 'Right' }], correctOptionId: 'l-right', explanations: { 'l-wrong': 'Wrong.', 'l-right': 'Right.' } },
];
const map = Object.fromEntries(pool.map(question => [question.id, question]));
function withAttempt(attempt: Attempt): Progress {
  return { ...initialProgress(), attempts: [attempt], activeAttemptId: attempt.id };
}
function retry(progress: Progress, now: number, correct: boolean): Progress {
  vi.setSystemTime(now);
  const attempt = createAttempt([pool[0]], 'review', { now });
  let updated: Progress = { ...progress, attempts: [...progress.attempts, attempt], activeAttemptId: attempt.id };
  updated = selectAnswer(updated, attempt.id, pool[0].id, correct ? 'v-right' : 'v-wrong');
  return submitAttempt(updated, attempt.id, map, now);
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(start); });
afterEach(() => { vi.useRealTimers(); });

describe('canonical attempt grading', () => {
  it('grades canonical option IDs after both questions and options are shuffled', () => {
    const attempt = createAttempt(pool.slice(0, 2), 'practice', { random: () => 0, now: start });
    expect(attempt.questionOrder).toEqual(['unit-grammar', 'unit-vocabulary']);
    expect(attempt.optionOrders['unit-vocabulary']).toEqual(['v-right', 'v-other', 'v-wrong']);
    let progress = withAttempt(attempt);
    for (const question of pool.slice(0, 2)) progress = selectAnswer(progress, attempt.id, question.id, question.correctOptionId);
    expect(gradeAttempt(progress.attempts[0], map)).toMatchObject({ correct: 2, total: 2, unanswered: 0 });
    expect(attempt.answers).toEqual({});
  });

  it('counts wrong and unanswered items as incorrect and retains their separate details', () => {
    const attempt = createAttempt(pool.slice(0, 2), 'practice');
    const progress = selectAnswer(withAttempt(attempt), attempt.id, 'unit-vocabulary', 'v-wrong');
    const submitted = submitAttempt(progress, attempt.id, map, start);
    const grade = gradeAttempt(submitted.attempts[0], map);
    expect(grade).toMatchObject({ correct: 0, total: 2, unanswered: 1 });
    expect(submitted.reviews['unit-vocabulary'].lastAnswerId).toBe('v-wrong');
    expect(submitted.reviews['unit-grammar'].lastAnswerId).toBeNull();
    expect(grade.items.find(item => item.questionId === 'unit-grammar')).toMatchObject({ correct: false, unanswered: true });
  });

  it('submits only once, locks answers, and clears the active results on review', () => {
    const attempt = createAttempt([pool[0]], 'practice');
    const submitted = submitAttempt(withAttempt(attempt), attempt.id, map, start);
    const once = JSON.stringify(submitted);
    expect(submitAttempt(submitted, attempt.id, map, start + 1000)).toBe(submitted);
    expect(selectAnswer(submitted, attempt.id, pool[0].id, 'v-right')).toBe(submitted);
    expect(JSON.stringify(submitted)).toBe(once);
    expect(submitted.activeAttemptId).toBe(attempt.id);
    const reviewed = markReviewed(submitted, attempt.id);
    expect(reviewed.attempts[0].status).toBe('reviewed');
    expect(reviewed.activeAttemptId).toBeNull();
  });

  it('withholds mock feedback and locks checked learning answers', () => {
    const mock = createAttempt([pool[0]], 'mock');
    const answered = selectAnswer(withAttempt(mock), mock.id, pool[0].id, 'v-right');
    expect(checkAnswer(answered, mock.id, pool[0].id)).toBe(answered);
    const learning = createAttempt([pool[0]], 'practice');
    const checked = checkAnswer(selectAnswer(withAttempt(learning), learning.id, pool[0].id, 'v-right'), learning.id, pool[0].id);
    expect(checked.attempts[0].checkedIds).toEqual([pool[0].id]);
    expect(selectAnswer(checked, learning.id, pool[0].id, 'v-wrong')).toBe(checked);
  });

  it('excludes script-only listening and technical failures from accuracy and mistake records', () => {
    const attempt = createAttempt(pool, 'practice', { listeningAccess: 'script' });
    attempt.answers['unit-listening'] = 'l-right';
    attempt.excludedIds.push('unit-vocabulary');
    const progress = submitAttempt(withAttempt(attempt), attempt.id, map, start);
    expect(gradeAttempt(progress.attempts[0], map)).toMatchObject({ total: 1, correct: 0, unanswered: 1, excluded: 2, skills: { grammar: { total: 1, correct: 0 } } });
    expect(Object.keys(progress.reviews)).toEqual(['unit-grammar']);
  });
});

describe('absolute timer and local study days', () => {
  it('keeps the deadline after a JSON reload and expires without accepting new answers', () => {
    const attempt = createAttempt([pool[0]], 'mock', { durationMinutes: 1, now: start });
    const restored = JSON.parse(JSON.stringify(withAttempt(attempt))) as Progress;
    expect(remainingSeconds(restored.attempts[0], start + 30_500)).toBe(30);
    vi.setSystemTime(start + 61_000);
    expect(remainingSeconds(restored.attempts[0])).toBe(0);
    expect(selectAnswer(restored, attempt.id, pool[0].id, 'v-right')).toBe(restored);
    const submitted = submitAttempt(restored, attempt.id, map, start + 61_000);
    expect(submitted.attempts[0].status).toBe('submitted');
    expect(gradeAttempt(submitted.attempts[0], map)).toMatchObject({ correct: 0, unanswered: 1 });
    expect(submitAttempt(submitted, attempt.id, map)).toBe(submitted);
  });

  it('deduplicates one studied item per learner-local day and counts it again next day', () => {
    const late = new Date(2026, 9, 9, 23, 59).getTime();
    const next = new Date(2026, 9, 10, 0, 1).getTime();
    expect(localDateKey(new Date(late))).toBe('2026-10-09');
    const studied = markStudied(initialProgress(), 'vocabulary', 'v1', late);
    expect(markStudied(studied, 'vocabulary', 'v1', late - 1000)).toBe(studied);
    expect(markStudied(studied, 'vocabulary', 'v1', next).studyEvents).toHaveLength(2);
  });
});

describe('question-level initial and retry accuracy', () => {
  it('keeps the first answer initial when a fresh mixed practice repeats that question', () => {
    const first = createAttempt([pool[0]], 'practice', { now: start });
    let progress = submitAttempt(selectAnswer(withAttempt(first), first.id, pool[0].id, 'v-wrong'), first.id, map, start);
    vi.setSystemTime(start + 1000);
    const second = createAttempt(pool.slice(0, 2), 'practice', { now: start + 1000 });
    expect(second.isRetry).toBe(false);
    progress = { ...progress, attempts: [...progress.attempts, second], activeAttemptId: second.id };
    progress = selectAnswer(progress, second.id, pool[0].id, 'v-right');
    progress = selectAnswer(progress, second.id, pool[1].id, 'g-right');
    progress = submitAttempt(progress, second.id, map, start + 1000);
    // Imported arrays need not be sorted; classification follows submission chronology.
    progress = { ...progress, attempts: [...progress.attempts].reverse() };
    expect(aggregateAccuracy(progress, map)).toEqual({
      initial: { correct: 1, total: 2, skills: { vocabulary: { correct: 0, total: 1 }, grammar: { correct: 1, total: 1 } } },
      retry: { correct: 1, total: 1, skills: { vocabulary: { correct: 1, total: 1 } } },
    });
  });

  it('does not let excluded script study or an imported retry flag hide a first assessed answer', () => {
    const script = createAttempt([pool[2]], 'listening', { now: start, listeningAccess: 'script' });
    let progress = submitAttempt(selectAnswer(withAttempt(script), script.id, pool[2].id, 'l-right'), script.id, map, start);
    vi.setSystemTime(start + 1000);
    const audio = createAttempt([pool[2]], 'review', { now: start + 1000, listeningAccess: 'audio', isRetry: true });
    progress = { ...progress, attempts: [...progress.attempts, audio], activeAttemptId: audio.id };
    progress = submitAttempt(selectAnswer(progress, audio.id, pool[2].id, 'l-right'), audio.id, map, start + 1000);
    const unfinished = createAttempt([pool[0]], 'practice', { now: start + 1000 });
    progress = { ...progress, attempts: [...progress.attempts, unfinished] };
    expect(aggregateAccuracy(progress, map)).toEqual({
      initial: { correct: 1, total: 1, skills: { listening: { correct: 1, total: 1 } } },
      retry: { correct: 0, total: 0, skills: {} },
    });
  });
});

describe('spaced review', () => {
  it('keeps an early correct retry from advancing the schedule, then requires three due successes', () => {
    const attempt = createAttempt([pool[0]], 'practice', { now: start });
    let progress = submitAttempt(selectAnswer(withAttempt(attempt), attempt.id, pool[0].id, 'v-wrong'), attempt.id, map, start);
    const firstDue = progress.reviews[pool[0].id].dueAt;
    progress = retry(progress, start + 1000, true);
    expect(progress.reviews[pool[0].id]).toMatchObject({ streak: 0, mastered: false, dueAt: firstDue, lastAnswerId: 'v-wrong' });
    for (let streak = 1; streak <= 3; streak++) {
      const due = Date.parse(progress.reviews[pool[0].id].dueAt);
      progress = retry(progress, due, true);
      expect(progress.reviews[pool[0].id].streak).toBe(streak);
      expect(progress.reviews[pool[0].id].mastered).toBe(streak === 3);
      expect(progress.reviews[pool[0].id].lastAnswerId).toBe('v-wrong');
    }
    expect(progress.attempts[0].answers[pool[0].id]).toBe('v-wrong');
    expect(progress.attempts).toHaveLength(5);
  });

  it('resets an existing success streak to one-day review after a new wrong retry', () => {
    const attempt = createAttempt([pool[0]], 'practice');
    let progress = submitAttempt(withAttempt(attempt), attempt.id, map, start);
    progress = retry(progress, Date.parse(progress.reviews[pool[0].id].dueAt), true);
    const retryTime = Date.parse(progress.reviews[pool[0].id].dueAt);
    progress = retry(progress, retryTime, false);
    const record = progress.reviews[pool[0].id];
    expect(record).toMatchObject({ streak: 0, mastered: false, lastAnswerId: 'v-wrong' });
    expect(new Date(record.dueAt).getDate()).toBe(new Date(retryTime).getDate() + 1);
    expect(record.firstMissedAt).toBe(new Date(start).toISOString());
  });
});
