import type { Skill } from '../types';

// Publisher facts and our teaching objectives are intentionally separate.
// These links indicate compatible skills/topics, not copied book exercises or page matches.
export type ReferenceLevel = 'n5' | 'n4' | 'n3' | 'n2' | 'n1';
type IntermediateReferenceLevel = 'n3' | 'n2' | 'n1';
export interface ReferenceMapEntry {
  id: string;
  series: 'Nihongo So-matome' | 'Shin Kanzen Master' | 'TRY!';
  volume: string;
  level: ReferenceLevel;
  skill: Skill;
  edition: string;
  isbn: string;
  verifiedTopic: string;
  appObjective: string;
  sourceUrl: string;
  appContentIds: string[];
  gaps: string[];
  verifiedCoverage: 'topic' | 'sample' | 'unavailable';
  pacing?: {
    studyPagesPerDay: number;
    weeks: number;
    reviewDay: number;
    note: string;
  };
}

export const referenceMapCheckedAt = '2026-10-09';
export const referenceScopeNote = 'Publisher catalog topics and edition metadata were checked on public pages for N5–N1. Combined books appear under each supported skill; these entries do not imply separate skill volumes. App objectives, examples, prerequisites and daily groupings are original. Content links are representative skill/topic links; exact textbook chapters, days and pages have not been mapped, and completing the app does not certify coverage of any entire book or JLPT syllabus. A Shin Kanzen Master N5 volume has not been identified in the checked public catalog; no N5 volume or ISBN is asserted.';

const skills: Skill[] = ['vocabulary', 'kanji', 'grammar', 'reading', 'listening'];
const titles: Record<Skill, string> = {
  vocabulary: 'Vocabulary', kanji: 'Kanji', grammar: 'Grammar', reading: 'Reading', listening: 'Listening',
};
type Books = Record<IntermediateReferenceLevel, Record<Skill, { isbn: string; release: string }>>;
const somatome: Books = {
  n3: {
    vocabulary: {isbn:'9784866395029',release:'2022-10'},
    kanji: {isbn:'9784866394961',release:'2022-08'},
    grammar: {isbn:'9784866394909',release:'2022-05'},
    reading: {isbn:'9784866396033',release:'2023-05'},
    listening: {isbn:'9784866397733',release:'2024-10'},
  },
  n2: {
    vocabulary: {isbn:'9784866395005',release:'2022-10'},
    kanji: {isbn:'9784866394947',release:'2022-08'},
    grammar: {isbn:'9784866394886',release:'2022-05'},
    reading: {isbn:'9784866396057',release:'2023-08'},
    listening: {isbn:'9784866397719',release:'2024-10'},
  },
  n1: {
    vocabulary: {isbn:'9784866394985',release:'2022-10'},
    kanji: {isbn:'9784866394923',release:'2022-08'},
    grammar: {isbn:'9784866394862',release:'2022-05'},
    reading: {isbn:'9784866396071',release:'2023-12'},
    listening: {isbn:'9784866397696',release:'2024-12'},
  },
};
type KanzenBook = {isbn:string;catalog:string;topic:string};
const kanzen: Record<IntermediateReferenceLevel, Record<Skill, KanzenBook>> = {
  n3: {
    vocabulary: {isbn:'9784883197439',catalog:'3634',topic:'Vocabulary grouped by everyday and social situations, followed by lexical properties such as word class, paraphrase, confusing words and word formation.'},
    kanji: {isbn:'9784883196883',catalog:'3624',topic:'Kanji readings within sentences, including on/kun reading groups, context-dependent readings, earlier-level review and additional readings of familiar characters.'},
    grammar: {isbn:'9784883196104',catalog:'3604',topic:'Meaning/function and attachment comparisons; sentence grammar, sentence ordering and text grammar. The contents include time expressions and relations between actions, including uchi ni, aida/aida ni, tokoro, toori and ni yotte.'},
    reading: {isbn:'9784883196715',catalog:'3614',topic:'Gradual reading of written Japanese; identifying meaning and retrieving information in practical texts such as messages, notices and advertisements, alongside progressively longer passages.'},
    listening: {isbn:'9784883196098',catalog:'3644',topic:'Sound distinctions and speaker intention, then verbal expressions, quick responses, task comprehension, key points and general outline.'},
  },
  n2: {
    vocabulary: {isbn:'9784883195749',catalog:'3632',topic:'Vocabulary grouped by situations and semantic/lexical properties, including social life, study and work, abstract concepts, synonyms, adverbs and word formation.'},
    kanji: {isbn:'9784883195473',catalog:'3622',topic:'Reading and using kanji in words, then affixes, word formation and sound changes; this catalog volume revises the former Level 2 kanji book.'},
    grammar: {isbn:'9784883195657',catalog:'3602',topic:'Meaning/function comparisons and three grammar modes: form selection, sentence ordering and text grammar. Contents include temporal relationships and expressions for circumstances and occasions.'},
    reading: {isbn:'9784883195725',catalog:'3612',topic:'Contrast, paraphrase, figurative expression and the structure of an argument; essays and practical documents; medium/long passages, author viewpoints, integrated reading and information retrieval.'},
    listening: {isbn:'9784883195671',catalog:'3642',topic:'Quick response, task comprehension, key points, general outline and integrated comprehension; interpreting indirect replies, conditions, sequence and speaker intention.'},
  },
  n1: {
    vocabulary: {isbn:'9784883195732',catalog:'3630',topic:'Topic-based advanced vocabulary across society, work, culture and abstract relationships, with multiple meanings, synonyms, similar word forms and adverbs.'},
    kanji: {isbn:'9784883195466',catalog:'3620',topic:'Advanced on/kun and special readings, word structure and sound changes, with inference of unfamiliar word readings and meanings; this catalog volume revises the former Level 1 kanji book.'},
    grammar: {isbn:'9784883195640',catalog:'3600',topic:'Meaning/function groupings and form selection, sentence ordering and text grammar; contents include time, limits, addition and examples, with comparisons of closely related constructions.'},
    reading: {isbn:'9784883195718',catalog:'3610',topic:'Complex arguments and practical texts, including contrast, reformulation, author viewpoints, reasons and examples; integrated reading and information retrieval.'},
    listening: {isbn:'9784883195664',catalog:'3640',topic:'Quick response, task comprehension, key points, general outline and integrated comprehension; following intentions, reformulations, conditions and priorities across information.'},
  },
};

