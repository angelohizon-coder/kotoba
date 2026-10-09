import type { Grammar, Kanji, Listening, Question, Reading, Vocabulary } from '../types';
import { buildLearningPath } from './learning-path';
import type { LearningPath } from './learning-path';

interface Bank {vocabulary:Vocabulary[];kanji:Kanji[];grammar:Grammar[];readings:Reading[];listening:Listening[];questions:Question[]}

// Append separately identified cycles. Existing saved lesson IDs retain their
// exact teaching targets; new content cannot silently complete an old checkmark.
export function extendDatasetPaths(established:LearningPath[], additions:Bank, complete:Bank):LearningPath[] {
  const addedPlans=buildLearningPath(additions,{prefix:'ds-'});
  const completePlans=buildLearningPath(complete,{prefix:'ds-'});
  const extended=established.map(plan=>{
    const added=addedPlans.find(item=>item.level===plan.level)!;
    const current=completePlans.find(item=>item.level===plan.level)!;
    const oldStudyUnits=plan.units.filter(unit=>unit.lessons.some(lesson=>lesson.kind==='daily'));
    const earlier=oldStudyUnits.flatMap(unit=>unit.lessons.flatMap(lesson=>lesson.questionIds));
    const newStudyUnits=added.units.filter(unit=>unit.lessons.some(lesson=>lesson.kind==='daily')).map((unit,index)=>({
      ...unit,title:'Extra study · '+unit.title,
      prerequisites:index===0&&oldStudyUnits.length?[oldStudyUnits.at(-1)!.id]:unit.prerequisites,
      lessons:unit.lessons.map(lesson=>({...lesson,retrievalIds:lesson.retrievalIds.length?lesson.retrievalIds:[...new Set(earlier)].slice(-24)})),
    }));
    const final={...current.units.at(-1)!,prerequisites:[newStudyUnits.at(-1)?.id||oldStudyUnits.at(-1)!.id]};
    return {...plan,pacing:plan.pacing+' Extra study cycles extend the library while preserving earlier saved lessons.',
      units:[...plan.units.map(unit=>unit.lessons.some(lesson=>lesson.kind==='revision')?{...unit,title:'Earlier library revision and mock'}:unit),...newStudyUnits,final]};
  });
  const foundations=buildLearningPath(complete,{levels:['n5','n4']});
  // Keep the established array ordering for older code; choose actual levels by ID.
  return [...extended,...foundations];
}
