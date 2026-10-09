import type { Grammar, JLPTLevel, Kanji, Listening, Question, Reading, Skill, Vocabulary } from '../types';
import type { ReferenceMapEntry } from './reference-map';

export interface DatasetSource {
  id: string; title: string; organization: string; sourceUrl: string;
  levels: JLPTLevel[]; skills: Skill[]; edition: string; checkedAt: string;
  inspected: 'official-description' | 'publisher-catalogue' | 'table-of-contents';
  verifiedTopic: string; application: string; limits: string[]; detailUrls?: { label: string; url: string }[];
}
const allLevels: JLPTLevel[] = ['n5','n4','n3','n2','n1'];
const allSkills: Skill[] = ['vocabulary','kanji','grammar','reading','listening'];
export const datasetSourceCheckedAt = '2026-10-09';
export const datasetSourcePolicy = 'All added explanations, examples, passages, questions and listening scripts are original. Sources guide skills, topic selection and study structure; a linked source is not proof that every app word appears in that book. Course level labels are teaching estimates. No exhaustive official item list or complete textbook alignment is claimed.';
export const supplementalDatasetSources: DatasetSource[] = [
  {id:'official-jlpt-levels',title:'Official JLPT level descriptions',organization:'Japan Foundation / Japan Educational Exchanges and Services',
    sourceUrl:'https://www.jlpt.jp/e/about/levelsummary.html',levels:allLevels,skills:allSkills,edition:'Live official level-description page',checkedAt:datasetSourceCheckedAt,inspected:'official-description',
    verifiedTopic:'Basic daily language at N5/N4, everyday connected material at N3, and broader arguments, viewpoints and coherent listening at N2/N1.',
    application:'Guides the complexity and purpose of our original passages and dialogues.',limits:['These are competence descriptions, not an official vocabulary, kanji or grammar inventory.']},
  {id:'official-jlpt-formats',title:'Official JLPT question types',organization:'Japan Foundation / Japan Educational Exchanges and Services',
    sourceUrl:'https://www.jlpt.jp/e/guideline/testsections.html',levels:allLevels,skills:allSkills,edition:'Live official test-section page',checkedAt:datasetSourceCheckedAt,inspected:'official-description',
    verifiedTopic:'Level-specific reading, vocabulary/grammar and listening task categories.',application:'Informs the task families; English definition retrieval is a study adaptation rather than an exact exam question.',
    limits:['Original questions do not reproduce released or commercial papers, official scaling or an exact historical item distribution.']},
  {id:'official-jlpt-faq',title:'Official JLPT study FAQ',organization:'Japan Foundation / Japan Educational Exchanges and Services',
    sourceUrl:'https://www.jlpt.jp/e/faq/index.html',levels:allLevels,skills:allSkills,edition:'Live official FAQ',checkedAt:datasetSourceCheckedAt,inspected:'official-description',
    verifiedTopic:'The current test does not publish exhaustive item specifications; released sample materials are distinct from a complete past-paper archive.',
    application:'Keeps coverage and mock-test claims accurate.',limits:['This reference does not certify any app content item or passing readiness.']},
  {id:'jpf-irodori-starter',title:'Irodori: Japanese for Life in Japan — Starter (A1)',organization:'The Japan Foundation',
    sourceUrl:'https://www.irodori.jpf.go.jp/en/starter/pdf.html',levels:['n5'],skills:allSkills,edition:'First edition, 2020-11-30 (publication PDF inspected)',checkedAt:datasetSourceCheckedAt,inspected:'table-of-contents',
    verifiedTopic:'Practical self-introductions, food, rooms, directions, daily schedules and short everyday messages; grammar and contextual kanji support these activities.',
    application:'Supplementary context and communication objectives for our original beginner study material.',
    limits:['Irodori uses JF Standard A1, not a JLPT N5 designation; N5 is our app placement, not an official crosswalk.','No Irodori passage, exercise, illustration or recording is bundled.'],
    detailUrls:[{label:'Verified contents',url:'https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_contents_en.pdf'},{label:'Publication information',url:'https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_okuzuke.pdf'}]},
  {id:'jpf-irodori-elementary1',title:'Irodori: Japanese for Life in Japan — Elementary 1 (A2)',organization:'The Japan Foundation',
    sourceUrl:'https://www.irodori.jpf.go.jp/en/elementary01/pdf.html',levels:['n4'],skills:allSkills,edition:'First edition, 2020-03-31 (publication PDF inspected)',checkedAt:datasetSourceCheckedAt,inspected:'table-of-contents',
    verifiedTopic:'Hobbies, weather, town services, directions, meeting arrangements and experiences; listening and practical reading support communication.',
    application:'Supplementary everyday contexts for our original foundation dialogues and reading tasks.',
    limits:['Irodori uses JF Standard A2, not a JLPT N4 designation; N4 is our app placement, not an official crosswalk.','No Irodori passage, exercise, illustration or recording is bundled.'],
    detailUrls:[{label:'Verified contents',url:'https://www.irodori.jpf.go.jp/assets/data/elementary01/pdf/Y_contents_en.pdf'},{label:'Publication information',url:'https://www.irodori.jpf.go.jp/assets/data/elementary01/pdf/Y_okuzuke.pdf'}]},
];

