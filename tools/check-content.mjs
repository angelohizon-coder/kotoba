// Structural, coverage, and canonical-answer checks against the actual editable course.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
registerHooks({resolve(specifier,context,next){
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/i.test(specifier)) {
    for (const suffix of ['.ts','/index.ts']) {const url=new URL(specifier+suffix,context.parentURL);if(existsSync(fileURLToPath(url)))return next(url.href,context);}
  }return next(specifier,context);
}});
const C=await import('../src/content/index.ts');
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label);}
const wordMap=new Map(C.vocabulary.map(v=>[v.id,v]));
const questionMap=new Map(C.questions.map(q=>[q.id,q]));
const topicIds=new Set(C.topics.map(t=>t.id));
const counts={vocabulary:C.vocabulary.length,kanji:C.kanji.length,grammar:C.grammar.length,readings:C.readings.length,listening:C.listening.length,questions:C.questions.length};
check('expanded course reaches substantial content targets',()=>{
  assert.ok(counts.vocabulary>=430);assert.ok(counts.kanji>=192);assert.ok(counts.grammar>=100);assert.ok(counts.readings>=20);assert.ok(counts.listening>=18);assert.ok(counts.questions>=800);
});
check('all IDs, vocabulary spellings, and kanji characters are unique',()=>{
  for(const items of [C.vocabulary,C.kanji,C.grammar,C.readings,C.listening,C.questions])assert.equal(new Set(items.map(v=>v.id)).size,items.length);
  assert.equal(new Set(C.vocabulary.map(v=>v.word+'|'+v.reading)).size,C.vocabulary.length);
  assert.equal(new Set(C.kanji.map(k=>k.character)).size,C.kanji.length);
});
check('every question has four unique choices, one key, and four explanations',()=>{
  for(const q of C.questions){assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options.map(o=>o.id)).size,4,q.id);assert.equal(new Set(q.options.map(o=>o.text.trim())).size,4,q.id);assert.equal(q.options.filter(o=>o.id===q.correctOptionId).length,1,q.id);for(const o of q.options)assert.ok(q.explanations[o.id]?.length>=15,`${q.id}/${o.id}`);}
});
check('all 18 everyday topics have study material and assessment questions',()=>{
  assert.equal(C.topics.length,18);
  for(const t of C.topics){assert.ok(C.vocabulary.filter(v=>v.topicId===t.id).length>=15,t.id);assert.ok(C.questions.some(q=>q.topicId===t.id),t.id);}
  for(const collection of [C.vocabulary,C.kanji,C.grammar,C.readings,C.listening,C.questions])for(const v of collection)assert.ok(topicIds.has(v.topicId),v.id+' topic');
});
check('all 17 N3 question-category study adaptations are represented',()=>{
  assert.equal(C.questionTypes.length,21);const types=new Set(C.questionTypes.map(t=>t.id));
  for(const t of C.questionTypes)assert.ok(C.questions.filter(q=>q.questionType===t.id).length>=(['word-formation','reading-integrated','reading-thematic','listening-integrated'].includes(t.id)?1:3),t.id);
  for(const q of C.questions)assert.ok(types.has(q.questionType),q.id+' question type');
});
check('reference routes and original six-week plan cover the complete topic map',()=>{
  assert.deepEqual(new Set(C.studyReferences.map(r=>r.id)),new Set(['deep','context','daily','exam']));
  for(const r of C.studyReferences){assert.ok(r.title&&r.approach.length>60);assert.equal(new URL(r.sourceUrl).protocol,'https:');}
  assert.deepEqual(C.studyPlan.map(w=>w.week),[1,2,3,4,5,6]);
  const scheduled=C.studyPlan.flatMap(w=>w.topicIds);
  assert.equal(scheduled.length,18);assert.deepEqual(new Set(scheduled),topicIds);
  for(const w of C.studyPlan)assert.equal(w.topicIds.length,3);
});
check('vocabulary readings and kanji links are usable',()=>{
  for(const v of C.vocabulary){assert.ok(/^[\p{Script=Hiragana}\p{Script=Katakana}ー・\s]+$/u.test(v.reading),v.id+' reading');assert.ok(v.example.includes(v.word)||v.example.length>=10,v.id+' example');assert.ok(v.exampleTranslation.length>=10,v.id+' translation');}
  for(const k of C.kanji){assert.ok(k.wordIds.length,k.id);for(const id of k.wordIds)assert.ok(wordMap.get(id)?.word.includes(k.character),k.id+'/'+id);}
  for(const q of C.questions.filter(q=>q.id.startsWith('qx-')&&q.skill==='kanji')){const v=wordMap.get(q.vocabularyId);assert.ok(v,q.id);assert.equal(q.options.find(o=>o.id===q.correctOptionId).text,v.reading,q.id);}
});
check('grammar lessons have original examples, comparisons, and linked assessments',()=>{
  const categories=new Set();
  for(const g of C.grammar){assert.ok(g.attachment.length,g.id);assert.ok(g.examples.length>=2,g.id);assert.ok(g.comparison.length>=20,g.id);assert.ok(g.mistake.wrong!==g.mistake.correct,g.id);assert.ok(g.questionIds.length>=2,g.id);for(const id of g.questionIds)assert.equal(questionMap.get(id)?.grammarId,g.id,id);if(g.category)categories.add(g.category);}
  assert.ok(categories.size>=12,'grammar families');
});
check('reading/listening references and quoted evidence match their original source',()=>{
  for(const [collection,field,textField] of [[C.readings,'passageId','body'],[C.listening,'listeningId','script']])for(const source of collection){assert.ok(source.translation.length>30,source.id);for(const id of source.questionIds){const q=questionMap.get(id);assert.equal(q?.[field],source.id,id);assert.ok(q.evidence,id+' evidence');if(source.id.startsWith('rx-')||source.id.startsWith('lx-'))assert.ok(source[textField].includes(q.evidence),id+' literal evidence');}}
});
check('ordering questions have all four fragments and a correct marked position',()=>{
  const ordering=C.questions.filter(q=>q.ordering);assert.ok(ordering.length>=12);
  for(const q of ordering){const o=q.ordering;assert.equal(o.fragments.length,4,q.id);assert.ok(o.target>=0&&o.target<4,q.id);assert.ok(q.prompt.includes('★'),q.id);assert.deepEqual(new Set(q.options.map(v=>v.text)),new Set(o.fragments),q.id);for(const f of o.fragments)assert.ok(o.completed.includes(f),q.id);const order=[...o.fragments].sort((a,b)=>o.completed.indexOf(a)-o.completed.indexOf(b));assert.equal(q.options.find(v=>v.id===q.correctOptionId).text,order[o.target],q.id);}
});
console.log(JSON.stringify(counts,null,2));
console.log(`${checks} course checks passed. These verify structure and coverage; human language review remains a separate editorial task.`);
