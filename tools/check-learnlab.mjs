// Verify the actual local learning model and canonical course, without npm.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts')&&!/\.[a-z]+$/i.test(specifier)){for(const suffix of ['.ts','/index.ts']){const url=new URL(specifier+suffix,context.parentURL);if(existsSync(fileURLToPath(url)))return next(url.href,context);}}return next(specifier,context);}});
const C=await import('../src/content/index.ts');
const L=await import('../src/lib/learnlab.ts');
const now=Date.UTC(2026,9,12,12),day=86400000;
const active=state=>state.sessions.find(session=>session.id===state.activeSessionId);
const start=(mode='recall',extra={})=>L.createSession(L.initialLearnLab(),{mode,level:'n3',count:4,now,random:()=>.3,...extra});
const answerFor=exercise=>exercise.kind==='sentence'?exercise.bank.slice().sort((a,b)=>Number(a.id)-Number(b.id)).map(token=>token.id):exercise.kind==='pairs'?Object.fromEntries(exercise.words.map(word=>[word.id,word.id])):exercise.kind==='bonus'?String(exercise.bonus.correct):exercise.kind==='choice'?exercise.target.id:exercise.target.reading;
let checks=0;
function check(name,run){run();checks++;console.log('PASS '+name);}
check('old progress can default an absent optional lab without inventing assessment history',()=>{const fresh=L.validateLearnLab(undefined);assert.deepEqual(fresh,L.initialLearnLab());assert.deepEqual(fresh.reviews,{});assert.equal(fresh.activeSessionId,null);});
check('all five levels get short sessions with 3–5 canonical concepts and at least 20 percent retrieval',()=>{
  for(const level of ['n5','n4','n3','n2','n1'])for(const count of [3,4,5])for(const mode of ['recall','sentence','pairs','dictation','bonus']){
    const state=start(mode,{level,count}),session=active(state);assert.equal(session.level,level);if(mode!=='bonus')assert.equal(session.newWordIds.length,count);assert.ok(session.queue.filter(item=>item.retrieval).length/session.queue.length>=.2,mode);assert.deepEqual(L.validateLearnLab(state),state);
    for(const item of session.queue)for(const id of item.wordIds)assert.equal(C.vocabulary.find(word=>word.id===id).jlptLevel||'n3',level);
  }
});
check('earlier studied words are retrieved without being presented as the new word set',()=>{
  const prior=C.vocabulary.filter(word=>(word.jlptLevel||'n3')==='n3').slice(0,5).map(word=>word.id);const state=start('recall',{studiedWordIds:prior}),session=active(state);
  assert.ok(session.newWordIds.every(id=>!prior.includes(id)));assert.ok(session.queue.filter(item=>item.retrieval).every(item=>prior.includes(item.wordIds[0])));
});
check('normalization accepts width, kana-script and harmless punctuation differences',()=>{
  assert.equal(L.normalizeAnswer('　レンラク。 '),'れんらく');assert.equal(L.normalizeAnswer('よ て い！'),'よてい');
  const session={queue:[{id:'x',kind:'recall',wordIds:['v-contact'],retrieval:false}],cursor:0};const exercise=L.currentExercise(session);
  for(const input of ['連絡','れんらく','レンラク。'])assert.equal(L.gradeResponse(exercise,input).outcome,'exact');
});
check('a small kana typo is explicit and earns no exact recall credit',()=>{
  const exercise=L.currentExercise({queue:[{id:'x',kind:'recall',wordIds:['v-contact'],retrieval:false}],cursor:0});const typo=L.gradeResponse(exercise,'れんらけ');
  assert.equal(typo.outcome,'typo');assert.equal(typo.accepted,true);assert.equal(typo.masteryCredit,false);assert.ok(typo.feedback.includes('Correct with a typo'));assert.equal(L.gradeResponse(exercise,'練絡').outcome,'incorrect');
});
check('one-mora words and another real dictionary word never pass as typos',()=>{
  const one=C.vocabulary.find(word=>word.reading.length===1);assert.ok(one);const make=word=>L.currentExercise({queue:[{id:'x',kind:'recall',wordIds:[word.id],retrieval:false}],cursor:0});assert.equal(L.gradeResponse(make(one),'あ').outcome,one.reading==='あ'?'exact':'incorrect');
  const source=C.vocabulary.find(word=>C.vocabulary.some(other=>other.id!==word.id&&L.editDistance(L.normalizeAnswer(word.reading),L.normalizeAnswer(other.reading))===1&&other.reading!==word.reading));
  const other=C.vocabulary.find(word=>word.id!==source.id&&L.editDistance(L.normalizeAnswer(source.reading),L.normalizeAnswer(word.reading))===1&&word.reading!==source.reading);assert.equal(L.gradeResponse(make(source),other.reading).outcome,'incorrect');
});
check('optional romaji assistance converts familiar combinations without requiring an external IME',()=>{assert.equal(L.romajiToKana('renraku'),'れんらく');assert.equal(L.romajiToKana('gakkou'),'がっこう');assert.equal(L.romajiToKana("kin'youbi"),'きんようび');assert.equal(L.romajiToKana('変更'),'変更');});
check('sentence word banks preserve original Japanese and separate useful particles',()=>{
  const tokens=L.sentenceTokens('私は図書館で本を借ります。');assert.equal(tokens.join(''),'私は図書館で本を借ります。');for(const particle of ['は','で','を'])assert.ok(tokens.includes(particle));assert.ok(tokens.includes('図書館'));assert.ok(L.sentenceTokens('電車に間に合う。').includes('間に合う'),'Known multi-part expressions stay semantic units');
  let state=L.beginSession(start('sentence'),active(start('sentence')).id,now+100);const exercise=L.currentExercise(active(state));assert.equal(L.gradeResponse(exercise,answerFor(exercise)).outcome,'exact');assert.equal(L.gradeResponse(exercise,answerFor(exercise).slice(1)).outcome,'incorrect');
});
check('pair rounds require all three to five actual word and meaning matches',()=>{
  const session=active(start('pairs')),exercise=L.currentExercise(session);assert.ok(exercise.words.length>=3&&exercise.words.length<=5);assert.equal(L.gradeResponse(exercise,answerFor(exercise)).outcome,'exact');const wrong=answerFor(exercise);wrong[exercise.words[0].id]=exercise.words[1].id;assert.equal(L.gradeResponse(exercise,wrong).outcome,'incorrect');
});
check('begin, saved resume, stale answers and duplicate events preserve a single grade per step',()=>{
  let state=start(),session=active(state),exercise=L.currentExercise(session);assert.equal(L.answerSession(state,session.id,exercise.id,exercise.target.reading,now+100),state,'Preview cannot be graded');
  state=L.beginSession(state,session.id,now+200);assert.equal(L.beginSession(state,session.id,now+300),state);session=active(state);exercise=L.currentExercise(session);
  const answered=L.answerSession(state,session.id,exercise.id,exercise.target.reading,now+1200);assert.equal(active(answered).results.length,1);assert.equal(active(answered).results[0].latencyMs,1000);assert.equal(L.answerSession(answered,session.id,exercise.id,'wrong',now+1500),answered);assert.deepEqual(L.validateLearnLab(JSON.parse(JSON.stringify(answered))),answered);
});
check('a missed lesson ends with an actual easier challenge and completion is idempotent',()=>{
  let state=start();state=L.beginSession(state,active(state).id,now+1);const id=active(state).id;let timestamp=now+100;let first=true;
  while(L.currentExercise(active(state))){const exercise=L.currentExercise(active(state));state=L.answerSession(state,id,exercise.id,first?'wrong':answerFor(exercise),timestamp);first=false;timestamp+=100;}
  const session=active(state),final=session.queue.at(-1);assert.equal(final.kind,'choice');assert.equal(final.final,true);assert.equal(final.choices.length,4);assert.equal(final.wordIds[0],session.queue[0].wordIds[0]);
  const complete=L.finishSession(state,id,timestamp);assert.equal(complete.activeSessionId,null);assert.equal(complete.sessions.at(-1).status,'complete');assert.equal(complete.reviews[final.wordIds[0]].exactStreak,0);assert.equal(complete.reviews[final.wordIds[0]].dueAt,timestamp+day);assert.equal(L.finishSession(complete,id,timestamp+100),complete);assert.deepEqual(L.validateLearnLab(complete),complete);
});
check('abandoning a session keeps partial study history without pretending it was completed',()=>{const state=start();const abandoned=L.abandonSession(state,active(state).id,now+100);assert.equal(abandoned.sessions.at(-1).status,'abandoned');assert.deepEqual(abandoned.reviews,{});assert.deepEqual(L.validateLearnLab(abandoned),abandoned);});
check('forged targets, grades, cursors, bonus IDs and queues are rejected',()=>{
  const state=L.beginSession(start(),active(start()).id,now+10);const corruptions=[s=>s.sessions[0].queue[0].wordIds=['unknown'],s=>s.sessions[0].cursor=3,s=>s.sessions[0].queue[0].id='stale',s=>s.activeSessionId='lab-0-0',s=>s.sessions[0].queue[0].kind='choice',s=>s.sessions[0].newWordIds=[]];for(const corrupt of corruptions){const bad=structuredClone(state);corrupt(bad);assert.throws(()=>L.validateLearnLab(bad),/Invalid learning lab/);}
  const exercise=L.currentExercise(active(state)),answered=L.answerSession(state,active(state).id,exercise.id,'wrong',now+100);answered.sessions[0].results[0].outcome='exact';assert.throws(()=>L.validateLearnLab(answered),/result grade/);
});
const draft={version:1,id:'draft-greeting',kind:'vocabulary',level:'n3',topicId:'communication',title:'A local draft',word:'連絡',reading:'れんらく',meaning:'contact',body:'先生に連絡しました。',translation:'I contacted the teacher.',sourceNote:'Original personal draft.'};
check('local drafts validate, edit and export without joining the canonical assessment bank',()=>{
  const before=C.vocabulary.length;const fresh=L.initialLearnLab();const saved=L.saveDraft(fresh,draft);assert.equal(saved.drafts.length,1);assert.equal(fresh.drafts.length,0);const edited=L.saveDraft(saved,{...draft,title:'Edited draft'});assert.equal(edited.drafts.length,1);assert.equal(edited.drafts[0].title,'Edited draft');assert.deepEqual(L.validateDraft(JSON.parse(JSON.stringify(edited.drafts[0]))),edited.drafts[0]);assert.equal(C.vocabulary.length,before);assert.deepEqual(L.validateLearnLab(edited),edited);
});
check('malformed drafts and reports reject unknown metadata, oversized content and invalid readings',()=>{
  for(const patch of [{version:2},{id:'../escape'},{kind:'html'},{level:'n0'},{topicId:'unknown'},{reading:'renraku'},{body:''},{translation:'x'.repeat(8001)}])assert.throws(()=>L.validateDraft({...draft,...patch}),/Invalid learning lab/);
  const state=L.initialLearnLab();assert.throws(()=>L.addReport(state,'unknown','typo','Fix this.'),/report content/);assert.throws(()=>L.addReport(state,'v-contact','publish','Fix this.'),/report reason/);assert.throws(()=>L.addReport(state,'v-contact','typo',''),/report message/);assert.throws(()=>L.addReport(state,'v-contact','typo','x'.repeat(1201)),/report message/);
});
check('reports group by canonical content and resolution stays entirely local',()=>{
  let state=L.addReport(L.initialLearnLab(),'v-contact','reading','Please review the reading.',now);state=L.addReport(state,'v-contact','translation','Please review the example.',now+1);state=L.addReport(state,'v-plan','typo','A local note.',now+2);assert.equal(L.groupReports(state)['v-contact'].length,2);const resolved=L.resolveReport(state,state.reports[0].id);assert.equal(resolved.reports[0].status,'resolved');assert.equal(state.reports[0].status,'open');assert.deepEqual(L.validateLearnLab(resolved),resolved);
});
check('bonus lessons distinguish the three keigo categories and sound/state symbolism without fake pitch data',()=>{
  for(const category of ['Keigo · Sonkeigo','Keigo · Kenjougo','Keigo · Teineigo','Onomatopoeia · Giongo','Onomatopoeia · Gitaigo'])assert.ok(L.bonusLessons.some(lesson=>lesson.category===category));
  assert.ok(L.bonusLessons.some(lesson=>lesson.category==='Verb pairs'));assert.ok(L.bonusLessons.some(lesson=>lesson.category==='Culture'));assert.ok(L.bonusLessons.some(lesson=>lesson.category==='Grammar forms'));assert.ok(L.bonusLessons.every(lesson=>lesson.options.length===4&&lesson.feedback.length>30));
  const note=L.wordNotes('v-contact');assert.equal(note.wordClass,C.vocabulary.find(word=>word.id==='v-contact').wordClass);assert.equal(Object.hasOwn(note,'pitch'),false);
});
console.log(`${checks} learning-lab checks passed. This separate self-study model never assigns an official or canonical exam grade.`);