// IDs are real course items. They are illustrative links, not a list of words present in a book.
const appIds: Record<ReferenceLevel, Record<Skill, string[]>> = {
  n5: {
    vocabulary: ['fv-n5-school','fv-n5-student','fv-n5-teacher','fv-n5-friend','fv-n5-child','fv-n5-father','fv-n5-mother','fv-n5-older-brother'],
    kanji: ['fk-6821','fk-751f','fk-4f9b','fk-72ac','fk-732b','fk-725b','fk-4e73','fk-8336'],
    grammar: ['fg-n5-copula','fg-n5-past-copula','fg-n5-polite-tense','fg-n5-topic','fg-n5-object','fg-n5-movement','fg-n5-action-location','fg-n5-possession'],
    reading: ['fr-n5-class','fr-n5-friend','fr-n5-cafe','fr-n5-park','fr-n5-routine','fr-n5-library','fr-n5-shopping','fr-n5-weather'],
    listening: ['fl-n5-meeting','fl-n5-class-items','fl-n5-bread','fl-n5-bus','fl-n5-lunch','fl-n5-umbrella','fl-n5-milk','fl-n5-directions'],
  },
  n4: {
    vocabulary: ['fv-n4-pupil','fv-n4-high-school','fv-n4-university','fv-n4-math','fv-n4-history','fv-n4-grammar','fv-n4-pronunciation','fv-n4-venue'],
    kanji: ['fk-5f92','fk-9ad8','fk-5927','fk-6570','fk-6b74','fk-53f2','fk-6cd5','fk-4f7f'],
    grammar: ['fg-n4-experience','fg-n4-potential','fg-n4-obligation','fg-n4-permission','fg-n4-prohibition','fg-n4-before-after','fg-n4-tara','fg-n4-ba'],
    reading: ['fr-n4-homework','fr-n4-museum','fr-n4-recipe','fr-n4-borrow','fr-n4-return','fr-n4-study','fr-n4-lost-wallet','fr-n4-plants'],
    listening: ['fl-n4-meeting-change','fl-n4-express-train','fl-n4-allergy','fl-n4-assignment','fl-n4-clinic','fl-n4-library-reserved','fl-n4-rain-outing','fl-n4-airport'],
  },
  n3: {
    vocabulary: ['v-dry','vx-people-family','v-repair','v-choose','vx-food-meal','v-prepare','v-on-time','vx-work-meeting','v-continue','vx-health-symptom','v-decrease','vx-technology-machine','v-participate','vx-culture-tradition','vx-feelings-relief','v-contact','v-plan','v-necessary'],
    kanji: ['k-yo','k-hen','k-san','k-raku','k-jun','k-kaku','k-oku','k-todo','k-tsuzu','k-ma','k-he','k-shu'],
    grammar: ['g-uchini','gx-aida','gx-aidani','gx-tekaradenaito','gx-tokoro-before','gx-tokoro-during','gx-tokoro-after','gx-toori','gx-niyotte','g-koto','g-you','gx-noni-contrast'],
    reading: ['r-email','r-notice','r-article','r-ad','rx-handover','rx-studygroup','rx-buses','rx-buffer'],
    listening: ['l-meeting','l-repair','lx-slides','lx-checkup','lx-gallery','lx-more-travel-expressions','lx-more-friend-replies','lx-more-service-replies'],
  },
  n2: {
    vocabulary: ['av-n2-maintain','av-n2-analyse','av-n2-compare','av-n2-condition','av-n2-influence','av-n2-measure','av-n2-resources','av-n2-adjust','av-n2-evidence','av-n2-concrete'],
    kanji: ['ak-7dad','ak-6301','ak-6790','ak-8f03','ak-52b9','ak-7387','ak-6761','ak-97ff','ak-7b56','ak-6574'],
    grammar: ['ag-n2-since','ag-n2-in-the-middle','ag-n2-as-soon-as','ag-n2-gradual-change','ag-n2-tailored','ag-n2-irrespective','ag-n2-based-on','ag-n2-partial-negation','ag-n2-although','ag-n2-not-limited'],
    reading: ['ar-n2-bus-survey','ar-n2-training','ar-n2-survey-method','ar-n2-repair-value','ar-n2-library-hours','ar-n2-festival-rain','ar-n2-energy','ar-n2-device-choice'],
    listening: ['al-n2-budget','al-n2-train-delay','al-n2-clinic-choice','al-n2-warranty','al-n2-energy-repair','al-n2-housing-fee','al-n2-research-talk','al-n2-privacy-call'],
  },
  n1: {
    vocabulary: ['av-n1-grounds','av-n1-meticulous','av-n1-balance','av-n1-insight','av-n1-intent','av-n1-norm','av-n1-argument-basis','av-n1-premise','av-n1-constraint','av-n1-consideration'],
    kanji: ['ak-59a5','ak-7dfb','ak-5bc6','ak-5747','ak-8861','ak-6d1e','ak-8da3','ak-65e8','ak-9f5f','ak-9f6c'],
    grammar: ['ag-n1-immediate','ag-n1-repeated-reversal','ag-n1-formal-endpoint','ag-n1-extent','ag-n1-even-if','ag-n1-lesser-demand','ag-n1-more-than','ag-n1-in-accordance','ag-n1-formal-dependent','ag-n1-distinctive'],
    reading: ['ar-n1-uniform-rules','ar-n1-public-data','ar-n1-evaluation-debate','ar-n1-agreement-debate','ar-n1-culture-change','ar-n1-technology-norms','ar-n1-resource-balance','ar-n1-grant-notice'],
    listening: ['al-n1-joint-event','al-n1-planning-debate','al-n1-norms-lecture','al-n1-feedback','al-n1-grant-adjustment','al-n1-research-privacy','al-n1-hybrid-meeting','al-n1-public-talk'],
  },
};

