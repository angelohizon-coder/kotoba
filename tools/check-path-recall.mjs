// Pure evidence/selection checks and focused action-lifecycle checks, without npm.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts')&&!/\.[a-z]+$/i.test(specifier)){
    for(const suffix of ['.ts','/index.ts']){const url=new URL(specifier+suffix,context.parentURL);if(existsSync(fileURLToPath(url)))return next(url.href,context);}
  }return next(specifier,context);
}});
const C=await import('../src/content/index.ts'), E=await import('../src/lib/engine.ts'), S=await import('../src/lib/storage.ts');
const context=vm.createContext({console,Date,Map,Set,Number,Math,encodeURIComponent});context.window=context;context.KotobaContent=C;context.KotobaEngine=E;
vm.runInContext(await readFile(new URL('../web/path-recall.js',import.meta.url),'utf8'),context,{filename:'web/path-recall.js'});
const R=context.KotobaPathRecall, DAY=86_400_000, now=Date.UTC(2026,9,9,8), plan=C.learningPath.find(p=>p.level==='n3'), lesson=plan.units[0].lessons.find(l=>l.kind==='daily');
const byId=new Map(C.questions.map(q=>[q.id,q])), map=Object.fromEntries(byId);
let checks=0;const check=(label,fn)=>{fn();checks++;console.log('PASS '+label);};
const plain=value=>JSON.parse(JSON.stringify(value));
function mastered(at=now-30*DAY){
  const p=E.initialProgress();for(const id of lesson.questionIds){const q=byId.get(id);p.reviews[id]={questionId:id,lastAnswerId:q.options.find(o=>o.id!==q.correctOptionId).id,firstMissedAt:new Date(at-20*DAY).toISOString(),lastMissedAt:new Date(at-9*DAY).toISOString(),lastReviewedAt:new Date(at).toISOString(),dueAt:new Date(at+7*DAY).toISOString(),streak:3,mastered:true};}return p;
}
function submit(p,questions,at,{correct=true,type='practice',access=null,excluded=[]}={}){
  const a=E.createAttempt(questions,type,{now:at-1000,random:()=>.5,listeningAccess:access});a.excludedIds=excluded;
  for(const q of questions)a.answers[q.id]=correct?q.correctOptionId:q.options.find(o=>o.id!==q.correctOptionId).id;
  return E.submitAttempt({...p,attempts:[...p.attempts,a],activeAttemptId:a.id},a.id,map,at);
}
check('a completion check alone cannot turn a lesson gold or create a recall reminder',()=>{
  const p=E.setTaskCompleted(E.initialProgress(),'path:'+lesson.id,true);const before=plain(p),s=R.status(p,lesson,now);assert.equal(s.mastered,false);assert.equal(s.needsReview,false);assert.deepEqual(p,before);
});
check('gold requires every actual canonical linked question to be mastered',()=>{
  const p=mastered(),s=R.status(p,lesson,now);assert.equal(s.mastered,true);assert.equal(s.masteredCount,lesson.questionIds.length);assert.equal(s.questionCount,lesson.questionIds.length);
  p.reviews[lesson.questionIds[0]].mastered=false;assert.equal(R.status(p,lesson,now).mastered,false);
  delete p.reviews[lesson.questionIds[1]];assert.equal(R.status(p,lesson,now).needsReview,false);
});
check('review attention starts at exactly 30 elapsed days and preserves mastery records',()=>{
  const p=mastered(),before=plain(p);assert.equal(R.status(p,lesson,now-1).needsReview,false);assert.equal(R.status(p,lesson,now).needsReview,true);assert.equal(R.status(p,lesson,now).ageDays,30);assert.deepEqual(p,before);assert.deepEqual(S.validateProgress(plain(p)).reviews,p.reviews);
});
check('existing mastered review timestamps are sufficient without new attempts',()=>{
  const p=mastered(now-31*DAY);assert.equal(p.attempts.length,0);assert.equal(R.status(p,lesson,now).needsReview,true);assert.equal(R.status(p,lesson,now).lastSuccessfulAt,new Date(now-31*DAY).toISOString());
});
check('negative elapsed time and an earlier clock do not crack mastery',()=>{
  const p=mastered(now+DAY),s=R.status(p,lesson,now);assert.equal(s.clockBackwards,true);assert.equal(s.ageDays,0);assert.equal(s.needsReview,false);assert.equal(R.status(p,lesson,-1).needsReview,false);
});
check('missing dates are an honest evidence gap rather than an invented 30-day lapse',()=>{
  const p=mastered();for(const review of Object.values(p.reviews))delete review.lastReviewedAt;const s=R.status(p,lesson,now);assert.equal(s.mastered,true);assert.equal(s.evidenceGap,true);assert.equal(s.ageDays,null);assert.equal(s.needsReview,false);
});
check('only a submitted correct linked assessment restores recent status',()=>{
  const p=mastered(),q=byId.get(lesson.questionIds.find(id=>byId.get(id).skill!=='listening'));
  const fresh=submit(p,[q],now);const s=R.status(fresh,lesson,now);assert.equal(s.mastered,true);assert.equal(s.needsReview,false);assert.equal(s.ageDays,0);assert.deepEqual(fresh.reviews,p.reviews);
  let pending={...p,attempts:[{...fresh.attempts.at(-1),status:'in-progress',submittedAt:undefined}]};assert.equal(R.status(pending,lesson,now).needsReview,true);
  const wrong={...p,attempts:submit(E.initialProgress(),[q],now,{correct:false}).attempts};assert.equal(R.status(wrong,lesson,now).needsReview,true);
});
check('unrelated, excluded, future and script-assisted successes cannot clear attention',()=>{
  const p=mastered(),linked=byId.get(lesson.questionIds[0]),other=C.questions.find(q=>!lesson.questionIds.includes(q.id)&&q.skill==='vocabulary');
  const unrelated={...p,attempts:submit(E.initialProgress(),[other],now).attempts};assert.equal(R.status(unrelated,lesson,now).needsReview,true);
  const excluded={...p,attempts:submit(E.initialProgress(),[linked],now,{excluded:[linked.id]}).attempts};assert.equal(R.status(excluded,lesson,now).needsReview,true);
  const future={...p,attempts:submit(E.initialProgress(),[linked],now+DAY,{access:'audio'}).attempts};assert.equal(R.status(future,lesson,now).needsReview,true);
  const listening=byId.get(lesson.questionIds.find(id=>byId.get(id).skill==='listening'));assert.ok(listening);const script={...p,attempts:submit(E.initialProgress(),[listening],now,{access:'script'}).attempts};assert.equal(R.status(script,lesson,now).needsReview,true);
});
check('first-answer accuracy alone never replaces the stored assessed mastery requirement',()=>{
  const p=submit(E.initialProgress(),lesson.questionIds.map(id=>byId.get(id)),now,{access:'audio'});assert.equal(E.gradeAttempt(p.attempts[0],map).correct,lesson.questionIds.length);assert.equal(R.status(p,lesson,now).mastered,false);
});
check('rapid review uses actual vocabulary links, one question per word, and an honest cap',()=>{
  const p=mastered(),before=plain(p),selection=R.selectRapidReview(p,lesson,now),linked=new Set(lesson.vocabularyIds);
  assert.ok(selection.questions.length>0);assert.ok(selection.questions.length<=10);assert.equal(new Set(selection.wordIds).size,selection.questions.length);assert.ok(selection.questions.every(q=>q.skill==='vocabulary'&&linked.has(q.vocabularyId)&&byId.get(q.id)===q));
  assert.ok(selection.availableWords<=lesson.vocabularyIds.length);assert.equal(selection.partial,true);assert.ok(selection.questions.length<10);assert.deepEqual(p,before);
});
check('existing due mistakes and weak answers receive selection priority',()=>{
  const pool=C.questions.filter(q=>q.skill==='vocabulary'&&lesson.vocabularyIds.includes(q.vocabularyId)),weak=pool.at(-1);const p=submit(E.initialProgress(),[weak],now-2*DAY,{correct:false});
  const selected=R.selectRapidReview(p,lesson,now);assert.equal(selected.questions[0].id,weak.id);assert.equal(selected.wordIds[0],weak.vocabularyId);assert.equal(new Set(selected.wordIds).size,selected.wordIds.length);
});
check('tampered lesson arguments cannot expand the canonical word or question links',()=>{
  const p=mastered(),altered={...lesson,questionIds:C.questions.map(q=>q.id),vocabularyIds:C.vocabulary.map(w=>w.id)};
  assert.deepEqual(plain(R.status(p,altered,now)),plain(R.status(p,lesson,now)));assert.deepEqual(plain(R.selectRapidReview(p,altered,now)),plain(R.selectRapidReview(p,lesson,now)));assert.equal(R.status(p,{id:'invented'},now).mastered,false);assert.equal(R.selectRapidReview(p,{id:'invented'},now).questions.length,0);
});

