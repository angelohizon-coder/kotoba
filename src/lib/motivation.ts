import { grammar, kanji, learningPath, questions, vocabulary } from '../content';
import type { Progress } from '../types';
import { initialLearnLab, validateLearnLab } from './learnlab';
import type { LabItem, LabResult, LabSession } from './learnlab';

export type MotivationGoal = 'travel' | 'career' | 'school';
export type MotivationReward = 'freeze' | 'boost' | 'sakura' | 'ocean' | 'sunset';
export type MotivationClaim = 'bronze' | 'silver' | 'gold' | 'chest' | 'monthly' | 'early-bird' | 'night-owl';
export interface MotivationPreferences {
  goal: MotivationGoal; dailyMinutes: number; dailyXP: number; streakGoal: number;
  heartsEnabled: boolean; disableAnimations: boolean; haptics: boolean;
}
export interface MotivationLedgerEntry {
  key: string; kind: 'attempt' | 'study' | 'lesson' | 'lab' | 'review' | 'quest' | 'chest';
  sourceId: string; at: string; day: string; xp: number; coins: number;
  questionIds: string[]; correct: number; perfect: boolean; multiplier: 1 | 2;
  labProof?: LabRewardProof; labConcepts?: string[];
}
/** A retained canonical proof survives the Lab's rolling 40-session history. */
export interface LabRewardProof extends Omit<LabSession, 'createdAt' | 'itemStartedAt' | 'finishedAt' | 'results'> {
  createdAt: string; itemStartedAt: string; finishedAt: string;
  results: (Omit<LabResult, 'at'> & { at: string })[];
}
export interface MotivationPurchase { id: string; reward: MotivationReward; at: string; cost: number }
export interface MotivationState {
  version: 1; enabledAt: string; lastReconciledAt: string; preferences: MotivationPreferences;
  baseline: { attempts: string[]; studies: string[]; lessons: string[]; reviews: string[]; labs?: string[] };
  ledger: MotivationLedgerEntry[]; xp: number; coins: number; purchases: MotivationPurchase[];
  freezesUsed: { day: string; purchaseId: string }[]; lastCalendarDay: string;
  hearts: number; heartsAt: string; boosts: { from: string; until: string; source: string }[];
  studySeconds: Record<string, number>; timeRecordedAt: string;
  claimedBadges: string[]; earnedBadges: string[]; profileBadges: string[];
  cosmetic: string; mascotTaps: number;
}
interface DueEvent { eventId: string; quality: number; reviewedAt: string; previousNextReviewAt?: string }
interface DueRecord { type: string; id: string; events: DueEvent[] }
export type MotivationProgress = Progress & { motivation?: MotivationState; srs?: Record<string, DueRecord> };

export const MOTIVATION_SHOP = [
  { id: 'freeze', title: 'Streak freeze', cost: 40, description: 'Protect one completed missed day. Hold up to two.' },
  { id: 'boost', title: '20-minute XP boost', cost: 60, description: 'Double XP from new eligible learning during a chosen 20-minute window.' },
  { id: 'sakura', title: 'Sakura card', cost: 80, description: 'A pink color for your local motivation cards.' },
  { id: 'ocean', title: 'Ocean card', cost: 80, description: 'A blue color for your local motivation cards.' },
  { id: 'sunset', title: 'Sunset card', cost: 120, description: 'A warm color for your local motivation cards.' },
] as const;
export const DAILY_QUESTS = [
  { id: 'bronze', title: 'Bronze', xp: 20, correct: 5, perfect: 0, coins: 10 },
  { id: 'silver', title: 'Silver', xp: 50, correct: 10, perfect: 0, coins: 20 },
  { id: 'gold', title: 'Gold', xp: 100, correct: 20, perfect: 1, coins: 40 },
] as const;
export const MOTIVATION_BADGES = [
  { id: 'first-steps', title: 'First steps', description: 'Earn 50 learning XP.' },
  { id: 'steady-study', title: 'Steady study', description: 'Earn 500 learning XP.' },
  { id: 'week-streak', title: 'A steady week', description: 'Reach a seven-day protected study streak.' },
  { id: 'month-streak', title: 'A steady month', description: 'Reach a 30-day protected study streak.' },
  { id: 'lesson-ten', title: 'Ten lessons', description: 'Complete ten lessons with recorded learning evidence.' },
  { id: 'reviewer', title: 'Retrieval habit', description: 'Rate 25 cards when their recorded reviews are due.' },
  { id: 'early-bird', title: 'Early bird', description: 'Claim after completing an eligible lesson between 5 am and 9 am.' },
  { id: 'night-owl', title: 'Night owl', description: 'Claim after completing an eligible lesson between 10 pm and 1 am.' },
] as const;