export function buildDatasetSources(references: ReferenceMapEntry[]): DatasetSource[] {
  const books = new Map<string, DatasetSource>();
  for (const ref of references) {
    const key = 'book-' + ref.isbn, present = books.get(key);
    if (present) { if (!present.skills.includes(ref.skill)) present.skills.push(ref.skill); continue; }
    books.set(key, {id:key,title:ref.volume,organization:ref.series === 'Shin Kanzen Master' ? '3A Network' : 'ASK Publishing',sourceUrl:ref.sourceUrl,
      levels:[ref.level],skills:[ref.skill],edition:ref.edition + '; ISBN ' + ref.isbn,checkedAt:datasetSourceCheckedAt,inspected:'publisher-catalogue',
      verifiedTopic:ref.verifiedTopic,application:'Publisher skill/topic reference for compatible original app study; item-level correspondence remains separately unverified.',limits:[...ref.gaps]});
  }
  return [...supplementalDatasetSources,...books.values()];
}

interface Bank {vocabulary:Vocabulary[];kanji:Kanji[];grammar:Grammar[];readings:Reading[];listening:Listening[];questions:Question[]}
export function buildDatasetInventory(bank: Bank) {
  return allLevels.map(level => {
    const wordIds=new Set(bank.vocabulary.filter(item=>(item.jlptLevel||'n3')===level).map(item=>item.id));
    return {level,
    vocabulary:bank.vocabulary.filter(item=>(item.jlptLevel||'n3')===level).length,
    kanji:bank.kanji.filter(item=>item.wordIds.some(id=>wordIds.has(id))).length,
    grammar:bank.grammar.filter(item=>(item.jlptLevel||'n3')===level).length,
    readings:bank.readings.filter(item=>(item.jlptLevel||'n3')===level).length,
    listening:bank.listening.filter(item=>(item.jlptLevel||'n3')===level).length,
    questions:bank.questions.filter(item=>(item.jlptLevel||'n3')===level).length,
    added: {vocabulary:bank.vocabulary.filter(item=>item.id.startsWith('ds-v-')&&item.jlptLevel===level).length,grammar:bank.grammar.filter(item=>item.id.startsWith('ds-g-')&&item.jlptLevel===level).length,
      readings:bank.readings.filter(item=>item.id.startsWith('ds-r-')&&item.jlptLevel===level).length,listening:bank.listening.filter(item=>item.id.startsWith('ds-l-')&&item.jlptLevel===level).length,
      questions:bank.questions.filter(item=>item.id.startsWith('ds-q-')&&item.jlptLevel===level).length},
  };});
}

export function buildDatasetAssociations(bank: Bank, sources: DatasetSource[]) {
  const family = {vocabulary:bank.vocabulary,kanji:bank.kanji,grammar:bank.grammar,reading:bank.readings,listening:bank.listening};
  return allLevels.flatMap(level => allSkills.map(skill => ({level,skill,basis:'Compatible skill/context reference for original material; no individual book-item match is asserted.',
    sourceIds:sources.filter(source=>source.levels.includes(level)&&source.skills.includes(skill)).map(source=>source.id),
    appContentIds:family[skill].filter(item=>item.id.startsWith('ds-')&&(item.jlptLevel||'n3')===level).map(item=>item.id),
    remainingGaps:['Individual lexical and textbook chapter/page alignment remains unverified.','Independent expert linguistic review and publisher audio remain unavailable.']})));
}