// A minimal DOM-shaped adapter isolates the enhancer's lifecycle; real Chrome checks cover layout.
class Node {
  constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs={...attrs};this.children=[];this.parent=null;this.dataset={};for(const[key,value]of Object.entries(attrs))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;this.classes=new Set((attrs.className||'').split(/\s+/).filter(Boolean));this.classList={add:(...items)=>items.forEach(item=>this.classes.add(item)),remove:(...items)=>items.forEach(item=>this.classes.delete(item)),contains:item=>this.classes.has(item)};this.append(children);}
  append(...children){for(const child of children.flat(Infinity)){if(child===null||child===undefined||child===false)continue;this.children.push(child);if(child instanceof Node)child.parent=this;}}
  get textContent(){return this.children.map(child=>child instanceof Node?child.textContent:String(child)).join('');}
  getAttribute(key){return this.attrs[key]??null;}
  setAttribute(key,value){this.attrs[key]=value;}
  removeAttribute(key){delete this.attrs[key];}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(item=>item!==this);this.parent=null;}
  after(child){const index=this.parent.children.indexOf(this);this.parent.children.splice(index+1,0,child);child.parent=this.parent;}
  all(){return this.children.filter(child=>child instanceof Node).flatMap(child=>[child,...child.all()]);}
  querySelectorAll(selector){if(selector==='[data-lesson-id]')return this.all().filter(node=>node.dataset.lessonId);const classes=selector.split(',').map(part=>part.trim().slice(1));return this.all().filter(node=>classes.some(name=>node.classes.has(name)));}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