const questionMap = new Map(questions.map(item => [item.id, item]));
const wordIds = new Set(vocabulary.map(item => item.id));
const kanjiIds = new Set(kanji.map(item => item.id));
const grammarIds = new Set(grammar.map(item => item.id));
const lessons = new Map(learningPath.flatMap(path => path.units.flatMap(unit => unit.lessons.map(lesson => ['path:' + lesson.id, lesson] as const))));
const HEART_MS = 4 * 60 * 60_000;
const BOOST_MS = 20 * 60_000;
const localDay = (value: number | string) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayDate = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); };
const shiftDay = (day: string, by: number) => { const d = dayDate(day); d.setDate(d.getDate() + by); return localDay(d.getTime()); };
const dayEnd = (day: string) => dayDate(shiftDay(day, 1)).getTime();
const iso = (now: number) => new Date(now).toISOString();
const copy = (state: MotivationState): MotivationState => structuredClone(state);
function fail(message: string): never { throw new Error('Invalid motivation: ' + message); }
const numeric = (value: unknown, label: string, min = 0, max = 100_000_000) => {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) fail(label + ' is out of range.');
  return Number(value);
};
const timestamp = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value || Date.parse(value) < 0 || Date.parse(value) >= Date.UTC(2200, 0, 1)) fail(label + ' must be an ISO timestamp.');
  return value as string;
};
const strings = (value: unknown, label: string, maximum = 100_000): string[] => {
  if (!Array.isArray(value) || value.length > maximum || value.some(item => typeof item !== 'string' || !item.length || item.length > 500) || new Set(value).size !== value.length) fail(label + ' must contain unique strings.');
  return value as string[];
};
const validDay = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(dayDate(value).getTime()) || localDay(dayDate(value).getTime()) !== value) fail('Calendar day is invalid.');
  return value as string;
};
const bool = (value: unknown) => { if (typeof value !== 'boolean') fail('Preference must be true or false.'); return value as boolean; };
const record = (value: unknown) => { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected an object.'); return value as Record<string, unknown>; };
const enumOf = <T extends string>(value: unknown, values: readonly T[], label: string): T => { if (typeof value !== 'string' || !values.includes(value as T)) fail(label + ' is unsupported.'); return value as T; };

function prefs(input: unknown): MotivationPreferences {
  const p = record(input);
  return {
    goal: enumOf(p.goal, ['travel', 'career', 'school'], 'Study goal'),
    dailyMinutes: numeric(p.dailyMinutes, 'Minute goal', 5, 120),
    dailyXP: numeric(p.dailyXP, 'XP goal', 10, 500),
    streakGoal: numeric(p.streakGoal, 'Streak goal', 1, 365),
    heartsEnabled: bool(p.heartsEnabled), disableAnimations: bool(p.disableAnimations), haptics: bool(p.haptics),
  };
}
function canonicalCard(key: string) {
  const split = key.indexOf(':'); const type = key.slice(0, split), id = key.slice(split + 1);
  return type === 'vocabulary' ? wordIds.has(id) : type === 'kanji' ? kanjiIds.has(id) : type === 'question' && questionMap.has(id);
}
function dueEvents(progress: MotivationProgress) {
  return Object.entries(progress.srs || {}).flatMap(([card, item]) => canonicalCard(card)
    ? (item.events || []).filter(event => event.previousNextReviewAt && Date.parse(event.reviewedAt) >= Date.parse(event.previousNextReviewAt)).map(event => ({ card, event }))
    : []);
}
function activity(state: MotivationState, day?: string) {
  const entries = state.ledger.filter(item => (!day || item.day === day) && !['quest', 'chest'].includes(item.kind));
  return { xp: entries.reduce((sum, item) => sum + item.xp, 0), correct: entries.reduce((sum, item) => sum + item.correct, 0), perfect: entries.filter(item => ['attempt', 'lab'].includes(item.kind) && item.perfect).length, days: new Set(entries.filter(item => item.xp > 0).map(item => item.day)) };
}
function streak(state: MotivationState, today: string) {
  const days = activity(state).days;
  const protectedDays = new Set(state.freezesUsed.map(item => item.day));
  let day = days.has(today) ? today : shiftDay(today, -1), count = 0;
  while (days.has(day) || protectedDays.has(day)) { count++; day = shiftDay(day, -1); }
  return count;
}
function badges(state: MotivationState, today: string) {
  const result = new Set<string>();
  if (state.xp >= 50) result.add('first-steps');
  if (state.xp >= 500) result.add('steady-study');
  const days = new Set([...activity(state).days, ...state.freezesUsed.map(item => item.day)]);
  let longest = 0, run = 0, previousDay = '';
  for (const day of [...days].sort()) { run = previousDay && shiftDay(previousDay, 1) === day ? run + 1 : 1; longest = Math.max(longest, run); previousDay = day; }
  if (longest >= 7) result.add('week-streak');
  if (longest >= 30) result.add('month-streak');
  if (state.ledger.filter(item => ['lesson', 'lab'].includes(item.kind)).length >= 10) result.add('lesson-ten');
  if (state.ledger.filter(item => item.kind === 'review').length >= 25) result.add('reviewer');
  for (const claimed of state.claimedBadges) result.add(claimed);
  for (const month of new Set(state.ledger.map(item => item.day.slice(0, 7)))) {
    const xp = state.ledger.filter(item => item.day.startsWith(month) && !['quest', 'chest'].includes(item.kind)).reduce((sum, item) => sum + item.xp, 0);
    if (xp >= 300) result.add('monthly:' + month);
  }
  return [...result];
}
function totals(state: MotivationState) {
  state.xp = state.ledger.reduce((sum, item) => sum + item.xp, 0);
  state.coins = state.ledger.reduce((sum, item) => sum + item.coins, 0) - state.purchases.reduce((sum, item) => sum + item.cost, 0);
}
function reward(state: MotivationState, entry: Omit<MotivationLedgerEntry, 'xp' | 'coins' | 'multiplier'>, baseXP: number, fixedCoins?: number) {
  if (state.ledger.some(item => item.key === entry.key)) return false;
  const at = Date.parse(entry.at);
  const multiplier = state.boosts.some(boost => Date.parse(boost.from) <= at && at < Date.parse(boost.until)) ? 2 : 1;
  const xp = baseXP * multiplier;
  state.ledger.push({ ...entry, xp, coins: fixedCoins ?? Math.floor(xp / 5), multiplier });
  totals(state);
  return true;
}
function lessonEvidence(progress: MotivationProgress, id: string, after: number, before: number) {
  const lesson = lessons.get(id);
  if (!lesson) return false;
  const events = progress.studyEvents.filter(event => after <= Date.parse(event.at) && Date.parse(event.at) <= before);
  const studied = events.some(e => e.type === 'vocabulary' && lesson.vocabularyIds.includes(e.contentId)) && events.some(e => e.type === 'grammar' && lesson.grammarIds.includes(e.contentId));
  const answered = new Set(progress.attempts.filter(a => ['submitted', 'reviewed'].includes(a.status) && a.submittedAt && after <= Date.parse(a.submittedAt) && Date.parse(a.submittedAt) <= before && a.listeningAccess !== 'script')
    .flatMap(a => a.questionOrder.filter(q => lesson.questionIds.includes(q) && assessedAnswer(a, q))));
  return studied || answered.size >= 2;
}
function assessedAnswer(attempt: Progress['attempts'][number], id: string) {
  const q = questionMap.get(id);
  return !!q && !attempt.excludedIds.includes(id) && (q.skill !== 'listening' || attempt.listeningAccess === 'audio') && q.options.some(o => o.id === attempt.answers[id]);
}
function perfectAttempt(progress: MotivationProgress, attemptId: string) {
  const a = progress.attempts.find(item => item.id === attemptId);
  return !!a && a.questionOrder.length >= 5 && a.excludedIds.length === 0 && a.listeningAccess !== 'script' && a.questionOrder.every(id => assessedAnswer(a, id) && a.answers[id] === questionMap.get(id)?.correctOptionId);
}
function perfectLesson(progress: MotivationProgress, lessonId: string, after: number, before: number) {
  const lesson = lessons.get(lessonId);
  return !!lesson && progress.attempts.some(a => a.submittedAt && after <= Date.parse(a.submittedAt) && Date.parse(a.submittedAt) <= before && ['submitted', 'reviewed'].includes(a.status) && perfectAttempt(progress, a.id) && a.questionOrder.some(q => lesson.questionIds.includes(q)));
}
function labProof(session: LabSession): LabRewardProof {
  return { ...structuredClone(session), createdAt: iso(session.createdAt), itemStartedAt: iso(session.itemStartedAt), finishedAt: iso(session.finishedAt!), results: session.results.map(result => ({ ...structuredClone(result), at: iso(result.at) })) };
}
function validateLabProof(input: unknown): LabRewardProof {
  const proof = record(input), createdAt = timestamp(proof.createdAt, 'Lab creation'), itemStartedAt = timestamp(proof.itemStartedAt, 'Lab exercise time'), finishedAt = timestamp(proof.finishedAt, 'Lab completion');
  if (Date.parse(itemStartedAt) > Date.parse(finishedAt)) fail('Lab exercise time cannot follow completion.');
  if (!Array.isArray(proof.results)) fail('Lab source needs answer results.');
  const results = proof.results.map(raw => { const result = record(raw); return { ...result, at: Date.parse(timestamp(result.at, 'Lab answer time')) }; });
  try {
    const state = validateLearnLab({ ...initialLearnLab(), sessions: [{ ...proof, createdAt: Date.parse(createdAt), itemStartedAt: Date.parse(itemStartedAt), finishedAt: Date.parse(finishedAt), results }] });
    const session = state.sessions[0];
    if (session.status !== 'complete') fail('Lab source must be a completed lesson.');
    return labProof(session);
  } catch (error) { fail('Lab completion proof is invalid: ' + (error instanceof Error ? error.message : 'unknown source')); }
}
function labConcepts(item: LabItem) { return item.kind === 'bonus' ? ['bonus:' + item.bonusId] : item.wordIds.map(id => 'word:' + id); }
function labOutcome(proof: LabRewardProof, day: string, rewarded: Set<string>) {
  const concepts: string[] = []; let correct = 0, xp = 0;
  for (const result of proof.results) {
    const item = proof.queue.find(item => item.id === result.exerciseId)!;
    for (const concept of labConcepts(item)) {
      if (rewarded.has(day + ':' + concept)) continue;
      rewarded.add(day + ':' + concept); concepts.push(concept);
      if (result.outcome === 'exact') { correct++; xp += 5; }
      else xp += result.outcome === 'typo' ? 2 : 1;
    }
  }
  const perfect = concepts.length >= 3 && proof.results.every(result => result.outcome === 'exact');
  return { concepts, correct, perfect, xp: xp + (perfect ? Math.floor(xp * .2) : 0) };
}
function seededChest(state: MotivationState, day: string) {
  let hash = 2166136261;
  for (const char of state.enabledAt + '|' + day) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return [10, 15, 20][hash % 3];
}
function claimAvailable(state: MotivationState, claim: MotivationClaim, day: string) {
  if (state.ledger.some(item => item.key === (claim === 'monthly' ? 'quest:monthly:' + day.slice(0, 7) : claim === 'chest' ? 'chest:' + day : 'quest:' + claim + ':' + day))) return false;
  const stats = activity(state, day), quest = DAILY_QUESTS.find(q => q.id === claim);
  if (quest) return stats.xp >= quest.xp && stats.correct >= quest.correct && stats.perfect >= quest.perfect;
  if (claim === 'chest') return stats.xp >= DAILY_QUESTS[0].xp && stats.correct >= DAILY_QUESTS[0].correct;
  if (claim === 'monthly') {
    const month = day.slice(0, 7), entries = state.ledger.filter(item => item.day.startsWith(month) && !['quest', 'chest'].includes(item.kind));
    return entries.reduce((sum, item) => sum + item.xp, 0) >= 300 && new Set(entries.filter(item => item.xp > 0).map(item => item.day)).size >= 5;
  }
  if (state.claimedBadges.includes(claim)) return false;
  return state.ledger.some(item => ['lesson', 'lab'].includes(item.kind) && item.day === day && (claim === 'early-bird' ? new Date(item.at).getHours() >= 5 && new Date(item.at).getHours() < 9 : new Date(item.at).getHours() >= 22 || new Date(item.at).getHours() < 1));
}

/** Opt-in starts a new ledger; existing learning is preserved and not rewarded retroactively. */
export function enableMotivation(progress: MotivationProgress, choices: Partial<MotivationPreferences> = {}, now = Date.now()): MotivationProgress {
  if (progress.motivation) return progress;
  const date = iso(now), day = localDay(now);
  const state: MotivationState = {
    version: 1, enabledAt: date, lastReconciledAt: date,
    preferences: prefs({ goal: 'travel', dailyMinutes: 10, dailyXP: 50, streakGoal: 7, heartsEnabled: false, disableAnimations: false, haptics: false, ...choices }),
    baseline: { attempts: progress.attempts.map(a => a.id), studies: progress.studyEvents.map(e => e.id), lessons: progress.completedTasks.filter(id => lessons.has(id)), reviews: dueEvents(progress).map(({ card, event }) => card + '@@' + event.eventId), ...(progress.learnlab ? { labs: progress.learnlab.sessions.filter(session => session.status === 'complete').map(session => session.id) } : {}) },
    ledger: [], xp: 0, coins: 0, purchases: [], freezesUsed: [], lastCalendarDay: day,
    hearts: 5, heartsAt: date, boosts: [], studySeconds: {}, timeRecordedAt: date,
    claimedBadges: [], earnedBadges: [], profileBadges: [], cosmetic: 'mint', mascotTaps: 0,
  };
  return { ...progress, motivation: state };
}
/** Pure reconciliation of actual completed learning. Reading a page and clicking controls earn nothing. */
export function reconcileMotivation(progress: MotivationProgress, previous: MotivationProgress = progress, now = Date.now()): MotivationProgress {
  if (!progress.motivation) return progress;
  const original = progress.motivation, state = copy(original), today = localDay(now), cutoff = Date.parse(state.enabledAt);
  if (now < Date.parse(state.lastReconciledAt)) return progress;
  const elapsed = Math.floor((now - Date.parse(state.heartsAt)) / HEART_MS);
  if (elapsed > 0) { state.hearts = Math.min(5, state.hearts + elapsed); state.heartsAt = state.hearts === 5 ? iso(now) : iso(Date.parse(state.heartsAt) + elapsed * HEART_MS); }
  const eligible = (at: string | undefined) => !!at && cutoff <= Date.parse(at) && Date.parse(at) <= now;
  const answeredToday = new Set(state.ledger.filter(e => e.kind === 'attempt').flatMap(e => e.questionIds.map(id => e.day + ':' + id)));
  for (const attempt of progress.attempts.filter(a => ['submitted', 'reviewed'].includes(a.status) && eligible(a.submittedAt)).sort((a, b) => Date.parse(a.submittedAt!) - Date.parse(b.submittedAt!))) {
    if (state.baseline.attempts.includes(attempt.id) || state.ledger.some(e => e.key === 'attempt:' + attempt.id) || attempt.listeningAccess === 'script') continue;
    const at = attempt.submittedAt!, day = localDay(at);
    const ids = attempt.questionOrder.filter(id => assessedAnswer(attempt, id) && !answeredToday.has(day + ':' + id));
    if (!ids.length) continue;
    ids.forEach(id => answeredToday.add(day + ':' + id));
    const correct = ids.filter(id => attempt.answers[id] === questionMap.get(id)!.correctOptionId).length;
    const perfect = perfectAttempt(progress, attempt.id), base = correct * 5 + ids.length - correct;
    const bonus = perfect ? Math.floor(base * .2) : 0;
    reward(state, { key: 'attempt:' + attempt.id, kind: 'attempt', sourceId: attempt.id, at, day, questionIds: ids, correct, perfect, }, base + bonus);
    if (state.preferences.heartsEnabled && attempt.type === 'practice') { state.hearts = Math.max(0, state.hearts - (ids.length - correct)); state.heartsAt = iso(now); }
    if (attempt.type === 'review') {
      const dueCorrect = ids.filter(id => attempt.answers[id] === questionMap.get(id)!.correctOptionId && previous.reviews[id] && Date.parse(previous.reviews[id].dueAt) <= Date.parse(at)).length;
      if (dueCorrect) { state.hearts = Math.min(5, state.hearts + dueCorrect); state.heartsAt = iso(now); }
    }
  }
  for (const event of progress.studyEvents.filter(e => eligible(e.at)).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    if (state.baseline.studies.includes(event.id)) continue;
    const day = localDay(event.at), key = `study:${event.type}:${event.contentId}:${day}`;
    reward(state, { key, kind: 'study', sourceId: event.id, at: event.at, day, questionIds: [], correct: 0, perfect: false }, 2);
  }
  for (const { card, event } of dueEvents(progress).filter(({ event }) => eligible(event.reviewedAt))) {
    const sourceId = card + '@@' + event.eventId;
    if (state.baseline.reviews.includes(sourceId)) continue;
    const added = reward(state, { key: 'review:' + sourceId, kind: 'review', sourceId, at: event.reviewedAt, day: localDay(event.reviewedAt), questionIds: [], correct: event.quality >= 3 ? 1 : 0, perfect: false }, event.quality >= 3 ? 4 : 2);
    if (added && event.quality >= 3) { state.hearts = Math.min(5, state.hearts + 1); state.heartsAt = iso(now); }
  }
  const rewardedLab = new Set(state.ledger.filter(e => e.kind === 'lab').flatMap(e => (e.labConcepts || []).map(concept => e.day + ':' + concept)));
  for (const session of (progress.learnlab?.sessions || []).filter(s => s.status === 'complete' && s.finishedAt !== undefined && eligible(iso(s.finishedAt))).sort((a, b) => a.finishedAt! - b.finishedAt!)) {
    if (state.baseline.labs?.includes(session.id) || state.ledger.some(e => e.key === 'lab:' + session.id)) continue;
    const proof = validateLabProof(labProof(session)), at = proof.finishedAt, day = localDay(at), outcome = labOutcome(proof, day, rewardedLab);
    if (!outcome.concepts.length) continue;
    reward(state, { key: 'lab:' + session.id, kind: 'lab', sourceId: session.id, at, day, questionIds: [], correct: outcome.correct, perfect: outcome.perfect, labProof: proof, labConcepts: outcome.concepts }, outcome.xp);
  }
  for (const id of progress.completedTasks.filter(id => lessons.has(id))) {
    if (state.baseline.lessons.includes(id) || !lessonEvidence(progress, id, cutoff, now)) continue;
    const perfect = perfectLesson(progress, id, cutoff, now);
    reward(state, { key: 'lesson:' + id, kind: 'lesson', sourceId: id, at: iso(now), day: today, questionIds: [], correct: 0, perfect }, perfect ? 12 : 10);
  }
  const actualDays = activity(state).days;
  let day = state.lastCalendarDay;
  while (day < today) {
    const previousDay = shiftDay(day, -1);
    if (!actualDays.has(day) && (actualDays.has(previousDay) || state.freezesUsed.some(item => item.day === previousDay))) {
      const unused = state.purchases.find(p => p.reward === 'freeze' && Date.parse(p.at) < dayEnd(day) && !state.freezesUsed.some(item => item.purchaseId === p.id));
      if (unused) state.freezesUsed.push({ day, purchaseId: unused.id });
    }
    day = shiftDay(day, 1);
  }
  state.lastCalendarDay = today;
  state.lastReconciledAt = iso(now);
  state.earnedBadges = badges(state, today);
  return JSON.stringify(state) === JSON.stringify(original) ? progress : { ...progress, motivation: state };
}

export function motivationSummary(progress: MotivationProgress, now = Date.now()) {
  const state = progress.motivation;
  if (!state) return null;
  const today = localDay(now), stats = activity(state, today), month = today.slice(0, 7);
  const monthly = state.ledger.filter(e => e.day.startsWith(month) && !['quest', 'chest'].includes(e.kind));
  const freezes = state.purchases.filter(p => p.reward === 'freeze').length - state.freezesUsed.length;
  const boostUses = new Set(state.boosts.map(b => b.source));
  const boostSources = [...state.purchases.filter(p => p.reward === 'boost').map(p => p.id), ...state.ledger.filter(e => e.key.startsWith('quest:monthly:')).map(e => e.key)];
  const cosmetics = ['mint', ...state.purchases.filter(p => ['sakura', 'ocean', 'sunset'].includes(p.reward)).map(p => p.reward), ...(state.mascotTaps >= 10 ? ['tanuki-star'] : [])];
  return {
    xp: state.xp, coins: state.coins, todayXP: stats.xp, todayCorrect: stats.correct, todayPerfect: stats.perfect,
    todayLabXP: state.ledger.filter(e => e.kind === 'lab' && e.day === today).reduce((sum, e) => sum + e.xp, 0),
    todayLabExact: state.ledger.filter(e => e.kind === 'lab' && e.day === today).reduce((sum, e) => sum + e.correct, 0),
    streak: streak(state, today), freezes, hearts: state.hearts,
    nextHeartAt: state.hearts < 5 ? iso(Date.parse(state.heartsAt) + HEART_MS) : null,
    todayMinutes: Math.floor((state.studySeconds[today] || 0) / 60), monthlyXP: monthly.reduce((sum, e) => sum + e.xp, 0),
    monthlyDays: new Set(monthly.filter(e => e.xp > 0).map(e => e.day)).size,
    boostCharges: boostSources.filter(id => !boostUses.has(id)).length,
    boostUntil: state.boosts.find(b => Date.parse(b.from) <= now && now < Date.parse(b.until))?.until || null,
    cosmetics: [...new Set(cosmetics)],
    quests: DAILY_QUESTS.map(q => ({ ...q, available: claimAvailable(state, q.id, today), claimed: state.ledger.some(e => e.key === 'quest:' + q.id + ':' + today) })),
    chestAvailable: claimAvailable(state, 'chest', today), chestClaimed: state.ledger.some(e => e.key === 'chest:' + today),
    monthlyAvailable: claimAvailable(state, 'monthly', today), monthlyClaimed: state.ledger.some(e => e.key === 'quest:monthly:' + month),
    earlyAvailable: claimAvailable(state, 'early-bird', today), nightAvailable: claimAvailable(state, 'night-owl', today),
  };
}
export function purchaseReward(progress: MotivationProgress, rewardId: MotivationReward, now = Date.now()): MotivationProgress {
  const updated = reconcileMotivation(progress, progress, now);
  if (!updated.motivation) return updated;
  const state = copy(updated.motivation), shop = MOTIVATION_SHOP.find(item => item.id === rewardId), summary = motivationSummary(updated, now)!;
  if (!shop) throw new Error('Unknown reward.');
  if (summary.cosmetics.includes(rewardId)) return updated;
  if (state.coins < shop.cost) throw new Error('Earn more coins through learning before buying this reward.');
  if (rewardId === 'freeze' && summary.freezes >= 2) throw new Error('You can hold two streak freezes.');
  state.purchases.push({ id: `purchase:${rewardId}:${now}:${state.purchases.length}`, reward: rewardId, at: iso(now), cost: shop.cost });
  totals(state);
  return { ...updated, motivation: state };
}
export function activateBoost(progress: MotivationProgress, now = Date.now()): MotivationProgress {
  const updated = reconcileMotivation(progress, progress, now);
  if (!updated.motivation) return updated;
  const state = copy(updated.motivation), summary = motivationSummary(updated, now)!;
  if (summary.boostUntil) return updated;
  const used = new Set(state.boosts.map(b => b.source));
  const source = [...state.purchases.filter(p => p.reward === 'boost').map(p => p.id), ...state.ledger.filter(e => e.key.startsWith('quest:monthly:')).map(e => e.key)].find(id => !used.has(id));
  if (!source) throw new Error('Earn or buy a boost before activating it.');
  // A boost cannot retroactively multiply an already saved receipt from the same millisecond.
  const from = Math.max(now, ...state.ledger.map(e => Date.parse(e.at) + 1));
  state.boosts.push({ from: iso(from), until: iso(from + BOOST_MS), source });
  state.lastReconciledAt = iso(Math.max(from, Date.parse(state.lastReconciledAt)));
  state.lastCalendarDay = localDay(state.lastReconciledAt);
  return { ...updated, motivation: state };
}
export function claimMotivationReward(progress: MotivationProgress, claim: MotivationClaim, now = Date.now()): MotivationProgress {
  const updated = reconcileMotivation(progress, progress, now);
  if (!updated.motivation) return updated;
  const state = copy(updated.motivation), day = localDay(now);
  if (!claimAvailable(state, claim, day)) return updated;
  if (claim === 'early-bird' || claim === 'night-owl') {
    state.claimedBadges.push(claim); state.earnedBadges = badges(state, day);
  } else {
    const chest = claim === 'chest', key = chest ? 'chest:' + day : claim === 'monthly' ? 'quest:monthly:' + day.slice(0, 7) : 'quest:' + claim + ':' + day;
    const coins = chest ? seededChest(state, day) : claim === 'monthly' ? 100 : DAILY_QUESTS.find(q => q.id === claim)!.coins;
    reward(state, { key, kind: chest ? 'chest' : 'quest', sourceId: claim, at: iso(now), day, questionIds: [], correct: 0, perfect: false }, 0, coins);
  }
  return { ...updated, motivation: state };
}
export function setMotivationPreference(progress: MotivationProgress, choices: Partial<MotivationPreferences>): MotivationProgress {
  if (!progress.motivation) return progress;
  return { ...progress, motivation: { ...progress.motivation, preferences: prefs({ ...progress.motivation.preferences, ...choices }) } };
}
export function setMotivationCosmetic(progress: MotivationProgress, cosmetic: string, now = Date.now()): MotivationProgress {
  if (!progress.motivation) return progress;
  if (!motivationSummary(progress, now)!.cosmetics.includes(cosmetic)) throw new Error('This card color has not been earned.');
  return { ...progress, motivation: { ...progress.motivation, cosmetic } };
}
export function setProfileBadges(progress: MotivationProgress, selected: string[]): MotivationProgress {
  if (!progress.motivation) return progress;
  if (selected.length > 3 || new Set(selected).size !== selected.length || selected.some(id => !progress.motivation!.earnedBadges.includes(id))) throw new Error('Choose up to three badges you have earned.');
  return { ...progress, motivation: { ...progress.motivation, profileBadges: selected.slice() } };
}
export function tapMascot(progress: MotivationProgress): MotivationProgress {
  if (!progress.motivation || progress.motivation.mascotTaps >= 10) return progress;
  return { ...progress, motivation: { ...progress.motivation, mascotTaps: progress.motivation.mascotTaps + 1 } };
}
/** Caller supplies measured visible active study time; opening an idle screen earns no minutes or XP. */
export function recordStudyTime(progress: MotivationProgress, seconds: number, now = Date.now()): MotivationProgress {
  if (!progress.motivation) return progress;
  numeric(seconds, 'Measured study seconds', 0, 60);
  const updated = reconcileMotivation(progress, progress, now);
  const state = copy(updated.motivation!), since = Date.parse(state.timeRecordedAt);
  if (now <= since) return progress;
  const credit = Math.min(seconds, Math.floor((now - since) / 1000));
  let cursor = now - credit * 1000;
  while (cursor < now) {
    const day = localDay(cursor), end = Math.min(now, dayEnd(day));
    state.studySeconds[day] = Math.min(86400, (state.studySeconds[day] || 0) + Math.floor((end - cursor) / 1000));
    cursor = end;
  }
  state.timeRecordedAt = iso(now); state.lastReconciledAt = iso(Math.max(now, Date.parse(state.lastReconciledAt)));
  return { ...updated, motivation: state };
}
export function disableMotivation(progress: MotivationProgress): MotivationProgress {
  if (!progress.motivation) return progress;
  const { motivation: _removed, ...plain } = progress;
  return plain;
}

/** Validate optional saved rewards against canonical learning, limits and wallet arithmetic. */
export function validateMotivation(input: unknown, canonicalProgress: MotivationProgress): MotivationState | undefined {
  if (input === undefined) return undefined;
  const data = record(input);
  if (data.version !== 1) fail('Version is unsupported.');
  const state = copy(data as unknown as MotivationState);
  state.enabledAt = timestamp(data.enabledAt, 'Enable date'); state.lastReconciledAt = timestamp(data.lastReconciledAt, 'Reconciliation date');
  if (Date.parse(state.lastReconciledAt) < Date.parse(state.enabledAt)) fail('Reconciliation precedes enabling.');
  state.preferences = prefs(data.preferences);
  const baseline = record(data.baseline);
  state.baseline = { attempts: strings(baseline.attempts, 'Prior attempts'), studies: strings(baseline.studies, 'Prior studies'), lessons: strings(baseline.lessons, 'Prior lessons'), reviews: strings(baseline.reviews, 'Prior ratings'), ...(baseline.labs !== undefined ? { labs: strings(baseline.labs, 'Prior Lab completions', 40) } : {}) };
  const priorRatingIds = new Set(dueEvents(canonicalProgress).filter(({ event }) => Date.parse(event.reviewedAt) <= Date.parse(state.enabledAt)).map(({ card, event }) => card + '@@' + event.eventId));
  if (state.baseline.attempts.some(id => !canonicalProgress.attempts.some(a => a.id === id && Date.parse(a.createdAt) <= Date.parse(state.enabledAt))) || state.baseline.studies.some(id => !canonicalProgress.studyEvents.some(e => e.id === id && Date.parse(e.at) <= Date.parse(state.enabledAt))) || state.baseline.lessons.some(id => !lessons.has(id)) || state.baseline.reviews.some(id => !priorRatingIds.has(id))) fail('Baseline references missing prior learning.');
  if (state.baseline.labs?.some(id => !/^lab-\d+-\d+$/.test(id) || Number(id.split('-')[1]) > Date.parse(state.enabledAt) || canonicalProgress.learnlab?.sessions.some(s => s.id === id && (s.status !== 'complete' || s.finishedAt! > Date.parse(state.enabledAt))))) fail('Lab baseline must reference prior completed sessions.');
  if (!Array.isArray(data.ledger) || data.ledger.length > 20_000) fail('Ledger is too large or invalid.');
  const keys = new Set<string>(), rewardedQuestions = new Set<string>(), rewardedLab = new Set<string>();
  state.ledger = data.ledger.map(raw => {
    const e = record(raw), at = timestamp(e.at, 'Reward date'), day = validDay(e.day);
    if (day !== localDay(at) || Date.parse(at) < Date.parse(state.enabledAt) || Date.parse(at) > Date.parse(state.lastReconciledAt)) fail('Reward date is inconsistent.');
    const kind = enumOf(e.kind, ['attempt', 'study', 'lesson', 'lab', 'review', 'quest', 'chest'], 'Reward kind');
    if (typeof e.key !== 'string' || e.key.length > 500 || keys.has(e.key) || typeof e.sourceId !== 'string' || e.sourceId.length > 500) fail('Reward keys must be unique.');
    keys.add(e.key);
    const questionIds = strings(e.questionIds, 'Reward questions', questions.length), correct = numeric(e.correct, 'Correct count', 0, questions.length), perfect = bool(e.perfect), multiplier = numeric(e.multiplier, 'XP multiplier', 1, 2) as 1 | 2;
    let expectedXP = 0, fixedCoins: number | undefined, sourceProof: LabRewardProof | undefined, rewardedConcepts: string[] | undefined;
    if (kind !== 'lab' && (e.labProof !== undefined || e.labConcepts !== undefined)) fail('Only Lab receipts contain Lab source proofs.');
    if (kind === 'attempt') {
      const a = canonicalProgress.attempts.find(a => a.id === e.sourceId);
      if (!a || !['submitted', 'reviewed'].includes(a.status) || a.submittedAt !== at || a.listeningAccess === 'script' || !questionIds.length || state.baseline.attempts.includes(a.id) || e.key !== 'attempt:' + a.id) fail('Rewarded attempt is not an eligible assessed submission.');
      for (const id of questionIds) {
        const q = questionMap.get(id);
        if (!q || !a.questionOrder.includes(id) || !assessedAnswer(a, id) || rewardedQuestions.has(day + ':' + id)) fail('Question rewards contain invalid or duplicate assessed answers.');
        rewardedQuestions.add(day + ':' + id);
      }
      const actualCorrect = questionIds.filter(id => a.answers[id] === questionMap.get(id)!.correctOptionId).length;
      if (correct !== actualCorrect || perfect !== perfectAttempt(canonicalProgress, a.id)) fail('Assessed reward outcome is incorrect.');
      const base = correct * 5 + questionIds.length - correct;
      expectedXP = base + (perfect ? Math.floor(base * .2) : 0);
    } else if (kind === 'study') {
      const event = canonicalProgress.studyEvents.find(item => item.id === e.sourceId);
      if (!event || event.at !== at || state.baseline.studies.includes(event.id) || e.key !== `study:${event.type}:${event.contentId}:${day}` || correct || perfect || questionIds.length) fail('Study reward does not match a canonical study action.');
      expectedXP = 2;
    } else if (kind === 'review') {
      const found = dueEvents(canonicalProgress).find(({ card, event }) => card + '@@' + event.eventId === e.sourceId);
      if (!found || found.event.reviewedAt !== at || state.baseline.reviews.includes(e.sourceId) || e.key !== 'review:' + e.sourceId || perfect || questionIds.length || correct !== Number(found.event.quality >= 3)) fail('Rating reward needs a real due review event.');
      expectedXP = found.event.quality >= 3 ? 4 : 2;
    } else if (kind === 'lesson') {
      if (!lessons.has(e.sourceId) || state.baseline.lessons.includes(e.sourceId) || e.key !== 'lesson:' + e.sourceId || !lessonEvidence(canonicalProgress, e.sourceId, Date.parse(state.enabledAt), Date.parse(at)) || perfect !== perfectLesson(canonicalProgress, e.sourceId, Date.parse(state.enabledAt), Date.parse(at)) || correct || questionIds.length) fail('Lesson reward needs recorded learning evidence.');
      expectedXP = perfect ? 12 : 10;
    } else if (kind === 'lab') {
      sourceProof = validateLabProof(e.labProof); rewardedConcepts = strings(e.labConcepts, 'Rewarded Lab concepts', 12);
      const source = canonicalProgress.learnlab?.sessions.find(s => s.id === e.sourceId);
      if (e.key !== 'lab:' + sourceProof.id || e.sourceId !== sourceProof.id || at !== sourceProof.finishedAt || state.baseline.labs?.includes(sourceProof.id) || questionIds.length || source && JSON.stringify(validateLabProof(labProof(source))) !== JSON.stringify(sourceProof)) fail('Lab receipt must match its completed canonical source.');
      const outcome = labOutcome(sourceProof, day, rewardedLab);
      if (!rewardedConcepts.length || JSON.stringify(outcome.concepts) !== JSON.stringify(rewardedConcepts) || correct !== outcome.correct || perfect !== outcome.perfect) fail('Lab rewards must deduplicate known concepts and preserve exact versus typo outcomes.');
      expectedXP = outcome.xp;
    } else {
      if (questionIds.length || correct || perfect) fail('Quest reward is not an assessed answer.');
      if (kind === 'chest') { if (e.sourceId !== 'chest' || e.key !== 'chest:' + day) fail('Chest key is invalid.'); fixedCoins = seededChest(state, day); }
      else { const quest = DAILY_QUESTS.find(q => q.id === e.sourceId); if (!quest && e.sourceId !== 'monthly') fail('Quest is unknown.'); if (e.key !== (quest ? 'quest:' + quest.id + ':' + day : 'quest:monthly:' + day.slice(0, 7))) fail('Quest key is invalid.'); fixedCoins = quest?.coins ?? 100; }
    }
    const xp = numeric(e.xp, 'Reward XP'), coins = numeric(e.coins, 'Reward coins');
    if (xp !== expectedXP * multiplier || coins !== (fixedCoins ?? Math.floor(xp / 5))) fail('Reward amounts do not match their learning source.');
    return { key: e.key, kind, sourceId: e.sourceId, at, day, xp, coins, questionIds, correct, perfect, multiplier, ...(sourceProof ? { labProof: sourceProof, labConcepts: rewardedConcepts! } : {}) };
  });
  if (!Array.isArray(data.purchases) || data.purchases.length > 10_000) fail('Purchase list is invalid.');
  const purchaseIds = new Set<string>();
  state.purchases = data.purchases.map(raw => {
    const p = record(raw), rewardId = enumOf(p.reward, MOTIVATION_SHOP.map(s => s.id), 'Shop item'), shop = MOTIVATION_SHOP.find(s => s.id === rewardId)!;
    if (typeof p.id !== 'string' || !p.id.length || p.id.length > 200 || purchaseIds.has(p.id) || p.cost !== shop.cost) fail('Purchase ID or cost is invalid.');
    purchaseIds.add(p.id);
    const at = timestamp(p.at, 'Purchase date');
    if (Date.parse(at) < Date.parse(state.enabledAt) || Date.parse(at) > Date.parse(state.lastReconciledAt)) fail('Purchase date is inconsistent.');
    return { id: p.id, reward: rewardId, at, cost: shop.cost };
  });
  const savedXP = numeric(data.xp, 'Total XP'), savedCoins = numeric(data.coins, 'Coin balance');
  totals(state);
  if (state.xp !== savedXP || state.coins !== savedCoins || state.coins < 0) fail('Balances disagree with earned rewards and purchases.');
  for (const purchase of state.purchases) {
    const earned = state.ledger.filter(e => Date.parse(e.at) <= Date.parse(purchase.at)).reduce((sum, e) => sum + e.coins, 0);
    const spent = state.purchases.filter(p => Date.parse(p.at) < Date.parse(purchase.at) || p.at === purchase.at && state.purchases.indexOf(p) <= state.purchases.indexOf(purchase)).reduce((sum, p) => sum + p.cost, 0);
    if (spent > earned) fail('A purchase cannot spend coins before they are earned.');
  }
  for (const cosmetic of ['sakura', 'ocean', 'sunset']) if (state.purchases.filter(p => p.reward === cosmetic).length > 1) fail('A cosmetic can be purchased once.');
  if (!Array.isArray(data.freezesUsed) || data.freezesUsed.length > state.purchases.length) fail('Freeze use list is invalid.');
  const freezeDays = new Set<string>(), freezeIds = new Set<string>();
  state.freezesUsed = data.freezesUsed.map(raw => {
    const f = record(raw), day = validDay(f.day), purchaseId = String(f.purchaseId), purchase = state.purchases.find(p => p.id === purchaseId && p.reward === 'freeze');
    if (!purchase || Date.parse(purchase.at) >= dayEnd(day) || freezeDays.has(day) || freezeIds.has(purchaseId)) fail('A freeze must use an earned purchase once for an elapsed day.');
    freezeDays.add(day); freezeIds.add(purchaseId); return { day, purchaseId };
  });
  if (state.purchases.filter(p => p.reward === 'freeze').length - state.freezesUsed.length > 2) fail('At most two freezes may be held.');
  state.lastCalendarDay = validDay(data.lastCalendarDay);
  if (state.lastCalendarDay !== localDay(state.lastReconciledAt) || state.freezesUsed.some(f => f.day >= state.lastCalendarDay)) fail('Future days cannot consume a freeze.');
  const actualDays = activity(state).days;
  for (const freeze of state.freezesUsed) if (actualDays.has(freeze.day) || !(actualDays.has(shiftDay(freeze.day, -1)) || freezeDays.has(shiftDay(freeze.day, -1)))) fail('A freeze only protects a missed day in an existing streak.');
  for (const purchase of state.purchases.filter(p => p.reward === 'freeze')) {
    const purchased = state.purchases.filter(p => p.reward === 'freeze' && (Date.parse(p.at) < Date.parse(purchase.at) || p.at === purchase.at && state.purchases.indexOf(p) <= state.purchases.indexOf(purchase))).length;
    const consumed = state.freezesUsed.filter(f => dayEnd(f.day) <= Date.parse(purchase.at)).length;
    if (purchased - consumed > 2) fail('Freeze inventory cannot exceed two at purchase time.');
  }
  state.hearts = numeric(data.hearts, 'Hearts', 0, 5); state.heartsAt = timestamp(data.heartsAt, 'Heart regeneration date');
  if (Date.parse(state.heartsAt) < Date.parse(state.enabledAt) || Date.parse(state.heartsAt) > Date.parse(state.lastReconciledAt)) fail('Heart date is inconsistent.');
  if (!Array.isArray(data.boosts) || data.boosts.length > state.purchases.length + state.ledger.length) fail('Boost list is invalid.');
  const boostIds = new Set<string>();
  state.boosts = data.boosts.map(raw => {
    const b = record(raw), from = timestamp(b.from, 'Boost start'), until = timestamp(b.until, 'Boost end'), source = String(b.source);
    const receipt = state.purchases.find(p => p.id === source && p.reward === 'boost') || state.ledger.find(e => e.key === source && e.key.startsWith('quest:monthly:'));
    if (!receipt || boostIds.has(source) || Date.parse(until) !== Date.parse(from) + BOOST_MS || Date.parse(from) < Date.parse(receipt.at) || Date.parse(from) > Date.parse(state.lastReconciledAt)) fail('Boost must use one earned charge for 20 minutes.');
    boostIds.add(source); return { from, until, source };
  });
  const chronologicalBoosts = [...state.boosts].sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
  if (chronologicalBoosts.some((b, i) => i > 0 && Date.parse(b.from) < Date.parse(chronologicalBoosts[i - 1].until))) fail('Boost windows cannot overlap.');
  for (const entry of state.ledger) {
    const boost = state.boosts.some(b => Date.parse(b.from) <= Date.parse(entry.at) && Date.parse(entry.at) < Date.parse(b.until));
    if (entry.multiplier !== (boost ? 2 : 1)) fail('XP multiplier requires an active earned boost.');
    if (['quest', 'chest'].includes(entry.kind)) {
      const prior = { ...state, ledger: state.ledger.filter(e => e.key !== entry.key && Date.parse(e.at) <= Date.parse(entry.at)) };
      if (!claimAvailable(prior, entry.sourceId as MotivationClaim, entry.day)) fail('Quest or chest has no eligible completed learning.');
    }
  }
  state.studySeconds = Object.fromEntries(Object.entries(record(data.studySeconds)).map(([day, seconds]) => [validDay(day), numeric(seconds, 'Study seconds', 0, 86400)]));
  state.timeRecordedAt = timestamp(data.timeRecordedAt, 'Recorded study time');
  if (Date.parse(state.timeRecordedAt) < Date.parse(state.enabledAt) || Date.parse(state.timeRecordedAt) > Date.parse(state.lastReconciledAt) || Object.keys(state.studySeconds).some(day => day < localDay(state.enabledAt) || day > state.lastCalendarDay) || Object.values(state.studySeconds).reduce((sum, s) => sum + s, 0) > Math.floor((Date.parse(state.timeRecordedAt) - Date.parse(state.enabledAt)) / 1000)) fail('Measured study time is inconsistent.');
  state.claimedBadges = strings(data.claimedBadges, 'Claimed badges', 2).map(id => enumOf(id, ['early-bird', 'night-owl'], 'Time badge'));
  for (const claimed of state.claimedBadges) if (!state.ledger.some(e => ['lesson', 'lab'].includes(e.kind) && (claimed === 'early-bird' ? new Date(e.at).getHours() >= 5 && new Date(e.at).getHours() < 9 : new Date(e.at).getHours() >= 22 || new Date(e.at).getHours() < 1))) fail('Time badge needs a completed eligible lesson.');
  state.earnedBadges = strings(data.earnedBadges, 'Earned badges', 1000);
  if (state.earnedBadges.some(id => !MOTIVATION_BADGES.some(b => b.id === id) && !/^monthly:\d{4}-\d{2}$/.test(id))) fail('Unknown milestone badge.');
  if (JSON.stringify([...state.earnedBadges].sort()) !== JSON.stringify(badges(state, state.lastCalendarDay).sort())) fail('Milestone badges must match actual learning.');
  state.profileBadges = strings(data.profileBadges, 'Profile badges', 3);
  if (state.profileBadges.some(id => !state.earnedBadges.includes(id))) fail('Profile may only display earned badges.');
  state.mascotTaps = numeric(data.mascotTaps, 'Mascot taps', 0, 10);
  const owned = motivationSummary({ ...canonicalProgress, motivation: state }, Date.parse(state.lastReconciledAt))!.cosmetics;
  state.cosmetic = enumOf(data.cosmetic, owned, 'Card color');
  return { version: 1, enabledAt: state.enabledAt, lastReconciledAt: state.lastReconciledAt, preferences: state.preferences, baseline: state.baseline, ledger: state.ledger, xp: state.xp, coins: state.coins, purchases: state.purchases, freezesUsed: state.freezesUsed, lastCalendarDay: state.lastCalendarDay, hearts: state.hearts, heartsAt: state.heartsAt, boosts: state.boosts, studySeconds: state.studySeconds, timeRecordedAt: state.timeRecordedAt, claimedBadges: state.claimedBadges, earnedBadges: state.earnedBadges, profileBadges: state.profileBadges, cosmetic: state.cosmetic, mascotTaps: state.mascotTaps };
}
