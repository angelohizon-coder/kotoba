// Execute the actual original path and verified reference map, without npm.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts')&&!/\.[a-z]+$/i.test(specifier)){
    for(const suffix of ['.ts','/index.ts']){const url=new URL(specifier+suffix,context.parentURL);if(existsSync(fileURLToPath(url)))return next(url.href,context);}
  }return next(specifier,context);
}});
const C=await import('../src/content/index.ts'),E=await import('../src/lib/engine.ts'),S=await import('../src/lib/storage.ts');
let checks=0;const check=(label,fn)=>{fn();checks++;console.log('PASS '+label);};
const byId=new Map([...C.vocabulary,...C.kanji,...C.grammar,...C.readings,...C.listening,...C.questions].map(item=>[item.id,item]));
const levelOf=item=>item.jlptLevel||'n3';
for(const level of ['n5','n4','n3','n2','n1']){
  const plan=C.learningPath.find(path=>path.level===level),lessons=plan.units.flatMap(unit=>unit.lessons),daily=lessons.filter(l=>l.kind==='daily');
  check(level.toUpperCase()+' integrates every authored word and grammar point in content-sized study cycles',()=>{
    const words=new Set(daily.flatMap(l=>l.vocabularyIds)),grammar=new Set(daily.flatMap(l=>l.grammarIds));
    assert.deepEqual([...words].sort(),C.vocabulary.filter(v=>levelOf(v)===level).map(v=>v.id).sort());
    assert.deepEqual([...grammar].sort(),C.grammar.filter(g=>levelOf(g)===level).map(g=>g.id).sort());
    for(const unit of plan.units.filter(u=>u.lessons.some(l=>l.kind==='daily'))){assert.ok(unit.lessons.filter(l=>l.kind==='daily').length<=6);assert.equal(unit.lessons.at(-1).kind,'review');}
  });
  check(level.toUpperCase()+' daily contexts use real word/grammar examples and link all skills without future retrieval',()=>{
    let earlier=new Set();
    for(const lesson of daily){
      assert.ok(lesson.vocabularyIds.length>0&&lesson.vocabularyIds.length<=7,lesson.id);
      assert.ok(lesson.grammarIds.length>0&&lesson.grammarIds.length<=2,lesson.id);
      assert.ok(lesson.readingId&&lesson.listeningId&&lesson.questionIds.length,lesson.id);
      if(lesson.vocabularyIds.some(id=>/\p{Script=Han}/u.test(byId.get(id).word)))assert.ok(lesson.kanjiIds.length,lesson.id);
      for(const id of [...lesson.vocabularyIds,...lesson.grammarIds,lesson.readingId,lesson.listeningId])assert.equal(levelOf(byId.get(id)),level,id);
      for(const id of lesson.vocabularyIds)assert.ok(lesson.context.some(line=>line.ja===byId.get(id).example&&line.en===byId.get(id).exampleTranslation));
      for(const id of lesson.grammarIds)assert.ok(lesson.context.some(line=>line.ja===byId.get(id).examples[0].ja));
      for(const id of lesson.retrievalIds)assert.ok(earlier.has(id),lesson.id+' retrieves only earlier content');
      lesson.questionIds.forEach(id=>{assert.equal(levelOf(byId.get(id)),level);earlier.add(id);});
    }
  });
  check(level.toUpperCase()+' prerequisites are acyclic and final revision precedes the original mock',()=>{
    const prior=new Set();
    for(const unit of plan.units){for(const prerequisite of unit.prerequisites)assert.ok(prior.has(prerequisite));prior.add(unit.id);}
    const final=plan.units.at(-1);assert.deepEqual(final.lessons.map(l=>l.kind),['revision','mock']);
    assert.deepEqual(final.lessons[0].questionIds.slice().sort(),C.questions.filter(q=>levelOf(q)===level).map(q=>q.id).sort());
    assert.ok(plan.gaps.some(gap=>gap.includes('unverified'))&&plan.pacing.includes('not calendar'));
  });
}
check('reference map identifies inspected N5–N1 volumes across three series with accurate combined skills and gaps',()=>{
  assert.equal(C.referenceMap.length,65);assert.equal(new Set(C.referenceMap.map(r=>r.id)).size,65);
  for(const level of ['n3','n2','n1'])for(const series of ['somatome','kanzen'])for(const skill of ['vocabulary','kanji','grammar','reading','listening']){
    assert.ok(C.referenceMap.find(r=>r.id===`${series}-${level}-${skill}`));
  }
  for(const ref of C.referenceMap){
    assert.ok(/^https:\/\/(ask-books\.com|www\.3anet\.co\.jp)\//.test(ref.sourceUrl));
    assert.ok(/^\d{13}$/.test(ref.isbn));assert.ok(ref.edition.length&&ref.verifiedTopic.length&&ref.gaps.length);
    for(const id of ref.appContentIds){assert.ok(byId.has(id),ref.id+' canonical mapping '+id);assert.equal(levelOf(byId.get(id)),ref.level,ref.id+' matching app level');}
  }
  for(const level of ['n5','n4','n3','n2','n1'])for(const skill of ['vocabulary','grammar','reading','listening'])assert.ok(C.referenceMap.find(r=>r.id===`try-${level}-${skill}`));
  assert.equal(C.referenceMap.filter(r=>r.level==='n5'&&r.series==='Shin Kanzen Master').length,0,'No unverified N5 Shin Kanzen volume is invented');
  assert.ok(C.referenceMap.filter(r=>r.level==='n5').some(r=>r.gaps.some(g=>/Shin Kanzen/.test(g))));
  const n5=C.referenceMap.filter(r=>r.level==='n5'&&r.series==='Nihongo So-matome');
  assert.equal(new Set(n5.map(r=>r.isbn)).size,1,'The five N5 skills share one actual combined Sō-matome volume');
  assert.equal(n5.length,5);
  const n4=C.referenceMap.filter(r=>r.level==='n4'&&r.series==='Nihongo So-matome');
  assert.equal(new Set(n4.map(r=>r.isbn)).size,2,'N4 Sō-matome uses two actual combined volumes');
  assert.equal(n4.length,5);
});
check('reference coverage, manual completion and demonstrated mastery remain independent',()=>{
  const lesson=C.learningPath[0].units[0].lessons[0],fresh=E.initialProgress();
  const completed=E.setTaskCompleted(fresh,'path:'+lesson.id,true);
  assert.ok(completed.completedTasks.includes('path:'+lesson.id));assert.deepEqual(completed.reviews,fresh.reviews);assert.deepEqual(completed.attempts,fresh.attempts);
  assert.deepEqual(E.aggregateAccuracy(completed,Object.fromEntries(C.questions.map(q=>[q.id,q]))),E.aggregateAccuracy(fresh,Object.fromEntries(C.questions.map(q=>[q.id,q]))));
  assert.ok(C.referenceMap.every(ref=>ref.verifiedCoverage!=='sample'||ref.gaps.length));
});
check('lesson resume, selected level, widget order and lesson checks travel in validated backups',()=>{
  const id=C.learningPath.find(p=>p.level==='n1').units[0].lessons[1].id;
  const original=E.setTaskCompleted(E.initialProgress(),'path:'+id,true);
  original.settings={...original.settings,studyLevel:'n1',pathResume:id,dashboardWidgets:['review','path']};
  const restored=S.validateProgress(JSON.parse(JSON.stringify(original)));assert.deepEqual(restored,original);
});
console.log(`${checks} learning-path and reference checks passed.`);
