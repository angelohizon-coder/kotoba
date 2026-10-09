// Generated from src/lib/motivation.ts and its local imports. Edit src/ then run tools/build-browser.mjs.
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
compiled["src/lib/motivation.ts"] = (() => {
const { grammar, kanji, learningPath, questions, vocabulary } = global.KotobaContent;


const { initialLearnLab, validateLearnLab } = compiled["src/lib/learnlab.ts"];

/** A retained canonical proof survives the Lab's rolling 40-session history. */
                                                                                                                    
                                                               
                                                      
 
                                                                                                      
                                  
                                                                                              
                                                                                                             
                                                                                              
                                                                              
                                                                                              
                                                               
                                                                           
                                       
 
                                                                                                          
                                                                    
                                                                                                              

const MOTIVATION_SHOP = [
  { id: 'freeze', title: 'Streak freeze', cost: 40, description: 'Protect one completed missed day. Hold up to two.' },
  { id: 'boost', title: '20-minute XP boost', cost: 60, description: 'Double XP from new eligible learning during a chosen 20-minute window.' },
  { id: 'sakura', title: 'Sakura card', cost: 80, description: 'A pink color for your local motivation cards.' },
  { id: 'ocean', title: 'Ocean card', cost: 80, description: 'A blue color for your local motivation cards.' },
  { id: 'sunset', title: 'Sunset card', cost: 120, description: 'A warm color for your local motivation cards.' },
]         ;
const DAILY_QUESTS = [
  { id: 'bronze', title: 'Bronze', xp: 20, correct: 5, perfect: 0, coins: 10 },
  { id: 'silver', title: 'Silver', xp: 50, correct: 10, perfect: 0, coins: 20 },
  { id: 'gold', title: 'Gold', xp: 100, correct: 20, perfect: 1, coins: 40 },
]         ;
const MOTIVATION_BADGES = [
  { id: 'first-steps', title: 'First steps', description: 'Earn 50 learning XP.' },
  { id: 'steady-study', title: 'Steady study', description: 'Earn 500 learning XP.' },
  { id: 'week-streak', title: 'A steady week', description: 'Reach a seven-day protected study streak.' },
  { id: 'month-streak', title: 'A steady month', description: 'Reach a 30-day protected study streak.' },
  { id: 'lesson-ten', title: 'Ten lessons', description: 'Complete ten lessons with recorded learning evidence.' },
  { id: 'reviewer', title: 'Retrieval habit', description: 'Rate 25 cards when their recorded reviews are due.' },
  { id: 'early-bird', title: 'Early bird', description: 'Claim after completing an eligible lesson between 5 am and 9 am.' },
  { id: 'night-owl', title: 'Night owl', description: 'Claim after completing an eligible lesson between 10 pm and 1 am.' },
]         ;

const questionMap = new Map(questions.map(item => [item.id, item]));
const wordIds = new Set(vocabulary.map(item => item.id));
const kanjiIds = new Set(kanji.map(item => item.id));
const grammarIds = new Set(grammar.map(item => item.id));
const lessons = new Map(learningPath.flatMap(path => path.units.flatMap(unit => unit.lessons.map(lesson => ['path:' + lesson.id, lesson]         ))));
const HEART_MS = 4 * 60 * 60_000;
const BOOST_MS = 20 * 60_000;
const localDay = (value                 ) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayDate = (day        ) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); };
const shiftDay = (day        , by        ) => { const d = dayDate(day); d.setDate(d.getDate() + by); return localDay(d.getTime()); };
const dayEnd = (day        ) => dayDate(shiftDay(day, 1)).getTime();
const iso = (now        ) => new Date(now).toISOString();
const copy = (state                 )                  => structuredClone(state);
function fail(message        )        { throw new Error('Invalid motivation: ' + message); }
const numeric = (value         , label        , min = 0, max = 100_000_000) => {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) fail(label + ' is out of range.');
  return Number(value);
};
const timestamp = (value         , label        ) => {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value || Date.parse(value) < 0 || Date.parse(value) >= Date.UTC(2200, 0, 1)) fail(label + ' must be an ISO timestamp.');
  return value          ;
};
const strings = (value         , label        , maximum = 100_000)           => {
  if (!Array.isArray(value) || value.length > maximum || value.some(item => typeof item !== 'string' || !item.length || item.length > 500) || new Set(value).size !== value.length) fail(label + ' must contain unique strings.');
  return value            ;
};
const validDay = (value         ) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(dayDate(value).getTime()) || localDay(dayDate(value).getTime()) !== value) fail('Calendar day is invalid.');
  return value          ;
};
const bool = (value         ) => { if (typeof value !== 'boolean') fail('Preference must be true or false.'); return value           ; };
const record = (value         ) => { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected an object.'); return value                           ; };
const enumOf =                   (value         , values              , label        )    => { if (typeof value !== 'string' || !values.includes(value     )) fail(label + ' is unsupported.'); return value     ; };

function prefs(input         )                        {
  const p = record(input);
  return {
    goal: enumOf(p.goal, ['travel', 'career', 'school'], 'Study goal'),
    dailyMinutes: numeric(p.dailyMinutes, 'Minute goal', 5, 120),
    dailyXP: numeric(p.dailyXP, 'XP goal', 10, 500),
    streakGoal: numeric(p.streakGoal, 'Streak goal', 1, 365),
    heartsEnabled: bool(p.heartsEnabled), disableAnimations: bool(p.disableAnimations), haptics: bool(p.haptics),
  };
}
function canonicalCard(key        ) {
  const split = key.indexOf(':'); const type = key.slice(0, split), id = key.slice(split + 1);
  return type === 'vocabulary' ? wordIds.has(id) : type === 'kanji' ? kanjiIds.has(id) : type === 'question' && questionMap.has(id);
}
function dueEvents(progress                    ) {
  return Object.entries(progress.srs || {}).flatMap(([card, item]) => canonicalCard(card)
    ? (item.events || []).filter(event => event.previousNextReviewAt && Date.parse(event.reviewedAt) >= Date.parse(event.previousNextReviewAt)).map(event => ({ card, event }))
    : []);
}
function activity(state                 , day         ) {
  const entries = state.ledger.filter(item => (!day || item.day === day) && !['quest', 'chest'].includes(item.kind));
  return { xp: entries.reduce((sum, item) => sum + item.xp, 0), correct: entries.reduce((sum, item) => sum + item.correct, 0), perfect: entries.filter(item => ['attempt', 'lab'].includes(item.kind) && item.perfect).length, days: new Set(entries.filter(item => item.xp > 0).map(item => item.day)) };
}
function streak(state                 , today        ) {
  const days = activity(state).days;
  const protectedDays = new Set(state.freezesUsed.map(item => item.day));
  let day = days.has(today) ? today : shiftDay(today, -1), count = 0;
  while (days.has(day) || protectedDays.has(day)) { count++; day = shiftDay(day, -1); }
  return count;
}
function badges(state                 , today        ) {
  const result = new Set        ();
  if (state.xp >= 50) result.add('first-steps');
  if (state.xp >= 500) result.add('steady-study');
  const days = new Set([...activity(state).days, ...state.freezesUsed.map(item => item.day)]);
  let longest = 0, run = 0, previousDay = '';
  for (const day of [...days].sort()) { run = previousDay && shiftDay(previousDay, 1) === day ? run + 1 : 1; longest = Math.max(longest, run); previousDay = day; }
  if (longest >= 7) result.add('week-streak');
  if (longest >= 30) result.add('month-streak');
  if (state.ledger.filter(item => ['lesson', 'lab'].includes(item.kind)).length >= 10) result.add('lesson-ten');
  if (state.ledger.filter(item => item.kind === 'review').length >= 25) result.add('reviewer');
  for (const claimed of state.claimedBadges) result.add(claimed);
  for (const month of new Set(state.ledger.map(item => item.day.slice(0, 7)))) {
    const xp = state.ledger.filter(item => item.day.startsWith(month) && !['quest', 'chest'].includes(item.kind)).reduce((sum, item) => sum + item.xp, 0);
    if (xp >= 300) result.add('monthly:' + month);
  }
  return [...result];
}
function totals(state                 ) {
  state.xp = state.ledger.reduce((sum, item) => sum + item.xp, 0);
  state.coins = state.ledger.reduce((sum, item) => sum + item.coins, 0) - state.purchases.reduce((sum, item) => sum + item.cost, 0);
}
function reward(state                 , entry                                                            , baseXP        , fixedCoins         ) {
  if (state.ledger.some(item => item.key === entry.key)) return false;
  const at = Date.parse(entry.at);
  const multiplier = state.boosts.some(boost => Date.parse(boost.from) <= at && at < Date.parse(boost.until)) ? 2 : 1;
  const xp = baseXP * multiplier;
  state.ledger.push({ ...entry, xp, coins: fixedCoins ?? Math.floor(xp / 5), multiplier });
  totals(state);
  return true;
}
function lessonEvidence(progress                    , id        , after        , before        ) {
  const lesson = lessons.get(id);
  if (!lesson) return false;
  const events = progress.studyEvents.filter(event => after <= Date.parse(event.at) && Date.parse(event.at) <= before);
  const studied = events.some(e => e.type === 'vocabulary' && lesson.vocabularyIds.includes(e.contentId)) && events.some(e => e.type === 'grammar' && lesson.grammarIds.includes(e.contentId));
  const answered = new Set(progress.attempts.filter(a => ['submitted', 'reviewed'].includes(a.status) && a.submittedAt && after <= Date.parse(a.submittedAt) && Date.parse(a.submittedAt) <= before && a.listeningAccess !== 'script')
    .flatMap(a => a.questionOrder.filter(q => lesson.questionIds.includes(q) && assessedAnswer(a, q))));
  return studied || answered.size >= 2;
}
function assessedAnswer(attempt                              , id        ) {
  const q = questionMap.get(id);
  return !!q && !attempt.excludedIds.includes(id) && (q.skill !== 'listening' || attempt.listeningAccess === 'audio') && q.options.some(o => o.id === attempt.answers[id]);
}
function perfectAttempt(progress                    , attemptId        ) {
  const a = progress.attempts.find(item => item.id === attemptId);
  return !!a && a.questionOrder.length >= 5 && a.excludedIds.length === 0 && a.listeningAccess !== 'script' && a.questionOrder.every(id => assessedAnswer(a, id) && a.answers[id] === questionMap.get(id)?.correctOptionId);
}
function perfectLesson(progress                    , lessonId        , after        , before        ) {
  const lesson = lessons.get(lessonId);
  return !!lesson && progress.attempts.some(a => a.submittedAt && after <= Date.parse(a.submittedAt) && Date.parse(a.submittedAt) <= before && ['submitted', 'reviewed'].includes(a.status) && perfectAttempt(progress, a.id) && a.questionOrder.some(q => lesson.questionIds.includes(q)));
}
function labProof(session            )                 {
  return { ...structuredClone(session), createdAt: iso(session.createdAt), itemStartedAt: iso(session.itemStartedAt), finishedAt: iso(session.finishedAt ), results: session.results.map(result => ({ ...structuredClone(result), at: iso(result.at) })) };
}
function validateLabProof(input         )                 {
  const proof = record(input), createdAt = timestamp(proof.createdAt, 'Lab creation'), itemStartedAt = timestamp(proof.itemStartedAt, 'Lab exercise time'), finishedAt = timestamp(proof.finishedAt, 'Lab completion');
  if (Date.parse(itemStartedAt) > Date.parse(finishedAt)) fail('Lab exercise time cannot follow completion.');
  if (!Array.isArray(proof.results)) fail('Lab source needs answer results.');
  const results = proof.results.map(raw => { const result = record(raw); return { ...result, at: Date.parse(timestamp(result.at, 'Lab answer time')) }; });
  try {
    const state = validateLearnLab({ ...initialLearnLab(), sessions: [{ ...proof, createdAt: Date.parse(createdAt), itemStartedAt: Date.parse(itemStartedAt), finishedAt: Date.parse(finishedAt), results }] });
    const session = state.sessions[0];
    if (session.status !== 'complete') fail('Lab source must be a completed lesson.');
    return labProof(session);
  } catch (error) { fail('Lab completion proof is invalid: ' + (error instanceof Error ? error.message : 'unknown source')); }
}
function labConcepts(item         ) { return item.kind === 'bonus' ? ['bonus:' + item.bonusId] : item.wordIds.map(id => 'word:' + id); }
function labOutcome(proof                , day        , rewarded             ) {
  const concepts           = []; let correct = 0, xp = 0;
  for (const result of proof.results) {
    const item = proof.queue.find(item => item.id === result.exerciseId) ;
    for (const concept of labConcepts(item)) {
      if (rewarded.has(day + ':' + concept)) continue;
      rewarded.add(day + ':' + concept); concepts.push(concept);
      if (result.outcome === 'exact') { correct++; xp += 5; }
      else xp += result.outcome === 'typo' ? 2 : 1;
    }
  }
  const perfect = concepts.length >= 3 && proof.results.every(result => result.outcome === 'exact');
  return { concepts, correct, perfect, xp: xp + (perfect ? Math.floor(xp * .2) : 0) };
}
function seededChest(state                 , day        ) {
  let hash = 2166136261;
  for (const char of state.enabledAt + '|' + day) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return [10, 15, 20][hash % 3];
}
function claimAvailable(state                 , claim                 , day        ) {
  if (state.ledger.some(item => item.key === (claim === 'monthly' ? 'quest:monthly:' + day.slice(0, 7) : claim === 'chest' ? 'chest:' + day : 'quest:' + claim + ':' + day))) return false;
  const stats = activity(state, day), quest = DAILY_QUESTS.find(q => q.id === claim);
  if (quest) return stats.xp >= quest.xp && stats.correct >= quest.correct && stats.perfect >= quest.perfect;
  if (claim === 'chest') return stats.xp >= DAILY_QUESTS[0].xp && stats.correct >= DAILY_QUESTS[0].correct;
  if (claim === 'monthly') {
    const month = day.slice(0, 7), entries = state.ledger.filter(item => item.day.startsWith(month) && !['quest', 'chest'].includes(item.kind));
    return entries.reduce((sum, item) => sum + item.xp, 0) >= 300 && new Set(entries.filter(item => item.xp > 0).map(item => item.day)).size >= 5;
  }
  if (state.claimedBadges.includes(claim)) return false;
  return state.ledger.some(item => ['lesson', 'lab'].includes(item.kind) && item.day === day && (claim === 'early-bird' ? new Date(item.at).getHours() >= 5 && new Date(item.at).getHours() < 9 : new Date(item.at).getHours() >= 22 || new Date(item.at).getHours() < 1));
}

/** Opt-in starts a new ledger; existing learning is preserved and not rewarded retroactively. */
function enableMotivation(progress                    , choices                                 = {}, now = Date.now())                     {
  if (progress.motivation) return progress;
  const date = iso(now), day = localDay(now);
  const state                  = {
    version: 1, enabledAt: date, lastReconciledAt: date,
    preferences: prefs({ goal: 'travel', dailyMinutes: 10, dailyXP: 50, streakGoal: 7, heartsEnabled: false, disableAnimations: false, haptics: false, ...choices }),
    baseline: { attempts: progress.attempts.map(a => a.id), studies: progress.studyEvents.map(e => e.id), lessons: progress.completedTasks.filter(id => lessons.has(id)), reviews: dueEvents(progress).map(({ card, event }) => card + '@@' + event.eventId), ...(progress.learnlab ? { labs: progress.learnlab.sessions.filter(session => session.status === 'complete').map(session => session.id) } : {}) },
    ledger: [], xp: 0, coins: 0, purchases: [], freezesUsed: [], lastCalendarDay: day,
    hearts: 5, heartsAt: date, boosts: [], studySeconds: {}, timeRecordedAt: date,
    claimedBadges: [], earnedBadges: [], profileBadges: [], cosmetic: 'mint', mascotTaps: 0,
  };
  return { ...progress, motivation: state };
}
/** Pure reconciliation of actual completed learning. Reading a page and clicking controls earn nothing. */
function reconcileMotivation(progress                    , previous                     = progress, now = Date.now())                     {
  if (!progress.motivation) return progress;
  const original = progress.motivation, state = copy(original), today = localDay(now), cutoff = Date.parse(state.enabledAt);
  if (now < Date.parse(state.lastReconciledAt)) return progress;
  const elapsed = Math.floor((now - Date.parse(state.heartsAt)) / HEART_MS);
  if (elapsed > 0) { state.hearts = Math.min(5, state.hearts + elapsed); state.heartsAt = state.hearts === 5 ? iso(now) : iso(Date.parse(state.heartsAt) + elapsed * HEART_MS); }
  const eligible = (at                    ) => !!at && cutoff <= Date.parse(at) && Date.parse(at) <= now;
  const answeredToday = new Set(state.ledger.filter(e => e.kind === 'attempt').flatMap(e => e.questionIds.map(id => e.day + ':' + id)));
  for (const attempt of progress.attempts.filter(a => ['submitted', 'reviewed'].includes(a.status) && eligible(a.submittedAt)).sort((a, b) => Date.parse(a.submittedAt ) - Date.parse(b.submittedAt ))) {
    if (state.baseline.attempts.includes(attempt.id) || state.ledger.some(e => e.key === 'attempt:' + attempt.id) || attempt.listeningAccess === 'script') continue;
    const at = attempt.submittedAt , day = localDay(at);
    const ids = attempt.questionOrder.filter(id => assessedAnswer(attempt, id) && !answeredToday.has(day + ':' + id));
    if (!ids.length) continue;
    ids.forEach(id => answeredToday.add(day + ':' + id));
    const correct = ids.filter(id => attempt.answers[id] === questionMap.get(id) .correctOptionId).length;
    const perfect = perfectAttempt(progress, attempt.id), base = correct * 5 + ids.length - correct;
    const bonus = perfect ? Math.floor(base * .2) : 0;
    reward(state, { key: 'attempt:' + attempt.id, kind: 'attempt', sourceId: attempt.id, at, day, questionIds: ids, correct, perfect, }, base + bonus);
    if (state.preferences.heartsEnabled && attempt.type === 'practice') { state.hearts = Math.max(0, state.hearts - (ids.length - correct)); state.heartsAt = iso(now); }
    if (attempt.type === 'review') {
      const dueCorrect = ids.filter(id => attempt.answers[id] === questionMap.get(id) .correctOptionId && previous.reviews[id] && Date.parse(previous.reviews[id].dueAt) <= Date.parse(at)).length;
      if (dueCorrect) { state.hearts = Math.min(5, state.hearts + dueCorrect); state.heartsAt = iso(now); }
    }
  }
  for (const event of progress.studyEvents.filter(e => eligible(e.at)).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    if (state.baseline.studies.includes(event.id)) continue;
    const day = localDay(event.at), key = `study:${event.type}:${event.contentId}:${day}`;
    reward(state, { key, kind: 'study', sourceId: event.id, at: event.at, day, questionIds: [], correct: 0, perfect: false }, 2);
  }
  for (const { card, event } of dueEvents(progress).filter(({ event }) => eligible(event.reviewedAt))) {
    const sourceId = card + '@@' + event.eventId;
    if (state.baseline.reviews.includes(sourceId)) continue;
    const added = reward(state, { key: 'review:' + sourceId, kind: 'review', sourceId, at: event.reviewedAt, day: localDay(event.reviewedAt), questionIds: [], correct: event.quality >= 3 ? 1 : 0, perfect: false }, event.quality >= 3 ? 4 : 2);
    if (added && event.quality >= 3) { state.hearts = Math.min(5, state.hearts + 1); state.heartsAt = iso(now); }
  }
  const rewardedLab = new Set(state.ledger.filter(e => e.kind === 'lab').flatMap(e => (e.labConcepts || []).map(concept => e.day + ':' + concept)));
  for (const session of (progress.learnlab?.sessions || []).filter(s => s.status === 'complete' && s.finishedAt !== undefined && eligible(iso(s.finishedAt))).sort((a, b) => a.finishedAt  - b.finishedAt )) {
    if (state.baseline.labs?.includes(session.id) || state.ledger.some(e => e.key === 'lab:' + session.id)) continue;
    const proof = validateLabProof(labProof(session)), at = proof.finishedAt, day = localDay(at), outcome = labOutcome(proof, day, rewardedLab);
    if (!outcome.concepts.length) continue;
    reward(state, { key: 'lab:' + session.id, kind: 'lab', sourceId: session.id, at, day, questionIds: [], correct: outcome.correct, perfect: outcome.perfect, labProof: proof, labConcepts: outcome.concepts }, outcome.xp);
  }
  for (const id of progress.completedTasks.filter(id => lessons.has(id))) {
    if (state.baseline.lessons.includes(id) || !lessonEvidence(progress, id, cutoff, now)) continue;
    const perfect = perfectLesson(progress, id, cutoff, now);
    reward(state, { key: 'lesson:' + id, kind: 'lesson', sourceId: id, at: iso(now), day: today, questionIds: [], correct: 0, perfect }, perfect ? 12 : 10);
  }
  const actualDays = activity(state).days;
  let day = state.lastCalendarDay;
  while (day < today) {
    const previousDay = shiftDay(day, -1);
    if (!actualDays.has(day) && (actualDays.has(previousDay) || state.freezesUsed.some(item => item.day === previousDay))) {
      const unused = state.purchases.find(p => p.reward === 'freeze' && Date.parse(p.at) < dayEnd(day) && !state.freezesUsed.some(item => item.purchaseId === p.id));
      if (unused) state.freezesUsed.push({ day, purchaseId: unused.id });
    }
    day = shiftDay(day, 1);
  }
  state.lastCalendarDay = today;
  state.lastReconciledAt = iso(now);
  state.earnedBadges = badges(state, today);
  return JSON.stringify(state) === JSON.stringify(original) ? progress : { ...progress, motivation: state };
}

function motivationSummary(progress                    , now = Date.now()) {
  const state = progress.motivation;
  if (!state) return null;
  const today = localDay(now), stats = activity(state, today), month = today.slice(0, 7);
  const monthly = state.ledger.filter(e => e.day.startsWith(month) && !['quest', 'chest'].includes(e.kind));
  const freezes = state.purchases.filter(p => p.reward === 'freeze').length - state.freezesUsed.length;
  const boostUses = new Set(state.boosts.map(b => b.source));
  const boostSources = [...state.purchases.filter(p => p.reward === 'boost').map(p => p.id), ...state.ledger.filter(e => e.key.startsWith('quest:monthly:')).map(e => e.key)];
  const cosmetics = ['mint', ...state.purchases.filter(p => ['sakura', 'ocean', 'sunset'].includes(p.reward)).map(p => p.reward), ...(state.mascotTaps >= 10 ? ['tanuki-star'] : [])];
  return {
    xp: state.xp, coins: state.coins, todayXP: stats.xp, todayCorrect: stats.correct, todayPerfect: stats.perfect,
    todayLabXP: state.ledger.filter(e => e.kind === 'lab' && e.day === today).reduce((sum, e) => sum + e.xp, 0),
    todayLabExact: state.ledger.filter(e => e.kind === 'lab' && e.day === today).reduce((sum, e) => sum + e.correct, 0),
    streak: streak(state, today), freezes, hearts: state.hearts,
    nextHeartAt: state.hearts < 5 ? iso(Date.parse(state.heartsAt) + HEART_MS) : null,
    todayMinutes: Math.floor((state.studySeconds[today] || 0) / 60), monthlyXP: monthly.reduce((sum, e) => sum + e.xp, 0),
    monthlyDays: new Set(monthly.filter(e => e.xp > 0).map(e => e.day)).size,
    boostCharges: boostSources.filter(id => !boostUses.has(id)).length,
    boostUntil: state.boosts.find(b => Date.parse(b.from) <= now && now < Date.parse(b.until))?.until || null,
    cosmetics: [...new Set(cosmetics)],
    quests: DAILY_QUESTS.map(q => ({ ...q, available: claimAvailable(state, q.id, today), claimed: state.ledger.some(e => e.key === 'quest:' + q.id + ':' + today) })),
    chestAvailable: claimAvailable(state, 'chest', today), chestClaimed: state.ledger.some(e => e.key === 'chest:' + today),
    monthlyAvailable: claimAvailable(state, 'monthly', today), monthlyClaimed: state.ledger.some(e => e.key === 'quest:monthly:' + month),
    earlyAvailable: claimAvailable(state, 'early-bird', today), nightAvailable: claimAvailable(state, 'night-owl', today),
  };
}
function purchaseReward(progress                    , rewardId                  , now = Date.now())                     {
  const updated = reconcileMotivation(progress, progress, now);
  if (!updated.motivation) return updated;
  const state = copy(updated.motivation), shop = MOTIVATION_SHOP.find(item => item.id === rewardId), summary = motivationSummary(updated, now) ;
  if (!shop) throw new Error('Unknown reward.');
  if (summary.cosmetics.includes(rewardId)) return updated;
  if (state.coins < shop.cost) throw new Error('Earn more coins through learning before buying this reward.');
  if (rewardId === 'freeze' && summary.freezes >= 2) throw new Error('You can hold two streak freezes.');
  state.purchases.push({ id: `purchase:${rewardId}:${now}:${state.purchases.length}`, reward: rewardId, at: iso(now), cost: shop.cost });
  totals(state);
  return { ...updated, motivation: state };
}
function activateBoost(progress                    , now = Date.now())                     {
  const updated = reconcileMotivation(progress, progress, now);
  if (!updated.motivation) return updated;
  const state = copy(updated.motivation), summary = motivationSummary(updated, now) ;
  if (summary.boostUntil) return updated;
  const used = new Set(state.boosts.map(b => b.source));
  const source = [...state.purchases.filter(p => p.reward === 'boost').map(p => p.id), ...state.ledger.filter(e => e.key.startsWith('quest:monthly:')).map(e => e.key)].find(id => !used.has(id));
  if (!source) throw new Error('Earn or buy a boost before activating it.');
  // A boost cannot retroactively multiply an already saved receipt from the same millisecond.
  const from = Math.max(now, ...state.ledger.map(e => Date.parse(e.at) + 1));
  state.boosts.push({ from: iso(from), until: iso(from + BOOST_MS), source });
  state.lastReconciledAt = iso(Math.max(from, Date.parse(state.lastReconciledAt)));
  state.lastCalendarDay = localDay(state.lastReconciledAt);
  return { ...updated, motivation: state };
}
function claimMotivationReward(progress                    , claim                 , now = Date.now())                     {
  const updated = reconcileMotivation(progress, progress, now);
  if (!updated.motivation) return updated;
  const state = copy(updated.motivation), day = localDay(now);
  if (!claimAvailable(state, claim, day)) return updated;
  if (claim === 'early-bird' || claim === 'night-owl') {
    state.claimedBadges.push(claim); state.earnedBadges = badges(state, day);
  } else {
    const chest = claim === 'chest', key = chest ? 'chest:' + day : claim === 'monthly' ? 'quest:monthly:' + day.slice(0, 7) : 'quest:' + claim + ':' + day;
    const coins = chest ? seededChest(state, day) : claim === 'monthly' ? 100 : DAILY_QUESTS.find(q => q.id === claim) .coins;
    reward(state, { key, kind: chest ? 'chest' : 'quest', sourceId: claim, at: iso(now), day, questionIds: [], correct: 0, perfect: false }, 0, coins);
  }
  return { ...updated, motivation: state };
}
function setMotivationPreference(progress                    , choices                                )                     {
  if (!progress.motivation) return progress;
  return { ...progress, motivation: { ...progress.motivation, preferences: prefs({ ...progress.motivation.preferences, ...choices }) } };
}
function setMotivationCosmetic(progress                    , cosmetic        , now = Date.now())                     {
  if (!progress.motivation) return progress;
  if (!motivationSummary(progress, now) .cosmetics.includes(cosmetic)) throw new Error('This card color has not been earned.');
  return { ...progress, motivation: { ...progress.motivation, cosmetic } };
}
function setProfileBadges(progress                    , selected          )                     {
  if (!progress.motivation) return progress;
  if (selected.length > 3 || new Set(selected).size !== selected.length || selected.some(id => !progress.motivation .earnedBadges.includes(id))) throw new Error('Choose up to three badges you have earned.');
  return { ...progress, motivation: { ...progress.motivation, profileBadges: selected.slice() } };
}
function tapMascot(progress                    )                     {
  if (!progress.motivation || progress.motivation.mascotTaps >= 10) return progress;
  return { ...progress, motivation: { ...progress.motivation, mascotTaps: progress.motivation.mascotTaps + 1 } };
}
/** Caller supplies measured visible active study time; opening an idle screen earns no minutes or XP. */
function recordStudyTime(progress                    , seconds        , now = Date.now())                     {
  if (!progress.motivation) return progress;
  numeric(seconds, 'Measured study seconds', 0, 60);
  const updated = reconcileMotivation(progress, progress, now);
  const state = copy(updated.motivation ), since = Date.parse(state.timeRecordedAt);
  if (now <= since) return progress;
  const credit = Math.min(seconds, Math.floor((now - since) / 1000));
  let cursor = now - credit * 1000;
  while (cursor < now) {
    const day = localDay(cursor), end = Math.min(now, dayEnd(day));
    state.studySeconds[day] = Math.min(86400, (state.studySeconds[day] || 0) + Math.floor((end - cursor) / 1000));
    cursor = end;
  }
  state.timeRecordedAt = iso(now); state.lastReconciledAt = iso(Math.max(now, Date.parse(state.lastReconciledAt)));
  return { ...updated, motivation: state };
}
function disableMotivation(progress                    )                     {
  if (!progress.motivation) return progress;
  const { motivation: _removed, ...plain } = progress;
  return plain;
}

/** Validate optional saved rewards against canonical learning, limits and wallet arithmetic. */
function validateMotivation(input         , canonicalProgress                    )                              {
  if (input === undefined) return undefined;
  const data = record(input);
  if (data.version !== 1) fail('Version is unsupported.');
  const state = copy(data                              );
  state.enabledAt = timestamp(data.enabledAt, 'Enable date'); state.lastReconciledAt = timestamp(data.lastReconciledAt, 'Reconciliation date');
  if (Date.parse(state.lastReconciledAt) < Date.parse(state.enabledAt)) fail('Reconciliation precedes enabling.');
  state.preferences = prefs(data.preferences);
  const baseline = record(data.baseline);
  state.baseline = { attempts: strings(baseline.attempts, 'Prior attempts'), studies: strings(baseline.studies, 'Prior studies'), lessons: strings(baseline.lessons, 'Prior lessons'), reviews: strings(baseline.reviews, 'Prior ratings'), ...(baseline.labs !== undefined ? { labs: strings(baseline.labs, 'Prior Lab completions', 40) } : {}) };
  const priorRatingIds = new Set(dueEvents(canonicalProgress).filter(({ event }) => Date.parse(event.reviewedAt) <= Date.parse(state.enabledAt)).map(({ card, event }) => card + '@@' + event.eventId));
  if (state.baseline.attempts.some(id => !canonicalProgress.attempts.some(a => a.id === id && Date.parse(a.createdAt) <= Date.parse(state.enabledAt))) || state.baseline.studies.some(id => !canonicalProgress.studyEvents.some(e => e.id === id && Date.parse(e.at) <= Date.parse(state.enabledAt))) || state.baseline.lessons.some(id => !lessons.has(id)) || state.baseline.reviews.some(id => !priorRatingIds.has(id))) fail('Baseline references missing prior learning.');
  if (state.baseline.labs?.some(id => !/^lab-\d+-\d+$/.test(id) || Number(id.split('-')[1]) > Date.parse(state.enabledAt) || canonicalProgress.learnlab?.sessions.some(s => s.id === id && (s.status !== 'complete' || s.finishedAt  > Date.parse(state.enabledAt))))) fail('Lab baseline must reference prior completed sessions.');
  if (!Array.isArray(data.ledger) || data.ledger.length > 20_000) fail('Ledger is too large or invalid.');
  const keys = new Set        (), rewardedQuestions = new Set        (), rewardedLab = new Set        ();
  state.ledger = data.ledger.map(raw => {
    const e = record(raw), at = timestamp(e.at, 'Reward date'), day = validDay(e.day);
    if (day !== localDay(at) || Date.parse(at) < Date.parse(state.enabledAt) || Date.parse(at) > Date.parse(state.lastReconciledAt)) fail('Reward date is inconsistent.');
    const kind = enumOf(e.kind, ['attempt', 'study', 'lesson', 'lab', 'review', 'quest', 'chest'], 'Reward kind');
    if (typeof e.key !== 'string' || e.key.length > 500 || keys.has(e.key) || typeof e.sourceId !== 'string' || e.sourceId.length > 500) fail('Reward keys must be unique.');
    keys.add(e.key);
    const questionIds = strings(e.questionIds, 'Reward questions', questions.length), correct = numeric(e.correct, 'Correct count', 0, questions.length), perfect = bool(e.perfect), multiplier = numeric(e.multiplier, 'XP multiplier', 1, 2)         ;
    let expectedXP = 0, fixedCoins                    , sourceProof                            , rewardedConcepts                      ;
    if (kind !== 'lab' && (e.labProof !== undefined || e.labConcepts !== undefined)) fail('Only Lab receipts contain Lab source proofs.');
    if (kind === 'attempt') {
      const a = canonicalProgress.attempts.find(a => a.id === e.sourceId);
      if (!a || !['submitted', 'reviewed'].includes(a.status) || a.submittedAt !== at || a.listeningAccess === 'script' || !questionIds.length || state.baseline.attempts.includes(a.id) || e.key !== 'attempt:' + a.id) fail('Rewarded attempt is not an eligible assessed submission.');
      for (const id of questionIds) {
        const q = questionMap.get(id);
        if (!q || !a.questionOrder.includes(id) || !assessedAnswer(a, id) || rewardedQuestions.has(day + ':' + id)) fail('Question rewards contain invalid or duplicate assessed answers.');
        rewardedQuestions.add(day + ':' + id);
      }
      const actualCorrect = questionIds.filter(id => a.answers[id] === questionMap.get(id) .correctOptionId).length;
      if (correct !== actualCorrect || perfect !== perfectAttempt(canonicalProgress, a.id)) fail('Assessed reward outcome is incorrect.');
      const base = correct * 5 + questionIds.length - correct;
      expectedXP = base + (perfect ? Math.floor(base * .2) : 0);
    } else if (kind === 'study') {
      const event = canonicalProgress.studyEvents.find(item => item.id === e.sourceId);
      if (!event || event.at !== at || state.baseline.studies.includes(event.id) || e.key !== `study:${event.type}:${event.contentId}:${day}` || correct || perfect || questionIds.length) fail('Study reward does not match a canonical study action.');
      expectedXP = 2;
    } else if (kind === 'review') {
      const found = dueEvents(canonicalProgress).find(({ card, event }) => card + '@@' + event.eventId === e.sourceId);
      if (!found || found.event.reviewedAt !== at || state.baseline.reviews.includes(e.sourceId) || e.key !== 'review:' + e.sourceId || perfect || questionIds.length || correct !== Number(found.event.quality >= 3)) fail('Rating reward needs a real due review event.');
      expectedXP = found.event.quality >= 3 ? 4 : 2;
    } else if (kind === 'lesson') {
      if (!lessons.has(e.sourceId) || state.baseline.lessons.includes(e.sourceId) || e.key !== 'lesson:' + e.sourceId || !lessonEvidence(canonicalProgress, e.sourceId, Date.parse(state.enabledAt), Date.parse(at)) || perfect !== perfectLesson(canonicalProgress, e.sourceId, Date.parse(state.enabledAt), Date.parse(at)) || correct || questionIds.length) fail('Lesson reward needs recorded learning evidence.');
      expectedXP = perfect ? 12 : 10;
    } else if (kind === 'lab') {
      sourceProof = validateLabProof(e.labProof); rewardedConcepts = strings(e.labConcepts, 'Rewarded Lab concepts', 12);
      const source = canonicalProgress.learnlab?.sessions.find(s => s.id === e.sourceId);
      if (e.key !== 'lab:' + sourceProof.id || e.sourceId !== sourceProof.id || at !== sourceProof.finishedAt || state.baseline.labs?.includes(sourceProof.id) || questionIds.length || source && JSON.stringify(validateLabProof(labProof(source))) !== JSON.stringify(sourceProof)) fail('Lab receipt must match its completed canonical source.');
      const outcome = labOutcome(sourceProof, day, rewardedLab);
      if (!rewardedConcepts.length || JSON.stringify(outcome.concepts) !== JSON.stringify(rewardedConcepts) || correct !== outcome.correct || perfect !== outcome.perfect) fail('Lab rewards must deduplicate known concepts and preserve exact versus typo outcomes.');
      expectedXP = outcome.xp;
    } else {
      if (questionIds.length || correct || perfect) fail('Quest reward is not an assessed answer.');
      if (kind === 'chest') { if (e.sourceId !== 'chest' || e.key !== 'chest:' + day) fail('Chest key is invalid.'); fixedCoins = seededChest(state, day); }
      else { const quest = DAILY_QUESTS.find(q => q.id === e.sourceId); if (!quest && e.sourceId !== 'monthly') fail('Quest is unknown.'); if (e.key !== (quest ? 'quest:' + quest.id + ':' + day : 'quest:monthly:' + day.slice(0, 7))) fail('Quest key is invalid.'); fixedCoins = quest?.coins ?? 100; }
    }
    const xp = numeric(e.xp, 'Reward XP'), coins = numeric(e.coins, 'Reward coins');
    if (xp !== expectedXP * multiplier || coins !== (fixedCoins ?? Math.floor(xp / 5))) fail('Reward amounts do not match their learning source.');
    return { key: e.key, kind, sourceId: e.sourceId, at, day, xp, coins, questionIds, correct, perfect, multiplier, ...(sourceProof ? { labProof: sourceProof, labConcepts: rewardedConcepts  } : {}) };
  });
  if (!Array.isArray(data.purchases) || data.purchases.length > 10_000) fail('Purchase list is invalid.');
  const purchaseIds = new Set        ();
  state.purchases = data.purchases.map(raw => {
    const p = record(raw), rewardId = enumOf(p.reward, MOTIVATION_SHOP.map(s => s.id), 'Shop item'), shop = MOTIVATION_SHOP.find(s => s.id === rewardId) ;
    if (typeof p.id !== 'string' || !p.id.length || p.id.length > 200 || purchaseIds.has(p.id) || p.cost !== shop.cost) fail('Purchase ID or cost is invalid.');
    purchaseIds.add(p.id);
    const at = timestamp(p.at, 'Purchase date');
    if (Date.parse(at) < Date.parse(state.enabledAt) || Date.parse(at) > Date.parse(state.lastReconciledAt)) fail('Purchase date is inconsistent.');
    return { id: p.id, reward: rewardId, at, cost: shop.cost };
  });
  const savedXP = numeric(data.xp, 'Total XP'), savedCoins = numeric(data.coins, 'Coin balance');
  totals(state);
  if (state.xp !== savedXP || state.coins !== savedCoins || state.coins < 0) fail('Balances disagree with earned rewards and purchases.');
  for (const purchase of state.purchases) {
    const earned = state.ledger.filter(e => Date.parse(e.at) <= Date.parse(purchase.at)).reduce((sum, e) => sum + e.coins, 0);
    const spent = state.purchases.filter(p => Date.parse(p.at) < Date.parse(purchase.at) || p.at === purchase.at && state.purchases.indexOf(p) <= state.purchases.indexOf(purchase)).reduce((sum, p) => sum + p.cost, 0);
    if (spent > earned) fail('A purchase cannot spend coins before they are earned.');
  }
  for (const cosmetic of ['sakura', 'ocean', 'sunset']) if (state.purchases.filter(p => p.reward === cosmetic).length > 1) fail('A cosmetic can be purchased once.');
  if (!Array.isArray(data.freezesUsed) || data.freezesUsed.length > state.purchases.length) fail('Freeze use list is invalid.');
  const freezeDays = new Set        (), freezeIds = new Set        ();
  state.freezesUsed = data.freezesUsed.map(raw => {
    const f = record(raw), day = validDay(f.day), purchaseId = String(f.purchaseId), purchase = state.purchases.find(p => p.id === purchaseId && p.reward === 'freeze');
    if (!purchase || Date.parse(purchase.at) >= dayEnd(day) || freezeDays.has(day) || freezeIds.has(purchaseId)) fail('A freeze must use an earned purchase once for an elapsed day.');
    freezeDays.add(day); freezeIds.add(purchaseId); return { day, purchaseId };
  });
  if (state.purchases.filter(p => p.reward === 'freeze').length - state.freezesUsed.length > 2) fail('At most two freezes may be held.');
  state.lastCalendarDay = validDay(data.lastCalendarDay);
  if (state.lastCalendarDay !== localDay(state.lastReconciledAt) || state.freezesUsed.some(f => f.day >= state.lastCalendarDay)) fail('Future days cannot consume a freeze.');
  const actualDays = activity(state).days;
  for (const freeze of state.freezesUsed) if (actualDays.has(freeze.day) || !(actualDays.has(shiftDay(freeze.day, -1)) || freezeDays.has(shiftDay(freeze.day, -1)))) fail('A freeze only protects a missed day in an existing streak.');
  for (const purchase of state.purchases.filter(p => p.reward === 'freeze')) {
    const purchased = state.purchases.filter(p => p.reward === 'freeze' && (Date.parse(p.at) < Date.parse(purchase.at) || p.at === purchase.at && state.purchases.indexOf(p) <= state.purchases.indexOf(purchase))).length;
    const consumed = state.freezesUsed.filter(f => dayEnd(f.day) <= Date.parse(purchase.at)).length;
    if (purchased - consumed > 2) fail('Freeze inventory cannot exceed two at purchase time.');
  }
  state.hearts = numeric(data.hearts, 'Hearts', 0, 5); state.heartsAt = timestamp(data.heartsAt, 'Heart regeneration date');
  if (Date.parse(state.heartsAt) < Date.parse(state.enabledAt) || Date.parse(state.heartsAt) > Date.parse(state.lastReconciledAt)) fail('Heart date is inconsistent.');
  if (!Array.isArray(data.boosts) || data.boosts.length > state.purchases.length + state.ledger.length) fail('Boost list is invalid.');
  const boostIds = new Set        ();
  state.boosts = data.boosts.map(raw => {
    const b = record(raw), from = timestamp(b.from, 'Boost start'), until = timestamp(b.until, 'Boost end'), source = String(b.source);
    const receipt = state.purchases.find(p => p.id === source && p.reward === 'boost') || state.ledger.find(e => e.key === source && e.key.startsWith('quest:monthly:'));
    if (!receipt || boostIds.has(source) || Date.parse(until) !== Date.parse(from) + BOOST_MS || Date.parse(from) < Date.parse(receipt.at) || Date.parse(from) > Date.parse(state.lastReconciledAt)) fail('Boost must use one earned charge for 20 minutes.');
    boostIds.add(source); return { from, until, source };
  });
  const chronologicalBoosts = [...state.boosts].sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
  if (chronologicalBoosts.some((b, i) => i > 0 && Date.parse(b.from) < Date.parse(chronologicalBoosts[i - 1].until))) fail('Boost windows cannot overlap.');
  for (const entry of state.ledger) {
    const boost = state.boosts.some(b => Date.parse(b.from) <= Date.parse(entry.at) && Date.parse(entry.at) < Date.parse(b.until));
    if (entry.multiplier !== (boost ? 2 : 1)) fail('XP multiplier requires an active earned boost.');
    if (['quest', 'chest'].includes(entry.kind)) {
      const prior = { ...state, ledger: state.ledger.filter(e => e.key !== entry.key && Date.parse(e.at) <= Date.parse(entry.at)) };
      if (!claimAvailable(prior, entry.sourceId                   , entry.day)) fail('Quest or chest has no eligible completed learning.');
    }
  }
  state.studySeconds = Object.fromEntries(Object.entries(record(data.studySeconds)).map(([day, seconds]) => [validDay(day), numeric(seconds, 'Study seconds', 0, 86400)]));
  state.timeRecordedAt = timestamp(data.timeRecordedAt, 'Recorded study time');
  if (Date.parse(state.timeRecordedAt) < Date.parse(state.enabledAt) || Date.parse(state.timeRecordedAt) > Date.parse(state.lastReconciledAt) || Object.keys(state.studySeconds).some(day => day < localDay(state.enabledAt) || day > state.lastCalendarDay) || Object.values(state.studySeconds).reduce((sum, s) => sum + s, 0) > Math.floor((Date.parse(state.timeRecordedAt) - Date.parse(state.enabledAt)) / 1000)) fail('Measured study time is inconsistent.');
  state.claimedBadges = strings(data.claimedBadges, 'Claimed badges', 2).map(id => enumOf(id, ['early-bird', 'night-owl'], 'Time badge'));
  for (const claimed of state.claimedBadges) if (!state.ledger.some(e => ['lesson', 'lab'].includes(e.kind) && (claimed === 'early-bird' ? new Date(e.at).getHours() >= 5 && new Date(e.at).getHours() < 9 : new Date(e.at).getHours() >= 22 || new Date(e.at).getHours() < 1))) fail('Time badge needs a completed eligible lesson.');
  state.earnedBadges = strings(data.earnedBadges, 'Earned badges', 1000);
  if (state.earnedBadges.some(id => !MOTIVATION_BADGES.some(b => b.id === id) && !/^monthly:\d{4}-\d{2}$/.test(id))) fail('Unknown milestone badge.');
  if (JSON.stringify([...state.earnedBadges].sort()) !== JSON.stringify(badges(state, state.lastCalendarDay).sort())) fail('Milestone badges must match actual learning.');
  state.profileBadges = strings(data.profileBadges, 'Profile badges', 3);
  if (state.profileBadges.some(id => !state.earnedBadges.includes(id))) fail('Profile may only display earned badges.');
  state.mascotTaps = numeric(data.mascotTaps, 'Mascot taps', 0, 10);
  const owned = motivationSummary({ ...canonicalProgress, motivation: state }, Date.parse(state.lastReconciledAt)) .cosmetics;
  state.cosmetic = enumOf(data.cosmetic, owned, 'Card color');
  return { version: 1, enabledAt: state.enabledAt, lastReconciledAt: state.lastReconciledAt, preferences: state.preferences, baseline: state.baseline, ledger: state.ledger, xp: state.xp, coins: state.coins, purchases: state.purchases, freezesUsed: state.freezesUsed, lastCalendarDay: state.lastCalendarDay, hearts: state.hearts, heartsAt: state.heartsAt, boosts: state.boosts, studySeconds: state.studySeconds, timeRecordedAt: state.timeRecordedAt, claimedBadges: state.claimedBadges, earnedBadges: state.earnedBadges, profileBadges: state.profileBadges, cosmetic: state.cosmetic, mascotTaps: state.mascotTaps };
}
return {MOTIVATION_SHOP,DAILY_QUESTS,MOTIVATION_BADGES,enableMotivation,reconcileMotivation,motivationSummary,purchaseReward,activateBoost,claimMotivationReward,setMotivationPreference,setMotivationCosmetic,setProfileBadges,tapMascot,recordStudyTime,disableMotivation,validateMotivation};
})();
global.KotobaMotivationEngine=compiled["src/lib/motivation.ts"];
})(window);
