import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts')&&!/\.[a-z]+$/i.test(specifier))for(const suffix of ['.ts','/index.ts']){
    const url=new URL(specifier+suffix,context.parentURL);if(existsSync(fileURLToPath(url)))return next(url.href,context);
  }return next(specifier,context);
}});
const C=await import('../src/content/index.ts'), E=await import('../src/lib/engine.ts'), S=await import('../src/lib/storage.ts'), M=await import('../src/lib/sm2.ts');
const baseline=JSON.parse(readFileSync(new URL('./content-baseline-2026.10.4.json',import.meta.url),'utf8'));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const families=['vocabulary','kanji','grammar','readings','listening','questions'],levels=['n5','n4','n3','n2','n1'];
const levelOf=item=>item.jlptLevel||'n3', added=kind=>C[kind].filter(item=>item.id.startsWith('ds-'));
const byId=new Map(families.flatMap(kind=>C[kind]).map(item=>[item.id,item]));
const questionMap=Object.fromEntries(C.questions.map(q=>[q.id,q]));
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}

check('every level grows across vocabulary, grammar, reading, listening and actual linked questions',()=>{
  assert.equal(C.CONTENT_VERSION,'2026.10.5');
  for(const level of levels){
    const row=C.datasetInventory.find(row=>row.level===level);assert.ok(row);
    assert.ok(row.added.vocabulary>=(level==='n3'?50:100),level+' vocabulary');
    assert.ok(row.added.grammar>=10&&row.added.readings>=4&&row.added.listening>=6,level+' all skills');
    assert.ok(row.added.questions>=row.added.vocabulary+40,level+' genuine question growth');
    for(const kind of ['vocabulary','grammar','readings','listening','questions'])assert.equal(row[kind],C[kind].filter(item=>levelOf(item)===level).length);
  }
});
check('every prior content item and canonical answer is unchanged; old kanji links only expand',()=>{
  for(const family of families)for(const [id,expected] of Object.entries(baseline.itemHashes[family])){
    const item=C[family].find(item=>item.id===id);assert.ok(item,'Missing '+id);
    if(family==='kanji'){
      const {wordIds,...fields}=item,prior=baseline.kanjiFields[id];assert.equal(hash(fields),prior.fieldsHash,id);
      for(const linked of prior.wordIds)assert.ok(wordIds.includes(linked),id+' loses '+linked);
    }else assert.equal(hash(item),expected,id+' changed canonical content');
  }
});
check('every previously saved lesson retains exactly its original targets, context and retrieval',()=>{
  const lessons=new Map(C.learningPath.flatMap(plan=>plan.units.flatMap(unit=>unit.lessons)).map(lesson=>[lesson.id,lesson]));
  for(const [id,expected] of Object.entries(baseline.pathLessons))assert.equal(hash(lessons.get(id)),expected,id+' changed a saved lesson');
  assert.equal(lessons.size,C.learningPath.flatMap(plan=>plan.units.flatMap(unit=>unit.lessons)).length);
});
check('new words have unique spellings, kana readings, explicit classes and faithful original contexts',()=>{
  assert.equal(new Set(C.vocabulary.map(word=>word.word.normalize('NFKC'))).size,C.vocabulary.length);
  for(const word of added('vocabulary')){
    assert.ok(levels.includes(word.jlptLevel)&&C.topics.some(t=>t.id===word.topicId),word.id);
    assert.match(word.reading,/^[\p{Script=Hiragana}\p{Script=Katakana}ー・ ]+$/u,word.id);
    assert.ok(word.meaning.trim()&&word.wordClass.trim()&&word.exampleTranslation.trim(),word.id);
    assert.ok(word.example.includes(word.word),word.id+' context omits spelling');
    for(const character of [...word.word].filter(char=>/\p{Script=Han}/u.test(char)))assert.ok(C.kanji.some(k=>k.character===character&&k.wordIds.includes(word.id)),word.id+' missing kanji link');
    assert.ok(C.questions.some(q=>q.vocabularyId===word.id&&q.skill==='vocabulary'),word.id+' missing retrieval');
  }
});
check('new grammar includes attachment rules, contrasts, corrected errors and two canonical exercises',()=>{
  for(const g of added('grammar')){
    assert.ok(g.attachment.length&&g.examples.length>=2&&g.comparison.trim()&&g.meaning.trim(),g.id);
    assert.notEqual(g.mistake.wrong,g.mistake.correct);assert.ok(g.mistake.explanation.trim());
    assert.equal(new Set(g.questionIds).size,2);for(const id of g.questionIds)assert.equal(byId.get(id)?.grammarId,g.id);
    assert.ok(C.referenceMap.some(ref=>ref.level===g.jlptLevel&&ref.skill==='grammar'&&ref.appContentIds.includes(g.id)),g.id+' lacks an honest topic reference');
  }
});
check('new passages and playable scripts have two questions with exact supporting evidence',()=>{
  for(const kind of ['readings','listening'])for(const source of added(kind)){
    const text=source.body||source.script;assert.ok(text.length>=60&&source.translation.length>=40,source.id);
    assert.equal(new Set(source.questionIds).size,2);
    assert.equal(source.audioUrl,undefined,'Do not bundle unlicensed publisher recordings');
    for(const id of source.questionIds){
      const q=byId.get(id);assert.equal(q?.passageId||q?.listeningId,source.id);
      const evidence=q.evidence||'',quotes=[...evidence.matchAll(/「([^」]+)」/g)].map(match=>match[1]);
      assert.ok(evidence.trim()&&(text.includes(evidence)||quotes.length>0&&quotes.every(quote=>text.includes(quote))),id+' unsupported answer evidence');
    }
  }
});
check('new canonical options are unique, completely explained and grade independently of shuffle position',()=>{
  for(const q of added('questions')){
    assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options.map(o=>o.text)).size,4,q.id);assert.equal(new Set(q.options.map(o=>o.id)).size,4,q.id);
    assert.equal(q.options.filter(o=>o.id===q.correctOptionId).length,1);for(const o of q.options)assert.ok(q.explanations[o.id]?.trim());
    const a=E.createAttempt([q],'practice',{now:Date.UTC(2026,9,9,8),random:()=>.7,listeningAccess:'audio'});
    a.answers[q.id]=q.correctOptionId;assert.equal(E.gradeAttempt(a,questionMap).correct,1,q.id);
  }
});
check('N2 and N1 add genuine dedicated quick-response practice in the listening collection',()=>{
  for(const level of ['n2','n1']){
    const sources=added('listening').filter(s=>s.jlptLevel===level&&s.questionIds.some(id=>byId.get(id)?.questionType==='listening-response'));
    assert.ok(sources.length>=2,level+' response scripts');
    for(const source of sources)assert.ok(source.script&&source.translation&&source.questionIds.every(id=>byId.get(id).skill==='listening'));
  }
});
check('all five levels have integrated paths and truthful references without fabricated N5 Kanzen books',()=>{
  for(const level of levels){const plan=C.learningPath.find(p=>p.level===level);assert.ok(plan);
    for(const unit of plan.units)for(const lesson of unit.lessons)for(const id of lesson.referenceIds)assert.ok(C.referenceMap.some(ref=>ref.id===id),lesson.id+' nonexistent reference '+id);
  }
  assert.equal(C.referenceMap.filter(ref=>ref.level==='n5'&&ref.series==='Shin Kanzen Master').length,0);
});
check('source guide deduplicates actual books, records inspected primary pages and maps original additions',()=>{
  const sourceIds=new Set(C.datasetSources.map(s=>s.id));assert.equal(sourceIds.size,C.datasetSources.length);
  assert.equal(C.datasetSources.filter(s=>s.id.startsWith('book-')).length,new Set(C.referenceMap.map(ref=>ref.isbn)).size);
  for(const source of C.datasetSources){assert.match(source.sourceUrl,/^https:\/\/(www\.jlpt\.jp|www\.irodori\.jpf\.go\.jp|ask-books\.com|www\.3anet\.co\.jp)\//);assert.equal(source.checkedAt,'2026-10-09');assert.ok(source.edition&&source.verifiedTopic&&source.limits.length);}
  for(const entry of C.datasetAssociations){assert.ok(entry.sourceIds.length&&entry.remainingGaps.length);for(const id of entry.sourceIds)assert.ok(sourceIds.has(id));for(const id of entry.appContentIds)assert.ok(byId.has(id)&&levelOf(byId.get(id))===entry.level);}
  for(const g of added('grammar'))assert.ok(C.datasetAssociations.some(a=>a.skill==='grammar'&&a.appContentIds.includes(g.id)));
  for(const s of C.datasetSources.filter(s=>s.id.startsWith('jpf-')))assert.ok(s.limits.some(limit=>limit.includes('not an official crosswalk')));
});
check('new vocabulary and added paths survive backup validation without inventing completion or mastery',()=>{
  const now=Date.UTC(2026,9,9,8);let p=E.initialProgress();
  for(const level of levels){const word=added('vocabulary').find(v=>v.jlptLevel===level);p=M.rateSrsItem(p,{type:'vocabulary',id:word.id},4,'dataset-rating-'+level,now);p.bookmarks.push(word.id);}
  p.settings.pathResume=C.learningPath.find(p=>p.level==='n5').units[0].lessons[0].id;
  const restored=S.validateProgress(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored,p);assert.deepEqual(restored.reviews,{});assert.deepEqual(restored.completedTasks,[]);
});
check('2026.10.4 snapshots retain old bookmarks, checks, answers, resume and SRS when migrating',()=>{
  const now=Date.UTC(2026,9,9,8),q=C.questions.find(q=>q.id==='q-g-01');let p=E.initialProgress();
  const attempt=E.createAttempt([q],'practice',{now,random:()=>.3});attempt.answers[q.id]=q.correctOptionId;p.attempts.push(attempt);p.activeAttemptId=attempt.id;
  p.bookmarks=['v-plan'];p.settings.pathResume='n3-day-1';p.completedTasks=['vocabulary:v-plan','path:n3-day-1'];p=M.rateSrsItem(p,{type:'vocabulary',id:'v-plan'},4,'legacy-dataset-rating',now);
  p.contentVersion='2026.10.4';const saved=JSON.stringify(p),restored=S.validateProgress(JSON.parse(saved));
  assert.equal(restored.contentVersion,C.CONTENT_VERSION);assert.deepEqual({...restored,contentVersion:'2026.10.4'},p);assert.equal(JSON.stringify(p),saved);
});
console.log(passed+' dataset growth, source integrity and compatibility checks passed. Linguistic review remains an editorial task.');
