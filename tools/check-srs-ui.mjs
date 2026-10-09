// Real browser journeys for explicit recall ratings and quiz keyboard controls.
import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function runSrsChecks({ js, send, nav, pause, progress, waitFor, pass, writeFile, artifacts, baseUrl }) {
  const reload = async () => {
    await send('Page.reload'); await pause(180);
    await waitFor('Boolean(window.KotobaSrs && document.querySelector(".app-shell"))', 'recall UI at ' + baseUrl);
  };
  const fresh = async (route = 'vocabulary', seed = '') => {
    await js(`(() => {let p=KotobaEngine.initialProgress();p.settings.soundEffects=false;${seed};localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));sessionStorage.removeItem('kotoba-n3-seen-scripts-'+KotobaContent.CONTENT_VERSION);location.hash=${JSON.stringify(route)};})()`);
    await reload();
  };
  const press = async (key, options = {}) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: 'Digit' + key, windowsVirtualKeyCode: key.charCodeAt(0), ...options });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: 'Digit' + key, windowsVirtualKeyCode: key.charCodeAt(0) });
    await pause(30);
  };
  const clickId = async id => assert.ok(await js(`(() => {const b=document.getElementById(${JSON.stringify(id)});if(!b||b.disabled)return false;b.click();return true;})()`), 'Enabled control ' + id);
  const flashcards = async () => { await clickId('vocabulary-tab-flashcards'); await waitFor('Boolean(document.getElementById("flashcard-display"))', 'flashcard deck'); };
  const select = async (id, value) => { await js(`(() => {const n=document.getElementById(${JSON.stringify(id)});n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}));})()`); await pause(30); };
  const card = () => js(`(() => {const n=document.getElementById('flashcard-display');return {id:n.dataset.cardId,type:n.dataset.deckType,side:n.dataset.side};})()`);
  const ratings = (target = null) => js(`(() => {const n=${target ? `document.querySelector('[data-srs-target='+CSS.escape(${JSON.stringify(target)})+']')` : `document.querySelector('.srs-ratings')`};return n?{event:n.dataset.srsEvent,target:n.dataset.srsTarget,enabled:[...n.querySelectorAll('[data-srs-quality]')].filter(b=>!b.disabled&&!b.closest('fieldset').disabled).map(b=>Number(b.dataset.srsQuality)),count:n.querySelectorAll('[data-srs-quality]').length,text:n.querySelector('.srs-rating-status').textContent}:null;})()`);
  const rate = async (target, quality) => assert.ok(await js(`(() => {const n=document.querySelector('[data-srs-target='+CSS.escape(${JSON.stringify(target)})+']'),b=n?.querySelector('[data-srs-quality="${quality}"]');if(!b||b.disabled||b.closest('fieldset').disabled)return false;b.click();return true;})()`), 'Allowed quality ' + quality + ' for ' + target);
  const grade = () => js(`(() => {const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)),a=p.attempts.find(a=>a.id===p.activeAttemptId);return KotobaEngine.gradeAttempt(a,Object.fromEntries(KotobaContent.questions.map(q=>[q.id,q])));})()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await fresh(); await flashcards();
  const first = await card();
  assert.equal((await ratings()).count, 6); assert.deepEqual((await ratings()).enabled, [], 'All six grades are disabled while the answer is hidden');
  await clickId('flashcard-flip'); await clickId('flashcard-got-it');
  assert.ok((await progress()).completedTasks.includes('vocabulary:' + first.id));
  assert.equal(Object.keys((await progress()).srs || {}).length, 0, 'Got it does not infer an SM-2 grade');
  await clickId('flashcard-flip'); const second = await card(); await clickId('flashcard-again');
  assert.ok(!(await progress()).completedTasks.includes('vocabulary:' + second.id));
  assert.equal(Object.keys((await progress()).srs || {}).length, 0, 'Again does not infer an SM-2 grade');
  assert.equal((await progress()).attempts.length, 0); assert.deepEqual((await progress()).reviews, {});
  pass('flashcard completion and session marks stay separate from explicit SM-2 grades');

  await fresh(); await flashcards();
  const word = await card(), wordKey = 'vocabulary:' + word.id, before = await progress();
  const hiddenEvent = (await ratings()).event;
  assert.equal(hiddenEvent, await js(`'flashcard:vocabulary:'+${JSON.stringify(word.id)}+':'+KotobaEngine.localDateKey()`));
  await clickId('flashcard-flip');
  assert.deepEqual((await ratings()).enabled, [0,1,2,3,4,5]); assert.equal((await ratings()).event, hiddenEvent);
  await rate(wordKey, 4);
  const saved = await progress(); assert.equal(saved.srs[wordKey].events.length, 1); assert.equal(saved.srs[wordKey].events[0].quality, 4); assert.equal(saved.srs[wordKey].events[0].eventId, hiddenEvent);
  assert.equal(saved.srs[wordKey].intervalDays, 1); assert.equal(saved.srs[wordKey].repetitions, 1); assert.equal(saved.srs[wordKey].maxIntervalDays, 365);
  assert.deepEqual(saved.completedTasks, before.completedTasks); assert.deepEqual(saved.reviews, before.reviews);
  assert.deepEqual((await ratings()).enabled, []); assert.match((await ratings()).text, /Rating saved/);
  await reload(); await flashcards(); assert.equal((await card()).id, word.id); assert.equal((await ratings()).event, hiddenEvent);
  await clickId('flashcard-flip'); assert.deepEqual((await ratings()).enabled, []); assert.equal((await progress()).srs[wordKey].events.length, 1);
  pass('revealed vocabulary recall saves one deterministic daily rating, persists across reload, and leaves scores and checklist intact');

  for (const quality of [0,1,2,3,4,5]) {
    await fresh(); await flashcards(); await select('flashcard-deck', 'kanji');
    const character = await card(), key = 'kanji:' + character.id;
    assert.deepEqual((await ratings()).enabled, []); await clickId('flashcard-flip'); assert.deepEqual((await ratings()).enabled, [0,1,2,3,4,5]);
    await rate(key, quality); const record = (await progress()).srs[key];
    assert.equal(record.type, 'kanji'); assert.equal(record.events[0].quality, quality); assert.equal(record.repetitions, quality < 3 ? 0 : 1);
    assert.equal(record.intervalDays, 1); assert.equal(record.events.length, 1);
    assert.equal(Object.keys((await progress()).reviews).length, 0);
  }
  pass('all six explicit kanji grades save their real SM-2 outcomes only after reveal');

  await fresh('practice', `
    const qs=[KotobaContent.questions.find(q=>q.skill==='vocabulary'),KotobaContent.questions.find(q=>q.skill==='grammar'),KotobaContent.questions.find(q=>q.skill==='reading'),KotobaContent.questions.find(q=>q.skill==='listening')];
    const extra=KotobaContent.questions.find(q=>q.skill==='grammar'&&q.id!==qs[1].id);qs.push(extra);
    const a=KotobaEngine.createAttempt(qs,'practice',{now:Date.now()-20_000,random:()=>.5,listeningAccess:'script'});
    a.answers[qs[0].id]=qs[0].correctOptionId;a.answers[qs[1].id]=qs[1].options.find(o=>o.id!==qs[1].correctOptionId).id;a.answers[qs[3].id]=qs[3].correctOptionId;a.answers[extra.id]=extra.correctOptionId;a.excludedIds=[extra.id];
    p={...p,attempts:[a],activeAttemptId:a.id};p=KotobaEngine.submitAttempt(p,a.id,Object.fromEntries(KotobaContent.questions.map(q=>[q.id,q])),Date.now()-10_000);`);
  await waitFor('Boolean(document.querySelector(".result-summary"))', 'submitted genuine result feedback');
  const assessed = await progress(), attempt = assessed.attempts[0], actualGrade = await grade();
  const rightId = await js(`KotobaContent.questions.find(q=>${JSON.stringify(attempt.questionOrder)}.includes(q.id)&&q.skill==='vocabulary').id`);
  const wrongId = await js(`KotobaContent.questions.find(q=>${JSON.stringify(attempt.questionOrder)}.includes(q.id)&&q.skill==='grammar'&&!${JSON.stringify(attempt.excludedIds)}.includes(q.id)).id`);
  const rightKey = 'question:' + rightId, wrongKey = 'question:' + wrongId;
  assert.equal(await js(`document.querySelectorAll('.srs-ratings').length`), 2, 'Only genuine answered assessment items expose recall ratings');
  assert.deepEqual((await ratings(rightKey)).enabled, [3,4,5]); assert.deepEqual((await ratings(wrongKey)).enabled, [0,1,2]);
  assert.equal((await ratings(rightKey)).event, `attempt:${attempt.id}:${rightId}`);
  assert.ok(await js(`(() => {const r=document.querySelector('[data-srs-target='+CSS.escape(${JSON.stringify(rightKey)})+']');return Boolean(r.previousElementSibling?.classList.contains('feedback'));})()`), 'Rating follows the result explanation');
  await rate(rightKey, 3); await rate(wrongKey, 2);
  assert.deepEqual(await grade(), actualGrade); assert.deepEqual((await progress()).reviews, assessed.reviews, 'Explicit ratings do not rewrite the mistake schedule');
  assert.equal((await progress()).srs[rightKey].events[0].quality, 3); assert.equal((await progress()).srs[wrongKey].events[0].quality, 2);
  await reload(); assert.deepEqual((await ratings(rightKey)).enabled, []); assert.deepEqual((await ratings(wrongKey)).enabled, []);
  assert.equal((await progress()).srs[rightKey].events.length, 1); assert.deepEqual(await grade(), actualGrade);
  pass('submitted result ratings follow feedback, enforce correct/wrong ranges, skip unscored and unanswered items, and preserve actual grades and mistake review');

  await fresh('practice', `const q=KotobaContent.questions.find(q=>q.skill==='vocabulary');const a=KotobaEngine.createAttempt([q],'practice',{now:Date.now(),random:()=>.15});p={...p,attempts:[a],activeAttemptId:a.id};`);
  await waitFor('Boolean(document.querySelector(".quiz-card .options"))', 'live numeric answer shortcuts');
  assert.equal(await js(`document.querySelectorAll('.srs-ratings').length`), 0, 'Unsubmitted practice has no question recall grade');
  const liveAttempt = (await progress()).attempts[0], qid = liveAttempt.questionOrder[0], displayed = liveAttempt.optionOrders[qid];
  await js(`document.getElementById('main').focus()`);
  for (const number of [1,2,3,4]) { await press(String(number)); assert.equal((await progress()).attempts[0].answers[qid], displayed[number - 1], 'Numeric shortcut follows shuffled display order'); }
  const selected = (await progress()).attempts[0].answers[qid];
  for (const attrs of [{isComposing:true},{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true},{repeat:true}]) await js(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'1',bubbles:true,...${JSON.stringify(attrs)}}))`);
  assert.equal((await progress()).attempts[0].answers[qid], selected, 'IME, modifier and held-key events do not select an answer');
  await js(`document.querySelector('.options input').focus()`); await press('1'); assert.equal((await progress()).attempts[0].answers[qid], selected, 'Input focus keeps its native keyboard behavior');
  await js(`document.getElementById('main').focus()`); await press('1');
  const checkButton = await js(`([...document.querySelectorAll('.quiz-card button')].find(b=>b.textContent.trim()==='Check answer')).textContent`); assert.equal(checkButton, 'Check answer');
  await js(`([...document.querySelectorAll('.quiz-card button')].find(b=>b.textContent.trim()==='Check answer')).click()`);
  assert.ok(await js(`Boolean(document.querySelector('.quiz-card .feedback'))`)); assert.equal(await js(`document.querySelectorAll('.srs-ratings').length`), 0, 'Checking does not create a submitted recall rating');
  await js(`document.getElementById('main').focus()`); await press('2'); assert.equal((await progress()).attempts[0].answers[qid], displayed[0], 'Checked answers stay locked');
  pass('1–4 selects actual shuffled options while IME, modifiers, inputs, repeats and checked answers remain protected');

  await fresh('practice', `const q=KotobaContent.questions.find(q=>q.skill==='vocabulary');const a=KotobaEngine.createAttempt([q],'practice',{now:Date.now(),random:()=>.5});p={...p,attempts:[a],activeAttemptId:a.id};`);
  const beforeLeave = (await progress()).attempts[0]; await nav('settings'); await js(`document.getElementById('main').focus()`); await press('2');
  assert.deepEqual((await progress()).attempts[0].answers, beforeLeave.answers, 'Old quiz handlers cannot answer from another page');
  await nav('practice'); await js(`document.getElementById('main').focus()`); await press('3');
  assert.equal((await progress()).attempts[0].answers[beforeLeave.questionOrder[0]], beforeLeave.optionOrders[beforeLeave.questionOrder[0]][2]);
  await fresh('mock', `const q=KotobaContent.questions.find(q=>q.skill==='vocabulary');const a=KotobaEngine.createAttempt([q],'mock',{now:Date.now()-120_000,durationMinutes:1});p={...p,attempts:[a],activeAttemptId:a.id};`);
  await js(`document.getElementById('main').focus()`); await press('1');
  assert.deepEqual((await progress()).attempts[0].answers, {}, 'Expired mock cannot receive a numeric answer');
  assert.equal(await js(`document.querySelectorAll('.srs-ratings').length`), 0, 'Unanswered expired results cannot claim a recall quality');
  pass('quiz shortcuts stop on navigation and expiry and resume only in the active question');

  await fresh(); await flashcards();
  for (const width of [320,360,768,1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 360 }); await pause(100);
    await js(`if(document.getElementById('flashcard-display').dataset.side==='back')document.getElementById('flashcard-flip').click();window.scrollTo(0,document.getElementById('flashcard-display').getBoundingClientRect().top+scrollY+20)`);
    const shape = () => js(`(() => {const n=document.getElementById('flashcard-display'),r=n.getBoundingClientRect(),w=document.getElementById('flashcard-word');return {width:r.width,height:r.height,scroll:scrollY,documentHeight:document.documentElement.scrollHeight,font:getComputedStyle(w).fontSize,buttons:[...document.querySelectorAll('.srs-rating')].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,width:r.width,height:r.height};}),overflow:document.documentElement.scrollWidth>innerWidth};})()`);
    const front = await shape(); await clickId('flashcard-flip'); await pause(280); const back = await shape();
    for (const key of ['width','height','scroll','documentHeight']) assert.ok(Math.abs(front[key]-back[key])<1, `${width}px flip preserves ${key}`);
    assert.equal(front.font,back.font); assert.equal(back.overflow,false); assert.equal(back.buttons.length,6);
    for(const b of back.buttons){assert.ok(b.height>=44);assert.ok(b.x>=0&&b.x+b.width<=width+1, `${width}px quality button fits the viewport`);}
    assert.ok(await js(`(() => {const n=document.getElementById('flashcard-display');return n.scrollHeight<=n.clientHeight+1&&[...n.querySelectorAll('.flashcard-side')].filter(s=>s.getAttribute('aria-hidden')==='false').length===1;})()`), 'Card remains naturally sized with only its active face accessible');
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: true }); await pause(100);
  await js(`window.scrollTo(0,document.querySelector('.srs-ratings').getBoundingClientRect().top+scrollY-40)`);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'srs-flashcard-320.png'),Buffer.from(shot.data,'base64'));
  assert.deepEqual(await js(`window.__errors || []`), []);
  pass('all six mobile recall actions fit without card scrolling or front/back layout changes at four viewport widths');
}
