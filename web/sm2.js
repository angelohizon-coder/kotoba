// Generated from src/lib/sm2.ts and its local imports. Edit src/ then run tools/build-browser.mjs.
(function(global){
'use strict';
const compiled={};
compiled["src/lib/sm2.ts"] = (() => {
/** The requested EF-first SM-2 variant. Scheduling is independent of quiz scores. */
                                               
                                                                
                                                              
                                                                                               
                                                    
                                                                                        
                                             
                  
                      
                     
                                
 
                                                                   
                               
                       
                         
                     
 

const SM2_INITIAL_STATE                     = Object.freeze({ repetitions: 0, intervalDays: 0, easinessFactor: 2.5 });
const SM2_DAY_MS = 86_400_000;
const SM2_QUALITY_LABELS = [
  { quality: 0, label: 'Blank', description: 'I could not recall it.' },
  { quality: 1, label: 'Forgot', description: 'I remembered only after seeing the answer.' },
  { quality: 2, label: 'Almost', description: 'My answer was wrong, but the answer felt familiar.' },
  { quality: 3, label: 'Hard', description: 'I recalled it correctly with serious difficulty.' },
  { quality: 4, label: 'Good', description: 'I recalled it correctly after a hesitation.' },
  { quality: 5, label: 'Easy', description: 'I recalled it correctly and confidently.' },
]         ;

const minTime = Date.UTC(1970, 0, 1), maxTime = Date.UTC(2200, 0, 1);
function invalid(message        )        { throw new Error(`Invalid SM-2: ${message}`); }
function validTime(now        )         {
  if (!Number.isSafeInteger(now) || now < minTime || now >= maxTime) invalid('time must be UTC milliseconds between 1970 and 2200.');
  return now;
}
function qualityValue(value        )             {
  if (!Number.isInteger(value) || value < 0 || value > 5) invalid('quality must be an integer from 0 to 5.');
  return value              ;
}
function policyValue(policy           )            {
  if (policy.maxIntervalDays !== undefined && policy.maxIntervalDays !== 365) invalid('the optional annual policy must use a 365-day cap.');
  return policy.maxIntervalDays === undefined ? {} : { maxIntervalDays: 365 };
}
function validState(state          )       {
  if (!Number.isSafeInteger(state.repetitions) || state.repetitions < 0) invalid('repetitions must be a nonnegative safe integer.');
  if (!Number.isSafeInteger(state.intervalDays) || state.intervalDays < 0 || state.repetitions > 0 && state.intervalDays === 0) invalid('interval must be a nonnegative safe integer, positive after a success.');
  if (!Number.isFinite(state.easinessFactor) || state.easinessFactor < 1.3) invalid('easiness factor must be finite and at least 1.3.');
}

/** Updates EF first; the optional annual cap is an app policy, not the formula. */
function calculateNextReview(state                             , quality        , now = Date.now(), policy            = {})            {
  const previous = state ?? SM2_INITIAL_STATE;
  validState(previous); validTime(now);
  const q = qualityValue(quality), cap = policyValue(policy).maxIntervalDays;
  const distance = 5 - q;
  const easinessFactor = Math.max(1.3, previous.easinessFactor + (.1 - distance * (.08 + distance * .02)));
  const repetitions = q < 3 ? 0 : previous.repetitions + 1;
  let intervalDays = q < 3 || repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.ceil(previous.intervalDays * easinessFactor);
  if (cap !== undefined) intervalDays = Math.min(intervalDays, cap);
  if (!Number.isSafeInteger(repetitions) || !Number.isSafeInteger(intervalDays) || intervalDays < 1 || !Number.isFinite(easinessFactor)) invalid('the next schedule is outside the supported numeric range.');
  const next = validTime(now + intervalDays * SM2_DAY_MS);
  return { repetitions, intervalDays, easinessFactor, nextReviewAt: new Date(next).toISOString(), reviewedAt: new Date(now).toISOString() };
}

function scheduleSm2(state                             , quality        , now = Date.now(), policy            = {})            {
  return calculateNextReview(state, quality, now, policy);
}

/** Number-parameter compatibility with the supplied service example; dates are ISO UTC. */
class SM2Service {
  static calculateNextReview(quality        , currentInterval = 0, currentRepetitions = 0, easinessFactor = 2.5, now = Date.now()) {
    const result = calculateNextReview({ intervalDays: currentInterval, repetitions: currentRepetitions, easinessFactor }, quality, now);
    return { interval: result.intervalDays, repetitions: result.repetitions, easinessFactor: result.easinessFactor, nextReviewDate: result.nextReviewAt };
  }
  calculateNextReview(quality        , currentInterval = 0, currentRepetitions = 0, easinessFactor = 2.5, now = Date.now()) {
    return SM2Service.calculateNextReview(quality, currentInterval, currentRepetitions, easinessFactor, now);
  }
}

function srsKey(target           )         {
  if (!['vocabulary', 'kanji', 'question'].includes(target.type) || typeof target.id !== 'string' || target.id.length === 0 || target.id.length > 180 || /[\u0000-\u0020\u007f]/.test(target.id)) invalid('target type or ID is invalid.');
  return `${target.type}:${target.id}`;
}

function plainObject(value         , label        )                          {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid(`${label} must be an object.`);
  return value                           ;
}
function text(value         , label        )         {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) invalid(`${label} must be a bounded nonempty string.`);
  return value;
}
function iso(value         , label        )         {
  const result = text(value, label), time = validTime(Date.parse(result));
  if (new Date(time).toISOString() !== result) invalid(`${label} must be an ISO UTC date.`);
  return result;
}

/** Replays explicit quality events so imported dates, EF and counters cannot disagree. */
function validateSrsRecord(input         )            {
  const value = plainObject(input, 'record');
  if (value.algorithm !== 'sm2-ef-first-v1') invalid('the scheduling algorithm is unsupported.');
  const type = text(value.type, 'target type')                 , id = text(value.id, 'target ID');
  srsKey({ type, id });
  const maxIntervalDays = policyValue({ maxIntervalDays: value.maxIntervalDays                    }).maxIntervalDays;
  if (!Array.isArray(value.events) || value.events.length === 0 || value.events.length > 100_000) invalid('events must be a nonempty bounded array.');
  const seen = new Set        ();
  let replay                       , previousTime = -Infinity;
  const events             = value.events.map(raw => {
    const event = plainObject(raw, 'event'), eventId = text(event.eventId, 'event ID');
    if (seen.has(eventId)) invalid('event IDs must be unique within an item.');
    seen.add(eventId);
    const quality = qualityValue(event.quality          ), reviewedAt = iso(event.reviewedAt, 'rating date');
    const time = Date.parse(reviewedAt);
    if (time < previousTime) invalid('rating dates must be chronological.');
    previousTime = time;
    const previousNextReviewAt = event.previousNextReviewAt === undefined ? undefined : iso(event.previousNextReviewAt, 'previous due date');
    if (previousNextReviewAt !== replay?.nextReviewAt) invalid('the previous due date does not match the rating history.');
    const eventCap = policyValue({ maxIntervalDays: event.maxIntervalDays                    }).maxIntervalDays;
    replay = calculateNextReview(replay, quality, time, eventCap === undefined ? {} : { maxIntervalDays: eventCap });
    return { eventId, quality, reviewedAt, ...(previousNextReviewAt === undefined ? {} : { previousNextReviewAt }), ...(eventCap === undefined ? {} : { maxIntervalDays: eventCap }) };
  });
  if (!replay || value.repetitions !== replay.repetitions || value.intervalDays !== replay.intervalDays || value.easinessFactor !== replay.easinessFactor || value.nextReviewAt !== replay.nextReviewAt || value.lastReviewedAt !== replay.reviewedAt || maxIntervalDays !== events.at(-1)?.maxIntervalDays) invalid('record state does not match its explicit ratings.');
  return { algorithm: 'sm2-ef-first-v1', type, id, repetitions: replay.repetitions, intervalDays: replay.intervalDays, easinessFactor: replay.easinessFactor, nextReviewAt: replay.nextReviewAt, lastReviewedAt: replay.reviewedAt, events, ...(maxIntervalDays === undefined ? {} : { maxIntervalDays }) };
}

/** Only the SRS map changes. Existing grades, mistakes and completion choices stay separate. */
function rateSrsItem(progress          , target           , quality        , eventId        , now = Date.now(), policy            = {})           {
  const key = srsKey(target), q = qualityValue(quality);
  text(eventId, 'event ID'); validTime(now); policyValue(policy);
  const previous = progress.srs?.[key];
  if (previous?.events.some(event => event.eventId === eventId)) return progress;
  if (previous) {
    validateSrsRecord(previous);
    if (srsKey(previous) !== key) invalid('the saved record does not match the target.');
    if (previous.events.length >= 100_000) invalid('the item rating history has reached its supported limit.');
    if (now < Date.parse(previous.lastReviewedAt)) invalid('a new rating cannot precede its saved history.');
  }
  const cap = policy.maxIntervalDays ?? previous?.maxIntervalDays;
  const result = calculateNextReview(previous, q, now, cap === undefined ? {} : { maxIntervalDays: cap });
  const event           = { eventId, quality: q, reviewedAt: result.reviewedAt, ...(previous ? { previousNextReviewAt: previous.nextReviewAt } : {}), ...(cap === undefined ? {} : { maxIntervalDays: cap }) };
  const record            = { algorithm: 'sm2-ef-first-v1', type: target.type, id: target.id, repetitions: result.repetitions, intervalDays: result.intervalDays, easinessFactor: result.easinessFactor, nextReviewAt: result.nextReviewAt, lastReviewedAt: result.reviewedAt, events: [...(previous?.events ?? []), event], ...(cap === undefined ? {} : { maxIntervalDays: cap }) };
  return { ...progress, srs: { ...(progress.srs ?? {}), [key]: record } };
}

function dueSrsItems(progress                       , now = Date.now(), types                           = ['vocabulary', 'kanji', 'question'])              {
  validTime(now);
  return Object.values(progress.srs ?? {}).filter(record => types.includes(record.type) && Date.parse(record.nextReviewAt) <= now).sort((a, b) => Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt) || (srsKey(a) < srsKey(b) ? -1 : srsKey(a) > srsKey(b) ? 1 : 0));
}
return {SM2_INITIAL_STATE,SM2_DAY_MS,SM2_QUALITY_LABELS,calculateNextReview,scheduleSm2,SM2Service,srsKey,validateSrsRecord,rateSrsItem,dueSrsItems};
})();
global.KotobaSm2=compiled["src/lib/sm2.ts"];
})(window);