const objectives: Record<Skill,string> = {
  vocabulary: 'Recall our original words before revealing their meanings, then explain their use in the supplied context sentences and mixed retrieval questions.',
  kanji: 'Read our linked characters in complete vocabulary words, distinguish context readings and revisit uncertain words through flashcards and reading questions.',
  grammar: 'Study our original meaning, attachment, examples, mistake and comparison notes; build from prerequisite families to mixed grammar practice.',
  reading: 'Read our original passages before opening translations, identify the writer\'s purpose and support an answer with literal evidence.',
  listening: 'Listen to our original dialogues through available device speech, infer intentions and next actions, and inspect the script and evidence after answering.',
};
const publisherSkill:Record<Skill,string> = {
  vocabulary: 'Vocabulary study in manageable daily portions with weekly consolidation.',
  kanji: 'Kanji study in manageable daily portions with weekly consolidation.',
  grammar: 'Grammar study with translated explanations and examples, daily portions and weekly consolidation.',
  reading: 'Reading practice in short daily portions with weekly consolidation and publisher audio support.',
  listening: 'Listening study and practice with publisher audio, small study portions and weekly consolidation.',
};
const commonGaps = [
  'The full commercial book was not accessed; no exercise, chapter, page or individual-word equivalence is asserted.',
  'App content IDs link original exercises with compatible skills/topics. They do not verify complete coverage of the volume or an exhaustive JLPT item list.',
];
function gapsFor(level:IntermediateReferenceLevel,skill:Skill,primary:boolean):string[] {
  const result=[...commonGaps];
  if(primary) result.push(level==='n3'
    ? 'The publisher-linked N3 sample image returned HTTP 403 when checked; exact chapter/day headings and sample content could not be verified.'
    : 'Exact chapter/day headings and page-level correspondence for this expanded/revised edition have not been verified.');
  if(level!=='n3') result.push('The app provides selected original upper-level study groups, with remaining textbook scope unmapped.');
  if(skill==='listening') result.push('Device speech and original scripts do not reproduce the publisher\'s human-recorded audio.');
  if(skill==='listening'&&level==='n3') result.push('N3 verbal-expression practice is a written-situation adaptation; official picture items need separate practice.');
  if(skill==='listening'&&level!=='n3') result.push('Original upper-level quick-response exercises supplement the other listening formats. Publisher recordings and an exact historical per-format blueprint remain unprovided.');
  if(skill==='kanji') result.push('The app teaches characters through linked words; it does not reproduce the publisher\'s character inventory, stroke-order teaching or complete reading inventory.');
  if(!appIds[level][skill].length) result.push('No representative app content IDs have yet been linked for this skill.');
  return result;
}

