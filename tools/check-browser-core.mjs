// Executes the checked-in classic scripts. This validates generated core behavior, not browser DOM rendering.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
const context = vm.createContext({ console, assert, localStorage: storage });
context.window = context;
for (const name of ['content', 'engine', 'storage', 'audio', 'quiz']) {
  const source = await readFile(new URL(`../web/${name}.js`, import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*(?:import|export)\b/m, `${name} must be a classic script.`);
  vm.runInContext(source, context, { filename: `web/${name}.js` });
}

let checks = 0;
function check(name, code) {
  vm.runInContext(`(() => { ${code}\n })()`, context, { filename: `check: ${name}` });
  checks++;
  console.log(`PASS ${name}`);
}
vm.runInContext(`
  const C = KotobaContent, E = KotobaEngine, S = KotobaStorage;
  const questionMap = Object.fromEntries(C.questions.map(q => [q.id, q]));
  const first = C.questions.find(q => q.skill === 'vocabulary');
  const second = C.questions.find(q => q.skill === 'grammar');
  const listeningQuestion = C.questions.find(q => q.skill === 'listening');
  const now = Date.now();
  const attach = (progress, attempt) => ({...progress, attempts:[...progress.attempts,attempt], activeAttemptId:attempt.id});
`, context);

check('classic namespaces expose complete core and DOM render contracts', `
  assert.ok(C.vocabulary.length >= 24 && C.kanji.length >= 12 && C.grammar.length >= 5 && C.readings.length >= 3 && C.listening.length >= 2 && C.questions.length >= 30);
  for (const name of ['initialProgress','createAttempt','selectAnswer','checkAnswer','submitAttempt','gradeAttempt','aggregateAccuracy','remainingSeconds','localDateKey','markStudied','markReviewed']) assert.equal(typeof E[name], 'function');
  for (const name of ['validateProgress','loadProgress','saveProgress']) assert.equal(typeof S[name], 'function');
  assert.equal(typeof KotobaQuiz.render, 'function'); assert.equal(typeof KotobaAudio.render, 'function'); assert.equal(typeof KotobaAudio.stop, 'function');
`);
check('shuffled canonical answers grade correctly and unanswered items remain incorrect', `
  const attempt = E.createAttempt([first,second], 'practice', {now, random:()=>0});
  assert.notDeepEqual(attempt.optionOrders[first.id], first.options.map(option => option.id));
  const progress = E.selectAnswer(attach(E.initialProgress(),attempt),attempt.id,first.id,first.correctOptionId);
  const grade = E.gradeAttempt(progress.attempts[0],questionMap);
  assert.equal(grade.correct,1); assert.equal(grade.total,2); assert.equal(grade.unanswered,1);
  assert.equal(grade.items.find(item => item.questionId === second.id).correct,false);
  S.validateProgress(progress);
`);
check('submission and review side effects happen exactly once', `
  const attempt = E.createAttempt([first], 'practice', {now});
  const progress = E.submitAttempt(attach(E.initialProgress(),attempt),attempt.id,questionMap,now);
  assert.equal(E.submitAttempt(progress,attempt.id,questionMap,now+1000),progress);
  assert.equal(Object.keys(progress.reviews).length,1);
  assert.equal(progress.reviews[first.id].lastAnswerId,null);
  assert.equal(E.selectAnswer(progress,attempt.id,first.id,first.correctOptionId),progress);
  const reviewed = E.markReviewed(progress,attempt.id);
  assert.equal(reviewed.attempts[0].status,'reviewed'); assert.equal(reviewed.activeAttemptId,null);
  S.validateProgress(reviewed);
`);
check('learning checks lock answers and mini mock feedback stays withheld', `
  const learning = E.createAttempt([first], 'practice', {now});
  let progress = E.selectAnswer(attach(E.initialProgress(),learning),learning.id,first.id,first.correctOptionId);
  progress = E.checkAnswer(progress,learning.id,first.id);
  assert.deepEqual(progress.attempts[0].checkedIds,[first.id]);
  assert.equal(E.selectAnswer(progress,learning.id,first.id,first.options.find(option => option.id !== first.correctOptionId).id),progress);
  const mock = E.createAttempt([first], 'mock', {now,durationMinutes:15});
  const answered = E.selectAnswer(attach(E.initialProgress(),mock),mock.id,first.id,first.correctOptionId);
  assert.equal(E.checkAnswer(answered,mock.id,first.id),answered);
`);
check('absolute deadlines and shuffle orders survive storage reload', `
  const attempt = E.createAttempt([first,second], 'mock', {now,durationMinutes:15,random:()=>0});
  const progress = E.selectAnswer(attach(E.initialProgress(),attempt),attempt.id,first.id,first.correctOptionId);
  assert.equal(S.saveProgress(progress).saved,true);
  const loaded = S.loadProgress(); assert.equal(loaded.warning,undefined); assert.deepEqual(loaded.progress,progress);
  assert.equal(loaded.progress.attempts[0].deadline,now+900000);
  assert.equal(E.remainingSeconds(loaded.progress.attempts[0],now+60000),840);
`);
check('a truly expired deadline blocks answers and submits once', `
  const attempt = E.createAttempt([first], 'mock', {now:now-120000,durationMinutes:1});
  const progress = S.validateProgress(JSON.parse(JSON.stringify(attach(E.initialProgress(),attempt))));
  assert.equal(E.remainingSeconds(progress.attempts[0]),0);
  assert.equal(E.selectAnswer(progress,attempt.id,first.id,first.correctOptionId),progress);
  const submitted = E.submitAttempt(progress,attempt.id,questionMap);
  assert.equal(E.gradeAttempt(submitted.attempts[0],questionMap).unanswered,1);
  assert.equal(E.submitAttempt(submitted,attempt.id,questionMap),submitted);
  S.validateProgress(submitted);
`);
check('script study and audio failures never count as listening assessments', `
  const script = E.createAttempt([listeningQuestion],'listening',{now,listeningAccess:'script'});
  script.answers[listeningQuestion.id] = listeningQuestion.correctOptionId;
  const studied = E.submitAttempt(attach(E.initialProgress(),script),script.id,questionMap,now);
  assert.equal(E.gradeAttempt(studied.attempts[0],questionMap).total,0); assert.equal(Object.keys(studied.reviews).length,0);
  const failure = E.createAttempt([listeningQuestion],'listening',{now,listeningAccess:'audio'});
  failure.excludedIds = [listeningQuestion.id];
  assert.equal(E.gradeAttempt(failure,questionMap).total,0);
`);
check('repeated fresh practice is retry accuracy in submission chronology', `
  const firstAttempt = E.createAttempt([first],'practice',{now});
  firstAttempt.answers[first.id] = first.options.find(option => option.id !== first.correctOptionId).id;
  let progress = E.submitAttempt(attach(E.initialProgress(),firstAttempt),firstAttempt.id,questionMap,now);
  const repeat = E.createAttempt([first,second],'practice',{now:now+1000});
  repeat.answers[first.id] = first.correctOptionId; repeat.answers[second.id] = second.correctOptionId;
  progress = E.submitAttempt(attach(progress,repeat),repeat.id,questionMap,now+1000);
  progress.attempts.reverse();
  const accuracy = E.aggregateAccuracy(progress,questionMap);
  assert.equal(accuracy.initial.total,2); assert.equal(accuracy.initial.correct,1);
  assert.equal(accuracy.retry.total,1); assert.equal(accuracy.retry.correct,1);
  assert.equal(progress.reviews[first.id].streak,0);
`);
check('early retries cannot master; due successes and later misses update review correctly', `
  const attempt = E.createAttempt([first],'practice',{now});
  let progress = E.submitAttempt(attach(E.initialProgress(),attempt),attempt.id,questionMap,now);
  const retry = (time,correct=true) => {
    const next = E.createAttempt([first],'review',{now:time});
    next.answers[first.id] = correct ? first.correctOptionId : first.options.find(option => option.id !== first.correctOptionId).id;
    progress = E.submitAttempt(attach(progress,next),next.id,questionMap,time);
  };
  const due = progress.reviews[first.id].dueAt;
  retry(now+1000); assert.equal(progress.reviews[first.id].streak,0); assert.equal(progress.reviews[first.id].dueAt,due);
  for (let streak=1;streak<=3;streak++) {retry(Date.parse(progress.reviews[first.id].dueAt));assert.equal(progress.reviews[first.id].streak,streak);}
  assert.equal(progress.reviews[first.id].mastered,true);
  retry(Date.parse(progress.reviews[first.id].dueAt),false);
  assert.equal(progress.reviews[first.id].mastered,false);assert.equal(progress.reviews[first.id].streak,0);
  S.validateProgress(progress);
`);
check('invalid imports reject canonical references, order corruption and inconsistent status', `
  const progress = attach(E.initialProgress(),E.createAttempt([first],'mock',{now,durationMinutes:15}));
  const clone = () => JSON.parse(JSON.stringify(progress));
  const unknown = clone();unknown.bookmarks.push('unknown-content');assert.throws(()=>S.validateProgress(unknown));
  const order = clone();order.attempts[0].optionOrders[first.id][1]=order.attempts[0].optionOrders[first.id][0];assert.throws(()=>S.validateProgress(order));
  const answer = clone();answer.attempts[0].answers[first.id]='unknown-answer';assert.throws(()=>S.validateProgress(answer));
  const status = clone();status.attempts[0].status='submitted';assert.throws(()=>S.validateProgress(status));
`);
values.set(context.KotobaStorage.STORAGE_KEY, '{invalid');
check('invalid saved JSON is retained while safe fallback reports a warning', `
  assert.ok(S.loadProgress().warning);assert.deepEqual(S.loadProgress().progress,E.initialProgress());
  assert.equal(localStorage.getItem(S.STORAGE_KEY),'{invalid');
`);
context.localStorage = { getItem: storage.getItem, setItem() { throw new Error('Quota exceeded'); } };
check('quota failures never claim a successful save', `
  assert.equal(S.saveProgress(E.initialProgress()).saved,false);
  assert.equal(localStorage.getItem(S.STORAGE_KEY),'{invalid');
`);
Object.defineProperty(context, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
check('blocked storage reports unsaved state without throwing out of the abstraction', `
  assert.ok(S.loadProgress().warning);assert.equal(S.saveProgress(E.initialProgress()).saved,false);
`);
console.log(`\n${checks} generated-browser core checks passed. Browser DOM, layout, keyboard, and audio checks are separate.`);
