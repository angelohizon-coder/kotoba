import { CONTENT_VERSION, grammar, kanji, learningPath, listening, questions, readings, vocabulary } from '../content';
import type { Attempt, FullMock, MockSection, Progress, ReviewRecord, StudyEvent } from '../types';
import { DASHBOARD_WIDGET_IDS, DEFAULT_DASHBOARD_WIDGETS, FULL_MOCK_CONFIG, initialProgress, isCompletableTaskId } from './engine';
import { srsKey, validateSrsRecord } from './sm2';
import { validateStudyPreferences } from './preferences';
import { validateLearnLab } from './learnlab';
import { validateMotivation } from './motivation';

export const STORAGE_KEY = 'kotoba-n3-progress';

function fail(message: string): never { throw new Error(`Invalid progress: ${message}`); }
function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return fail(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function string(value: unknown, label: string, allowEmpty = false, maxLength = 200): string {
  if (typeof value !== 'string' || value.length > maxLength || (!allowEmpty && value.length === 0)) return fail(`${label} must be a valid string.`);
  return value;
}
function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') return fail(`${label} must be true or false.`);
  return value;
}
function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return fail(`${label} is out of range.`);
  return value;
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > 100_000) return fail(`${label} must be a valid array.`);
  return value;
}
function uniqueStrings(value: unknown, label: string): string[] {
  const result = array(value, label).map(item => string(item, label));
  if (new Set(result).size !== result.length) return fail(`${label} contains duplicate IDs.`);
  return result;
}
function enumValue<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) return fail(`${label} is not supported.`);
  return value as T;
}
const minDate = Date.UTC(1970, 0, 1);
const maxDate = Date.UTC(2200, 0, 1);
function timestamp(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minDate || value >= maxDate) return fail(`${label} is not a valid timestamp.`);
  return value;
}
function isoDate(value: unknown, label: string): string {
  const result = string(value, label);
  const parsed = Date.parse(result);
  timestamp(parsed, label);
  if (new Date(parsed).toISOString() !== result) return fail(`${label} must be an ISO date.`);
  return result;
}
function known(id: string, ids: Set<string>, label: string): string {
  if (!ids.has(id)) return fail(`${label} references unknown content.`);
  return id;
}