const intermediateReferenceMap:ReferenceMapEntry[] = (['n3','n2','n1'] as IntermediateReferenceLevel[]).flatMap(level => skills.flatMap(skill => {
  const primary=somatome[level][skill], supplement=kanzen[level][skill];
  return [{
    id:`somatome-${level}-${skill}`,series:'Nihongo So-matome',volume:`Nihongo So-matome ${level.toUpperCase()} ${titles[skill]}`,
    level,skill,edition:`Expanded and revised English/Chinese/Korean edition; publisher release ${primary.release}`,isbn:primary.isbn,
    verifiedTopic:publisherSkill[skill],appObjective:objectives[skill],
    sourceUrl:`https://ask-books.com/book-details/?slug=${primary.isbn}`,appContentIds:[...appIds[level][skill]],gaps:gapsFor(level,skill,true),verifiedCoverage:'topic',
    pacing:{studyPagesPerDay:2,weeks:8,reviewDay:7,note:'The linked expanded/revised volume advertises two pages a day over eight weeks, with review on Day 7. The series overview still describes six weeks. Our variable-length sequence of six study lessons plus cumulative review adapts the rhythm; it is not an exact book-day or book-page schedule.'},
  },{
    id:`kanzen-${level}-${skill}`,series:'Shin Kanzen Master',volume:`Shin Kanzen Master ${level.toUpperCase()} ${titles[skill]}`,
    level,skill,edition:'Publisher catalog volume identified by ISBN; edition number and publication date are not stated on the public page.',isbn:supplement.isbn,
    verifiedTopic:supplement.topic,appObjective:objectives[skill],
    sourceUrl:`https://www.3anet.co.jp/np/books/${supplement.catalog}/`,appContentIds:[...appIds[level][skill]],gaps:gapsFor(level,skill,false),verifiedCoverage:'topic',
  }] as ReferenceMapEntry[];
}));

