import type { Grammar, JLPTLevel, Kanji, Listening, Question, Reading, Vocabulary } from '../types';

// This is an original prerequisite sequence. No book chapter/day equivalences are asserted.
export interface PathLesson {
  id: string; title: string; kind: 'daily'|'review'|'revision'|'mock';
  objective: string; prerequisite: string; vocabularyIds: string[]; kanjiIds: string[];
  grammarIds: string[]; readingId: string|null; listeningId: string|null;
  questionIds: string[]; retrievalIds: string[];
  context: {ja:string;en:string}[]; referenceIds: string[];
}
export interface PathUnit {id:string; title:string; objective:string; prerequisites:string[]; lessons:PathLesson[]}
export interface LearningPath {level:JLPTLevel; title:string; pacing:string; gaps:string[]; units:PathUnit[]}
interface Bank {vocabulary:Vocabulary[];kanji:Kanji[];grammar:Grammar[];readings:Reading[];listening:Listening[];questions:Question[]}

const prerequisiteFamilies = ['conditions','connections','sequence','time-aspect','change','reasons','purpose','contrast','comparison','quantity','certainty','reported','nominalization','voice','requests','obligation','honorifics','formal','evaluation','concession','nuance'];
const familyObjectives:Record<string,string> = {
  conditions:'Distinguish conditions and outcomes before combining longer ideas.',
  connections:'Connect related ideas and identify the relation between clauses.',
  sequence:'Follow the order of actions and changes.',
  'time-aspect':'Locate an action in time and distinguish completion from continuation.',
  change:'Explain changes, arrangements, and intended habits.',
  reasons:'Separate a stated reason from a result or an inference.',
  purpose:'Distinguish aims, means, and intended outcomes.',
  contrast:'Recognize concessions and contrasts without reversing the speaker’s point.',
  comparison:'Compare scope, degree, and alternatives in context.',
  certainty:'Separate evidence, expectation, and certainty.',
  reported:'Identify whose information or viewpoint is being reported.',
  voice:'Identify who acts, who benefits, and who is affected.',
  honorifics:'Choose language appropriate to speaker, listener, and social relationship.',
  formal:'Interpret formal connections and written register.',
  evaluation:'Recognize evaluation and the reasons supporting it.',
  concession:'Interpret a concession before drawing a conclusion.',
  nuance:'Distinguish stance, implication, and restrictions in advanced expression.',
};
const unique = (ids:string[]) => [...new Set(ids)];
const levelOf = (item:{jlptLevel?:JLPTLevel}) => item.jlptLevel||'n3';

