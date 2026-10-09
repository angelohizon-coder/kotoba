// Exercise the real opt-in rewards engine with canonical content and transitions; no npm.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts')&&!/\.[a-z]+$/i.test(specifier)){
    for(const suffix of ['.ts','/index.ts']){const url=new URL(specifier+suffix,context.parentURL);if(existsSync(fileURLToPath(url)))return next(url.href,context);}
  }return next(specifier,context);
}});
const C=await import('../src/content/index.ts'), E=await import('../src/lib/engine.ts'), M=await import('../src/lib/motivation.ts');
const L=await import('../src/lib/learnlab.ts'), S=await import('../src/lib/storage.ts');
const HOUR=3_600_000, DAY=24*HOUR, start=new Date(2026,0,6,8,0).getTime();
const map=Object.fromEntries(C.questions.map(q=>[q.id,q]));
const pool=C.questions.filter(q=>q.skill!=='listening');
const lesson=C.learningPath.find(p=>p.level==='n3').units[0].lessons.find(l=>l.kind==='daily');
let checks=0;
const check=(label,fn)=>{fn();checks++;console.log('PASS '+label);};
const enabled=(choices={},now=start)=>M.enableMotivation(E.initialProgress(),choices,now);
function assessed(progress,qs,now,{correct=true,type='practice',access=null,exclude=[]}={}){
  const attempt=E.createAttempt(qs,type,{now:now-1000,listeningAccess:access,random:()=>.5});
  let next={...progress,attempts:[...progress.attempts,attempt],activeAttemptId:attempt.id};
  for(const q of qs){const answer=correct?q.correctOptionId:q.options.find(o=>o.id!==q.correctOptionId).id;next=E.selectAnswer(next,attempt.id,q.id,answer);}
  next={...next,attempts:next.attempts.map(a=>a.id===attempt.id?{...a,excludedIds:exclude}:a)};
  return E.submitAttempt(next,attempt.id,map,now);
}
function reward(progress,qs,now,options){return M.reconcileMotivation(assessed(progress,qs,now,options),progress,now);}
function valid(progress){assert.deepEqual(M.validateMotivation(JSON.parse(JSON.stringify(progress.motivation)),progress),progress.motivation);}
function rejected(progress,mutate){const saved=structuredClone(progress.motivation);mutate(saved);assert.throws(()=>M.validateMotivation(saved,progress),/Invalid motivation/);}
function studied(progress,type,id,now){return M.reconcileMotivation(E.markStudied(progress,type,id,now),progress,now);}
function completeLab(progress,mode,now,answerFor){
  let lab=L.createSession(progress.learnlab||L.initialLearnLab(),{mode,level:'n3',count:3,now:now-5000,random:()=>.5});const id=lab.activeSessionId;
  lab=L.beginSession(lab,id,now-4900);let clock=now-4800,index=0;
  while(true){const session=lab.sessions.find(s=>s.id===id),exercise=L.currentExercise(session);if(!exercise)break;
    let answer=exercise.kind==='bonus'?String(exercise.bonus.correct):exercise.kind==='pairs'?Object.fromEntries(exercise.wordIds.map(id=>[id,id])):exercise.kind==='sentence'?exercise.bank.map(token=>token.id).sort((a,b)=>Number(a)-Number(b)):exercise.kind==='choice'?exercise.target.id:exercise.target.reading;
    if(answerFor)answer=answerFor(exercise,answer,index++);
    lab=L.answerSession(lab,id,exercise.id,answer,clock);clock+=100;
  }
  return {...progress,learnlab:L.finishSession(lab,id,now)};
}
check('disabled rewards preserve the original progress and optional field absence',()=>{
  const p=E.initialProgress();assert.equal(M.reconcileMotivation(p,p,start),p);assert.equal(M.validateMotivation(undefined,p),undefined);assert.equal(M.recordStudyTime(p,30,start),p);assert.ok(!('motivation' in p));
});
check('enabling preserves core learning and baselines prior submissions and pending attempts',()=>{
  let p=assessed(E.initialProgress(),pool.slice(0,5),start-5000);
  const pending=E.createAttempt(pool.slice(5,10),'practice',{now:start-2000,random:()=>.5});p={...p,attempts:[...p.attempts,pending]};
  const before=structuredClone(p);p=M.enableMotivation(p,{},start);assert.deepEqual(p.attempts,before.attempts);assert.deepEqual(p.reviews,before.reviews);assert.equal(p.motivation.xp,0);
  p=M.reconcileMotivation(p,p,start+1000);assert.equal(p.motivation.ledger.length,0);valid(p);
});
check('unfinished checked answers are not XP or perfect-session evidence',()=>{
  let p=enabled();const a=E.createAttempt(pool.slice(0,5),'practice',{now:start+1000,random:()=>.5});p={...p,attempts:[a],activeAttemptId:a.id};
  for(const q of pool.slice(0,5)){p=E.selectAnswer(p,a.id,q.id,q.correctOptionId);p=E.checkAnswer(p,a.id,q.id);}
  p=M.reconcileMotivation(p,p,start+2000);assert.equal(p.motivation.xp,0);assert.equal(M.motivationSummary(p,start+2000).todayPerfect,0);valid(p);
});
let five=reward(enabled(),pool.slice(0,5),start+2000);
check('five assessed correct answers earn actual XP, coins and the 20 percent perfect bonus',()=>{
  assert.equal(five.motivation.xp,30);assert.equal(five.motivation.coins,6);assert.equal(five.motivation.ledger.length,1);assert.equal(five.motivation.ledger[0].perfect,true);valid(five);
});
check('submission reconciliation and imported receipt replay are idempotent',()=>{
  const next=M.reconcileMotivation(five,five,start+2000);assert.equal(next,five);const again=M.reconcileMotivation(next,next,start+3000);assert.equal(again.motivation.xp,30);assert.equal(again.motivation.ledger.length,1);valid(again);
});
check('repeated questions cannot farm XP on the same local calendar day',()=>{
  const next=reward(five,pool.slice(0,5),start+5000);assert.equal(next.motivation.xp,30);assert.equal(next.motivation.ledger.length,1);valid(next);
});
check('a partly overlapping session rewards only newly assessed questions',()=>{
  const next=reward(five,pool.slice(3,8),start+5000);assert.equal(next.motivation.ledger[1].questionIds.length,3);assert.equal(next.motivation.xp,48);valid(next);
});
check('a later local day permits a new assessed retrieval receipt',()=>{
  const next=reward(five,pool.slice(0,5),start+DAY);assert.equal(next.motivation.xp,60);assert.equal(M.motivationSummary(next,start+DAY).streak,2);valid(next);
});
check('script-assisted listening creates no assessment XP; audio assessment does',()=>{
  const qs=C.questions.filter(q=>q.skill==='listening').slice(0,5);
  let p=reward(enabled(),qs,start+2000,{access:'script'});assert.equal(p.motivation.xp,0);p=reward(p,qs,start+3000,{access:'audio'});assert.equal(p.motivation.xp,30);valid(p);
});
check('listening without recorded audio access cannot claim assessed XP or perfection',()=>{
  const qs=C.questions.filter(q=>q.skill==='listening').slice(0,5);let p=reward(enabled(),qs,start+2000);assert.equal(p.motivation.xp,0);assert.equal(M.motivationSummary(p,start+2000).todayPerfect,0);valid(p);
});
check('excluded questions do not reward answers or create a perfect session',()=>{
  const p=reward(enabled(),pool.slice(0,5),start+2000,{exclude:[pool[0].id]});assert.equal(p.motivation.xp,20);assert.equal(p.motivation.ledger[0].questionIds.length,4);assert.equal(p.motivation.ledger[0].perfect,false);valid(p);
});
check('repeated study events reward a canonical word once per local day',()=>{
  let p=studied(enabled(),'vocabulary',C.vocabulary[0].id,start+1000);p=studied(p,'vocabulary',C.vocabulary[0].id,start+2000);assert.equal(p.motivation.xp,2);
  p=studied(p,'vocabulary',C.vocabulary[1].id,start+3000);assert.equal(p.motivation.xp,4);assert.equal(Object.keys(p.reviews).length,0);valid(p);
});
check('marking a checklist alone does not earn learning XP',()=>{
  const p=M.reconcileMotivation(E.setTaskCompleted(enabled(),'path:'+lesson.id,true),enabled(),start+1000);assert.equal(p.motivation.xp,0);valid(p);
});
let learned=studied(enabled(),'vocabulary',lesson.vocabularyIds[0],start+1000);learned=studied(learned,'grammar',lesson.grammarIds[0],start+2000);
learned=M.reconcileMotivation(E.setTaskCompleted(learned,'path:'+lesson.id,true),learned,start+3000);
check('lesson completion needs recorded linked learning and earns once',()=>{
  assert.equal(learned.motivation.xp,14);assert.equal(learned.motivation.ledger.at(-1).kind,'lesson');valid(learned);
  let p=E.setTaskCompleted(learned,'path:'+lesson.id,false);p=M.reconcileMotivation(p,learned,start+4000);p=E.setTaskCompleted(p,'path:'+lesson.id,true);p=M.reconcileMotivation(p,p,start+5000);assert.equal(p.motivation.xp,14);valid(p);
});
check('a perfect linked session earns the 20 percent lesson bonus with evidence',()=>{
  const linked=[...new Set([...lesson.questionIds,...pool.slice(0,10).map(q=>q.id)])].slice(0,5).map(id=>map[id]);
  let p=reward(enabled(),linked,start+2000,{access:'audio'});p=studied(p,'vocabulary',lesson.vocabularyIds[0],start+3000);p=studied(p,'grammar',lesson.grammarIds[0],start+4000);p=M.reconcileMotivation(E.setTaskCompleted(p,'path:'+lesson.id,true),p,start+5000);
  assert.equal(p.motivation.ledger.at(-1).xp,12);assert.equal(p.motivation.ledger.at(-1).perfect,true);valid(p);
});
let emptyHearts=reward(enabled({heartsEnabled:true}),pool.slice(0,6),start+2000,{correct:false});
check('zero optional hearts never changes core attempts, mastery or free practice access',()=>{
  assert.equal(emptyHearts.motivation.hearts,0);assert.equal(emptyHearts.motivation.xp,6);assert.equal(E.createAttempt(pool.slice(6,11),'practice',{now:start+3000}).questionOrder.length,5);assert.equal(emptyHearts.attempts.length,1);valid(emptyHearts);
});
check('hearts regenerate one per four hours up to five, including from zero',()=>{
  const before=M.reconcileMotivation(emptyHearts,emptyHearts,start+2000+4*HOUR-1);assert.equal(before.motivation.hearts,0);
  const one=M.reconcileMotivation(before,before,start+2000+4*HOUR);assert.equal(one.motivation.hearts,1);valid(one);
  const full=M.reconcileMotivation(one,one,start+2000+20*HOUR);assert.equal(full.motivation.hearts,5);valid(full);
});
check('a backward clock does not regenerate hearts or consume future freezes',()=>{
  assert.equal(M.reconcileMotivation(emptyHearts,emptyHearts,start-1000),emptyHearts);
});
check('due SRS audit events reward once and successful due ratings refill hearts',()=>{
  const at=new Date(start+3000).toISOString(),previous=new Date(start+2500).toISOString(),card='vocabulary:'+C.vocabulary[0].id;
  let p={...emptyHearts,srs:{[card]:{type:'vocabulary',id:C.vocabulary[0].id,events:[{eventId:'due-one',quality:4,reviewedAt:at,previousNextReviewAt:previous}]}}};
  p=M.reconcileMotivation(p,emptyHearts,start+3000);assert.equal(p.motivation.xp,10);assert.equal(p.motivation.hearts,1);valid(p);
  const replay=M.reconcileMotivation(p,p,start+4000);assert.equal(replay.motivation.xp,10);assert.equal(replay.motivation.hearts,1);valid(replay);
});
check('first and early SRS ratings do not claim due-review XP',()=>{
  const card='kanji:'+C.kanji[0].id,at=new Date(start+3000).toISOString();let p={...enabled(),srs:{[card]:{type:'kanji',id:C.kanji[0].id,events:[{eventId:'first',quality:5,reviewedAt:at},{eventId:'early',quality:4,reviewedAt:at,previousNextReviewAt:new Date(start+DAY).toISOString()}]}}};
  p=M.reconcileMotivation(p,p,start+4000);assert.equal(p.motivation.xp,0);assert.equal(p.motivation.ledger.length,0);valid(p);
});
check('due mistake review can refill hearts without bypassing its real review schedule',()=>{
  const id=pool[0].id;let p={...emptyHearts,reviews:{...emptyHearts.reviews,[id]:{...emptyHearts.reviews[id],dueAt:new Date(start+2500).toISOString()}}};
  const next=reward(p,[pool[0]],start+3000,{type:'review'});assert.equal(next.motivation.hearts,0); // same-day reward dedup keeps repeat clicks from refilling
  const later=reward(p,[pool[0]],start+DAY,{type:'review'});assert.equal(later.motivation.hearts,5);valid(later);
});
let rich=reward(enabled(),pool.slice(0,200),start+2000);
check('three daily quest tiers require actual XP, correct answers and a perfect session',()=>{
  const s=M.motivationSummary(rich,start+2000);assert.equal(s.quests.filter(q=>q.available).length,3);
  let p=rich;for(const id of ['bronze','silver','gold'])p=M.claimMotivationReward(p,id,start+3000);
  assert.equal(p.motivation.coins,rich.motivation.coins+70);assert.equal(p.motivation.xp,rich.motivation.xp);const again=M.claimMotivationReward(p,'gold',start+3000);assert.equal(again.motivation.coins,p.motivation.coins);valid(p);
  assert.equal(M.claimMotivationReward(enabled(),'gold',start+1000).motivation.coins,0);
});
check('the seeded daily chest saves one outcome without rerolls or free XP',()=>{
  const p=M.claimMotivationReward(five,'chest',start+3000),coins=p.motivation.coins-five.motivation.coins;
  assert.ok([10,15,20].includes(coins));assert.equal(p.motivation.xp,five.motivation.xp);assert.equal(M.claimMotivationReward(p,'chest',start+4000).motivation.coins,p.motivation.coins);valid(p);
  const independent=M.claimMotivationReward(five,'chest',start+5000);assert.equal(independent.motivation.coins,p.motivation.coins);
});
check('monthly rewards require 300 real XP and five active dates and earn one boost',()=>{
  let p=enabled();for(let day=0;day<5;day++)p=reward(p,pool.slice(0,10),start+day*DAY+2000);
  assert.equal(M.motivationSummary(p,start+4*DAY+2000).monthlyXP,300);assert.ok(p.motivation.earnedBadges.includes('monthly:2026-01'));
  p=M.claimMotivationReward(p,'monthly',start+4*DAY+3000);assert.equal(p.motivation.coins,160);assert.equal(M.motivationSummary(p,start+4*DAY+3000).boostCharges,1);valid(p);
  assert.equal(M.claimMotivationReward(p,'monthly',start+4*DAY+4000).motivation.coins,160);
  const instant=M.activateBoost(p,start+4*DAY+3000);assert.equal(instant.motivation.boosts.length,1);valid(instant);
});
check('the shop spends only earned coins and preserves default free cosmetics',()=>{
  assert.throws(()=>M.purchaseReward(enabled(),'freeze',start+1000),/Earn more coins/);
  const p=M.purchaseReward(rich,'sakura',start+3000);assert.equal(p.motivation.coins,rich.motivation.coins-80);assert.ok(M.motivationSummary(p,start+3000).cosmetics.includes('mint'));assert.ok(M.motivationSummary(p,start+3000).cosmetics.includes('sakura'));valid(p);
  assert.equal(M.purchaseReward(p,'sakura',start+3000),p);assert.equal(M.setMotivationCosmetic(p,'sakura').motivation.cosmetic,'sakura');assert.throws(()=>M.setMotivationCosmetic(p,'sunset'),/not been earned/);
});
let frozen=M.purchaseReward(M.purchaseReward(rich,'freeze',start+3000),'freeze',start+4000);
check('freeze inventory holds at most two purchased freezes',()=>{
  assert.equal(M.motivationSummary(frozen,start+4000).freezes,2);assert.throws(()=>M.purchaseReward(frozen,'freeze',start+5000),/two streak freezes/);valid(frozen);
});
check('freezes protect only elapsed missed calendar days and cannot prefill future days',()=>{
  const today=M.reconcileMotivation(frozen,frozen,start+DAY);assert.equal(today.motivation.freezesUsed.length,0);valid(today);
  const first=M.reconcileMotivation(today,today,start+2*DAY);assert.equal(first.motivation.freezesUsed.length,1);assert.equal(M.motivationSummary(first,start+2*DAY).streak,2);valid(first);
  const second=M.reconcileMotivation(first,first,start+3*DAY);assert.equal(second.motivation.freezesUsed.length,2);assert.equal(M.motivationSummary(second,start+3*DAY).streak,3);valid(second);
  const broken=M.reconcileMotivation(second,second,start+4*DAY);assert.equal(M.motivationSummary(broken,start+4*DAY).streak,0);valid(broken);
});
check('buying a freeze later cannot repair already elapsed historical gaps',()=>{
  const p=M.purchaseReward(rich,'freeze',start+3*DAY);assert.equal(p.motivation.freezesUsed.length,0);assert.equal(M.motivationSummary(p,start+3*DAY).streak,0);valid(p);
});
check('an earned boost activates once and doubles only new activity in its 20-minute window',()=>{
  let p=M.activateBoost(M.purchaseReward(rich,'boost',start+3000),start+4000);assert.equal(M.motivationSummary(p,start+4000).boostCharges,0);
  const replay=M.activateBoost(p,start+4000);assert.equal(replay.motivation.boosts.length,1);
  p=reward(p,pool.slice(200,205),start+5000);assert.equal(p.motivation.ledger.at(-1).xp,60);assert.equal(p.motivation.ledger.at(-1).multiplier,2);valid(p);
  p=reward(p,pool.slice(205,210),start+4000+20*60_000);assert.equal(p.motivation.ledger.at(-1).xp,30);assert.equal(p.motivation.ledger.at(-1).multiplier,1);valid(p);
  assert.throws(()=>M.activateBoost(p,start+4000+21*60_000),/Earn or buy/);
});
check('local badges reflect evidence and the private profile permits at most three earned badges',()=>{
  assert.ok(rich.motivation.earnedBadges.includes('first-steps'));assert.ok(rich.motivation.earnedBadges.includes('steady-study'));
  assert.throws(()=>M.setProfileBadges(rich,['night-owl']),/earned/);const p=M.setProfileBadges(rich,['first-steps','steady-study']);assert.equal(p.motivation.profileBadges.length,2);valid(p);
  assert.throws(()=>M.setProfileBadges(p,['first-steps','steady-study','first-steps','steady-study']),/three/);
});
check('optional time badges require an actual completed lesson in today’s local window',()=>{
  assert.equal(M.motivationSummary(learned,start+3000).earlyAvailable,true);
  const p=M.claimMotivationReward(learned,'early-bird',start+4000);assert.ok(p.motivation.earnedBadges.includes('early-bird'));assert.equal(p.motivation.coins,learned.motivation.coins);valid(p);
  assert.equal(M.motivationSummary(learned,start+DAY).earlyAvailable,false);assert.equal(M.claimMotivationReward(enabled(),'night-owl',start+1000).motivation.claimedBadges.length,0);
});
check('ten mascot taps unlock only a cosmetic and can never farm learning XP or coins',()=>{
  let p=enabled();for(let i=0;i<25;i++)p=M.tapMascot(p);assert.equal(p.motivation.mascotTaps,10);assert.equal(p.motivation.xp,0);assert.equal(p.motivation.coins,0);assert.ok(M.motivationSummary(p,start).cosmetics.includes('tanuki-star'));valid(p);
});
check('measured active time is bounded by elapsed seconds and crosses midnight cleanly',()=>{
  let p=M.recordStudyTime(enabled(),30,start+30_000);assert.equal(M.motivationSummary(p,start+30_000).todayMinutes,0);p=M.recordStudyTime(p,30,start+60_000);assert.equal(M.motivationSummary(p,start+60_000).todayMinutes,1);assert.equal(p.motivation.xp,0);valid(p);
  assert.equal(M.recordStudyTime(p,60,start+60_000),p);assert.throws(()=>M.recordStudyTime(p,61,start+61_000),/out of range/);
  const midnight=new Date(2026,0,7,0,0).getTime();let q=enabled({},midnight-30_000);q=M.recordStudyTime(q,60,midnight+30_000);assert.deepEqual(Object.values(q.motivation.studySeconds),[30,30]);valid(q);
});
check('invalid rewards, source outcomes, duplicate ledgers and balances are rejected',()=>{
  rejected(five,s=>s.ledger[0].xp++);rejected(five,s=>s.ledger.push(structuredClone(s.ledger[0])));rejected(five,s=>s.ledger[0].correct=0);rejected(five,s=>s.coins=9999);rejected(five,s=>s.ledger[0].sourceId='unknown');rejected(five,s=>s.ledger[0].multiplier=2);
});
check('forged lesson bonuses, unsupported due reviews and fake badge mastery are rejected',()=>{
  rejected(learned,s=>{s.ledger.at(-1).perfect=true;s.ledger.at(-1).xp=12;s.xp+=2;});rejected(five,s=>s.earnedBadges.push('month-streak'));rejected(rich,s=>s.profileBadges=['night-owl']);
  rejected(five,s=>{s.ledger[0].kind='review';s.ledger[0].sourceId='vocabulary:unknown@@fake';});
});
check('future freeze consumption, unearned purchases and forged study minutes are rejected',()=>{
  rejected(frozen,s=>s.freezesUsed=[{day:s.lastCalendarDay,purchaseId:s.purchases[0].id}]);rejected(rich,s=>{s.purchases=[{id:'fake',reward:'sunset',cost:0,at:s.enabledAt}];});rejected(five,s=>s.studySeconds={'2099-01-01':60});rejected(five,s=>s.studySeconds={[s.lastCalendarDay]:86400});
});
check('opt-out removes only optional rewards and a later enable does not replay history',()=>{
  const p=M.disableMotivation(rich);assert.ok(!('motivation' in p));assert.deepEqual(p.attempts,rich.attempts);assert.deepEqual(p.reviews,rich.reviews);const again=M.enableMotivation(p,{},start+5000);assert.equal(M.reconcileMotivation(again,again,start+6000).motivation.xp,0);valid(again);
});
let labExact=M.reconcileMotivation(completeLab(enabled(),'recall',start+10_000),enabled(),start+10_000);
check('a completed Lab lesson earns immediate validated engagement XP without exam or SRS changes',()=>{
  assert.equal(labExact.motivation.ledger.length,1);const receipt=labExact.motivation.ledger[0];assert.equal(receipt.kind,'lab');assert.equal(receipt.correct,3);assert.equal(receipt.perfect,true);assert.equal(receipt.xp,18);assert.equal(receipt.coins,3);
  assert.equal(labExact.attempts.length,0);assert.deepEqual(labExact.reviews,{});assert.ok(!labExact.srs);assert.equal(receipt.labProof.finishedAt,new Date(start+10_000).toISOString());assert.ok(receipt.labProof.results.every(result=>typeof result.at==='string'&&result.at.endsWith('Z')));valid(labExact);
  const restored=S.validateProgress(JSON.parse(JSON.stringify(labExact)));assert.deepEqual(restored.motivation,labExact.motivation);
});
check('Lab replay and repeated targets or easier final choices cannot farm XP',()=>{
  const repeated=M.reconcileMotivation(labExact,labExact,start+11_000);assert.equal(repeated.motivation.xp,18);assert.equal(repeated.motivation.ledger.length,1);assert.equal(repeated.motivation.ledger[0].labConcepts.length,3);valid(repeated);
  const sameTargets=completeLab(enabled(),'recall',start+20_000);let p={...labExact,learnlab:{...sameTargets.learnlab,sessions:[...labExact.learnlab.sessions,...sameTargets.learnlab.sessions]}};
  p=M.reconcileMotivation(p,labExact,start+20_000);assert.equal(p.motivation.xp,18);assert.equal(p.motivation.ledger.length,1);valid(p);
});
check('unfinished or abandoned Lab sessions do not earn completion XP',()=>{
  const created=L.createSession(L.initialLearnLab(),{mode:'recall',level:'n3',count:3,now:start+1000,random:()=>.5});let p={...enabled(),learnlab:created};p=M.reconcileMotivation(p,p,start+2000);assert.equal(p.motivation.xp,0);
  p={...p,learnlab:L.abandonSession(p.learnlab,p.learnlab.activeSessionId,start+3000)};p=M.reconcileMotivation(p,p,start+3000);assert.equal(p.motivation.xp,0);valid(p);
});
check('previously completed Lab lessons are excluded when enabling rewards',()=>{
  const old=completeLab(E.initialProgress(),'recall',start-1000),p=M.enableMotivation(old,{},start);assert.equal(p.motivation.baseline.labs.length,1);const next=M.reconcileMotivation(p,p,start+1000);assert.equal(next.motivation.xp,0);valid(next);
});
check('sentence, pairs, dictation and bonus Lab modes each use canonical proof and bounded perfect bonuses',()=>{
  for(const mode of ['sentence','pairs','dictation','bonus']){const p=M.reconcileMotivation(completeLab(enabled(),mode,start+10_000),enabled(),start+10_000);assert.ok(p.motivation.xp>0,mode);assert.equal(p.motivation.ledger[0].perfect,true,mode);assert.equal(p.motivation.ledger[0].correct,3,mode);assert.equal(p.motivation.ledger[0].xp,18,mode);valid(p);assert.deepEqual(S.validateProgress(JSON.parse(JSON.stringify(p))).motivation,p.motivation);}
});
check('Lab typo engagement never earns an exact-answer count or a perfect bonus',()=>{
  let typoUsed=false;
  const p=completeLab(enabled(),'recall',start+10_000,(exercise,answer,index)=>{
    if(exercise.kind!=='recall'||typoUsed)return answer;
    for(const char of ['あ','い','う','え','お']){const candidate=char+exercise.target.reading.slice(1);if(L.gradeResponse(exercise,candidate).outcome==='typo'){typoUsed=true;return candidate;}}
    return answer;
  });
  assert.equal(typoUsed,true);const next=M.reconcileMotivation(p,p,start+10_000);const e=next.motivation.ledger[0];assert.equal(e.correct,2);assert.equal(e.perfect,false);assert.equal(e.xp,12);assert.equal(M.motivationSummary(next,start+10_000).todayPerfect,0);valid(next);
});
check('Lab missed answers earn engagement only and repeated final correction does not rewrite the first outcome',()=>{
  let p=completeLab(enabled(),'recall',start+10_000,(exercise,answer,index)=>index===0?'definitely wrong':answer);p=M.reconcileMotivation(p,p,start+10_000);const e=p.motivation.ledger[0];assert.equal(e.correct,2);assert.equal(e.perfect,false);assert.equal(e.xp,11);valid(p);
});
check('Lab receipt proofs survive trimmed session history and progress backup validation',()=>{
  const archived={...labExact,learnlab:L.initialLearnLab()};valid(archived);assert.deepEqual(S.validateProgress(JSON.parse(JSON.stringify(archived))).motivation,archived.motivation);
});
check('Lab source validation rejects invented words, fabricated exact grades, missing completion and excess XP',()=>{
  rejected(labExact,s=>s.ledger[0].labProof.queue[0].wordIds=['not-canonical']);rejected(labExact,s=>s.ledger[0].labProof.results[0].answer='wrong');rejected(labExact,s=>s.ledger[0].labProof.status='in-progress');rejected(labExact,s=>s.ledger[0].labProof.finishedAt=new Date(start+DAY).toISOString());rejected(labExact,s=>s.ledger[0].labConcepts.push('word:fake'));rejected(labExact,s=>s.ledger[0].xp+=100);
});
check('Lab XP contributes to real daily goals and local streaks without claiming exam mastery',()=>{
  const summary=M.motivationSummary(labExact,start+10_000);assert.equal(summary.todayLabXP,18);assert.equal(summary.todayLabExact,3);assert.equal(summary.todayXP,18);assert.equal(summary.streak,1);assert.deepEqual(E.aggregateAccuracy(labExact,map),E.aggregateAccuracy(E.initialProgress(),map));
});
check('earned boosts multiply new completed Lab learning rather than old source receipts',()=>{
  let p=M.activateBoost(M.purchaseReward(rich,'boost',start+3000),start+4000);p=M.reconcileMotivation(completeLab(p,'recall',start+10_000),p,start+10_000);assert.equal(p.motivation.ledger.at(-1).kind,'lab');assert.equal(p.motivation.ledger.at(-1).xp,36);assert.equal(p.motivation.ledger.at(-1).multiplier,2);valid(p);assert.deepEqual(S.validateProgress(JSON.parse(JSON.stringify(p))).motivation,p.motivation);
});
check('new local calendar days permit Lab retrieval XP and carry a real study streak',()=>{
  const sameWords=completeLab(enabled(),'recall',start+DAY+10_000);let p={...labExact,learnlab:{...sameWords.learnlab,sessions:[...labExact.learnlab.sessions,...sameWords.learnlab.sessions]}};p=M.reconcileMotivation(p,labExact,start+DAY+10_000);assert.equal(p.motivation.xp,36);assert.equal(M.motivationSummary(p,start+DAY+10_000).streak,2);valid(p);
});
console.log(`${checks} motivation checks passed.`);