// Foundation So-matome books combine skills. Preserve their actual book identity
// instead of implying that five separate N5/N4 skill volumes were published.
const foundationSomatome = {
  n5: {isbn:'9784866396514',release:'2023-09',volume:'Nihongo So-matome N5 Kanji, Vocabulary, Grammar, Reading and Listening'},
  n4Words: {isbn:'9784866396491',release:'2023-07',volume:'Nihongo So-matome N4 Kanji and Vocabulary'},
  n4Texts: {isbn:'9784866396477',release:'2023-10',volume:'Nihongo So-matome N4 Grammar, Reading and Listening'},
};
const foundationKanzen:Record<Skill,KanzenBook> = {
  vocabulary:{isbn:'9784883198481',catalog:'3636',topic:'Everyday vocabulary for people, hobbies, daily life, shopping, school, work, town, time, health and nature, followed by polite words, adverbs and intransitive/transitive verbs.'},
  kanji:{isbn:'9784883197804',catalog:'3626',topic:'Kanji vocabulary in short everyday passages about family relocation, a new town, shopping, classes, work, travel and health.'},
  grammar:{isbn:'9784883196944',catalog:'3606',topic:'Meaning/function study and conjugation, including particles, te forms, intransitive/transitive verbs, honorifics, conditionals and comparison.'},
  reading:{isbn:'9784883197644',catalog:'3616',topic:'Sentence boundaries, actors, feelings, context, demonstratives and linking expressions; memos, email, notices, explanations, essays and information retrieval.'},
  listening:{isbn:'9784883197637',catalog:'3646',topic:'Sounds and accent, task comprehension, key points, verbal expressions and quick responses; understanding roles, instructions and final decisions.'},
};

function foundationSomatomeTopic(level:'n5'|'n4',skill:Skill):string {
  if(level==='n5') return `The combined N5 volume identifies ${titles[skill].toLowerCase()} as one of its five foundation skills; publisher audio is available for the book.`;
  if(skill==='kanji'||skill==='vocabulary') return `The combined N4 Kanji and Vocabulary volume identifies ${titles[skill].toLowerCase()} as a study skill.`;
  return `The combined N4 Grammar, Reading and Listening volume develops patterns, passages and listening in everyday contexts, in two-page daily portions over six weeks.`;
}

const foundationReferenceMap:ReferenceMapEntry[] = (['n5','n4'] as const).flatMap(level => skills.flatMap(skill => {
  const book=level==='n5'?foundationSomatome.n5:skill==='kanji'||skill==='vocabulary'?foundationSomatome.n4Words:foundationSomatome.n4Texts;
  const gaps=[...commonGaps,'Combined-volume skill labels and publisher descriptions are verified; individual constructions, chapters and sample-page correspondence have not been mapped.'];
  if(level==='n5') gaps.push(
    'The N5 catalog description contains generic higher-level pacing/language text that does not consistently describe this multilingual combined volume; no exact N5 pacing or translation-language coverage is asserted.',
    'A Shin Kanzen Master N5 volume has not been identified in the checked public catalog; no N5 volume or ISBN is asserted.');
  if(skill==='listening') gaps.push('Device speech and original scripts do not reproduce the publisher\'s human-recorded audio.');
  if(skill==='kanji') gaps.push('The app teaches characters through linked words; it does not reproduce the publisher\'s character inventory or complete reading inventory.');
  const primary:ReferenceMapEntry={
    id:`somatome-${level}-${skill}`,series:'Nihongo So-matome',volume:book.volume,level,skill,
    edition:`Multilingual combined volume; publisher release ${book.release}`,isbn:book.isbn,
    verifiedTopic:foundationSomatomeTopic(level,skill),appObjective:objectives[skill],
    sourceUrl:`https://ask-books.com/book-details/?slug=${book.isbn}`,appContentIds:[...appIds[level][skill]],gaps,verifiedCoverage:'topic',
  };
  if(level==='n5') return [primary];
  const supplement=foundationKanzen[skill];
  const supplementGaps=[...commonGaps,'Exact chapters, sample pages and individual-construction correspondence have not been mapped.'];
  if(skill==='listening') supplementGaps.push('Device speech and original scripts do not reproduce the publisher\'s human-recorded audio.');
  if(skill==='kanji') supplementGaps.push('The app teaches characters through linked words; it does not reproduce the publisher\'s character inventory or complete reading inventory.');
  return [primary,{
    id:`kanzen-${level}-${skill}`,series:'Shin Kanzen Master',volume:`Shin Kanzen Master N4 ${titles[skill]}`,level,skill,
    edition:'Publisher catalog volume identified by ISBN; edition number and publication date are not stated on the public page.',isbn:supplement.isbn,
    verifiedTopic:supplement.topic,appObjective:objectives[skill],
    sourceUrl:`https://www.3anet.co.jp/np/books/${supplement.catalog}/`,appContentIds:[...appIds[level][skill]],gaps:supplementGaps,verifiedCoverage:'topic',
  } as ReferenceMapEntry];
}));

