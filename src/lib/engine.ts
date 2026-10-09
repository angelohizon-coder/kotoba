import { CONTENT_VERSION, grammar, kanji, learningPath, listening, questions, readings, topics, vocabulary } from '../content';
import type { Attempt, Grade, JLPTLevel, MockSection, Progress, Question, ReviewRecord, StudyEvent } from '../types';

export const REVIEW_INTERVAL_DAYS = [1, 3, 7] as const;
export const DASHBOARD_WIDGET_IDS = ['path', 'goal', 'review', 'balance', 'habit', 'activity', 'library', 'topics', 'references', 'foundations', 'motivation'] as const;
export const DEFAULT_DASHBOARD_WIDGETS = ['path', 'goal', 'review'] as const;
export const REVIEW_SCHEDULE = 'A miss is due in 1 day. Correct retries in Mistake review on or after the due time move to 3 days, then 7 days. Three consecutive due correct retries in Mistake review mark a question mastered. Early correct retries do not advance the schedule; any new miss resets it. Repeated questions in other practice sessions count as retry accuracy without advancing mastery.';

let sequence = 0;
function makeId(prefix: string, now: number): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${now.toString(36)}-${(++sequence).toString(36)}`;
  return `${prefix}-${suffix}`;
}

export function initialProgress(): Progress {
  return {
    schemaVersion: 1,
    contentVersion: CONTENT_VERSION,
    settings: { furigana: false, dailyGoal: 10, examDate: '', theme: 'light', soundEffects: true, studyLevel: 'n3', pathResume: null, dashboardWidgets: [...DEFAULT_DASHBOARD_WIDGETS], speechStyle: 'natural', speechVoice: '' },
    bookmarks: [], completedTasks: [], attempts: [], reviews: {}, studyEvents: [], activeAttemptId: null,
  };
}

// Storage and state transitions share this one canonical task catalogue.
const completableTaskIds = new Set([
  ...vocabulary.map(item => `vocabulary:${item.id}`),
  ...kanji.map(item => `kanji:${item.id}`),
  ...grammar.map(item => `grammar:${item.id}`),
  ...readings.map(item => `reading:${item.id}`),
  ...listening.map(item => `listening:${item.id}`),
  ...topics.map(item => `topic:${item.id}`),
  ...Array.from({ length: 6 }, (_, index) => `week:${index + 1}`),
  ...learningPath.flatMap(path => path.units.flatMap(unit => unit.lessons.map(lesson => `path:${lesson.id}`))),
]);

export function isCompletableTaskId(taskId: string): boolean {
  return completableTaskIds.has(taskId);
}

/** Checkmarks are learner choices, separate from assessed scores and review mastery. */
export function setTaskCompleted(progress: Progress, taskId: string, completed: boolean): Progress {
  if (!isCompletableTaskId(taskId)) throw new Error('Unknown completion task.');
  if (typeof completed !== 'boolean') throw new Error('Completion must be true or false.');
  const tasks = progress.completedTasks ?? [];
  if (tasks.includes(taskId) === completed) return progress;
  return { ...progress, completedTasks: completed ? [...tasks, taskId] : tasks.filter(id => id !== taskId) };
}

function shuffle<T>(source: readonly T[], random: () => number): T[] {
  const result = [...source];
  for (let index = result.length - 1; index > 0; index--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random value must be between 0 and 1.');
    const other = Math.floor(value * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

interface PracticeStat { total: number; correct: number; lastAt: number; lastCorrect: boolean }

/** Select within the caller's filters before createAttempt shuffles the chosen set. */
export function selectPracticeQuestions(
  progress: Progress,
  pool: Question[],
  options: { count?: number; now?: number; random?: () => number } = {},
): Question[] {
  const now = options.now ?? Date.now();
  const requested = options.count ?? pool.length;
  if (!Number.isFinite(now) || !Number.isInteger(requested) || requested < 0) throw new Error('Practice selection needs a valid count and time.');
  const unique = [...new Map(pool.map(question => [question.id, question])).values()];
  const count = Math.min(requested, unique.length);
  if (count === 0) return [];
  const random = options.random ?? Math.random;
  const questionMap = new Map([...questions, ...unique].map(question => [question.id, question]));
  const byQuestion = new Map<string, PracticeStat>();
  const byGrammar = new Map<string, PracticeStat>();
  const byVocabulary = new Map<string, PracticeStat>();
  const byType = new Map<string, PracticeStat>();
  const bySkill = new Map<string, PracticeStat>();
  function record(group: Map<string, PracticeStat>, key: string | undefined, correct: boolean, at: number) {
    if (!key) return;
    const previous = group.get(key);
    group.set(key, {
      total: (previous?.total ?? 0) + 1,
      correct: (previous?.correct ?? 0) + Number(correct),
      lastAt: Math.max(previous?.lastAt ?? -Infinity, at),
      lastCorrect: previous && previous.lastAt > at ? previous.lastCorrect : correct,
    });
  }
  // Checked answers in an unfinished session are deliberately not evidence.
  for (const attempt of progress.attempts) {
    if (attempt.status !== 'submitted' && attempt.status !== 'reviewed') continue;
    const parsed = Date.parse(attempt.submittedAt ?? attempt.createdAt);
    const at = Number.isFinite(parsed) ? parsed : 0;
    for (const id of attempt.questionOrder) {
      const question = questionMap.get(id);
      if (!question || attempt.excludedIds.includes(id) || (question.skill === 'listening' && attempt.listeningAccess !== 'audio')) continue;
      const correct = attempt.answers[id] === question.correctOptionId;
      record(byQuestion, id, correct, at);
      record(byGrammar, question.grammarId, correct, at);
      record(byVocabulary, question.vocabularyId, correct, at);
      record(byType, question.questionType, correct, at);
      record(bySkill, question.skill, correct, at);
    }
  }
  const shuffled = shuffle(unique, random);
  const due = (question: Question) => {
    const review = progress.reviews[question.id];
    return review && !review.mastered && Date.parse(review.dueAt) <= now ? review : undefined;
  };
  if (byQuestion.size === 0 && !shuffled.some(question => due(question))) {
    // Start a mixed course with breadth instead of consuming one large skill bank.
    const groups = new Map<string, Question[]>();
    for (const question of shuffled) {
      const group = groups.get(question.skill) ?? [];
      group.push(question);
      groups.set(question.skill, group);
    }
    const skills = shuffle([...groups.keys()], random);
    const selected: Question[] = [];
    for (let round = 0; selected.length < count; round++) {
      for (const skill of skills) {
        const question = groups.get(skill)?.[round];
        if (question) selected.push(question);
        if (selected.length === count) break;
      }
    }
    return selected;
  }
  // A smoothed signal reduces the influence of a single result. Strong assessed
  // areas receive a negative signal; an unseen area starts neutral.
  const weakness = (stat: PracticeStat | undefined) => stat ? (stat.total - 2 * stat.correct) / (stat.total + 2) : 0;
  const recentWindow = 30 * 24 * 60 * 60 * 1000;
  const ranked = shuffled.map((question, index) => {
    const review = due(question);
    const stat = byQuestion.get(question.id);
    const recentMiss = stat && !stat.lastCorrect && Math.max(0, now - stat.lastAt) <= recentWindow;
    return {
      question, index,
      tier: review ? 3 : recentMiss ? 2 : 1,
      urgency: review ? now - Date.parse(review.dueAt) : recentMiss ? stat.lastAt : 0,
      weakness: 5 * weakness(stat)
        + 4 * weakness(byGrammar.get(question.grammarId ?? ''))
        + 4 * weakness(byVocabulary.get(question.vocabularyId ?? ''))
        + 2 * weakness(byType.get(question.questionType ?? ''))
        + weakness(bySkill.get(question.skill)),
    };
  }).sort((a, b) => b.tier - a.tier || b.urgency - a.urgency || b.weakness - a.weakness || a.index - b.index);
  const selected = ranked.slice(0, count).map(item => item.question);
  if (count >= 3 && !selected.some(question => !byQuestion.has(question.id))) {
    const unseen = ranked.find(item => !byQuestion.has(item.question.id));
    if (unseen) selected[count - 1] = unseen.question;
  }
  return selected;
}

export function createAttempt(
  pool: Question[],
  type: Attempt['type'],
  options: { count?: number; durationMinutes?: number; isRetry?: boolean; listeningAccess?: 'audio' | 'script' | null; now?: number; random?: () => number } = {},
): Attempt {
  const now = options.now ?? Date.now();
  const count = options.count ?? pool.length;
  if (!Number.isFinite(now) || !Number.isInteger(count) || count < 1 || pool.length === 0) throw new Error('An attempt needs questions and a valid start time.');
  if (options.durationMinutes !== undefined && (!Number.isFinite(options.durationMinutes) || options.durationMinutes <= 0)) throw new Error('The time limit must be positive.');
  if (new Set(pool.map(question => question.id)).size !== pool.length) throw new Error('Question IDs must be unique.');
  const random = options.random ?? Math.random;
  const selected = shuffle(pool, random).slice(0, count);
  const optionOrders: Record<string, string[]> = {};
  for (const question of selected) {
    const ids = question.options.map(option => option.id);
    if (ids.length < 2 || new Set(ids).size !== ids.length || !ids.includes(question.correctOptionId)) throw new Error(`Invalid options for ${question.id}.`);
    optionOrders[question.id] = shuffle(ids, random);
  }
  return {
    id: makeId('attempt', now), type, status: 'in-progress',
    questionOrder: selected.map(question => question.id), optionOrders,
    answers: {}, checkedIds: [], excludedIds: [], createdAt: new Date(now).toISOString(),
    deadline: options.durationMinutes === undefined ? null : now + options.durationMinutes * 60_000,
    isRetry: options.isRetry ?? type === 'review', listeningAccess: options.listeningAccess ?? null,
  };
}

// These are authored practice counts, not a claim about any historical paper.
// Section times follow the current official N5–N1 test schedule.
export const MOCK_SECTION_TITLES = ['Vocabulary & kanji', 'Grammar & reading', 'Listening'] as const;
export const MOCK_SECTION_IDS = ['vocabulary', 'grammar-reading', 'listening'] as const;
export const FULL_MOCK_CONFIG = {
  n5: { minutes: [20, 40, 30], counts: [35, 32, 24], readingCount: 12, sectionIds: MOCK_SECTION_IDS, sectionTitles: MOCK_SECTION_TITLES },
  n4: { minutes: [25, 55, 35], counts: [35, 35, 28], readingCount: 12, sectionIds: MOCK_SECTION_IDS, sectionTitles: MOCK_SECTION_TITLES },
  n3: { minutes: [30, 70, 40], counts: [35, 39, 28], readingCount: 16, sectionIds: MOCK_SECTION_IDS, sectionTitles: MOCK_SECTION_TITLES },
  n2: { minutes: [105, 50], counts: [75, 32], readingCount: 16, vocabularyCount: 35, sectionIds: ['language-reading', 'listening'], sectionTitles: ['Language knowledge & reading', 'Listening'] },
  n1: { minutes: [110, 55], counts: [71, 30], readingCount: 16, vocabularyCount: 35, sectionIds: ['language-reading', 'listening'], sectionTitles: ['Language knowledge & reading', 'Listening'] },
} as const;

export function mockSection(attempt: Attempt): MockSection | undefined {
  return attempt.mock?.sections[attempt.mock.currentSection];
}

/** Build every section before starting, so later deadlines never reshuffle questions. */
export function createFullMockAttempt(
  level: JLPTLevel,
  pool: Question[] = questions,
  options: { now?: number; random?: () => number; listeningAccess?: 'audio' | 'script' } = {},
): Attempt {
  const config = FULL_MOCK_CONFIG[level];
  if (!Object.hasOwn(FULL_MOCK_CONFIG, level)) throw new Error('Choose a level from N5 to N1 for a full mock.');
  const now = options.now ?? Date.now();
  const random = options.random ?? Math.random;
  const levelPool = pool.filter(question => (question.jlptLevel ?? 'n3') === level);
  if (new Set(levelPool.map(question => question.id)).size !== levelPool.length) throw new Error('Question IDs must be unique.');
  const pick = (skills: Question['skill'][], count: number): Question[] => {
    const eligible = levelPool.filter(question => skills.includes(question.skill));
    if (eligible.length < count) throw new Error(`${level.toUpperCase()} needs ${count} original ${skills.join('/')} questions for this full mock; only ${eligible.length} are available.`);
    // Round-robin question types keeps a large reading or grammar-form bank
    // from crowding the other available formats out of an original test.
    const groups = new Map<string, Question[]>();
    for (const question of shuffle(eligible, random)) {
      const key = question.questionType ?? question.skill;
      const group = groups.get(key) ?? []; group.push(question); groups.set(key, group);
    }
    const keys = shuffle([...groups.keys()], random);
    const chosen: Question[] = [];
    for (let round = 0; chosen.length < count; round++) {
      for (const key of keys) {
        const question = groups.get(key)?.[round];
        if (question) chosen.push(question);
        if (chosen.length === count) break;
      }
    }
    return chosen;
  };
  const selectedSections = 'vocabularyCount' in config ? [
    [...pick(['vocabulary', 'kanji'], config.vocabularyCount), ...pick(['grammar'], config.counts[0] - config.vocabularyCount - config.readingCount), ...pick(['reading'], config.readingCount)],
    pick(['listening'], config.counts[1]),
  ] : [
    pick(['vocabulary', 'kanji'], config.counts[0]),
    [...pick(['grammar'], config.counts[1] - config.readingCount), ...pick(['reading'], config.readingCount)],
    pick(['listening'], config.counts[2]),
  ];
  const attempt = createAttempt(selectedSections.flat(), 'mock', { now, random, listeningAccess: options.listeningAccess ?? 'audio' });
  const sections: MockSection[] = selectedSections.map((selected, index) => ({
    id: config.sectionIds[index], title: config.sectionTitles[index],
    durationMinutes: config.minutes[index], questionIds: selected.map(question => question.id),
    status: index === 0 ? 'in-progress' : 'pending',
    ...(index === 0 ? { startedAt: attempt.createdAt, deadline: now + config.minutes[0] * 60_000 } : {}),
  }));
  return { ...attempt, questionOrder: sections.flatMap(section => section.questionIds), deadline: sections[0].deadline!, mock: { level, currentSection: 0, sections } };
}

function replaceAttempt(progress: Progress, replacement: Attempt): Progress {
  return { ...progress, attempts: progress.attempts.map(attempt => attempt.id === replacement.id ? replacement : attempt) };
}

export function remainingSeconds(attempt: Attempt, now = Date.now()): number | null {
  if (attempt.deadline === null) return null;
  return Math.max(0, Math.ceil((attempt.deadline - now) / 1000));
}

function acceptsAnswers(attempt: Attempt | undefined): attempt is Attempt {
  return !!attempt && attempt.status === 'in-progress'
    && (!attempt.mock || mockSection(attempt)?.status === 'in-progress')
    && (attempt.deadline === null || Date.now() < attempt.deadline);
}

export function selectAnswer(progress: Progress, attemptId: string, questionId: string, optionId: string): Progress {
  const attempt = progress.attempts.find(item => item.id === attemptId);
  if (!acceptsAnswers(attempt) || (attempt.mock && !mockSection(attempt)?.questionIds.includes(questionId)) || attempt.checkedIds.includes(questionId) || attempt.excludedIds.includes(questionId) || !attempt.optionOrders[questionId]?.includes(optionId)) return progress;
  return replaceAttempt(progress, { ...attempt, answers: { ...attempt.answers, [questionId]: optionId } });
}

export function checkAnswer(progress: Progress, attemptId: string, questionId: string): Progress {
  const attempt = progress.attempts.find(item => item.id === attemptId);
  if (!acceptsAnswers(attempt) || attempt.type === 'mock' || !attempt.answers[questionId] || attempt.checkedIds.includes(questionId) || attempt.excludedIds.includes(questionId)) return progress;
  return replaceAttempt(progress, { ...attempt, checkedIds: [...attempt.checkedIds, questionId] });
}

export function excludeQuestion(progress: Progress, attemptId: string, questionId: string): Progress {
  const attempt = progress.attempts.find(item => item.id === attemptId);
  if (!acceptsAnswers(attempt) || (attempt.mock && (!mockSection(attempt)?.questionIds.includes(questionId) || questions.find(question => question.id === questionId)?.skill !== 'listening')) || !attempt.questionOrder.includes(questionId) || attempt.excludedIds.includes(questionId)) return progress;
  return replaceAttempt(progress, { ...attempt, excludedIds: [...attempt.excludedIds, questionId] });
}

/** Freeze a section without releasing answers or recording review outcomes. */
export function finishMockSection(progress: Progress, attemptId: string, questionMap: Record<string, Question>, now = Date.now()): Progress {
  const attempt = progress.attempts.find(item => item.id === attemptId);
  const section = attempt && mockSection(attempt);
  if (!attempt?.mock || attempt.status !== 'in-progress' || section?.status !== 'in-progress') return progress;
  const finishedAt = Math.min(now, section.deadline!);
  if (!Number.isFinite(finishedAt) || finishedAt < Date.parse(section.startedAt!)) throw new Error('The section submission time is invalid.');
  const sections = attempt.mock.sections.map((item, index) => index === attempt.mock!.currentSection
    ? { ...item, status: 'submitted' as const, submittedAt: new Date(finishedAt).toISOString() } : item);
  const next = replaceAttempt(progress, { ...attempt, deadline: null, mock: { ...attempt.mock, sections } });
  return sections.every(item => item.status === 'submitted') ? submitAttempt(next, attemptId, questionMap, finishedAt) : next;
}

/** Breaks are explicit; a pending section has no running clock until Continue. */
export function startNextMockSection(progress: Progress, attemptId: string, now = Date.now()): Progress {
  const attempt = progress.attempts.find(item => item.id === attemptId);
  const current = attempt && mockSection(attempt);
  if (!attempt?.mock || attempt.status !== 'in-progress' || current?.status !== 'submitted') return progress;
  const index = attempt.mock.currentSection + 1;
  const section = attempt.mock.sections[index];
  if (!section || section.status !== 'pending') return progress;
  if (!Number.isFinite(now) || now < Date.parse(current.submittedAt!)) throw new Error('The next section start time is invalid.');
  const deadline = now + section.durationMinutes * 60_000;
  const sections = attempt.mock.sections.map((item, i) => i === index ? { ...item, status: 'in-progress' as const, startedAt: new Date(now).toISOString(), deadline } : item);
  return replaceAttempt(progress, { ...attempt, deadline, mock: { ...attempt.mock, currentSection: index, sections } });
}

/** Deadline enforcement is safe on reload and repeat ticks, including breaks. */
export function expireAttempt(progress: Progress, attemptId: string, questionMap: Record<string, Question>, now = Date.now()): Progress {
  const attempt = progress.attempts.find(item => item.id === attemptId);
  if (!attempt || attempt.status !== 'in-progress' || attempt.deadline === null || now < attempt.deadline) return progress;
  return attempt.mock ? finishMockSection(progress, attemptId, questionMap, now) : submitAttempt(progress, attemptId, questionMap, now);
}

export function gradeAttempt(attempt: Attempt, questionMap: Record<string, Question>): Grade {
  const result: Grade = { correct: 0, total: 0, unanswered: 0, excluded: 0, skills: {}, items: [] };
  for (const questionId of attempt.questionOrder) {
    const question = questionMap[questionId];
    if (!question) throw new Error(`Unknown question: ${questionId}.`);
    const selectedOptionId = attempt.answers[questionId];
    const excluded = attempt.excludedIds.includes(questionId) || (question.skill === 'listening' && attempt.listeningAccess !== 'audio');
    const unanswered = !selectedOptionId;
    const correct = !excluded && selectedOptionId === question.correctOptionId;
    result.items.push({ questionId, selectedOptionId, correct, unanswered, excluded });
    if (excluded) { result.excluded++; continue; }
    result.total++;
    if (unanswered) result.unanswered++;
    if (correct) result.correct++;
    const skill = result.skills[question.skill] ?? { correct: 0, total: 0 };
    skill.total++;
    if (correct) skill.correct++;
    result.skills[question.skill] = skill;
  }
  return result;
}

export interface AccuracyBucket {
  correct: number;
  total: number;
  skills: Grade['skills'];
}

/** A question's first assessed submission counts as initial; all later answers are retries. */
export function aggregateAccuracy(progress: Progress, questionMap: Record<string, Question>): { initial: AccuracyBucket; retry: AccuracyBucket } {
  const result = {
    initial: { correct: 0, total: 0, skills: {} } as AccuracyBucket,
    retry: { correct: 0, total: 0, skills: {} } as AccuracyBucket,
  };
  const seen = new Set<string>();
  const completed = progress.attempts
    .filter(attempt => attempt.status === 'submitted' || attempt.status === 'reviewed')
    .sort((a, b) => Date.parse(a.submittedAt ?? a.createdAt) - Date.parse(b.submittedAt ?? b.createdAt));
  for (const attempt of completed) {
    for (const item of gradeAttempt(attempt, questionMap).items) {
      if (item.excluded) continue;
      const bucket = seen.has(item.questionId) ? result.retry : result.initial;
      seen.add(item.questionId);
      bucket.total++;
      if (item.correct) bucket.correct++;
      const skill = questionMap[item.questionId].skill;
      const score = bucket.skills[skill] ?? { correct: 0, total: 0 };
      score.total++;
      if (item.correct) score.correct++;
      bucket.skills[skill] = score;
    }
  }
  return result;
}

function afterLocalDays(now: number, days: number): string {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function submitAttempt(progress: Progress, attemptId: string, questionMap: Record<string, Question>, now = Date.now()): Progress {
  const attempt = progress.attempts.find(item => item.id === attemptId);
  if (!attempt || attempt.status === 'submitted' || attempt.status === 'reviewed') return progress;
  if (attempt.mock && attempt.mock.sections.some(section => section.status !== 'submitted')) return finishMockSection(progress, attemptId, questionMap, now);
  const submittedAt = new Date(now).toISOString();
  const grade = gradeAttempt(attempt, questionMap);
  const reviews = { ...progress.reviews };
  for (const item of grade.items) {
    if (item.excluded) continue;
    const previous = reviews[item.questionId];
    if (!item.correct) {
      const record: ReviewRecord = {
        questionId: item.questionId, lastAnswerId: item.selectedOptionId ?? null,
        firstMissedAt: previous?.firstMissedAt ?? submittedAt, lastMissedAt: submittedAt,
        dueAt: afterLocalDays(now, REVIEW_INTERVAL_DAYS[0]), streak: 0, mastered: false,
      };
      if (attempt.isRetry) record.lastReviewedAt = submittedAt;
      else if (previous?.lastReviewedAt) record.lastReviewedAt = previous.lastReviewedAt;
      reviews[item.questionId] = record;
    } else if (previous && attempt.isRetry) {
      if (now >= Date.parse(previous.dueAt) && !previous.mastered) {
        const streak = Math.min(previous.streak + 1, 3);
        reviews[item.questionId] = {
          ...previous, streak, mastered: streak === 3, lastReviewedAt: submittedAt,
          dueAt: afterLocalDays(now, REVIEW_INTERVAL_DAYS[Math.min(streak, 2)]),
        };
      } else {
        reviews[item.questionId] = { ...previous, lastReviewedAt: submittedAt };
      }
    }
  }
  return {
    ...replaceAttempt(progress, { ...attempt, status: 'submitted', submittedAt }), reviews,
  };
}

export function markReviewed(progress: Progress, attemptId: string): Progress {
  const attempt = progress.attempts.find(item => item.id === attemptId);
  return attempt?.status === 'submitted'
    ? { ...replaceAttempt(progress, { ...attempt, status: 'reviewed' }), activeAttemptId: progress.activeAttemptId === attemptId ? null : progress.activeAttemptId }
    : progress;
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function markStudied(progress: Progress, type: StudyEvent['type'], contentId: string, now = Date.now()): Progress {
  const day = localDateKey(new Date(now));
  if (progress.studyEvents.some(event => event.type === type && event.contentId === contentId && localDateKey(new Date(event.at)) === day)) return progress;
  return { ...progress, studyEvents: [...progress.studyEvents, { id: makeId('study', now), at: new Date(now).toISOString(), type, contentId }] };
}
