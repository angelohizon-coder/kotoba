// Original foundation content and assessment invariants. Node 24+, no npm.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/i.test(specifier)) {
    for(const suffix of ['.ts','/index.ts']) { const url=new URL(specifier+suffix,context.parentURL); if(existsSync(fileURLToPath(url))) return next(url.href,context); }
  } return next(specifier,context);
}});
const C=await import('../src/content/index.ts');
const F=await import('../src/content/foundation-review.ts');
let checks=0;
const check=(label,fn)=>{fn();checks++;console.log('PASS '+label);};
const questions=new Map(C.questions.map(q=>[q.id,q]));
const content=new Map([...C.vocabulary,...C.grammar,...C.readings,...C.listening].map(v=>[v.id,v]));
for(const level of ['n5','n4']) {
  check(level.toUpperCase()+' offers original vocabulary, grammar, reading and listening lessons',()=>{
    assert.ok(F.foundationVocabulary.filter(v=>v.jlptLevel===level).length>=35);
    assert.ok(F.foundationGrammar.filter(v=>v.jlptLevel===level).length>=18);
    assert.ok(F.foundationReadings.filter(v=>v.jlptLevel===level).length>=8);
    assert.ok(F.foundationListening.filter(v=>v.jlptLevel===level).length>=14);
  });
  check(level.toUpperCase()+' has enough distinct questions for each full-length practice block',()=>{
    const bank=C.questions.filter(q=>q.jlptLevel===level);
    assert.ok(bank.filter(q=>q.skill==='vocabulary'||q.skill==='kanji').length>=35);
    assert.ok(bank.filter(q=>q.skill==='grammar'||q.skill==='reading').length>=(level==='n5'?32:35));
    assert.ok(bank.filter(q=>q.skill==='listening').length>=(level==='n5'?24:28));
    assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
  });
}
check('foundation content preserves unique global word and question identities',()=>{
  assert.equal(new Set(C.vocabulary.map(v=>v.word+'|'+v.reading)).size,C.vocabulary.length,'Duplicate word/reading');
  assert.equal(new Set(C.questions.map(q=>q.id)).size,C.questions.length);
  for(const v of F.foundationVocabulary) assert.equal(content.get(v.id),v);
});
check('every foundational kanji word is reachable through a shared character card',()=>{
  const cards=new Map(C.kanji.map(k=>[k.character,k]));
  for(const word of F.foundationVocabulary) for(const character of word.word) {
    if(/\p{Script=Han}/u.test(character)) assert.ok(cards.get(character)?.wordIds.includes(word.id),word.id+'/'+character);
  }
});
check('every question keeps four distinct choices with a canonical answer and per-option explanations',()=>{
  for(const q of F.foundationQuestions) {
    assert.equal(q.options.length,4,q.id);
    assert.equal(new Set(q.options.map(o=>o.text)).size,4,q.id);
    assert.equal(q.options.filter(o=>o.id===q.correctOptionId).length,1,q.id);
    for(const o of q.options) assert.ok(q.explanations[o.id]?.length>=15,q.id+'/'+o.id);
    const linked=q.grammarId||q.passageId||q.listeningId||q.vocabularyId;
    assert.equal(content.get(linked)?.jlptLevel,q.jlptLevel,q.id+' linked level');
  }
});
check('grammar has attachment rules, two exercises and a corrected mistake',()=>{
  for(const g of F.foundationGrammar) {
    assert.ok(g.attachment.length&&g.examples.length>=2&&g.comparison.length>=20,g.id);
    assert.ok(g.mistake.wrong!==g.mistake.correct,g.id);
    assert.ok(g.mistake.explanation.length>=20,g.id);
    assert.equal(g.questionIds.length,2,g.id);
    for(const id of g.questionIds) assert.equal(questions.get(id)?.grammarId,g.id);
  }
});
check('every reading/listening answer has literal source evidence and matches its lesson',()=>{
  for(const [lessons,field,text] of [[F.foundationReadings,'passageId','body'],[F.foundationListening,'listeningId','script']]) {
    for(const lesson of lessons) {
      assert.equal(lesson.questionIds.length,2,lesson.id);
      assert.ok(lesson.translation.length>30,lesson.id);
      for(const id of lesson.questionIds) {
        const q=questions.get(id); assert.equal(q?.[field],lesson.id,id);
        assert.ok(q.evidence&&lesson[text].includes(q.evidence),id+' literal evidence');
      }
    }
  }
});
check('levels are honest study routes rather than a claim of official past-paper coverage',()=>{
  assert.deepEqual(F.foundationLevels.map(level=>level.id),['n5','n4','n3']);
  for(const level of F.foundationLevels) assert.ok(level.description.length>25);
  assert.match(F.foundationScopeNote,/original/i); assert.match(F.foundationScopeNote,/official/i);
});
console.log(`${checks} foundation checks passed.`);