export function buildLearningPath(bank:Bank, options:{levels?:JLPTLevel[];prefix?:string} = {}):LearningPath[] {
  return (options.levels || ['n3','n2','n1'] as JLPTLevel[]).map(level=>{
    const key=(options.prefix||'')+level;
    const skillReferences=(skills:string[])=>skills.flatMap(skill=>[`somatome-${level}-${skill}`,...(level==='n5'?[]:[`kanzen-${level}-${skill}`])]);
    const words=bank.vocabulary.filter(v=>levelOf(v)===level);
    const grammar=bank.grammar.filter(g=>levelOf(g)===level).sort((a,b)=>{
      if(level==='n5'||level==='n4') return 0; // Preserve the foundations' basic-form/particle sequence.
      const rank=(g:Grammar)=>{const n=prerequisiteFamilies.indexOf(g.category||'');return n<0?prerequisiteFamilies.length:n;};
      return rank(a)-rank(b);
    });
    const readings=bank.readings.filter(r=>levelOf(r)===level);
    const listening=bank.listening.filter(l=>levelOf(l)===level);
    const questions=bank.questions.filter(q=>levelOf(q)===level);
    // The unit count follows available material: at most seven words and two patterns per day.
    const dailyCount=Math.max(Math.ceil(words.length/7),Math.ceil(grammar.length/2),readings.length,listening.length);
    const units:PathUnit[]=[];let earlier:string[]=[];
    for(let offset=0;offset<dailyCount;offset+=6){
      const number=units.length+1,unitId=`${key}-unit-${number}`;
      const lessons:PathLesson[]=[];
      for(let day=offset;day<Math.min(offset+6,dailyCount);day++){
        const freshWords=words.slice(day*7,day*7+7),freshGrammar=grammar.slice(day*2,day*2+2);
        const selectedWords=freshWords.length?freshWords:Array.from({length:Math.min(7,words.length)},(_,i)=>words[(day*7+i)%words.length]);
        const selectedGrammar=freshGrammar.length?freshGrammar:Array.from({length:Math.min(2,grammar.length)},(_,i)=>grammar[(day*2+i)%grammar.length]);
        const reading=readings[day%readings.length]||null;
        const audio=listening[day%listening.length]||null;
        const ownIds=unique([
          ...questions.filter(q=>q.vocabularyId&&selectedWords.some(v=>v.id===q.vocabularyId)).map(q=>q.id),
          ...selectedGrammar.flatMap(g=>g.questionIds),...(reading?.questionIds||[]),...(audio?.questionIds||[]),
        ]);
        const family=selectedGrammar[0]?.category||'retrieval';
        lessons.push({id:`${key}-day-${day+1}`,title:`Lesson ${day+1} · ${selectedGrammar[0]?.title||reading?.title||'Context and retrieval'}`,kind:'daily',
          objective:familyObjectives[family]||'Recall words in context and explain the meaning of connected ideas.',
          prerequisite:day?`Retrieve a few items from lesson ${day} before starting.`:level==='n3'?'Review plain forms, particles, and N4 conditionals.':level==='n5'?'Begin with kana, basic sentence order and greetings.':level==='n4'?'Review N5 particles, polite forms and basic everyday words.':`Review the preceding ${level==='n2'?'N3':'N2'} level’s clause connections, inference, and reading strategies.`,
          vocabularyIds:selectedWords.map(v=>v.id),kanjiIds:bank.kanji.filter(k=>k.wordIds.some(id=>selectedWords.some(v=>v.id===id))).map(k=>k.id),
          grammarIds:selectedGrammar.map(g=>g.id),readingId:reading?.id||null,listeningId:audio?.id||null,questionIds:ownIds,retrievalIds:earlier.slice(-24),
          // Original context sentences literally contain the day's word usage and grammar examples.
          // The longer reading/audio is an additional strategy task, not a claimed book/day match.
          context:[...selectedWords.map(v=>({ja:v.example,en:v.exampleTranslation})),...selectedGrammar.map(g=>g.examples[0])],
          referenceIds:[`somatome-${level}-vocabulary`,`somatome-${level}-kanji`,...skillReferences(['grammar','reading','listening']).filter(id=>!id.startsWith('kanzen-')),...skillReferences(['grammar','reading','listening']).filter(id=>id.startsWith('kanzen-'))],
        });
        earlier=unique([...earlier,...ownIds]);
      }
      const current=unique(lessons.flatMap(l=>l.questionIds));
      lessons.push({id:`${key}-review-${number}`,title:'Cumulative review',kind:'review',objective:'Retrieve this unit and earlier material, then revisit weak answers.',prerequisite:'Study this unit’s daily lessons at your own pace.',
        vocabularyIds:unique(lessons.flatMap(l=>l.vocabularyIds)),kanjiIds:unique(lessons.flatMap(l=>l.kanjiIds)),grammarIds:unique(lessons.flatMap(l=>l.grammarIds)),readingId:lessons[0]?.readingId||null,listeningId:lessons[0]?.listeningId||null,
        questionIds:current,retrievalIds:earlier.filter(id=>!current.includes(id)),context:lessons.flatMap(l=>l.context).slice(0,4),referenceIds:[`somatome-${level}-vocabulary`]});
      const family=grammar[offset*2]?.category||'retrieval';
      units.push({id:unitId,title:`Unit ${number} · ${family.replaceAll('-',' ')}`,objective:familyObjectives[family]||'Consolidate contextual understanding and retrieval.',prerequisites:number>1?[units[number-2].id]:[],lessons});
    }
    const finalId=`${key}-revision`;
    const shared={vocabularyIds:words.map(v=>v.id),kanjiIds:bank.kanji.filter(k=>k.wordIds.some(id=>words.some(v=>v.id===id))).map(k=>k.id),grammarIds:grammar.map(g=>g.id),readingId:readings.at(-1)?.id||null,listeningId:listening.at(-1)?.id||null,questionIds:questions.map(q=>q.id),retrievalIds:[] as string[],context:[] as {ja:string;en:string}[],referenceIds:level==='n5'?skillReferences(['grammar','reading','listening']):[`kanzen-${level}-grammar`,`kanzen-${level}-reading`,`kanzen-${level}-listening`]};
    units.push({id:`${key}-final`,title:'Comprehensive revision and mock',objective:'Revisit all skills before an original full timed test.',prerequisites:units.length?[units.at(-1)!.id]:[],lessons:[
      {...shared,id:finalId,title:'Comprehensive revision',kind:'revision',objective:'Use weak answers to choose revision across vocabulary, kanji, grammar, reading, and listening.',prerequisite:'Review cumulative checkpoints; repeat any weak unit.'},
      {...shared,id:`${key}-path-mock`,title:`Original ${level.toUpperCase()} full mock`,kind:'mock',objective:'Manage time across the official testing blocks, then review raw practice results.',prerequisite:'Complete comprehensive revision when ready; this step is optional until you are prepared.'},
    ]});
    return {level,title:`${level.toUpperCase()} integrated learning path`,pacing:'Six manageable lessons followed by cumulative review. Units are flexible study cycles, not calendar deadlines or matching book chapters. Current N3 Sō-matome volumes advertise eight weeks with Day 7 review; this app’s unit count follows its own content.',
      gaps:['Publisher descriptions and available contents establish skill objectives; unavailable previews leave chapter-by-chapter alignment unverified.','Longer reading and dialogue tasks are mapped separately by skill and context; corresponding days in different books are not assumed to match.','N2/N1 collections are expanding original study banks, not an exhaustive official syllabus or complete textbook coverage.','Browser speech plays original scripts; human-recorded voices and some official picture-based tasks are not supplied.'],units};
  });
}