context.KotobaUI={el:(tag,attrs,...children)=>new Node(tag,attrs,children),icon:name=>new Node('svg',{},[]),button:(label,handler,classes,attrs)=>new Node('button',{...attrs,className:classes,onClick:handler},[label])};
function rendered(progress,selected=lesson){
  const stage=new Node('section',{},[...plan.units[0].lessons.map(l=>new Node('button',{'data-lesson-id':l.id,'aria-describedby':'existing-note',className:'daily-lesson-node'},[l.title])),new Node('article',{className:'daily-lesson'},[new Node('div',{className:'path-evidence'})])]);
  const calls=[],notices=[],cleanup=[];let current=progress;const ctx={progress:()=>current,now:()=>now,start:(qs,type,options)=>calls.push({qs,type,options}),notice:text=>notices.push(text),cleanup:fn=>cleanup.push(fn)};
  R.enhance(ctx,stage,plan,selected);return{ctx,stage,calls,notices,cleanup,change:p=>{current=p;},button:()=>stage.all().find(node=>node.attrs.id==='path-rapid-review')};
}
check('enhancement marks only genuine gold nodes and communicates attention accessibly',()=>{
  const p=mastered(),before=plain(p),render=rendered(p),node=render.stage.querySelectorAll('[data-lesson-id]').find(n=>n.dataset.lessonId===lesson.id);
  assert.ok(node.classList.contains('path-recall-gold'));assert.ok(node.classList.contains('path-recall-attention'));assert.match(node.textContent,/Review attention/);assert.match(node.getAttribute('aria-describedby'),/^existing-note path-recall-note-/);
  const actualCount=R.selectRapidReview(p,lesson,now).questions.length;const action=render.button();assert.match(action.textContent,new RegExp('Start '+actualCount+'-word rapid review'));assert.match(render.stage.querySelector('.path-recall-panel').textContent,new RegExp('Refresh the '+actualCount+' words available'));assert.deepEqual(p,before);
});
check('repeated enhancement replaces its own labels without duplicating or editing unrelated ARIA',()=>{
  const p=mastered(),render=rendered(p);R.enhance(render.ctx,render.stage,plan,lesson);assert.equal(render.stage.querySelectorAll('.path-recall-panel').length,1);assert.equal(render.stage.querySelectorAll('.path-recall-node-status').length,1);const node=render.stage.querySelectorAll('[data-lesson-id]').find(n=>n.dataset.lessonId===lesson.id);assert.equal(node.getAttribute('aria-describedby').split('existing-note').length,2);
});
check('rapid action starts once and changes no mastery, completion, XP, SRS or attention by itself',()=>{
  const p=mastered(),before=plain(p),render=rendered(p),action=render.button();action.attrs.onClick();action.attrs.onClick();assert.equal(render.calls.length,1);assert.equal(render.calls[0].type,'practice');assert.equal(render.calls[0].options.count,render.calls[0].qs.length);assert.equal(R.status(p,lesson,now).needsReview,true);assert.deepEqual(p,before);
});
check('mock guards and disposed callbacks cannot start an additional session',()=>{
  const p=mastered(),render=rendered(p),a=E.createAttempt([byId.get(lesson.questionIds[0])],'mock',{now,durationMinutes:15});render.change({...p,attempts:[a],activeAttemptId:a.id});render.button().attrs.onClick();assert.equal(render.calls.length,0);assert.match(render.notices[0],/active mock/);
  const duringMock=rendered({...p,attempts:[a],activeAttemptId:a.id});assert.equal(duringMock.button().attrs.disabled,true);
  const disposed=rendered(p);disposed.cleanup.forEach(fn=>fn());disposed.button().attrs.onClick();assert.equal(disposed.calls.length,0);
});
check('a newly submitted successful retrieval clears the visual reminder on the next render only',()=>{
  const p=mastered(),render=rendered(p),q=byId.get(lesson.questionIds.find(id=>byId.get(id).skill!=='listening')),recent=submit(p,[q],now);render.change(recent);render.button().attrs.onClick();assert.equal(render.calls.length,0);R.enhance(render.ctx,render.stage,plan,lesson);
  assert.equal(render.stage.querySelectorAll('.path-recall-panel').length,0);const node=render.stage.querySelectorAll('[data-lesson-id]').find(n=>n.dataset.lessonId===lesson.id);assert.ok(node.classList.contains('path-recall-gold'));assert.ok(!node.classList.contains('path-recall-attention'));assert.deepEqual(recent.reviews,p.reviews);
});
console.log(`${checks} path recall checks passed.`);