// These are the current revised English-edition catalog records. The publisher
// explicitly lists grammar/reading/listening review and an English vocabulary list.
// Each skill entry refers to the same integrated book, not a separate TRY! volume.
const tryBooks:Record<ReferenceLevel,{isbn:string;release:string;grammarTopic:string}> = {
  n5:{isbn:'9784866397320',release:'2024-08',grammarTopic:'Introduces 46 N5 grammar points through conversations with friends and in shops, plus greetings, numbers and basic conjugation, using explanations, examples and exercises.'},
  n4:{isbn:'9784866396330',release:'2023-05',grammarTopic:'Introduces 100 N4 grammar points through friend conversations, simple speeches and part-time job interviews; also develops particles, adverbs, demonstratives and transitive/intransitive verbs.'},
  n3:{isbn:'9784866396668',release:'2023-08',grammarTopic:'Introduces 127 N3 grammar points through blogs, notices, recipes, friend conversations and interviews, with practice attending to semantic connections between sentences.'},
  n2:{isbn:'9784866396927',release:'2023-10',grammarTopic:'Introduces 149 N2 grammar points through speeches, news, casual conversations, essays and opinion texts, with two stages of review.'},
  n1:{isbn:'9784866397870',release:'2024-09',grammarTopic:'Introduces 129 N1 grammar points through newspaper articles, practical guides, lectures and business conversations, with illustrations supporting difficult vocabulary and expressions.'},
};
type TrySkill = Exclude<Skill,'kanji'>;
const trySkills:TrySkill[] = ['vocabulary','grammar','reading','listening'];
const trySkillTopics:Record<Exclude<TrySkill,'grammar'>,string> = {
  vocabulary:'The integrated grammar-in-context volume provides a publisher-linked English vocabulary list alongside its situational texts and dialogues.',
  reading:'Situational reading passages contextualize grammar, with JLPT-format reading review in the same integrated volume.',
  listening:'Situational dialogues, downloadable publisher audio and JLPT-format listening review are provided in the same integrated volume.',
};
const tryReferenceMap:ReferenceMapEntry[] = (['n5','n4','n3','n2','n1'] as ReferenceLevel[]).flatMap(level => trySkills.map(skill => {
  const book=tryBooks[level];
  const gaps=[...commonGaps,
    'This is a grammar-centered integrated volume; its skill records do not imply separate vocabulary, reading or listening books.',
    'Publisher descriptions, edition metadata and linked support-material labels were inspected. Exact construction, chapter and sample-page alignment has not been verified.',
    'No dedicated TRY! kanji volume or complete character inventory is asserted by this mapping.'];
  if(skill==='vocabulary') gaps.push('The publisher vocabulary list was identified, but its words were not copied or exhaustively matched to the original app word bank.');
  if(skill==='listening') gaps.push('Device speech and original scripts do not reproduce the publisher\'s human-recorded audio.');
  if(level==='n2'||level==='n1') gaps.push('The app provides selected original upper-level study groups, with remaining textbook scope unmapped.');
  return {
    id:`try-${level}-${skill}`,series:'TRY!',volume:`TRY! 日本語能力試験 ${level.toUpperCase()} 文法から伸ばす日本語 (Revised English Edition)`,level,skill,
    edition:`Revised English edition; publisher release ${book.release}`,isbn:book.isbn,
    verifiedTopic:skill==='grammar'?book.grammarTopic:trySkillTopics[skill],appObjective:objectives[skill],
    sourceUrl:`https://ask-books.com/book-details/?slug=${book.isbn}`,appContentIds:[...appIds[level][skill]],gaps,verifiedCoverage:'topic',
  };
}));

export const referenceMap:ReferenceMapEntry[] = [...foundationReferenceMap,...intermediateReferenceMap,...tryReferenceMap];