/** Validates first, then returns a clean object; callers replace progress only on success. */
export function validateProgress(input: unknown): Progress {
  const data = object(input, 'progress');
  if (data.schemaVersion !== 1) return fail('this schema version is not supported.');
  const releases = ['2026.10.1', '2026.10.2', '2026.10.3', '2026.10.4', '2026.10.5'];
  const savedRelease = typeof data.contentVersion === 'string' ? releases.indexOf(data.contentVersion) : -1;
  const compatibleLegacyVersion = savedRelease >= 0 && savedRelease < releases.indexOf(CONTENT_VERSION);
  if (data.contentVersion !== CONTENT_VERSION && !compatibleLegacyVersion) return fail('this content version does not match the installed course content.');
  const questionMap = new Map(questions.map(question => [question.id, question]));
  const questionIds = new Set(questionMap.keys());
  const vocabularyIds = new Set(vocabulary.map(item => item.id));
  const grammarIds = new Set(grammar.map(item => item.id));
  const kanjiIds = new Set(kanji.map(item => item.id));
  const contentIds = new Set([...vocabularyIds, ...grammarIds, ...kanjiIds, ...readings.map(item => item.id), ...listening.map(item => item.id)]);
  const settings = object(data.settings, 'settings');
  const pathLessonIds = new Set(learningPath.flatMap(path => path.units.flatMap(unit => unit.lessons.map(lesson => lesson.id))));
  const pathResume = settings.pathResume === undefined || settings.pathResume === null ? null : known(string(settings.pathResume, 'path resume lesson'), pathLessonIds, 'path resume lesson');
  const studyLevel = settings.studyLevel === undefined ? 'n3' : enumValue(settings.studyLevel, ['n5', 'n4', 'n3', 'n2', 'n1', 'all'] as const, 'study level setting');
  const dashboardWidgets = uniqueStrings(settings.dashboardWidgets === undefined ? [...DEFAULT_DASHBOARD_WIDGETS] : settings.dashboardWidgets, 'dashboard widgets').map(id => enumValue(id, DASHBOARD_WIDGET_IDS, 'dashboard widget'));
  const speechStyle = settings.speechStyle === undefined ? 'natural' : enumValue(settings.speechStyle, ['natural', 'bright', 'calm', 'deep'] as const, 'speech style setting');
  const speechVoice = settings.speechVoice === undefined ? '' : string(settings.speechVoice, 'speech voice setting', true, 300);
  const examDate = string(settings.examDate, 'exam date', true);
  if (examDate !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(examDate) || !Number.isFinite(Date.parse(`${examDate}T00:00:00.000Z`)) || new Date(`${examDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== examDate || Date.parse(examDate) < minDate || Date.parse(examDate) >= maxDate)) return fail('exam date must be a real calendar date.');
  const bookmarks = uniqueStrings(data.bookmarks, 'bookmarks').map(id => known(id, contentIds, 'bookmark'));
  const completedTasks = uniqueStrings(data.completedTasks === undefined ? [] : data.completedTasks, 'completed tasks').map(id => {
    if (!isCompletableTaskId(id)) return fail('completed task references unknown content or a week outside 1–6.');
    return id;
  });
  const attemptIds = new Set<string>();
  const attempts: Attempt[] = array(data.attempts, 'attempts').map((raw, index) => {
    const item = object(raw, `attempt ${index + 1}`);
    const id = string(item.id, 'attempt ID');
    if (attemptIds.has(id)) return fail('attempt IDs must be unique.');
    attemptIds.add(id);
    const type = enumValue(item.type, ['practice', 'mock', 'reading', 'listening', 'review'] as const, 'attempt type');
    const status = enumValue(item.status, ['ready', 'in-progress', 'submitted', 'reviewed'] as const, 'attempt status');
    const questionOrder = uniqueStrings(item.questionOrder, 'question order');
    if (questionOrder.length === 0 || questionOrder.some(questionId => !questionMap.has(questionId))) return fail('attempt contains an unknown or empty question list.');
    const orderData = object(item.optionOrders, 'option orders');
    if (Object.keys(orderData).length !== questionOrder.length || Object.keys(orderData).some(key => !questionOrder.includes(key))) return fail('option orders do not match the questions.');
    const optionOrders: Record<string, string[]> = {};
    for (const questionId of questionOrder) {
      const canonicalIds = questionMap.get(questionId)!.options.map(option => option.id);
      const order = uniqueStrings(orderData[questionId], 'option order');
      if (order.length !== canonicalIds.length || order.some(optionId => !canonicalIds.includes(optionId))) return fail('option order must be a permutation of the canonical options.');
      optionOrders[questionId] = order;
    }
    const answers: Record<string, string> = {};
    for (const [questionId, answer] of Object.entries(object(item.answers, 'answers'))) {
      const optionId = string(answer, 'answer ID');
      if (!questionOrder.includes(questionId) || !optionOrders[questionId].includes(optionId)) return fail('answer references an unknown question or option.');
      answers[questionId] = optionId;
    }
    const checkedIds = uniqueStrings(item.checkedIds, 'checked questions');
    const excludedIds = uniqueStrings(item.excludedIds, 'excluded questions');
    if ([...checkedIds, ...excludedIds].some(questionId => !questionOrder.includes(questionId))) return fail('checked or excluded question is not in the attempt.');
    if (checkedIds.some(questionId => !answers[questionId]) || (type === 'mock' && checkedIds.length > 0)) return fail('checked questions are inconsistent with the answers or mode.');
    const createdAt = isoDate(item.createdAt, 'created date');
    const deadline = item.deadline === null ? null : timestamp(item.deadline, 'deadline');
    if (deadline !== null && deadline <= Date.parse(createdAt)) return fail('deadline must follow the start time.');
    const submittedAt = item.submittedAt === undefined ? undefined : isoDate(item.submittedAt, 'submission date');
    const completed = status === 'submitted' || status === 'reviewed';
    if (completed !== (submittedAt !== undefined) || (submittedAt && Date.parse(submittedAt) < Date.parse(createdAt))) return fail('submission date does not match the attempt status.');
    if (status === 'ready' && (Object.keys(answers).length > 0 || checkedIds.length > 0)) return fail('a ready attempt cannot contain answers.');
    const isRetry = bool(item.isRetry, 'retry flag');
    if (type === 'review' && !isRetry) return fail('review attempts must be marked as retries.');
    const listeningAccess = item.listeningAccess === null ? null : enumValue(item.listeningAccess, ['audio', 'script'] as const, 'listening access');
    let mock: FullMock | undefined;
    if (item.mock !== undefined) {
      if (type !== 'mock' || status === 'ready' || isRetry || listeningAccess === null) return fail('full mock metadata does not match the attempt mode.');
      if (excludedIds.some(questionId => questionMap.get(questionId)!.skill !== 'listening')) return fail('only listening audio or transcript issues may be excluded from a full mock.');
      const source = object(item.mock, 'full mock');
      const level = enumValue(source.level, ['n5', 'n4', 'n3', 'n2', 'n1'] as const, 'mock level');
      const config = FULL_MOCK_CONFIG[level];
      const currentSection = integer(source.currentSection, 'current mock section', 0, config.counts.length - 1);
      const rawSections = array(source.sections, 'mock sections');
      if (rawSections.length !== config.counts.length) return fail(`a full ${level.toUpperCase()} mock must contain all ${config.counts.length} sections.`);
      const sections: MockSection[] = rawSections.map((rawSection, sectionIndex) => {
        const section = object(rawSection, 'mock section');
        const sectionId = config.sectionIds[sectionIndex];
        if (section.id !== sectionId || section.title !== config.sectionTitles[sectionIndex] || section.durationMinutes !== config.minutes[sectionIndex]) return fail('mock section identity or duration is invalid.');
        const questionIds = uniqueStrings(section.questionIds, 'mock section questions');
        if (questionIds.length !== config.counts[sectionIndex]) return fail('mock section question count is invalid.');
        const skills = sectionId === 'language-reading' ? ['vocabulary', 'kanji', 'grammar', 'reading'] : sectionId === 'vocabulary' ? ['vocabulary', 'kanji'] : sectionId === 'grammar-reading' ? ['grammar', 'reading'] : ['listening'];
        if (questionIds.some(questionId => {
          const question = questionMap.get(questionId);
          return !question || !questionOrder.includes(questionId) || !skills.includes(question.skill) || (question.jlptLevel ?? 'n3') !== level;
        })) return fail('mock section contains questions from another level or section.');
        if (sectionId === 'grammar-reading' || sectionId === 'language-reading') {
          if (questionIds.filter(questionId => questionMap.get(questionId)!.skill === 'reading').length !== config.readingCount) return fail('the full mock must include its grammar and reading balance.');
          if ('vocabularyCount' in config && questionIds.filter(questionId => ['vocabulary', 'kanji'].includes(questionMap.get(questionId)!.skill)).length !== config.vocabularyCount) return fail('the combined mock section must include its vocabulary balance.');
        }
        const sectionStatus = enumValue(section.status, ['pending', 'in-progress', 'submitted'] as const, 'mock section status');
        if (sectionIndex < currentSection && sectionStatus !== 'submitted' || sectionIndex > currentSection && sectionStatus !== 'pending' || sectionIndex === currentSection && sectionStatus === 'pending') return fail('mock section progression is inconsistent.');
        const startedAt = section.startedAt === undefined ? undefined : isoDate(section.startedAt, 'section start date');
        const sectionDeadline = section.deadline === undefined ? undefined : timestamp(section.deadline, 'section deadline');
        const sectionSubmittedAt = section.submittedAt === undefined ? undefined : isoDate(section.submittedAt, 'section submission date');
        if (sectionStatus === 'pending') {
          if (startedAt !== undefined || sectionDeadline !== undefined || sectionSubmittedAt !== undefined || questionIds.some(questionId => answers[questionId])) return fail('a pending mock section cannot contain time or answer data.');
        } else {
          if (startedAt === undefined || sectionDeadline === undefined || sectionDeadline !== Date.parse(startedAt) + config.minutes[sectionIndex] * 60_000 || Date.parse(startedAt) < Date.parse(createdAt)) return fail('mock section deadline must match its start and duration.');
          if (sectionIndex === 0 && startedAt !== createdAt) return fail('the first mock section must start with the attempt.');
          if ((sectionStatus === 'submitted') !== (sectionSubmittedAt !== undefined) || sectionSubmittedAt && (Date.parse(sectionSubmittedAt) < Date.parse(startedAt) || Date.parse(sectionSubmittedAt) > sectionDeadline)) return fail('mock section submission date is inconsistent.');
        }
        return { id: sectionId, title: config.sectionTitles[sectionIndex], durationMinutes: config.minutes[sectionIndex], questionIds, status: sectionStatus, ...(startedAt !== undefined ? { startedAt } : {}), ...(sectionDeadline !== undefined ? { deadline: sectionDeadline } : {}), ...(sectionSubmittedAt !== undefined ? { submittedAt: sectionSubmittedAt } : {}) };
      });
      const flattened = sections.flatMap(section => section.questionIds);
      if (new Set(flattened).size !== flattened.length || flattened.length !== questionOrder.length || flattened.some((questionId, i) => questionId !== questionOrder[i])) return fail('mock sections must partition the ordered questions exactly once.');
      for (let sectionIndex = 1; sectionIndex < sections.length; sectionIndex++) {
        const previous = sections[sectionIndex - 1]; const section = sections[sectionIndex];
        if (section.startedAt && (!previous.submittedAt || Date.parse(section.startedAt) < Date.parse(previous.submittedAt))) return fail('mock section start precedes its previous submission.');
      }
      const current = sections[currentSection];
      const allSubmitted = sections.every(section => section.status === 'submitted');
      if (completed !== allSubmitted || completed && currentSection !== sections.length - 1 || deadline !== (current.status === 'in-progress' ? current.deadline : null) || completed && submittedAt !== current.submittedAt) return fail('full mock attempt status or deadline does not match its sections.');
      mock = { level, currentSection, sections };
    }
    return { id, type, status, questionOrder, optionOrders, answers, checkedIds, excludedIds, createdAt, deadline, ...(submittedAt ? { submittedAt } : {}), isRetry, listeningAccess, ...(mock ? { mock } : {}) };
  });
  const reviews: Record<string, ReviewRecord> = {};
  for (const [questionId, raw] of Object.entries(object(data.reviews, 'reviews'))) {
    const item = object(raw, 'review record');
    const question = questionMap.get(questionId);
    if (!question || item.questionId !== questionId) return fail('review references an unknown or mismatched question.');
    const lastAnswerId = item.lastAnswerId === null ? null : string(item.lastAnswerId, 'missed answer');
    if (lastAnswerId !== null && (!question.options.some(option => option.id === lastAnswerId) || lastAnswerId === question.correctOptionId)) return fail('missed answer must be a canonical incorrect option.');
    const firstMissedAt = isoDate(item.firstMissedAt, 'first missed date');
    const lastMissedAt = isoDate(item.lastMissedAt, 'last missed date');
    const dueAt = isoDate(item.dueAt, 'review due date');
    const lastReviewedAt = item.lastReviewedAt === undefined ? undefined : isoDate(item.lastReviewedAt, 'last review date');
    if (Date.parse(lastMissedAt) < Date.parse(firstMissedAt) || Date.parse(dueAt) < Date.parse(lastMissedAt) || (lastReviewedAt && Date.parse(lastReviewedAt) < Date.parse(firstMissedAt))) return fail('review dates are inconsistent.');
    const streak = integer(item.streak, 'review streak', 0, 3);
    const mastered = bool(item.mastered, 'mastery flag');
    if (mastered !== (streak === 3)) return fail('mastery requires three consecutive due correct retries.');
    reviews[questionId] = { questionId, lastAnswerId, firstMissedAt, lastMissedAt, dueAt, streak, mastered, ...(lastReviewedAt ? { lastReviewedAt } : {}) };
  }
  const eventIds = new Set<string>();
  const studyEvents: StudyEvent[] = array(data.studyEvents, 'study events').map(raw => {
    const item = object(raw, 'study event');
    const id = string(item.id, 'study event ID');
    if (eventIds.has(id)) return fail('study event IDs must be unique.');
    eventIds.add(id);
    const type = enumValue(item.type, ['vocabulary', 'grammar', 'kanji'] as const, 'study event type');
    const contentId = string(item.contentId, 'studied content ID');
    known(contentId, type === 'vocabulary' ? vocabularyIds : type === 'grammar' ? grammarIds : kanjiIds, 'study event');
    return { id, type, contentId, at: isoDate(item.at, 'study date') };
  });
  const activeAttemptId = data.activeAttemptId === null ? null : string(data.activeAttemptId, 'active attempt');
  if (activeAttemptId !== null && !attempts.some(attempt => attempt.id === activeAttemptId && ['in-progress', 'submitted'].includes(attempt.status))) return fail('active attempt must reference an in-progress or submitted attempt.');
  const srs = data.srs === undefined ? undefined : Object.fromEntries(Object.entries(object(data.srs, 'SRS records')).map(([key, raw]) => {
    let record;
    try {
      record = validateSrsRecord(raw);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'SRS record could not be validated.');
    }
    if (key !== srsKey(record)) return fail('SRS record key does not match its target.');
    known(record.id, record.type === 'vocabulary' ? vocabularyIds : record.type === 'kanji' ? kanjiIds : questionIds, 'SRS target');
    return [key, record];
  }));
  const cleaned: Progress = {
    schemaVersion: 1, contentVersion: CONTENT_VERSION,
    settings: { furigana: bool(settings.furigana, 'furigana setting'), dailyGoal: integer(settings.dailyGoal, 'daily goal', 1, 1000), examDate, theme: settings.theme === undefined ? 'light' : enumValue(settings.theme, ['light', 'dark'] as const, 'theme setting'), soundEffects: settings.soundEffects === undefined ? true : bool(settings.soundEffects, 'sound effects setting'), studyLevel, pathResume, dashboardWidgets, speechStyle, speechVoice, ...(settings.offlineCaching === undefined ? {} : {offlineCaching: bool(settings.offlineCaching, 'offline cache preference')}) },
    bookmarks, completedTasks, attempts, reviews, studyEvents, activeAttemptId, ...(srs === undefined ? {} : { srs }),
  };
  try {
    if (settings.studyPreferences !== undefined) cleaned.settings.studyPreferences = validateStudyPreferences(settings.studyPreferences);
    if (data.learnlab !== undefined) cleaned.learnlab = validateLearnLab(data.learnlab);
    if (data.motivation !== undefined) cleaned.motivation = validateMotivation(data.motivation, cleaned);
  } catch (error) { return fail(error instanceof Error ? error.message : 'Extended study state could not be validated.'); }
  return cleaned;
}

export function loadProgress(): { progress: Progress; warning?: string } {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { progress: initialProgress() };
    try {
      return { progress: validateProgress(JSON.parse(raw)) };
    } catch {
      return { progress: initialProgress(), warning: 'Saved progress could not be validated. The original data has been kept. Download or replace it in Settings before saving new progress.' };
    }
  } catch {
    return { progress: initialProgress(), warning: 'Device storage is unavailable. Progress works in this tab, but cannot be saved until storage is available.' };
  }
}

export function saveProgress(progress: Progress): { saved: boolean; error?: string } {
  try {
    const validated = validateProgress(progress);
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    return { saved: true };
  } catch (error) {
    return { saved: false, error: error instanceof Error && error.message.startsWith('Invalid progress:') ? error.message : 'Progress could not be saved on this device. Storage may be blocked or full. Export a backup in Settings.' };
  }
}
