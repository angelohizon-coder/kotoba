// Browser checks using Chrome's DevTools Protocol and Node built-ins. No npm packages.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { runEnhancementChecks, runInterfacePolishChecks } from './check-ui-enhancements.mjs';
import { runStudyChecks } from './check-study-ui.mjs';
import { runAudioChecks } from './check-audio-ui.mjs';
import { runPhaseChecks } from './check-phase-ui.mjs';
import { runSrsChecks } from './check-srs-ui.mjs';
import { runDatasetChecks } from './check-dataset-ui.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = join(project, 'artifacts');
await mkdir(artifacts, {recursive:true});
const profile = await mkdtemp(join(artifacts,'browser-profile-'));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:5173';
let chrome;
let launchError;
let diagnostics='';
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
let socket;
let requests=new Map(); let sequence=0;
function send(method,params={}) {
  return new Promise((resolve,reject) => {
    const id=++sequence;
    const timeout=setTimeout(() => {requests.delete(id);reject(new Error(`${method} timed out`));},15000);
    requests.set(id,{resolve:result => {clearTimeout(timeout);resolve(result);},reject:error => {clearTimeout(timeout);reject(error);}});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function js(expression) {
  const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression,label) {
  for (let i=0;i<50;i++) {if (await js(expression)) return;await pause(100);}
  throw new Error(`Did not become ready: ${label}`);
}
async function goto(url) {await send('Page.navigate',{url});await waitFor('Boolean(window.KotobaContent && document.querySelector(".app-shell"))','application');}
async function click(label) {
  const ok=await js(`(() => {const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(label)}&&!x.disabled);if(!b)return false;b.click();return true;})()`);
  assert.ok(ok,`Enabled button: ${label}`);
}
async function nav(page) {
  await js(`document.querySelector('nav a[href="#${page}"]').click()`);
  // Compare settled card geometry after the deliberate 210ms menu transition.
  await pause(240);
}
const progress = () => js('JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY))');
const wordCardHeights = () => js('([...document.querySelectorAll(".vocab-card")].map(n=>{const r=n.getBoundingClientRect();return {height:r.height,top:r.top+scrollY};}))');
function sameWordCardHeights(before,after,label) {
  assert.equal(after.length,before.length,`${label}: card count stays fixed`);
  before.forEach((card,index)=>{for(const key of ['height','top'])assert.ok(Math.abs(card[key]-after[index][key])<1,`${label}: word card ${index+1} ${key} stays fixed`);});
}
let passed=0;
function pass(name) {passed++;console.log(`PASS ${name}`);}
try {
  chrome = spawn(chromePath, ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], {windowsHide:true,stdio:['ignore','ignore','pipe']});
  chrome.on('error', error => {launchError=error;});
  chrome.stderr.on('data',chunk => {diagnostics=(diagnostics+chunk.toString()).slice(-2500);});
  let port;
  for (let i=0;i<100;i++) {
    if (launchError) throw launchError;
    try {port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;} catch {}
    await pause(100);
  }
  if (!port) throw new Error('Chrome did not start. '+diagnostics);
  const endpoint=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json());
  socket=new WebSocket(endpoint.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event => {
    const data=JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') console.error('Browser:', data.params.args.map(arg => arg.value || arg.description).join(' '));
    const pending=requests.get(data.id);
    if (pending) {requests.delete(data.id);data.error ? pending.reject(new Error(data.error.message)) : pending.resolve(data.result);}
  });
  await send('Page.enable');await send('Runtime.enable');
  // Headless tabs need active-page focus to emit the same keyboard focus events as a browser window.
  await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__errors=[];addEventListener('error',e=>window.__errors.push(e.message));Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],addEventListener(){},removeEventListener(){},cancel(){},speak(){throw new Error('Test playback failure');}}});`});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await goto(baseUrl);
  if (process.argv.includes('--dataset-only')) {
    await runDatasetChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});
    console.log(`${passed} expanded dataset journeys passed.`);
  } else if (process.argv.includes('--phase-only')) {
    await runPhaseChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});
    console.log(`${passed} local and offline journeys passed.`);
  } else if (process.argv.includes('--srs-only')) {
    await runSrsChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});
    console.log(`${passed} recall scheduling journeys passed.`);
  } else if (process.argv.includes('--audio-only')) {
    await runAudioChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});
    console.log(`${passed} focused audio journeys passed.`);
  } else if (process.argv.includes('--study-only')) {
    await runStudyChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});
    console.log(`${passed} focused study journeys passed.`);
  } else if (process.argv.includes('--polish-only')) {
    await runInterfacePolishChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});
    console.log(`${passed} focused interface journeys passed.`);
  } else if (process.argv.includes('--enhancements-only') || process.argv.includes('--widgets-only')) {
    await runEnhancementChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl,onlyWidgets:process.argv.includes('--widgets-only')});
    console.log(`${passed} focused browser journeys passed.`);
  } else {
  await js('localStorage.clear();location.reload()');await pause(150);await waitFor('Boolean(window.KotobaContent && document.querySelector(".app-shell"))','fresh learner');
  assert.equal((await progress()).attempts.length,0);
  assert.equal(await js('document.querySelectorAll("nav a").length'),9);
  assert.deepEqual(await js('[...document.querySelectorAll("#home-widgets > [data-widget]")].map(n=>n.dataset.widget)'),['path','goal','review']);
  assert.equal(await js('document.querySelectorAll(".topic-card").length'),0,'Optional topic widgets do not clutter the default home');
  assert.ok(await js('KotobaContent.vocabulary.length>=430 && KotobaContent.grammar.length>=100 && KotobaContent.questions.length>=800'));
  assert.deepEqual(await js('window.__errors'),[]);
  pass('fresh dashboard, original lesson path, and no runtime errors');
  const desktop=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(join(artifacts,'desktop.png'),Buffer.from(desktop.data,'base64'));
  async function showAllWidgets() {
    await js('(()=>{const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));p.settings.dashboardWidgets=KotobaEngine.DASHBOARD_WIDGET_IDS.slice();localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));})()');
    await send('Page.reload');await pause(240);await waitFor('Boolean(document.querySelector(".app-shell"))','optional dashboard widgets');
  }
  await showAllWidgets();

  await nav('vocabulary');
  assert.equal(await js('document.querySelectorAll(".vocab-card").length'),24);
  const closedWordHeights=await wordCardHeights();
  await js('document.querySelectorAll(".vocab-card button")[1].click()');
  sameWordCardHeights(closedWordHeights,await wordCardHeights(),'Desktop word definition');
  assert.equal((await progress()).studyEvents.length,1);
  await click('Hide');
  sameWordCardHeights(closedWordHeights,await wordCardHeights(),'Desktop hidden word definition');
  await js('document.querySelectorAll(".vocab-card button")[1].click()');
  assert.equal((await progress()).studyEvents.length,1);
  assert.ok(await js('document.querySelector(".vocab-card").textContent.includes("Studied today")'));
  await js('document.querySelector(".bookmark-button").click()');
  assert.equal((await progress()).bookmarks.length,1);
  assert.ok(await js('document.querySelector(".bookmark-button[aria-pressed=true]").textContent.includes("Saved")'),'A saved bookmark has a visible Saved label');
  const savedBookmarkId=await js('document.querySelector(".bookmark-button[aria-pressed=true]").id');
  const completedWordTask=await js('document.querySelector(".vocab-grid input[data-task]").dataset.task');
  await js('document.querySelector(".task-completion input").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space'});
  assert.ok((await progress()).completedTasks.includes(completedWordTask),'Completion pill works from the keyboard and saves the completed item');
  assert.notEqual(await js('document.querySelector(".vocab-grid input[data-task]").dataset.task'),completedWordTask,'Finished words move behind unfinished words');
  assert.equal(await js('document.querySelector(".task-completion-content").getAttribute("aria-hidden")'),'true');
  const vocabControls=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'vocabulary-controls.png'),Buffer.from(vocabControls.data,'base64'));
  await send('Page.reload');await pause(180);await waitFor('Boolean(document.querySelector(".vocab-card"))','saved bookmark indicator');
  assert.ok((await progress()).completedTasks.includes(completedWordTask),'Completion survives reload');
  await click('Bookmarks');
  assert.ok(await js('document.querySelector(".vocab-grid input[data-task]").checked && document.querySelector(".task-completion").textContent.includes("Completed")'),'Completed bookmarked words remain available in their filtered view');
  await js('document.querySelector(".vocab-grid input[data-task]").click()');
  await click('Word cards');
  assert.ok(await js(`document.getElementById(${JSON.stringify(savedBookmarkId)}).getAttribute('aria-pressed')==='true' && document.getElementById(${JSON.stringify(savedBookmarkId)}).textContent.includes('Saved')`),'Saved bookmark indicator survives reload');
  await js(`document.getElementById(${JSON.stringify(savedBookmarkId)}).click()`);
  assert.equal((await progress()).bookmarks.length,0);
  assert.equal(await js(`document.getElementById(${JSON.stringify(savedBookmarkId)}).textContent.trim()`),'Save');
  await js(`document.getElementById(${JSON.stringify(savedBookmarkId)}).click()`);
  await js(`(()=>{const n=document.querySelector('input[placeholder^="Search word"]');n.focus();n.value='予定';n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  assert.ok(await js('document.querySelectorAll(".vocab-card").length>=1 && document.querySelector(".vocab-card").textContent.includes("予定")'));
  assert.equal(await js('document.activeElement.value'),'予定');
  pass('word reveal, visible saved bookmarks, keyboard completion, Japanese search, and retained focus');

  await nav('grammar');await click('Practice this pattern');
  const startState=await progress();const a=startState.attempts.at(-1);
  const qid=a.questionOrder[0];
  await js(`(()=>{const q=KotobaContent.questions.find(q=>q.id===${JSON.stringify(qid)});const wrong=q.options.find(o=>o.id!==q.correctOptionId);document.querySelector('input[value="'+wrong.id+'"]').click();})()`);
  await click('Check answer');
  assert.ok(await js('document.querySelector(".feedback").textContent.includes("Let’s review this one")'));
  assert.equal((await progress()).attempts.at(-1).checkedIds.length,1);
  for (let i=1;i<a.questionOrder.length;i++) {await click('Next');await js(`(()=>{const a=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)).attempts.at(-1);const q=KotobaContent.questions.find(q=>q.id===a.questionOrder[${i}]);document.querySelector('input[value="'+q.correctOptionId+'"]').click();})()`);await click('Check answer');}
  await click('Submit practice');
  assert.equal((await progress()).attempts.at(-1).status,'submitted');
  assert.equal(Object.keys((await progress()).reviews).length,1);
  await click('Finish review');await nav('review');await click('Practice early');
  await js('(()=>{const a=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)).attempts.at(-1);const q=KotobaContent.questions.find(q=>q.id===a.questionOrder[0]);document.querySelector(\'input[value="\'+q.correctOptionId+\'"]\').click();})()');
  await click('Check answer');await click('Submit practice');await click('Finish review');
  assert.equal(Object.values((await progress()).reviews)[0].streak,0);
  pass('canonical quiz answers, explanations, submission, mistakes, and early retry schedule');

  // A saved legacy short mock still resumes after the new full-test feature ships.
  await js('(()=>{const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));const pool=[["vocabulary",3],["kanji",2],["grammar",3],["reading",4]].flatMap(([skill,count])=>KotobaContent.questions.filter(q=>!q.jlptLevel&&q.skill===skill).slice(0,count));const a=KotobaEngine.createAttempt(pool,"mock",{durationMinutes:15});p.attempts.push(a);p.activeAttemptId=a.id;localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));location.hash="mock";location.reload();})()');
  await pause(200);await waitFor('Boolean(document.querySelector(".quiz-card"))','legacy short mock');
  const before=await progress();const mock=before.attempts.at(-1);
  await js(`document.querySelector('input[value="${mock.optionOrders[mock.questionOrder[0]][0]}"]').click()`);
  await send('Page.reload');await pause(200);await waitFor('Boolean(document.querySelector(".quiz-card"))','resumed mock');
  const resumed=(await progress()).attempts.at(-1);
  assert.deepEqual(resumed.questionOrder,mock.questionOrder);assert.deepEqual(resumed.optionOrders,mock.optionOrders);
  assert.equal(Object.keys(resumed.answers).length,1);
  assert.equal(await js('document.querySelectorAll(".feedback,.translation,.transcript").length'),0);
  await nav('grammar');
  assert.equal(await js('document.querySelectorAll(".lesson-detail,.feedback,.japanese-word").length'),0);
  await click('Resume mock test');
  await nav('settings');
  assert.equal(await js('[...document.querySelectorAll("button")].filter(n=>n.textContent==="View results").length'),0);
  await click('Resume mock test');
  // A legitimately expired persisted attempt tests reload and background-route expiry in seconds.
  await js('(()=>{const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));const a=p.attempts.at(-1);a.createdAt=new Date(Date.now()-120000).toISOString();a.deadline=Date.now()+1000;localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));location.hash="dashboard";location.reload();})()');
  await pause(1800);await waitFor('Boolean(document.querySelector(".app-shell"))','background deadline');
  const expired=await progress();assert.equal(expired.attempts.at(-1).status,'submitted');assert.equal(expired.attempts.length,before.attempts.length);
  await nav('mock');assert.ok(await js('document.querySelector(".result-summary").textContent.includes("11 unanswered")'));
  await send('Page.reload');await pause(200);await waitFor('Boolean(document.querySelector(".result-summary"))','single submitted result');
  assert.equal((await progress()).attempts.length,before.attempts.length);
  await click('Finish review');
  pass('saved shuffles and answers, withheld keys, background deadline, unanswered score, and no duplicate submission');

  await nav('settings');
  const preserved=await progress();
  await js(`(()=>{const input=document.getElementById('progress-import');const dt=new DataTransfer();dt.items.add(new File(['{"schemaVersion":99}'],'bad.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await pause(100);assert.deepEqual(await progress(),preserved);
  assert.ok(await js('document.querySelector(".notice[role=status]").textContent.includes("Invalid progress")'));
  await click('Reset progress');assert.equal(await js('document.querySelectorAll("[role=dialog]").length'),1);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  assert.equal(await js('document.querySelectorAll("[role=dialog]").length'),0);assert.deepEqual(await progress(),preserved);
  await click('View results');assert.ok(await js('Boolean(document.querySelector(".result-summary"))'));await click('Finish review');
  pass('invalid import preserves progress, reset Escape cancels, and history results open');

  await js(`(()=>{const input=document.getElementById('progress-import');const dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(JSON.stringify(preserved))}],'good.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor('Boolean(document.querySelector("[role=dialog]"))','valid import confirmation');
  await click('Cancel');assert.deepEqual(await progress(),preserved);
  await js(`(()=>{const input=document.getElementById('progress-import');const dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(JSON.stringify(preserved))}],'good.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor('Boolean(document.querySelector("[role=dialog]"))','replacement confirmation');
  await click('Replace progress');assert.deepEqual(await progress(),preserved);
  await click('Reset progress');await click('Reset all progress');
  assert.equal((await progress()).studyEvents.length,0);assert.equal((await progress()).attempts.length,0);
  await nav('vocabulary');assert.equal(await js('document.querySelectorAll(".word-face[aria-hidden=false] .word-reading").length'),0);
  pass('valid import cancel/replace and confirmed reset clear progress and revealed cards');

  await nav('listening');await pause(3300);
  assert.ok(await js('document.querySelector(".audio-status").textContent.includes("No Japanese voice")'));
  assert.equal(await js('[...document.querySelectorAll("button")].find(x=>x.textContent==="Play / replay").disabled'),true);
  await click('Study the script instead');await click('Hide script');await nav('dashboard');await nav('listening');
  await js(`(()=>{const key=KotobaStorage.STORAGE_KEY;const p=JSON.parse(localStorage.getItem(key));p.contentVersion='2026.10.1';localStorage.setItem(key,JSON.stringify(p));const seen=JSON.parse(sessionStorage.getItem('kotoba-n3-seen-scripts-'+KotobaContent.CONTENT_VERSION));sessionStorage.setItem('kotoba-n3-seen-scripts-2026.10.1',JSON.stringify(seen));sessionStorage.removeItem('kotoba-n3-seen-scripts-'+KotobaContent.CONTENT_VERSION);})()`);
  await send('Page.reload');await pause(200);await waitFor('Boolean(document.querySelector(".audio-player"))','script exposure reload');
  assert.equal((await progress()).contentVersion,await js('KotobaContent.CONTENT_VERSION'));
  await click('Start script-study questions');
  assert.equal((await progress()).attempts.at(-1).listeningAccess,'script');
  const script=(await progress()).attempts.at(-1);
  for (let i=0;i<script.questionOrder.length-1;i++) await click('Next');
  await click('Submit practice');
  assert.ok(await js('document.querySelector(".result-score").textContent.includes("Unscored")'));
  await click('Finish review');
  pass('missing speech voice, hidden transcript classification, and unscored script study');

  await nav('listening');
  await js(`(()=>{const synth=window.speechSynthesis;synth.getVoices=()=>[{lang:'ja-JP',name:'Test voice'}];synth.speak=u=>u.onerror({error:'synthesis-failed'});const node=KotobaAudio.render({cleanup:()=>{}},KotobaContent.listening[0],()=>{window.__audioFailed=true;});document.querySelector('.audio-player').replaceWith(node);})()`);
  await click('Play / replay');
  assert.ok(await js('window.__audioFailed===true && document.querySelector(".audio-status").textContent.includes("Playback failed")'));
  // Deny localStorage reads/writes, then verify the real app remains usable and accurately unsaved.
  const blockedScript=await send('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage denied','SecurityError')}});`});
  await send('Page.reload');await pause(200);await waitFor('Boolean(document.querySelector(".app-shell"))','blocked storage fallback');
  assert.ok(await js('document.querySelector(".status-chip").textContent.includes("Storage needs attention")'));
  await nav('vocabulary');await js('document.querySelectorAll(".vocab-card button")[1].click()');
  assert.ok(await js('document.querySelector(".word-face[aria-hidden=false] .word-reading")!==null'));
  await nav('settings');await click('Use current progress and retry saving');
  assert.ok(await js('document.querySelector(".status-chip").textContent.includes("Unsaved")'));
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:blockedScript.identifier});
  await send('Page.reload');await pause(200);await waitFor('Boolean(document.querySelector(".app-shell"))','storage restored');
  pass('synthesis failure feedback and usable, accurately unsaved blocked-storage state');

  await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
  for (const id of ['dashboard','vocabulary','grammar','reading','listening','practice','mock','review','settings']) {
    await nav(id);
    assert.ok(await js('document.documentElement.scrollWidth<=window.innerWidth+1'),`No horizontal overflow on ${id}`);
  }
  await nav('vocabulary');
  const mobileWords=await wordCardHeights();await click('Reveal card');
  sameWordCardHeights(mobileWords,await wordCardHeights(),'Mobile word definition');
  await click('Hide');sameWordCardHeights(mobileWords,await wordCardHeights(),'Mobile hidden word definition');
  await nav('dashboard');
  const mobile=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(join(artifacts,'mobile.png'),Buffer.from(mobile.data,'base64'));
  await js('document.querySelector(".skip-link").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter'});
  assert.equal(await js('document.activeElement.id'),'main');
  pass('all nine screens at 360px and keyboard skip navigation');

  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await nav('dashboard');
  await showAllWidgets();
  assert.equal(await js('document.querySelectorAll(".route-card").length'),4);
  await click('Study grammar');assert.equal(await js('document.getElementById("grammarTopic").value'),'all');
  await nav('dashboard');await click('Study in context');
  assert.equal(await js('document.getElementById("readingTopic").value'),'daily');
  await js('document.querySelector(".lesson-detail .inline-actions button").click()');
  assert.equal(await js('document.getElementById("grammarTopic").value'),'daily');
  await nav('dashboard');await click('Open learning path');
  assert.ok(await js('Boolean(document.getElementById("integrated-path"))'));
  await js('document.querySelector(\'button[data-lesson-id="n3-review-1"]\').click()');
  await js('document.querySelector(\'input[data-task="path:n3-review-1"]\').click()');
  assert.ok((await progress()).completedTasks.includes('path:n3-review-1'));
  assert.equal((await progress()).settings.pathResume,'n3-review-1');
  await nav('dashboard');await click('Try a full mock');assert.ok(await js('Boolean(document.getElementById("start-full-mock"))'));
  await nav('dashboard');
  pass('optional textbook approaches, contextual grammar links, and cumulative integrated review');
  await js('document.querySelector(\'#home-widgets > [data-widget="topics"]\').scrollIntoView({block:"start"})');
  const mapShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(join(artifacts,'course-map.png'),Buffer.from(mapShot.data,'base64'));
  await js('[...document.querySelectorAll(".topic-card")].find(b=>b.querySelector("strong").textContent==="Food & cooking").click()');
  assert.equal(await js('document.getElementById("vocabularyTopic").value'),'food');
  assert.ok(await js('[...document.querySelectorAll(".vocab-card .word-face[aria-hidden=false] .japanese-word")].every(n=>KotobaContent.vocabulary.some(v=>v.word===n.textContent&&v.topicId==="food"))'));
  await js('(()=>{const s=document.getElementById("vocabularyTopic");s.value="all";s.dispatchEvent(new Event("change",{bubbles:true}));})()');
  const firstWord=await js('document.querySelector(".japanese-word").textContent');
  await click('Next cards');assert.notEqual(await js('document.querySelector(".japanese-word").textContent'),firstWord);
  await click('Previous cards');assert.equal(await js('document.querySelector(".japanese-word").textContent'),firstWord);
  await nav('practice');
  await js('(()=>{const s=document.getElementById("practice-skill");s.value="grammar";s.dispatchEvent(new Event("change",{bubbles:true}));const t=document.getElementById("practice-topic");t.value="all";t.dispatchEvent(new Event("change",{bubbles:true}));const f=document.getElementById("practice-format");f.value="grammar-order";f.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await click('Start practice');
  assert.ok((await progress()).attempts.at(-1).questionOrder.every(id=>id.startsWith('qgx-')||id==='q-g-03'||id==='q-g-12'));
  assert.ok(await js('document.querySelector(".question-prompt").textContent.includes("★")'));
  // Submit the saved untimed session through its real engine before continuing the rest of the checks.
  await js('(()=>{let p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));const a=p.attempts.at(-1);p=KotobaEngine.submitAttempt(p,a.id,KotobaQuiz.questionMap);p=KotobaEngine.markReviewed(p,a.id);localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));location.hash="dashboard";location.reload();})()');
  await pause(200);await waitFor('Boolean(document.querySelector(".app-shell"))','expanded practice saved');
  pass('18-topic coverage links, paginated large lexicon, and question-category practice');

  await nav('vocabulary');await click('Flashcards');
  assert.equal(await js('document.getElementById("flashcard-display").dataset.side'),'front');
  const flashWidth = () => js('(()=>{const s=document.querySelector(".flashcard-shell").getBoundingClientRect(),c=document.getElementById("flashcard-display").getBoundingClientRect(),a=document.querySelector(".flashcard-actionbar").getBoundingClientRect();return {shell:s.width,card:c.width,left:s.left,shellHeight:s.height,cardHeight:c.height,actionsTop:a.top,pageHeight:document.documentElement.scrollHeight};})()');
  const sameFlashWidth=(before,after,label)=>{for(const key of Object.keys(before))assert.ok(Math.abs(before[key]-after[key])<1,`${label}: ${key} stays fixed while flipping (${before[key]} → ${after[key]})`);};
  const vocabularyFrontWidth=await flashWidth();
  const cardId=await js('document.getElementById("flashcard-display").dataset.cardId');
  const beforeStudy=(await progress()).studyEvents.length;
  const studiedBeforeFlip=await js(`JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)).studyEvents.some(e=>e.type==="vocabulary"&&e.contentId===${JSON.stringify(cardId)}&&KotobaEngine.localDateKey(new Date(e.at))===KotobaEngine.localDateKey())`);
  await click('Flip card');
  assert.equal(await js('document.getElementById("flashcard-display").dataset.side'),'back');
  sameFlashWidth(vocabularyFrontWidth,await flashWidth(),'Desktop vocabulary');
  assert.equal((await progress()).studyEvents.length,beforeStudy+(studiedBeforeFlip?0:1),'Revealing a flashcard records one study action per word per day');
  await click('Got it');assert.ok((await progress()).completedTasks.includes('vocabulary:'+cardId));
  await js('document.getElementById("flashcard-deck").value="kanji";document.getElementById("flashcard-deck").dispatchEvent(new Event("change",{bubbles:true}));');
  assert.equal(await js('document.getElementById("flashcard-display").dataset.deckType'),'kanji');
  const kanjiFrontWidth=await flashWidth();
  await click('Flip card');assert.ok(await js('document.getElementById("flashcard-display").textContent.includes("Readings vary by word")'));
  sameFlashWidth(kanjiFrontWidth,await flashWidth(),'Desktop kanji');
  await pause(220);
  const flashShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'flashcards.png'),Buffer.from(flashShot.data,'base64'));
  await js('document.getElementById("flashcard-flip").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space'});
  assert.equal(await js('document.getElementById("flashcard-display").dataset.side'),'front');
  await nav('grammar');
  const taskId=await js('document.querySelector(".lesson-detail input[data-task]").dataset.task');
  await js('document.querySelector(".lesson-detail input[data-task]").click()');assert.ok((await progress()).completedTasks.includes(taskId));
  await send('Page.reload');await pause(200);await waitFor('Boolean(document.querySelector(".lesson-detail input[data-task]"))','saved completion');
  assert.ok((await progress()).completedTasks.includes(taskId));
  await nav('settings');await nav('dashboard');assert.ok((await progress()).completedTasks.includes('path:n3-review-1'));
  pass('vocabulary/kanji flashcards with stable card and panel dimensions, keyboard controls, and saved completion marks');

  await nav('practice');assert.equal(await js('document.getElementById("prioritize-weak").checked'),true);
  const weakBefore=await progress();
  await click('Start practice');
  const weakRun=(await progress()).attempts.at(-1);
  assert.equal(weakRun.questionOrder.length,5);
  assert.ok(weakRun.questionOrder.some(id=>weakBefore.reviews[id]&&!weakBefore.reviews[id].mastered));
  await js('(()=>{let p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));const a=p.attempts.at(-1);p=KotobaEngine.markReviewed(KotobaEngine.submitAttempt(p,a.id,KotobaQuiz.questionMap),a.id);localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));location.hash="dashboard";location.reload();})()');
  await pause(200);await waitFor('Boolean(document.querySelector(".app-shell"))','weak-point practice');
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
  await js('[...document.querySelectorAll(".mobile-bottom-nav button")].find(b=>b.textContent==="Menu").click()');
  assert.ok(await js('document.querySelector(".sidebar").classList.contains("menu-open")'));
  assert.equal(await js('document.getElementById("bottom-menu-toggle").getAttribute("aria-expanded")'),'true');
  await nav('listening');assert.equal(await js('document.querySelector(".sidebar").classList.contains("menu-open")'),false);
  assert.ok(await js('KotobaContent.listening.length>=30'));
  await js('[...document.querySelectorAll(".mobile-bottom-nav button")].find(b=>b.textContent==="Cards").click()');
  // Like nav(), compare flips after the intentional route-entry motion has settled.
  await pause(240);
  assert.ok(await js('Boolean(document.getElementById("flashcard-display"))'));
  await js('(()=>{const a=document.querySelector(".flashcard-actionbar").getBoundingClientRect(),nav=document.querySelector(".mobile-bottom-nav").getBoundingClientRect();window.scrollBy({top:Math.max(0,a.bottom-nav.top+12),behavior:"instant"});})()');
  assert.ok(await js('document.documentElement.scrollWidth<=window.innerWidth+1'));
  assert.ok(await js('document.getElementById("flashcard-display").getBoundingClientRect().top<document.querySelector(".mobile-bottom-nav").getBoundingClientRect().top'));
  assert.ok(await js('document.getElementById("flashcard-flip").getBoundingClientRect().bottom<=document.querySelector(".mobile-bottom-nav").getBoundingClientRect().top+1'),'Mobile flip control stays above quick navigation');
  await js('document.getElementById("flashcard-word").scrollIntoView({block:"center",behavior:"instant"})');
  assert.ok(await js('(()=>{const word=document.getElementById("flashcard-word"),range=document.createRange();range.selectNodeContents(word);const r=range.getBoundingClientRect(),card=document.getElementById("flashcard-display").getBoundingClientRect(),actions=document.querySelector(".flashcard-actionbar").getBoundingClientRect(),nav=document.querySelector(".mobile-bottom-nav").getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=card.top&&r.bottom<=card.bottom&&r.left>=card.left&&r.right<=card.right&&r.bottom<=actions.top+1&&r.bottom<=nav.top+1&&!!document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest("#flashcard-word");})()'),'Complete Japanese front word is visible and unobscured above the controls');
  const mobileFlash=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'flashcards-mobile.png'),Buffer.from(mobileFlash.data,'base64'));
  const mobileFrontWidth=await flashWidth();
  await click('Flip card');sameFlashWidth(mobileFrontWidth,await flashWidth(),'Mobile kanji');
  await click('Flip to front');sameFlashWidth(mobileFrontWidth,await flashWidth(),'Mobile kanji return');
  await js('document.getElementById("flashcard-deck").value="vocabulary";document.getElementById("flashcard-deck").dispatchEvent(new Event("change",{bubbles:true}));');
  const mobileWordFrontWidth=await flashWidth();
  await click('Flip card');sameFlashWidth(mobileWordFrontWidth,await flashWidth(),'Mobile vocabulary');
  assert.ok(await js('(()=>{const card=document.getElementById("flashcard-display");card.scrollTop=100;return card.scrollTop===0&&card.scrollHeight<=card.clientHeight+1&&getComputedStyle(card).overflowY==="visible";})()'),'Long mobile answers use natural card height with no internal scrollbar');
  await js('document.querySelector(".flashcard-side[aria-hidden=false] .flashcard-translation").scrollIntoView({block:"center",behavior:"instant"})');
  assert.ok(await js('(()=>{const n=document.querySelector(".flashcard-side[aria-hidden=false] .flashcard-translation"),r=n.getBoundingClientRect(),card=document.getElementById("flashcard-display").getBoundingClientRect(),nav=document.querySelector(".mobile-bottom-nav").getBoundingClientRect();return r.top>=0&&r.bottom<=nav.top&&r.bottom<=card.bottom&&Boolean(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest(".flashcard-translation"));})()'),'Long mobile examples remain readable with normal page scrolling');
  const mobileWordBackWidth=await flashWidth();
  await click('Flip to front');
  sameFlashWidth(mobileWordBackWidth,await flashWidth(),'Mobile vocabulary return');
  // Include a narrow desktop where the answer can introduce a page scrollbar.
  await send('Emulation.setDeviceMetricsOverride',{width:900,height:800,deviceScaleFactor:1,mobile:false});
  const tabletFrontWidth=await flashWidth();
  await click('Flip card');sameFlashWidth(tabletFrontWidth,await flashWidth(),'Narrow desktop vocabulary');
  await click('Flip to front');
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
  await js('document.getElementById("flashcard-options").open=true;document.querySelector(".flashcard-filters").scrollIntoView({block:"center"});');
  const dropdownShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'flashcard-dropdowns-mobile.png'),Buffer.from(dropdownShot.data,'base64'));
  pass('weak-point practice controls, expanded listening, and mobile quick navigation');

  async function glossaryAttempt(ids, type = 'practice') {
    await js(`(()=>{const questions=${JSON.stringify(ids)}.map(id=>KotobaContent.questions.find(q=>q.id===id));const a=KotobaEngine.createAttempt(questions,${JSON.stringify(type)},{random:()=>0});const p=KotobaEngine.initialProgress();p.attempts=[a];p.activeAttemptId=a.id;localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));location.hash=${JSON.stringify(type === 'mock' ? 'mock' : 'practice')};location.reload();})()`);
    await pause(200);await waitFor('Boolean(document.querySelector(".quiz-card"))','word-help practice');
    await pause(240); // Hover coordinates belong to the settled page transition.
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await glossaryAttempt(['q-k-02']);
  assert.equal(await js('document.querySelector(".question-prompt").textContent'),await js('KotobaContent.questions.find(q=>q.id==="q-k-02").prompt'));
  assert.ok(await js('[...document.querySelectorAll(".gloss-word")].some(n=>n.textContent==="予約")'));
  assert.equal(await js('[...document.querySelectorAll(".gloss-word")].some(n=>n.textContent==="確認")'),false);
  assert.equal(await js('document.querySelectorAll(".options .gloss-word").length'),0);
  const untouched=await progress();
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
  await js('document.querySelector(".gloss-word").scrollIntoView({block:"center",behavior:"instant"});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const hoverPoint=await js('(()=>{const n=document.querySelector(".gloss-word"),r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()');
  assert.ok(await js(`document.elementFromPoint(${hoverPoint.x},${hoverPoint.y})?.closest('.gloss-word')`),'Settled hover target is visible and receives pointer input');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...hoverPoint});
  await waitFor('Boolean(document.querySelector(".gloss-tooltip:not([hidden])"))','hover definition');
  assert.ok(await js('document.querySelector(".gloss-tooltip-reading").textContent==="よやく" && document.querySelector(".gloss-tooltip-meaning").textContent.includes("reservation")'));
  assert.ok(await js('document.getElementById(document.querySelector(".gloss-word").getAttribute("aria-describedby"))?.getAttribute("role")==="tooltip"'));
  const glossShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'practice-definitions.png'),Buffer.from(glossShot.data,'base64'));
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  assert.equal(await js('document.querySelectorAll(".gloss-tooltip:not([hidden])").length'),0);
  await js('document.querySelector(".gloss-word").focus()');
  assert.equal(await js('document.querySelectorAll(".gloss-tooltip:not([hidden])").length'),1);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  assert.equal(await js('document.activeElement.classList.contains("gloss-word")'),true);
  assert.deepEqual(await progress(),untouched);
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
  await js('document.querySelector(".gloss-word").click()');
  assert.equal(await js('document.querySelectorAll(".gloss-tooltip:not([hidden])").length'),1);
  assert.ok(await js('(()=>{const r=document.querySelector(".gloss-tooltip").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1;})()'),'Mobile definition fits the viewport');
  const mobileGlossShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'practice-definitions-mobile.png'),Buffer.from(mobileGlossShot.data,'base64'));
  await js('document.querySelector(".question-prompt").click()');
  assert.equal(await js('document.querySelectorAll(".gloss-tooltip:not([hidden])").length'),0);
  await js('document.querySelector(".gloss-word").click()');
  assert.deepEqual(await progress(),untouched);
  const choicePoint=await js('(()=>{const n=document.querySelector(\'input[value="q-k-02-a"]\').closest("label");n.scrollIntoView({block:"center"});const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...choicePoint,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',...choicePoint,button:'left',clickCount:1});
  assert.equal(await js('document.querySelectorAll(".gloss-tooltip:not([hidden])").length'),0);
  assert.equal(await js('document.querySelectorAll(".gloss-tooltip").length'),1);
  await click('Check answer');
  assert.ok(await js('[...document.querySelectorAll(".question-prompt .gloss-word")].some(n=>n.textContent==="確認")'));
  assert.ok(await js('document.querySelector(".feedback").textContent.includes("Correct")'));
  await glossaryAttempt(['q-r-01','q-r-02']);
  assert.equal(await js('[...document.querySelectorAll(".passage-body .gloss-word")].some(n=>["変更","予定","公園","都合","連絡"].includes(n.textContent))'),false);
  await glossaryAttempt(['q-k-02'],'mock');
  assert.equal(await js('document.querySelectorAll(".gloss-word,.gloss-tooltip,.word-help-note").length'),0);
  await glossaryAttempt(['q-g-04']);
  await js('document.querySelector(".gloss-word").focus()');
  const previousGlossId=await js('document.querySelector(".gloss-tooltip").id');
  await nav('dashboard');
  assert.equal(await js(`Boolean(document.getElementById(${JSON.stringify(previousGlossId)}))`),false,'Navigation disposes the previous practice tooltip');
  assert.equal(await js('document.querySelectorAll(".gloss-tooltip:not([hidden])").length'),0,'The new Learn reading help starts closed');
  assert.deepEqual(await js('window.__errors'),[]);
  pass('safe background-word definitions, hover/focus/tap, shared clues, mock isolation, and cleanup');

  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const beforeTheme=await progress();
  assert.equal(await js('document.documentElement.dataset.theme'),'light');
  await js('document.getElementById("theme-toggle").click()');
  assert.equal(await js('document.documentElement.dataset.theme'),'dark');
  const darkProgress=await progress();
  assert.deepEqual(darkProgress,{...beforeTheme,settings:{...beforeTheme.settings,theme:'dark'}},'Changing appearance leaves learning progress and active quiz untouched');
  await send('Page.reload');await pause(180);await waitFor('Boolean(document.querySelector(".app-shell"))','saved dark appearance');
  assert.equal(await js('document.documentElement.dataset.theme'),'dark');
  assert.equal(await js('document.querySelector(\'meta[name="theme-color"]\').content'),'#10222a');
  assert.deepEqual(await progress(),darkProgress);
  await nav('dashboard');
  await waitFor('document.querySelector(".hero-art").complete && document.querySelector(".hero-art").naturalWidth>0','new mascot image');
  assert.ok(await js('document.querySelector(".hero-art").alt.includes("Momo")'));
  const darkDesktop=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'desktop-dark.png'),Buffer.from(darkDesktop.data,'base64'));
  for (const screen of ['dashboard','vocabulary','grammar','reading','listening','practice','mock','review','settings']) {
    await nav(screen);
    assert.equal(await js('document.documentElement.dataset.theme'),'dark');
    assert.ok(await js('document.documentElement.scrollWidth<=innerWidth+1'),`Dark ${screen} fits desktop`);
    assert.ok(await js('getComputedStyle(document.body).backgroundColor!=="rgb(255, 255, 255)"'),`Dark ${screen} uses the dark canvas`);
  }
  assert.equal(await js('document.getElementById("theme-dark").getAttribute("aria-pressed")'),'true');
  const darkSettings=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'settings-dark.png'),Buffer.from(darkSettings.data,'base64'));
  await click('Reset progress');
  const darkModal=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'modal-dark.png'),Buffer.from(darkModal.data,'base64'));
  await click('Cancel');
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
  for (const screen of ['dashboard','vocabulary','grammar','reading','listening','practice','mock','review','settings']) {
    await nav(screen);
    assert.ok(await js('document.documentElement.scrollWidth<=innerWidth+1'),`Dark ${screen} fits mobile`);
    const toggle=await js('(()=>{const r=document.getElementById("theme-toggle").getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};})()');
    assert.ok(toggle.width>0&&toggle.left>=0&&toggle.right<=360,`Theme toggle is reachable on mobile ${screen}`);
  }
  await nav('dashboard');await js('window.scrollTo({top:0,behavior:"instant"})');
  const darkMobile=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'mobile-dark.png'),Buffer.from(darkMobile.data,'base64'));
  await nav('practice');
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:400,deviceScaleFactor:1,mobile:true});
  const offscreenWord=await js('(()=>{window.scrollTo({top:0,behavior:"instant"});const n=document.querySelector(".gloss-word");const r=n.getBoundingClientRect();return r.top>=innerHeight||r.bottom<=0;})()');
  assert.equal(offscreenWord,true,'Dark mobile background word begins outside the viewport');
  await pause(100);
  await js('document.querySelector(".gloss-word").focus()');
  await pause(220);
  const keyboardHelp=await js('(()=>{const n=document.querySelector(".gloss-word");const t=document.getElementById(n.getAttribute("aria-describedby"));return {focused:document.activeElement===n,open:Boolean(t&&!t.hidden),scrollY,anchor:n.getBoundingClientRect().toJSON(),viewport:{width:visualViewport.width,height:visualViewport.height,top:visualViewport.offsetTop}};})()');
  assert.ok(keyboardHelp.focused&&keyboardHelp.open,`Keyboard definition remains open after automatic scrolling: ${JSON.stringify(keyboardHelp)}`);
  assert.ok(await js('(()=>{const r=document.querySelector(".gloss-tooltip").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})()'),'Dark mobile definition fits the viewport');
  await js('window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');await pause(100);
  assert.equal(await js('document.querySelectorAll(".gloss-tooltip:not([hidden])").length'),0,'Definition closes when its focused word scrolls out of view');
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
  await nav('practice');await js('document.querySelector(".gloss-word").focus()');await pause(220);
  const darkPractice=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'practice-dark.png'),Buffer.from(darkPractice.data,'base64'));
  await nav('settings');await js('if(document.getElementById("furigana-toggle").getAttribute("aria-checked")==="false")document.getElementById("furigana-toggle").click()');
  await nav('vocabulary');await click('Word cards');
  const longWordId=await js('(()=>{const level=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)).settings.studyLevel;const word=KotobaContent.vocabulary.filter(w=>level==="all"||(w.jlptLevel||"n3")===level).reduce((a,b)=>(a.example.length+a.exampleTranslation.length+a.meaning.length)>(b.example.length+b.exampleTranslation.length+b.meaning.length)?a:b);const input=document.getElementById("vocabulary-search");input.value=word.word;input.dispatchEvent(new Event("input",{bubbles:true}));return word.id;})()');
  const darkWordHeights=await wordCardHeights();
  await js(`document.getElementById(${JSON.stringify('reveal-')}+${JSON.stringify(longWordId)}).click()`);
  sameWordCardHeights(darkWordHeights,await wordCardHeights(),'Dark mobile long definition with furigana');
  assert.ok(await js('(()=>{const card=document.querySelector(".vocab-card"),active=card.querySelector(".word-face[aria-hidden=false]"),inactive=card.querySelector(".word-face[aria-hidden=true]");return active.checkVisibility({visibilityProperty:true})&&active.querySelector("ruby")&&!inactive.checkVisibility({visibilityProperty:true})&&inactive.inert;})()'),'Only the revealed word face is visible and accessible');
  await click('Hide');sameWordCardHeights(darkWordHeights,await wordCardHeights(),'Dark mobile hidden long definition');
  await click('Flashcards');
  const darkFrontWidth=await flashWidth();await click('Flip card');sameFlashWidth(darkFrontWidth,await flashWidth(),'Dark mobile vocabulary');
  await pause(220);
  const darkCards=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'flashcards-dark.png'),Buffer.from(darkCards.data,'base64'));
  await nav('settings');await js('document.getElementById("theme-light").click()');
  assert.equal(await js('document.documentElement.dataset.theme'),'light');
  assert.equal((await progress()).settings.theme,'light');
  assert.equal(await js('document.getElementById("theme-light").getAttribute("aria-pressed")'),'true');
  await send('Page.reload');await pause(180);await waitFor('Boolean(document.querySelector(".settings-card"))','saved light appearance');
  assert.equal(await js('document.documentElement.dataset.theme'),'light');
  assert.deepEqual(await js('window.__errors'),[]);
  pass('saved light/dark appearance, new mascot, all nine themed screens, and mobile theme controls');

  await runEnhancementChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});
  await runStudyChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});

  await runAudioChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});

  await runPhaseChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});
  await runSrsChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});
  await runDatasetChecks({js,send,nav,click,pause,progress,waitFor,pass,writeFile,artifacts,baseUrl});

  for (const screen of ['dashboard','vocabulary','grammar','reading','listening','practice','mock','review','settings']) {
    await goto(new URL('#'+screen,baseUrl).href);await pause(240);
    assert.equal(await js('document.querySelector(".nav-list [aria-current=page]").getAttribute("href")'),'#'+screen,`Direct hash route: ${screen}`);
    await send('Page.reload');await pause(240);await waitFor('Boolean(document.querySelector(".app-shell"))','refreshed '+screen);
    assert.equal(await js('document.querySelector(".nav-list [aria-current=page]").getAttribute("href")'),'#'+screen,`Refreshed hash route: ${screen}`);
    assert.deepEqual(await js('window.__errors'),[]);
  }
  const assetStatuses=await js('Promise.all([...document.querySelectorAll("script[src],link[href]")].map(async n=>({url:n.src||n.href,status:(await fetch(n.src||n.href)).status})))');
  assert.ok(assetStatuses.every(asset=>asset.status===200&&asset.url.startsWith(new URL('./',baseUrl).href)),`All packaged assets remain inside the subpath: ${JSON.stringify(assetStatuses)}`);
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:new URL('404.html',baseUrl).href});await pause(240);await waitFor('Boolean(document.querySelector("[data-home-link]"))','standalone 404');
  assert.ok(await js('document.querySelector("h1").textContent.includes("back to learning")'));
  assert.equal(await js('document.documentElement.scrollWidth<=innerWidth+1'),true);
  assert.equal(await js('document.querySelector("[data-home-link]").href'),new URL('index.html#dashboard',baseUrl).href);
  const missingPage=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(artifacts,'404-mobile.png'),Buffer.from(missingPage.data,'base64'));
  await js('document.querySelector("[data-home-link]").click()');await pause(240);await waitFor('Boolean(document.querySelector(".app-shell"))','404 return link');
  assert.equal(await js('document.querySelector(".nav-list [aria-current=page]").getAttribute("href")'),'#dashboard');
  pass('all nine direct hash routes and refreshes under the production subpath, local assets, and a working mobile 404 return link');

  const fileUrl=pathToFileURL(join(project,'index.html')).href;
  await goto(fileUrl);
  assert.equal(await js('document.querySelectorAll("nav a").length'),9);
  await nav('vocabulary');assert.equal(await js('document.querySelectorAll(".vocab-card").length'),24);
  await js('document.querySelectorAll(".vocab-card button")[1].click();document.querySelector(".bookmark-button").click();');
  const fileProgress=await progress();
  assert.equal(fileProgress.studyEvents.length,1);assert.equal(fileProgress.bookmarks.length,1);
  await send('Page.reload');await pause(150);await waitFor('Boolean(document.querySelector(".vocab-card"))','direct-file saved progress');
  assert.deepEqual(await progress(),fileProgress);
  await js('document.getElementById("theme-toggle").click()');
  assert.equal((await progress()).settings.theme,'dark');
  await send('Page.reload');await pause(150);await waitFor('Boolean(document.querySelector(".vocab-card"))','direct-file dark appearance');
  assert.equal(await js('document.documentElement.dataset.theme'),'dark');
  assert.deepEqual(await progress(),{...fileProgress,settings:{...fileProgress.settings,theme:'dark'}});
  assert.ok(await js('performance.getEntriesByType("resource").every(r=>r.name.startsWith("file:"))'));
  assert.deepEqual(await js('window.__errors'),[]);
  pass('direct index.html loading and saved progress without a server, npm, remote requests, or modules');
  console.log(`${passed} browser journeys passed. Screenshots: artifacts/desktop.png and artifacts/mobile.png`);
  }
} catch (error) {
  try { console.error(await js('({errors:window.__errors,view:document.querySelector("main")?.textContent.slice(-1800)})')); } catch {}
  console.error(error.stack || error);process.exitCode=1;
} finally {
  socket?.close();chrome?.kill();
  await pause(400);
  // Delete only this fresh, uniquely named browser profile inside this project's artifacts folder.
  if (dirname(resolve(profile)) !== resolve(artifacts) || !basename(profile).startsWith('browser-profile-')) throw new Error('Unexpected browser profile path; cleanup refused.');
  try {await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});} catch {console.log('Browser profile remains at '+profile);}
}
