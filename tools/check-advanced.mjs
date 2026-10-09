// Upper-level content, answer evidence, shared kanji and assessment format checks.
// Uses the actual editable TypeScript course; Node 24+, no npm.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts')&&!/\.[a-z]+$/i.test(specifier)) {
    for(const suffix of ['.ts','/index.ts']) {const url=new URL(specifier+suffix,context.parentURL);if(existsSync(fileURLToPath(url)))return next(url.href,context);}
  }return next(specifier,context);
}});
const C=await import('../src/content/index.ts');
const A=await import('../src/content/advanced-review.ts');
const old=await import('../src/content/expanded-vocabulary.ts');
const F=await import('../src/content/foundation-review.ts');
const questions=new Map(C.questions.map(q=>[q.id,q]));
const content=new Map([...C.vocabulary,...C.grammar,...C.readings,...C.listening].map(v=>[v.id,v]));
let checks=0;
const check=(label,fn)=>{fn();checks++;console.log('PASS '+label);};
for(const level of ['n2','n1']) {
  check(level.toUpperCase()+' has linked vocabulary, grammar, reading and playable local listening scripts',()=>{
    assert.ok(A.advancedVocabulary.filter(v=>v.jlptLevel===level).length>=45);
    assert.ok(A.advancedGrammar.filter(v=>v.jlptLevel===level).length>=20);
    assert.ok(A.advancedReadings.filter(v=>v.jlptLevel===level).length>=8);
    assert.ok(A.advancedListening.filter(v=>v.jlptLevel===level).length>=16);
    assert.ok(A.advancedQuestions.some(q=>q.jlptLevel===level&&q.questionType==='listening-integrated'),level+' integrated listening');
  });
  check(level.toUpperCase()+' has sufficient distinct pools for its combined-text and listening blocks',()=>{
    const bank=A.advancedQuestions.filter(q=>q.jlptLevel===level);
    assert.ok(bank.filter(q=>q.skill==='kanji'||q.skill==='vocabulary').length>=35);
    assert.ok(bank.filter(q=>q.skill==='grammar').length>=(level==='n2'?24:20));
    assert.ok(bank.filter(q=>q.skill==='reading').length>=16);
    assert.ok(bank.filter(q=>q.skill==='listening').length>=(level==='n2'?32:30));
    assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
  });
}
check('N1 lexical practice uses reading/paraphrase adaptations rather than N2-only orthography and word formation',()=>{
  const bank=A.advancedQuestions.filter(q=>q.jlptLevel==='n1');
  assert.ok(bank.some(q=>q.questionType==='paraphrase'));
  assert.ok(!bank.some(q=>['orthography','word-formation','listening-expression'].includes(q.questionType)));
});
check('new format categories are registered and have actual linked questions',()=>{
  const registered=new Set(C.questionTypes.map(type=>type.id));
  for(const type of ['word-formation','reading-integrated','reading-thematic','listening-integrated']) {
    assert.ok(registered.has(type),type);
    assert.ok(A.advancedQuestions.filter(q=>q.questionType===type).length>=3,type);
  }
  for(const q of A.advancedQuestions) assert.ok(registered.has(q.questionType),q.id);
});
check('every advanced item has four unique choices and explanations for its canonical options',()=>{
  for(const q of A.advancedQuestions) {
    assert.equal(q.options.length,4,q.id);
    assert.equal(new Set(q.options.map(o=>o.id)).size,4,q.id);
    assert.equal(new Set(q.options.map(o=>o.text)).size,4,q.id);
    assert.equal(q.options.filter(o=>o.id===q.correctOptionId).length,1,q.id);
    for(const o of q.options) assert.ok(typeof o.text==='string'&&o.text.length&&q.explanations[o.id]?.length>=15,q.id+'/'+o.id);
    const linked=q.vocabularyId||q.grammarId||q.passageId||q.listeningId;
    assert.equal(content.get(linked)?.jlptLevel,q.jlptLevel,q.id+' linked level');
  }
});
check('advanced words retain readings, real usage and faithful translation fields without duplicate word identities',()=>{
  assert.equal(new Set(C.vocabulary.map(v=>v.word+'|'+v.reading)).size,C.vocabulary.length);
  for(const word of A.advancedVocabulary) {
    assert.match(word.reading,/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u,word.id);
    assert.ok(word.example.includes(word.word)&&word.exampleTranslation.length>=15,word.id);
  }
});
check('grammar has attachment rules, contrast notes, two linked examples and a corrected error',()=>{
  for(const g of A.advancedGrammar) {
    assert.ok(g.attachment.length&&g.examples.length===2&&g.comparison.length>=30,g.id);
    assert.notEqual(g.mistake.wrong,g.mistake.correct,g.id);
    assert.ok(g.mistake.explanation.length>=20,g.id);
    assert.equal(g.questionIds.length,2,g.id);
    for(const id of g.questionIds) assert.equal(questions.get(id)?.grammarId,g.id,id);
  }
});
check('every reading and listening answer quotes literal evidence from its own original source',()=>{
  for(const [lessons,field,text] of [[A.advancedReadings,'passageId','body'],[A.advancedListening,'listeningId','script']]) for(const lesson of lessons) {
    assert.ok(lesson[text].length>=120&&lesson.translation.length>=80,lesson.id);
    assert.equal(lesson.questionIds.length,2,lesson.id);
    for(const id of lesson.questionIds) {
      const q=questions.get(id);assert.equal(q?.[field],lesson.id,id);
      assert.ok(q.evidence&&lesson[text].includes(q.evidence),id+' evidence');
    }
  }
});
check('advanced and foundation words can share character cards without replacing earlier kanji IDs or links',()=>{
  const cards=new Map(C.kanji.map(k=>[k.character,k]));
  for(const word of [...A.advancedVocabulary,...F.foundationVocabulary]) for(const character of word.word) {
    if(/\p{Script=Han}/u.test(character)) assert.ok(cards.get(character)?.wordIds.includes(word.id),word.id+'/'+character);
  }
  for(const card of old.expandedKanji) {
    const current=cards.get(card.character);assert.equal(current?.id,card.id,card.character);
    for(const id of card.wordIds) assert.ok(current.wordIds.includes(id),card.id+'/'+id);
  }
  assert.equal(new Set(C.kanji.map(k=>k.character)).size,C.kanji.length);
});
check('level guidance labels the original progression honestly and preserves all foundation levels',()=>{
  assert.deepEqual(A.advancedLevels.map(level=>level.id),['n2','n1']);
  assert.deepEqual(C.foundationLevels.map(level=>level.id),['n5','n4','n3']);
  assert.match(A.advancedScopeNote,/original/i);assert.match(A.advancedScopeNote,/not an official exhaustive/i);
});
console.log(`${checks} advanced-course checks passed.`);
