// Generated from src/lib/learnlab.ts and its local imports. Edit src/ then run tools/build-browser.mjs.
(function(global){
'use strict';
const compiled={};
compiled["src/lib/learnlab.ts"] = (() => {
const { vocabulary, grammar, readings, listening, topics } = global.KotobaContent;

// Small original cultural and register lessons. Labels describe usage, not pitch accent.
const bonusLessons = [
  { id: 'bonus-genkan', category: 'Culture', title: 'Entering a home', label: 'Polite request', body: 'At a home entrance, shoes usually stay in the genkan. Follow your host’s guidance; indoor slippers are not always used on tatami.', prompt: '「玄関で靴を脱いでください。」 What is the guest asked to do?', options: ['Take off their shoes at the entrance.', 'Put shoes on the tatami.', 'Leave without greeting.', 'Open every room.'], correct: 0, feedback: '靴を脱ぐ means take off shoes. ください makes this a polite request.' },
  { id: 'bonus-sonkeigo', category: 'Keigo · Sonkeigo', title: 'Respectful language', label: 'Respect for another person', body: '尊敬語 (sonkeigo) raises the person whose action you describe. It does not raise your own action.', prompt: '先生がいらっしゃいました。Whose action receives respect?', options: ['The teacher’s arrival.', 'The speaker’s arrival.', 'A humble description of the speaker.', 'A casual command.'], correct: 0, feedback: 'いらっしゃる respectfully describes another person coming, going, or being present. Context determines which action.' },
  { id: 'bonus-kenjogo', category: 'Keigo · Kenjougo', title: 'Humble language', label: 'Humble about your own action', body: '謙譲語 (kenjōgo) lowers your side’s action in relation to the person it concerns. 伺う can mean humbly visit or ask, depending on context.', prompt: '明日、先生のお宅に伺います。Which explanation fits?', options: ['The speaker humbly says they will visit the teacher.', 'The teacher is arriving at the speaker’s home.', 'A casual order to the teacher.', 'The speaker respectfully raises their own visit.'], correct: 0, feedback: 'Here 伺います refers to the speaker visiting the teacher’s home. Respectfully raising your own visit would mismatch this relationship.' },
  { id: 'bonus-teineigo', category: 'Keigo · Teineigo', title: 'Polite endings', label: 'Polite register', body: '丁寧語 (teineigo) includes です and ます. It makes speech polite to the listener; it does not by itself make an action respectful or humble.', prompt: 'Which version uses polite endings consistently?', options: ['明日は休みです。家で勉強します。', '明日は休みだ。家で勉強します。', '明日は休みです。家で勉強する。', '明日は休みだ。家で勉強する。'], correct: 0, feedback: 'です and ます maintain polite endings across this short example. Mixed endings can occur for a purpose, but do not satisfy this requested consistent register.' },
  { id: 'bonus-transitivity', category: 'Verb pairs', title: 'An event and an action', label: 'Intransitive / transitive', body: 'ドアが開きました describes the door opening. 私がドアを開けました describes a person opening the door. Transitive verbs often take an object with を.', prompt: 'Someone opened the door. Choose the matching sentence.', options: ['私がドアを開けました。', '私がドアが開きました。', 'ドアを開きました。', 'ドアが私を開けました。'], correct: 0, feedback: '開ける is transitive here: 私が identifies the person, and ドアを identifies the object. 開く describes the door opening.' },
  { id: 'bonus-giongo', category: 'Onomatopoeia · Giongo', title: 'Words that imitate sounds', label: 'Giongo · actual sound', body: '擬音語 (giongo) imitate sounds. ワンワン represents a dog’s barking. Sound symbolism is context dependent, so learn examples with their meanings.', prompt: '犬がワンワン鳴いています。What does ワンワン describe?', options: ['The barking sound.', 'A shining appearance.', 'A respectful greeting.', 'A silent emotional state.'], correct: 0, feedback: 'ワンワン imitates barking. キラキラ, by comparison, often describes a sparkling appearance rather than an actual sound.' },
  { id: 'bonus-gitaigo', category: 'Onomatopoeia · Gitaigo', title: 'Words that portray a state', label: 'Gitaigo · appearance or state', body: '擬態語 (gitaigo) portray a state, motion, or appearance without necessarily imitating a sound. 星がキラキラ光っています describes stars sparkling.', prompt: 'In 星がキラキラ光っています, what does キラキラ portray?', options: ['A sparkling appearance.', 'A dog’s barking.', 'A telephone ringtone.', 'A humble request.'], correct: 0, feedback: 'キラキラ portrays the visual impression of sparkling in this sentence. No pitch-accent value is supplied.' },
  { id: 'bonus-attachment', category: 'Grammar forms', title: 'The form before こと', label: 'Plain form before the pattern', body: 'In an arrangement sentence, verb dictionary form + ことになる presents the resulting decision. The polite ending goes at the end of the sentence.', prompt: '来週からここで（　）ことになりました。Which form fits?', options: ['働く', '働きます', '働いて', '働こう'], correct: 0, feedback: '働く is the dictionary form before こと. になりました supplies the polite ending.' },
]         ;

const wordMap = new Map(vocabulary.map(word => [word.id, word]));
const bonusMap = new Map(bonusLessons.map(item => [item.id          , item]));
const contentIds = new Set([...vocabulary, ...grammar, ...readings, ...listening].map(item => item.id));
const levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
const modes = ['recall', 'sentence', 'pairs', 'dictation', 'bonus'];
const dictionaryForms = [...new Set(vocabulary.map(word=>word.word))].sort((a,b)=>b.length-a.length);
const day = 86400000;
const levelOf = (word                           ) => word.jlptLevel || 'n3';
const shuffle =    (items     , random              )      => {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.max(0, Math.min(i, Math.floor(random() * (i + 1)))); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
};
const bad = (message        )        => { throw new Error('Invalid learning lab: ' + message); };
function text(value         , label        , max = 2000, empty = false)         { if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) bad(label); return value          ; }
function integer(value         , label        , max = 8640000000000000)         { if (!Number.isSafeInteger(value) || (value          ) < 0 || (value          ) > max) bad(label); return value          ; }
function list(value         , label        , max = 100)            { if (!Array.isArray(value) || value.length > max) bad(label); return value             ; }
function object(value         , label        )                          { if (!value || typeof value !== 'object' || Array.isArray(value)) bad(label); return value                           ; }
function unique(items          , label        )           { if (new Set(items).size !== items.length) bad(label); return items; }

function initialLearnLab()                { return { version: 1, activeSessionId: null, sessions: [], reviews: {}, reports: [], drafts: [] }; }
function normalizeAnswer(value        )         { return String(value).normalize('NFKC').trim().replace(/[\s。．.!！?？、，,]/gu, '').replace(/[ァ-ヶ]/gu, character => String.fromCharCode(character.charCodeAt(0) - 0x60)); }
function editDistance(a        , b        )         {
  const left = Array.from(a), right = Array.from(b); let prior = Array.from({ length: right.length + 1 }, (_, i) => i);
  left.forEach((letter, i) => { const row = [i + 1]; right.forEach((other, j) => row.push(Math.min(row[j] + 1, prior[j + 1] + 1, prior[j] + (letter === other ? 0 : 1)))); prior = row; });
  return prior[right.length];
}
function romajiToKana(value        )         {
  const table                         = { a:'あ',i:'い',u:'う',e:'え',o:'お',ka:'か',ki:'き',ku:'く',ke:'け',ko:'こ',sa:'さ',shi:'し',si:'し',su:'す',se:'せ',so:'そ',ta:'た',chi:'ち',ti:'ち',tsu:'つ',tu:'つ',te:'て',to:'と',na:'な',ni:'に',nu:'ぬ',ne:'ね',no:'の',ha:'は',hi:'ひ',fu:'ふ',hu:'ふ',he:'へ',ho:'ほ',ma:'ま',mi:'み',mu:'む',me:'め',mo:'も',ya:'や',yu:'ゆ',yo:'よ',ra:'ら',ri:'り',ru:'る',re:'れ',ro:'ろ',wa:'わ',wo:'を',ga:'が',gi:'ぎ',gu:'ぐ',ge:'げ',go:'ご',za:'ざ',ji:'じ',zi:'じ',zu:'ず',ze:'ぜ',zo:'ぞ',da:'だ',de:'で',do:'ど',ba:'ば',bi:'び',bu:'ぶ',be:'べ',bo:'ぼ',pa:'ぱ',pi:'ぴ',pu:'ぷ',pe:'ぺ',po:'ぽ',kya:'きゃ',kyu:'きゅ',kyo:'きょ',sha:'しゃ',shu:'しゅ',sho:'しょ',cha:'ちゃ',chu:'ちゅ',cho:'ちょ',nya:'にゃ',nyu:'にゅ',nyo:'にょ',hya:'ひゃ',hyu:'ひゅ',hyo:'ひょ',mya:'みゃ',myu:'みゅ',myo:'みょ',rya:'りゃ',ryu:'りゅ',ryo:'りょ',gya:'ぎゃ',gyu:'ぎゅ',gyo:'ぎょ',ja:'じゃ',ju:'じゅ',jo:'じょ',bya:'びゃ',byu:'びゅ',byo:'びょ',pya:'ぴゃ',pyu:'ぴゅ',pyo:'ぴょ' };
  return value.toLowerCase().replace(/[a-z']+/g, run => { let result=''; for(let i=0;i<run.length;){ if(run[i]===run[i+1]&&/[bcdfghjklmpqrstvwxyz]/.test(run[i])){result+='っ';i++;continue;}if(run[i]==='n'&&(i===run.length-1||run[i+1]==="'"||!/^[aiueoyn]$/.test(run[i+1]))){result+='ん';i+=run[i+1]==="'"?2:1;continue;}let found=false;for(const size of [3,2,1]){const key=run.slice(i,i+size);if(table[key]){result+=table[key];i+=size;found=true;break;}}if(!found){result+=run[i];i++;}}return result; });
}
function wordNotes(id        )                                                                {
  const word=wordMap.get(id);if(!word)bad('unknown word');
  return { homophones: vocabulary.filter(other=>other.id!==id&&normalizeAnswer(other.reading)===normalizeAnswer(word .reading)).map(other=>`${other.word}: ${other.meaning}`).slice(0,6),wordClass:word .wordClass,register:/(?:ます|でした|です|ください)[。！]?$/u.test(word .example)?'Polite example':'Original example' };
}
function sentenceTokens(sentence        )           {
  const manual                          = { '私は図書館で本を借ります。':['私','は','図書館','で','本','を','借ります','。'],'ドアが開きました。':['ドア','が','開きました','。'] };
  if (typeof Intl.Segmenter === 'function') {
    const parts=[...new Intl.Segmenter('ja',{granularity:'word'}).segment(sentence)].map(part=>part.segment).filter(part=>part.trim()),result         =[];
    for(let i=0;i<parts.length;){const form=dictionaryForms.find(word=>word.startsWith(parts[i])&&word!==parts[i]&&parts.slice(i,i+word.length).join('').startsWith(word));let combined=parts[i],last=i;if(form){while(combined.length<form.length&&last+1<parts.length)combined+=parts[++last];}if(form&&combined===form){result.push(form);i=last+1;}else{result.push(parts[i]);i++;}}
    return result;
  }
  return manual[sentence]?.slice() || [sentence];
}
function itemWords(item         ) { return item.wordIds.map(id=>wordMap.get(id) ); }
function currentExercise(session            ) {
  const item=session.queue[session.cursor];if(!item)return null;
  const words=itemWords(item),target=words[0],bonus=item.bonusId?bonusMap.get(item.bonusId):null;
  const tokens=target?sentenceTokens(target.example):[];
  return { ...item, words, target, bonus, prompt:bonus?.prompt||(item.kind==='dictation'?'Listen, then type the word or its kana reading.':item.kind==='sentence'?target?.exampleTranslation:item.kind==='pairs'?'Match each word with its meaning.':target?.meaning),bank:(item.bankOrder||tokens.map((_,i)=>i)).map(index=>({id:String(index),text:tokens[index]})), options:bonus?(item.optionOrder||[0,1,2,3]).map(index=>({id:String(index),label:bonus.options[index]})):(item.choices||[]).map(id=>({id,label:wordMap.get(id) .word})), grammarForms:grammar.filter(point=>(point.jlptLevel||'n3')===session.level).slice(0,2).map(point=>({title:point.title,attachment:point.attachment})) };
}
function gradeResponse(exercise                                                 , answer           ) {
  const word=exercise.target;
  let exact=false,typo=false;let expected='';
  if(exercise.kind==='bonus'){exact=answer===String(exercise.bonus .correct);expected=exercise.bonus .options[exercise.bonus .correct];}
  else if(exercise.kind==='choice'){exact=answer===word.id;expected=word.word+'（'+word.reading+'）';}
  else if(exercise.kind==='pairs'){
    const pairs                      =answer&&typeof answer==='object'&&!Array.isArray(answer)?answer:{};
    exact=exercise.words.every(item=>pairs[item.id]===item.id)&&Object.keys(pairs).length===exercise.words.length;
    expected=exercise.words.map(item=>item.word+' = '+item.meaning).join(' / ');
  }else if(exercise.kind==='sentence'){
    const choices=Array.isArray(answer)?answer:[];
    exact=choices.length===exercise.bank.length&&new Set(choices).size===choices.length&&choices.every(id=>exercise.bank.some(token=>token.id===id))&&choices.map(id=>exercise.bank.find(token=>token.id===id) .text).join('')===word.example.replace(/\s/gu,'');
    expected=word.example;
  }else{
    const given=typeof answer==='string'?normalizeAnswer(answer):'',reading=normalizeAnswer(word.reading),surface=normalizeAnswer(word.word);
    exact=given!==''&&(given===reading||given===surface);expected=word.word+'（'+word.reading+'）';
    const mora=Array.from(reading).filter(character=>!/[ゃゅょぁぃぅぇぉゎ]/u.test(character)).length;
    const isOtherWord=vocabulary.some(other=>other.id!==word.id&&(normalizeAnswer(other.word)===given||normalizeAnswer(other.reading)===given));
    typo=!exact&&mora>=3&&/^[\p{Script=Hiragana}ー]+$/u.test(given)&&!isOtherWord&&editDistance(given,reading)===1;
  }
  const outcome=exact?'exact':typo?'typo':'incorrect';
  return {outcome:outcome                        ,accepted:exact||typo,masteryCredit:exact,expected,feedback:exercise.bonus?.feedback||(exact?'Correct.':typo?'Correct with a typo. Practise the exact reading again; this does not earn an exact-recall credit.':'Review the word and try it again in an easier final challenge.')};
}

function createSession(state               , options                                                                                                     )                {
  validateLearnLab(state);if(state.activeSessionId)return state;
  if(!modes.includes(options.mode)||!levels.includes(options.level))bad('session mode or level');
  const count=options.count??4;if(!Number.isInteger(count)||count<3||count>5)bad('choose 3 to 5 new concepts');
  const now=options.now??Date.now(),random=options.random??Math.random;
  integer(now,'session time');
  const prior=new Set([...(options.studiedWordIds||[]),...Object.keys(state.reviews),...state.sessions.filter(session=>session.status==='complete').flatMap(session=>session.newWordIds)]);
  const pool=vocabulary.filter(word=>levelOf(word)===options.level);
  const unseen=shuffle(pool.filter(word=>!prior.has(word.id)),random);
  const fresh=unseen.slice(0,count);if(fresh.length<count)fresh.push(...shuffle(pool.filter(word=>!fresh.some(item=>item.id===word.id)),random).slice(0,count-fresh.length));
  if(fresh.length<3)bad('not enough canonical vocabulary');
  const review=shuffle(pool.filter(word=>prior.has(word.id)&&!fresh.some(item=>item.id===word.id)),random).sort((a,b)=>(state.reviews[a.id]?.dueAt??Number.MAX_SAFE_INTEGER)-(state.reviews[b.id]?.dueAt??Number.MAX_SAFE_INTEGER));
  let ordinal=state.sessions.length+1;while(state.sessions.some(item=>item.id==='lab-'+now+'-'+ordinal))ordinal++;
  const id='lab-'+now+'-'+ordinal;const queue          =[];
  const add=(kind                ,wordIds         ,retrieval=false,bonusId        )=>{
    const target=wordMap.get(wordIds[0]);const tokens=target?sentenceTokens(target.example):[];
    queue.push({id:id+':'+(queue.length+1),kind,wordIds,retrieval,...(bonusId?{bonusId,optionOrder:shuffle([0,1,2,3],random)}:{}),...(kind==='sentence'?{bankOrder:shuffle(tokens.map((_,i)=>i),random)}:{})});
  };
  if(options.mode==='bonus'){
    const lessons=shuffle(bonusLessons.slice(),random).slice(0,count);lessons.forEach(lesson=>add('bonus',[],false,lesson.id));for(let i=0;i<Math.ceil(count/4);i++)add('bonus',[],true,lessons[i%lessons.length].id);
  }else if(options.mode==='pairs'){
    add('pairs',fresh.map(word=>word.id));add('pairs',(review.length>=3?review:fresh).slice(0,Math.min(count,Math.max(3,review.length))).map(word=>word.id),true);
  }else{
    fresh.forEach(word=>add(options.mode,[word.id]));
    const retrievalCount=Math.ceil(count/4);
    for(let i=0;i<retrievalCount;i++)add(options.mode,[(review[i]||fresh[i%fresh.length]).id],true);
  }
  const session           ={id,mode:options.mode,level:options.level,newWordIds:options.mode==='bonus'?[]:fresh.map(word=>word.id),queue,cursor:0,phase:'learn',status:'in-progress',createdAt:now,itemStartedAt:now,results:[]};
  return {...state,activeSessionId:id,sessions:[...state.sessions.slice(-39),session]};
}
function replaceSession(state               , session            )                { return {...state,sessions:state.sessions.map(item=>item.id===session.id?session:item)}; }
function beginSession(state               , id        , now=Date.now())                {
  const session=state.sessions.find(item=>item.id===id);if(!session||session.id!==state.activeSessionId||session.status!=='in-progress'||session.phase==='challenge')return state;
  return replaceSession(state,{...session,phase:'challenge',itemStartedAt:Math.max(now,session.createdAt)});
}
function resumeExercise(state              ,id       ,now=Date.now())               {
  const session=state.sessions.find(item=>item.id===id);if(!session||state.activeSessionId!==id||session.status!=='in-progress'||session.phase!=='challenge'||!currentExercise(session))return state;
  integer(now,'exercise time');return replaceSession(state,{...session,itemStartedAt:Math.max(now,session.itemStartedAt)});
}
function answerSession(state               , id        , exerciseId        , answer           , now=Date.now())                {
  const session=state.sessions.find(item=>item.id===id);if(!session||state.activeSessionId!==id||session.status!=='in-progress'||session.phase!=='challenge')return state;
  const exercise=currentExercise(session);if(!exercise||exercise.id!==exerciseId)return state;
  validateAnswer(answer);integer(now,'answer time');if(now<session.itemStartedAt)bad('answer precedes exercise');
  const grade=gradeResponse(exercise,answer);const results=[...session.results,{exerciseId,outcome:grade.outcome,answer:JSON.parse(JSON.stringify(answer)),latencyMs:Math.max(0,now-session.itemStartedAt),at:now}];
  const queue=session.queue.slice();
  if(session.cursor===queue.length-1&&!exercise.final){
    if(session.mode==='bonus')queue.push({id:id+':'+(queue.length+1),kind:'bonus',wordIds:[],retrieval:true,bonusId:exercise.bonusId,optionOrder:shuffle([0,1,2,3],()=>.4),final:true});
    else{
      const missed=results.find(result=>result.outcome!=='exact');const targetId=(missed?queue.find(item=>item.id===missed.exerciseId):exercise)?.wordIds[0]||session.newWordIds[0];
      const distractors=shuffle(vocabulary.filter(word=>levelOf(word)===session.level&&word.id!==targetId),()=>.37).slice(0,3).map(word=>word.id);
      queue.push({id:id+':'+(queue.length+1),kind:'choice',wordIds:[targetId],retrieval:true,choices:shuffle([targetId,...distractors],()=>.61),final:true});
    }
  }
  return replaceSession(state,{...session,queue,cursor:session.cursor+1,results,itemStartedAt:now});
}
function finishSession(state               ,id       ,now=Date.now())               {
  const session=state.sessions.find(item=>item.id===id);if(!session||state.activeSessionId!==id||session.status!=='in-progress'||session.cursor!==session.queue.length||!session.queue.at(-1)?.final)return state;
  integer(now,'finish time');if(now<session.itemStartedAt)bad('finish precedes answer');
  const reviews={...state.reviews};const outcomes=new Map                ();
  session.results.forEach(result=>session.queue.find(item=>item.id===result.exerciseId)?.wordIds.forEach(wordId=>outcomes.set(wordId,(outcomes.get(wordId)??true)&&result.outcome==='exact')));
  outcomes.forEach((exact,wordId)=>{const old=reviews[wordId];reviews[wordId]={dueAt:now+(exact?3:1)*day,exactStreak:exact?Math.min(10000,(old?.exactStreak||0)+(old&&now<old.dueAt?0:1)):0,seen:Math.min(10000,(old?.seen||0)+1)};});
  return {...replaceSession(state,{...session,status:'complete',finishedAt:now}),activeSessionId:null,reviews};
}
function abandonSession(state              ,id       ,now=Date.now())               {
  const session=state.sessions.find(item=>item.id===id);if(!session||state.activeSessionId!==id||session.status!=='in-progress')return state;
  return {...replaceSession(state,{...session,status:'abandoned',finishedAt:now}),activeSessionId:null};
}
function validateAnswer(answer        )           {
  if(typeof answer==='string')return text(answer,'answer',2000,true);
  if(Array.isArray(answer))return list(answer,'sentence answer',100).map(value=>text(value,'token id',80));
  const pairs=object(answer,'pair answer');if(Object.keys(pairs).length>5)bad('pair count');const result                      ={};for(const [id,value]of Object.entries(pairs)){if(!wordMap.has(id))bad('pair word');result[id]=text(value,'pair target',100);}return result;
}
function validateDraft(input        )          {
  const item=object(input,'draft');if(item.version!==1)bad('draft version');
  const id=text(item.id,'draft id',90);if(!/^draft-[a-z0-9-]+$/.test(id))bad('draft id');
  const kind=text(item.kind,'draft kind',20);if(!['vocabulary','grammar','reading','listening'].includes(kind))bad('draft kind');
  const level=text(item.level,'draft level',2);if(!levels.includes(level))bad('draft level');
  const topicId=text(item.topicId,'draft topic',30);if(!topics.some(topic=>topic.id===topicId))bad('draft topic');
  const result         ={version:1,id,kind:kind                    ,level:level            ,topicId,title:text(item.title,'draft title',160),body:text(item.body,'draft Japanese',8000),translation:text(item.translation,'draft translation',8000),sourceNote:text(item.sourceNote,'draft source note',600)};
  if(kind==='vocabulary'){result.word=text(item.word,'draft word',80);result.reading=text(item.reading,'draft kana reading',160);if(!/^[\p{Script=Hiragana}\p{Script=Katakana}ー・\s]+$/u.test(result.reading))bad('draft kana reading');result.meaning=text(item.meaning,'draft meaning',500);}
  return result;
}
function saveDraft(state              ,input        )               {
  const draft=validateDraft(input);if(!state.drafts.some(item=>item.id===draft.id)&&state.drafts.length>=20)bad('20 local drafts maximum');
  return {...state,drafts:[...state.drafts.filter(item=>item.id!==draft.id),draft]};
}
function addReport(state              ,contentId       ,reason                    ,message       ,now=Date.now())               {
  if(!contentIds.has(contentId)&&!bonusMap.has(contentId))bad('report content');if(!['reading','translation','ambiguous','typo','other'].includes(reason))bad('report reason');text(message,'report message',1200);integer(now,'report time');
  let ordinal=state.reports.length+1;while(state.reports.some(item=>item.id==='report-'+now+'-'+ordinal))ordinal++;
  const id='report-'+now+'-'+ordinal;return {...state,reports:[...state.reports.slice(-99),{id,contentId,reason,message:message.trim(),status:'open',createdAt:now}]};
}
function resolveReport(state              ,id       )               { return {...state,reports:state.reports.map(report=>report.id===id?{...report,status:'resolved'}:report)}; }
function groupReports(state              ) { const groups                           ={};state.reports.forEach(report=>(groups[report.contentId]??=[]).push(report));return groups; }
function validateLearnLab(input        )               {
  if(input===undefined)return initialLearnLab();const value=object(input,'state');if(value.version!==1)bad('version');
  const sessions=list(value.sessions,'sessions',40).map(raw=>{
    const s=object(raw,'session'),id=text(s.id,'session id',100),mode=text(s.mode,'mode',20),level=text(s.level,'level',2);
    if(!/^lab-\d+-\d+$/.test(id)||!modes.includes(mode)||!levels.includes(level))bad('session identity');
    const wordIds=(rawIds        ,label       )=>unique(list(rawIds,label,5).map(rawId=>{const wordId=text(rawId,label,100);const word=wordMap.get(wordId);if(!word||levelOf(word)!==level)bad('canonical word level');return wordId;}),label);
    const newWordIds=wordIds(s.newWordIds,'new words');if(mode!=='bonus'&&(newWordIds.length<3||newWordIds.length>5)||mode==='bonus'&&newWordIds.length)bad('new concept count');
    const queue=list(s.queue,'queue',12).map((rawItem,index)=>{
      const item=object(rawItem,'exercise'),kind=text(item.kind,'exercise kind',20);if(![...modes,'choice'].includes(kind)||item.id!==id+':'+(index+1)||typeof item.retrieval!=='boolean'||item.final!==undefined&&item.final!==true)bad('exercise metadata');
      const ids=wordIds(item.wordIds,'exercise words');
      if(kind==='bonus'){if(ids.length||!bonusMap.has(String(item.bonusId)))bad('bonus concept');}
      else if(kind==='pairs'){if(ids.length<3||ids.length>5)bad('pair count');}
      else if(ids.length!==1)bad('target count');
      if(kind!=='choice'&&kind!==mode)bad('exercise mode');
      const result        ={id:item.id          ,kind:kind                   ,wordIds:ids,retrieval:item.retrieval           ,...(item.final?{final:true}:{}),...(kind==='bonus'?{bonusId:String(item.bonusId)}:{})};
      if(kind==='sentence'){const tokens=sentenceTokens(wordMap.get(ids[0]) .example);const order=list(item.bankOrder,'bank order',100).map(value=>integer(value,'token index',tokens.length-1));if(order.length!==tokens.length||new Set(order).size!==order.length)bad('sentence tokens');result.bankOrder=order;}
      if(kind==='bonus'){const order=list(item.optionOrder,'bonus order',4).map(value=>integer(value,'bonus option',3));if(order.length!==4||new Set(order).size!==4)bad('bonus options');result.optionOrder=order;}
      if(kind==='choice'){const choices=wordIds(item.choices,'choice words');if(choices.length!==4||!choices.includes(ids[0])||item.final!==true)bad('final choices');result.choices=choices;}
      return result;
    });
    if(!queue.length||queue.filter(item=>item.retrieval).length/queue.length<.2||queue.filter(item=>item.final).length>1||queue.some((item,i)=>item.final&&i!==queue.length-1))bad('queue structure');
    const introduced=queue.filter(item=>!item.retrieval);
    if(mode==='bonus'){const concepts=unique(introduced.map(item=>item.bonusId ),'new bonus concepts');if(concepts.length<3||concepts.length>5)bad('bonus concept count');}
    else if([...new Set(introduced.flatMap(item=>item.wordIds))].sort().join('|')!==newWordIds.slice().sort().join('|'))bad('introduced word set');
    const cursor=integer(s.cursor,'cursor',queue.length),phase=text(s.phase,'phase',20),status=text(s.status,'status',20);if(!['learn','challenge'].includes(phase)||!['in-progress','complete','abandoned'].includes(status))bad('phase or status');
    const createdAt=integer(s.createdAt,'created time'),itemStartedAt=integer(s.itemStartedAt,'item time');if(itemStartedAt<createdAt)bad('item time order');
    const results=list(s.results,'results',12).map((rawResult,index)=>{const item=object(rawResult,'result');if(item.exerciseId!==queue[index]?.id||!['exact','typo','incorrect'].includes(String(item.outcome)))bad('result order');const answer=validateAnswer(item.answer);const expected=gradeResponse(currentExercise({queue,cursor:index}              ) ,answer);if(expected.outcome!==item.outcome)bad('result grade');return{exerciseId:item.exerciseId          ,outcome:item.outcome                        ,answer,latencyMs:integer(item.latencyMs,'latency'),at:integer(item.at,'answer time')};});
    if(results.length!==cursor||phase==='learn'&&cursor!==0||status==='complete'&&(cursor!==queue.length||!queue.at(-1)?.final||phase!=='challenge')||results.some((result,index)=>result.at<(results[index-1]?.at??createdAt)||result.latencyMs>result.at-createdAt))bad('result cursor or completion');
    const finishedAt=s.finishedAt===undefined?undefined:integer(s.finishedAt,'finished time');if(status==='in-progress'&&finishedAt!==undefined||status!=='in-progress'&&finishedAt===undefined||finishedAt!==undefined&&finishedAt<(results.at(-1)?.at??createdAt))bad('finished state');
    return{id,mode:mode           ,level:level            ,newWordIds,queue,cursor,phase:phase                       ,status:status                        ,createdAt,itemStartedAt,results,...(finishedAt!==undefined?{finishedAt}:{})};
  });
  unique(sessions.map(session=>session.id),'duplicate session');const active=value.activeSessionId===null?null:text(value.activeSessionId,'active session',100);
  if(sessions.filter(session=>session.status==='in-progress').length!==(active?1:0)||active&&!sessions.some(session=>session.id===active&&session.status==='in-progress'))bad('active session');
  const reviews                         ={};for(const[id,raw]of Object.entries(object(value.reviews,'reviews'))){if(!wordMap.has(id))bad('review word');const item=object(raw,'review');reviews[id]={dueAt:integer(item.dueAt,'review date'),exactStreak:integer(item.exactStreak,'exact streak',10000),seen:integer(item.seen,'seen count',10000)};}
  const drafts=list(value.drafts,'drafts',20).map(validateDraft);unique(drafts.map(draft=>draft.id),'duplicate draft');
  const reports=list(value.reports,'reports',100).map(raw=>{const item=object(raw,'report');const id=text(item.id,'report id',100),contentId=text(item.contentId,'report content',100);if(!/^report-\d+-\d+$/.test(id)||!contentIds.has(contentId)&&!bonusMap.has(contentId))bad('report identity');const reason=text(item.reason,'report reason',20),status=text(item.status,'report status',20);if(!['reading','translation','ambiguous','typo','other'].includes(reason)||!['open','resolved'].includes(status))bad('report category');return{id,contentId,reason:reason                       ,message:text(item.message,'report message',1200),status:status                       ,createdAt:integer(item.createdAt,'report date')};});
  unique(reports.map(report=>report.id),'duplicate report');return{version:1,activeSessionId:active,sessions,reviews,reports,drafts};
}
return {bonusLessons,initialLearnLab,normalizeAnswer,editDistance,romajiToKana,wordNotes,sentenceTokens,currentExercise,gradeResponse,createSession,beginSession,resumeExercise,answerSession,finishSession,abandonSession,validateDraft,saveDraft,addReport,resolveReport,groupReports,validateLearnLab};
})();
global.KotobaLearnLabModel=compiled["src/lib/learnlab.ts"];
})(window);
