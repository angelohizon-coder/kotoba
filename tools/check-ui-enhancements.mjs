// Additional journeys reuse the main Chrome/CDP harness; this module never launches a browser.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function runEnhancementChecks(harness) {
  const { js, send, nav, click, pause, progress, waitFor, pass, writeFile, artifacts } = harness;
  const onlyWidgets = Boolean(harness.onlyWidgets || harness.widgetsOnly);
  const metrics = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const reload = async (ready = 'Boolean(document.querySelector(".app-shell"))') => {
    await send('Page.reload'); await pause(220); await waitFor(ready, 'enhancement journey reload');
  };
  const fresh = async (route = 'dashboard', extra = '') => {
    await js(`(() => {let p=KotobaEngine.initialProgress();p.settings.soundEffects=false;${extra};localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));sessionStorage.removeItem('kotoba-n3-seen-scripts-'+KotobaContent.CONTENT_VERSION);location.hash=${JSON.stringify(route)};})()`);
    await reload();
  };
  const select = async (id, value) => {
    const changed = await js(`(() => {const n=document.getElementById(${JSON.stringify(id)});if(!n||![...n.options].some(o=>o.value===${JSON.stringify(value)}))return false;n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
    assert.ok(changed, `Available selector ${id}=${value}`);
  };
  const number = async value => js(`(() => {const n=document.getElementById('practice-count');n.value=${JSON.stringify(String(value))};n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const key = async (value, code = value) => {
    const virtualKey = ({ Enter: 13, ' ': 32 })[value];
    const event = { key: value, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey };
    const text = value === 'Enter' ? '\r' : value === ' ' ? ' ' : undefined;
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...event, text, unmodifiedText: text });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...event });
  };
  const shot = async name => {
    await pause(240);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(artifacts, name), Buffer.from(screenshot.data, 'base64'));
  };
  const finishSaved = async () => {
    await js(`(() => {let p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));const id=p.activeAttemptId;const map=Object.fromEntries(KotobaContent.questions.map(q=>[q.id,q]));p=KotobaEngine.submitAttempt(p,id,map);p=KotobaEngine.markReviewed(p,id);localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));})()`);
    await reload();
  };
  const submitSection = async () => {
    const submitted = await js(`(() => {const b=[...document.querySelectorAll('button')].find(n=>n.textContent.trim().startsWith('Submit section (')&&!n.disabled);if(!b)return false;b.click();return true;})()`);
    assert.ok(submitted, 'Current section can be submitted explicitly');
  };
  const point = selector => js(`(() => {const n=document.querySelector(${JSON.stringify(selector)}),r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  const mouseClick = async selector => {
    const position = await point(selector);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...position });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...position });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...position });
  };
  const dragWidget = async (source, target, { touch = false, cancel = false } = {}) => {
    await js(`(() => {const n=document.querySelector('#home-widgets > [data-widget="${source}"] .widget-drag-handle');n.scrollIntoView({block:'nearest',behavior:'instant'});const r=n.getBoundingClientRect(),nav=document.querySelector('.mobile-bottom-nav'),safeBottom=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top-12:innerHeight-12;if(r.bottom>safeBottom)window.scrollBy({top:r.bottom-safeBottom,behavior:'instant'});})()`);
    const start = await point(`#home-widgets > [data-widget="${source}"] .widget-drag-handle`);
    const finish = await js(`(() => {const r=document.querySelector('#home-widgets > [data-widget="${target}"]').getBoundingClientRect();return {x:r.left+Math.min(80,r.width/2),y:r.top+Math.min(70,r.height*.25)};})()`);
    const visible = await js(`(() => {const start=${JSON.stringify(start)},finish=${JSON.stringify(finish)},nav=document.querySelector('.mobile-bottom-nav'),safeBottom=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight,hit=document.elementFromPoint(start.x,start.y);return {safeBottom,width:innerWidth,hit:Boolean(hit?.closest('#home-widgets > [data-widget="${source}"] .widget-drag-handle'))};})()`);
    assert.ok(visible.hit, 'A real pointer begins on the visible widget drag handle');
    assert.ok([start, finish].every(p => p.x > 0 && p.x < visible.width && p.y > 0 && p.y < visible.safeBottom), `Drag source and destination are both visible above the bottom navigation: ${JSON.stringify({ start, finish, visible })}`);
    if (touch) await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, radiusX: 2, radiusY: 2, force: 1 }] });
    else {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...start });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...start });
    }
    for (let step = 1; step <= 12; step++) {
      const position = { x: start.x + (finish.x - start.x) * step / 12, y: start.y + (finish.y - start.y) * step / 12 };
      if (touch) await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...position, radiusX: 2, radiusY: 2, force: 1 }] });
      else await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, ...position });
      await pause(18);
    }
    if (cancel) await key('Escape');
    if (touch) await send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    else await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...finish });
    await pause(100);
  };

  await metrics(1440, 1000);
  if (!onlyWidgets) {
  await fresh();
  for (const route of ['grammar', 'reading', 'listening']) {
    await nav(route); await pause(250);
    const measured = await js(`(() => {const g=document.querySelector('.study-layout');const list=g.firstElementChild;const detail=g.lastElementChild;return {menu:list.getBoundingClientRect().height,detail:detail.getBoundingClientRect().height,count:list.querySelectorAll('button').length,contain:getComputedStyle(list).contain};})()`);
    assert.ok(measured.count > 2, `${route} has a meaningful menu`);
    assert.equal(measured.contain, 'size', `${route} menu uses the article's row height`);
    assert.ok(Math.abs(measured.menu - measured.detail) < 1, `${route} menu follows article height: ${JSON.stringify(measured)}`);
    await js(`document.querySelector('.study-layout').firstElementChild.querySelectorAll('button')[1].click()`);
    await pause(230);
    assert.ok(await js(`(() => {const g=document.querySelector('.study-layout');return Math.abs(g.firstElementChild.getBoundingClientRect().height-g.lastElementChild.getBoundingClientRect().height)<1;})()`), `${route} height follows a different selected lesson`);
    const grew = await js(`(() => {const g=document.querySelector('.study-layout');const old=g.lastElementChild.getBoundingClientRect().height;const p=document.createElement('p');p.id='dynamic-height-probe';p.textContent='Longer study content should grow this article and its menu together. '.repeat(100);g.lastElementChild.append(p);return {old,menu:g.firstElementChild.getBoundingClientRect().height,detail:g.lastElementChild.getBoundingClientRect().height};})()`);
    assert.ok(grew.detail > grew.old + 100 && Math.abs(grew.menu - grew.detail) < 1, `${route} follows natural text growth`);
    await js(`document.getElementById('dynamic-height-probe').remove()`);
    for (const edge of ['first', 'last']) {
      const reached = await js(`(() => {const list=document.querySelector('.study-layout').firstElementChild;list.scrollTop=${edge === 'last' ? 'list.scrollHeight' : '0'};const nodes=list.querySelectorAll('button');const n=${edge === 'last' ? 'nodes[nodes.length-1]' : 'nodes[0]'};const r=n.getBoundingClientRect(),l=list.getBoundingClientRect();return {height:r.height,top:r.top,bottom:r.bottom,listTop:l.top,listBottom:l.bottom};})()`);
      assert.ok(reached.height >= 40 && reached.top >= reached.listTop - 1 && reached.bottom <= reached.listBottom + 1, `${route} ${edge} menu item stays readable and reachable: ${JSON.stringify(reached)}`);
    }
    await js(`document.querySelector('.study-layout').firstElementChild.scrollTop=0;window.scrollTo({top:0,behavior:'instant'})`);
    await shot(`${route}-menu.png`);
    await metrics(360, 500, true); await pause(100);
    const mobile = await js(`(() => {const g=document.querySelector('.study-layout'),l=g.firstElementChild,d=g.lastElementChild;return {menu:l.getBoundingClientRect().toJSON(),detail:d.getBoundingClientRect().toJSON(),max:parseFloat(getComputedStyle(l).maxHeight),contain:getComputedStyle(l).contain,viewport:innerHeight};})()`);
    assert.equal(mobile.contain, 'none');
    assert.ok(mobile.menu.height <= mobile.viewport * .45 + 1 && mobile.max <= mobile.viewport * .45 + 1, `${route} mobile menu respects 45dvh`);
    assert.ok(mobile.detail.top >= mobile.menu.bottom - 1, `${route} stacks on a short mobile screen`);
    assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth+1`), `${route} fits a short mobile screen`);
    await metrics(1440, 1000); await pause(100);
    assert.ok(await js(`(() => {const g=document.querySelector('.study-layout');return Math.abs(g.firstElementChild.getBoundingClientRect().height-g.lastElementChild.getBoundingClientRect().height)<1;})()`), `${route} restores dynamic height after resizing`);
  }
  pass('grammar, reading, and listening menus follow article growth, preserve readable items, and resize to bounded mobile lists');

  await fresh('practice');
  await js(`document.getElementById('practice-skill-trigger').focus()`);
  await key('ArrowDown');
  assert.equal(await js(`document.getElementById('practice-skill-trigger').getAttribute('aria-expanded')`), 'true');
  assert.equal(await js(`document.querySelector('.dropdown-menu').parentElement===document.body`), true);
  await key('ArrowDown'); await key('Enter');
  assert.equal(await js(`document.getElementById('practice-skill').value`), 'vocabulary');
  assert.equal(await js(`document.activeElement.id`), 'practice-skill-trigger');
  assert.equal(await js(`document.querySelectorAll('.dropdown-menu').length`), 0);
  await key('r', 'KeyR'); await key('Enter');
  assert.equal(await js(`document.getElementById('practice-skill').value`), 'reading', 'Typeahead selects Reading');
  await key('Enter'); await key('ArrowDown'); await key('Escape');
  assert.equal(await js(`document.getElementById('practice-skill').value`), 'reading', 'Escape preserves the chosen value');
  assert.equal(await js(`document.activeElement.id`), 'practice-skill-trigger');
  await key('Enter'); await nav('grammar');
  assert.equal(await js(`document.querySelectorAll('body>.dropdown-menu').length`), 0, 'Route cleanup removes open popup');
  await metrics(360, 640, true); await nav('practice');
  await js(`document.getElementById('theme-toggle').click();document.getElementById('practice-topic-trigger').scrollIntoView({block:'center'});document.getElementById('practice-topic-trigger').focus({preventScroll:true});document.getElementById('practice-topic-trigger').click()`);
  await pause(180);
  const popup = await js(`(() => {const r=document.querySelector('.dropdown-menu').getBoundingClientRect(),nav=document.querySelector('.mobile-bottom-nav').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,navTop:nav.top,width:innerWidth};})()`);
  assert.ok(popup.left >= 0 && popup.right <= popup.width + 1 && popup.top >= 0 && popup.bottom <= popup.navTop + 1, `Mobile dropdown stays inside the viewport and above navigation: ${JSON.stringify(popup)}`);
  assert.equal(await js(`document.querySelectorAll('.dropdown-menu [aria-selected=true]').length`), 1);
  await shot('dropdown-dark-mobile.png');
  await key('Escape'); await nav('dashboard');
  assert.equal(await js(`document.querySelectorAll('.dropdown-menu').length`), 0);
  pass('custom dropdowns support arrows, Enter, Escape, typeahead, retained focus, mobile positioning, and popup cleanup');

  await metrics(1440, 1000);
  await fresh('grammar', `const q=KotobaContent.questions.find(q=>q.jlptLevel==='n5'&&q.skill==='vocabulary');const a=KotobaEngine.createAttempt([q],'practice',{now:Date.now()-2*86400000});a.answers[q.id]=q.options.find(o=>o.id!==q.correctOptionId).id;p={...p,attempts:[a],activeAttemptId:a.id};p=KotobaEngine.submitAttempt(p,a.id,Object.fromEntries(KotobaContent.questions.map(q=>[q.id,q])),Date.now()-2*86400000);p=KotobaEngine.markReviewed(p,a.id);`);
  const dueId = Object.keys((await progress()).reviews)[0];
  for (const level of ['n5', 'n4']) {
    for (const route of ['grammar', 'reading', 'listening', 'vocabulary']) {
      await nav(route); await select('study-level', level);
      const ids = await js(`(() => {const route=${JSON.stringify(route)};const selector=route==='grammar'?'.lesson-list button':route==='vocabulary'?'.vocab-card .bookmark-button':'.passage-list button';const prefix=route==='grammar'?'grammar-lesson-':route==='reading'?'reading-passage-':route==='listening'?'listening-script-':'bookmark-';return [...document.querySelectorAll(selector)].map(n=>n.id.slice(prefix.length));})()`);
      const correctLevel = await js(`(() => {const route=${JSON.stringify(route)};const bank=route==='reading'?KotobaContent.readings:route==='listening'?KotobaContent.listening:route==='grammar'?KotobaContent.grammar:KotobaContent.vocabulary;return ${JSON.stringify(ids)}.every(id=>bank.find(item=>item.id===id)?.jlptLevel===${JSON.stringify(level)});})()`);
      assert.ok(ids.length >= (route === 'vocabulary' ? 20 : 8) && correctLevel, `${level.toUpperCase()} ${route} shows foundation content`);
    }
  }
  await nav('practice'); await select('study-level', 'n5');
  assert.equal(await js(`document.getElementById('prioritize-weak').checked`), true);
  await number(0);
  assert.equal(await js(`document.getElementById('practice-count').getAttribute('aria-invalid')`), 'true');
  assert.ok(await js(`[...document.querySelectorAll('button')].find(n=>n.textContent.trim()==='Start practice').disabled`));
  const maximum = await js(`Number(document.getElementById('practice-count').max)`);
  await number(maximum + 1);
  assert.ok(await js(`[...document.querySelectorAll('button')].find(n=>n.textContent.trim()==='Start practice').disabled`));
  await number(7); await shot('practice-count.png'); await click('Start practice');
  const prioritized = (await progress()).attempts.at(-1);
  assert.equal(prioritized.questionOrder.length, 7);
  assert.ok(prioritized.questionOrder.includes(dueId), 'A due weak N5 question is retained in the selected seven');
  assert.ok(await js(`KotobaContent.questions.filter(q=>${JSON.stringify(prioritized.questionOrder)}.includes(q.id)).every(q=>q.jlptLevel==='n5'&&q.skill!=='listening')`));
  await finishSaved();
  await nav('practice'); await select('study-level', 'n4');
  await js(`document.getElementById('prioritize-weak').click()`);
  assert.equal(await js(`document.getElementById('prioritize-weak').checked`), false);
  await number(20); await click('Start practice');
  const ordinary = (await progress()).attempts.at(-1);
  assert.equal(ordinary.questionOrder.length, 20);
  assert.ok(await js(`KotobaContent.questions.filter(q=>${JSON.stringify(ordinary.questionOrder)}.includes(q.id)).every(q=>q.jlptLevel==='n4'&&q.skill!=='listening')`));
  await reload('Boolean(document.querySelector(".quiz-card"))');
  assert.deepEqual((await progress()).attempts.at(-1), ordinary, 'Selected session length and level survive reload');
  await finishSaved();
  pass('N5/N4 review content, custom practice lengths, validation, weak-point priority, optional mixing, and saved level filters');

  await fresh('mock');
  for (const [level, counts, minutes] of [['n5', [35, 32, 24], [20, 40, 30]], ['n4', [35, 35, 28], [25, 55, 35]], ['n3', [35, 39, 28], [30, 70, 40]]]) {
    await select('mock-level', level);
    const facts = await js(`[...document.querySelectorAll('.mock-facts>span')].map(n=>n.textContent)`);
    assert.equal(facts.length, 3);
    facts.forEach((fact, index) => assert.ok(fact.includes(`${counts[index]} questions`) && fact.includes(`${minutes[index]} minutes`), `${level} section ${index + 1} advertises its counts and duration`));
    const created = await js(`(() => {document.getElementById('start-full-mock').click();const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));const a=p.attempts.at(-1);return {level:a.mock.level,counts:a.mock.sections.map(s=>s.questionIds.length),minutes:a.mock.sections.map(s=>s.durationMinutes)};})()`);
    assert.deepEqual(created, { level, counts, minutes });
    await fresh('mock');
  }
  // Pick a script that the deterministic original test contains, then record transcript exposure before starting.
  const seenScript = await js(`(() => {const a=KotobaEngine.createFullMockAttempt('n3',KotobaContent.questions,{random:()=>0});const id=a.mock.sections[2].questionIds[0];return KotobaContent.questions.find(q=>q.id===id).listeningId;})()`);
  await js(`sessionStorage.setItem('kotoba-n3-seen-scripts-'+KotobaContent.CONTENT_VERSION,JSON.stringify([${JSON.stringify(seenScript)}]))`);
  await reload();
  await js(`(() => {const random=Math.random;try {Math.random=()=>0;document.getElementById('start-full-mock').click();}finally{Math.random=random;}})()`);
  const original = (await progress()).attempts.at(-1);
  assert.equal(original.questionOrder.length, 102);
  assert.ok(original.excludedIds.length > 0 && original.excludedIds.length < original.mock.sections[2].questionIds.length);
  assert.ok(await js(`KotobaContent.questions.filter(q=>${JSON.stringify(original.excludedIds)}.includes(q.id)).every(q=>q.skill==='listening'&&q.listeningId===${JSON.stringify(seenScript)})`), 'Only previously exposed listening questions are excluded');
  assert.equal(original.listeningAccess, 'audio');
  await js(`(() => {const q=KotobaContent.questions.find(q=>q.id===${JSON.stringify(original.questionOrder[0])});document.querySelector('input[value="'+q.correctOptionId+'"]').click();})()`);
  assert.equal(await js(`document.querySelectorAll('.feedback,.translation,.transcript').length`), 0);
  await submitSection();
  const afterVocabulary = (await progress()).attempts.at(-1);
  assert.equal(afterVocabulary.mock.sections[0].status, 'submitted');
  assert.equal(afterVocabulary.status, 'in-progress'); assert.equal(afterVocabulary.deadline, null);
  assert.equal(Object.keys((await progress()).reviews).length, 0);
  assert.equal(await js(`document.querySelectorAll('.feedback,.translation,.transcript,.result-summary').length`), 0);
  await reload('Boolean(document.querySelector(".mock-break-card"))');
  assert.deepEqual((await progress()).attempts.at(-1), afterVocabulary);
  await nav('grammar'); assert.equal(await js(`document.querySelectorAll('.lesson-detail,.lesson-list').length`), 0);
  await click('Resume mock test'); await click('Start grammar & reading');
  const middle = (await progress()).attempts.at(-1);
  assert.equal(middle.mock.currentSection, 1);
  assert.ok(middle.deadline > Date.now() + 69 * 60000);
  assert.equal(await js(`document.querySelectorAll('.feedback,.translation,.transcript').length`), 0);
  await submitSection(); await click('Start listening');
  const listening = (await progress()).attempts.at(-1);
  assert.equal(listening.mock.currentSection, 2);
  assert.deepEqual(listening.questionOrder, original.questionOrder); assert.deepEqual(listening.optionOrders, original.optionOrders);
  await js(`(() => {const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));p.attempts.at(-1).listeningAccess='script';localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));})()`);
  await reload('Boolean(document.querySelector(".quiz-card"))');
  assert.equal((await progress()).attempts.at(-1).listeningAccess, 'script');
  assert.equal(await js(`document.querySelectorAll('.transcript,.translation,.feedback').length`), 0, 'Imported script-mode mock keeps transcripts hidden until final submission');
  await js(`(() => {const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));p.attempts.at(-1).listeningAccess='audio';localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));})()`);
  await reload('Boolean(document.querySelector(".quiz-card"))');
  await js(`speechSynthesis.getVoices=()=>[{lang:'ja-JP',name:'Test voice'}];speechSynthesis.speak=u=>u.onerror({error:'synthesis-failed'})`);
  await nav('mock'); await click('Play / replay');
  await waitFor(`[...document.querySelectorAll('button')].some(n=>n.textContent.trim()==='Exclude this question')`, 'mock audio failure exclusion');
  const beforeFailure = (await progress()).attempts.at(-1).excludedIds.length;
  await click('Exclude this question');
  assert.equal((await progress()).attempts.at(-1).excludedIds.length, beforeFailure + 1);
  await shot('full-mock.png');
  await submitSection();
  const completed = (await progress()).attempts.at(-1);
  assert.equal(completed.status, 'submitted');
  assert.ok(completed.mock.sections.every(section => section.status === 'submitted'));
  const finalGrade = await js(`KotobaEngine.gradeAttempt(JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)).attempts.at(-1),Object.fromEntries(KotobaContent.questions.map(q=>[q.id,q])))`);
  assert.equal(finalGrade.correct, 1); assert.equal(finalGrade.total, 102 - completed.excludedIds.length);
  assert.ok(await js(`document.querySelector('.result-summary').textContent.includes('raw results') && document.querySelector('.result-summary').textContent.includes('not JLPT scaled scores')`));
  assert.ok(await js(`document.querySelectorAll('.feedback').length===102`));
  const finalProgress = await progress();
  assert.ok(completed.excludedIds.every(id => !finalProgress.reviews[id]), 'Technical/script exclusions never create missed-question reviews');
  await reload('Boolean(document.querySelector(".result-summary"))');
  assert.deepEqual((await progress()).attempts.at(-1), completed);
  await click('Finish review');
  pass('full N5/N4/N3 setup, all three N3 sections, locked reloads and breaks, hidden keys/transcripts, protected study routes, audio exclusions, and final raw results');

  await fresh('settings');
  assert.equal(await js(`document.getElementById('sound-effects-toggle').getAttribute('aria-checked')`), 'false');
  assert.equal(await js(`document.getElementById('preview-sounds').disabled`), true);
  assert.equal(await js(`KotobaSounds.play('correct',false)`), false, 'Muted cues do not schedule playback');
  await js(`document.getElementById('sound-effects-toggle').click()`);
  assert.equal((await progress()).settings.soundEffects, true);
  await reload('Boolean(document.getElementById("sound-effects-toggle"))');
  assert.equal(await js(`document.getElementById('sound-effects-toggle').getAttribute('aria-checked')`), 'true');
  assert.equal(await js(`document.getElementById('preview-sounds').disabled`), false);
  await js(`document.getElementById('preview-sounds').scrollIntoView({block:'center'})`);
  const preview = await js(`(() => {const r=document.getElementById('preview-sounds').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...preview });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...preview });
  await pause(500);
  assert.deepEqual(await js('window.__errors'), []);
  await js(`document.getElementById('sound-effects-toggle').click()`);
  await reload('Boolean(document.getElementById("sound-effects-toggle"))');
  assert.equal((await progress()).settings.soundEffects, false);
  assert.equal(await js(`document.getElementById('preview-sounds').disabled`), true);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await nav('grammar');
  assert.ok(await js(`matchMedia('(prefers-reduced-motion: reduce)').matches && getComputedStyle(document.querySelector('.page-enter')).animationName==='none'`));
  await js(`document.querySelectorAll('.lesson-list button')[1].click()`);
  assert.equal(await js(`getComputedStyle(document.querySelector('.lesson-enter')).animationName`), 'none');
  await js(`document.getElementById('grammar-category-trigger').focus();document.getElementById('grammar-category-trigger').click()`);
  assert.equal(await js(`getComputedStyle(document.querySelector('.dropdown-menu')).animationName`), 'none');
  assert.equal(await js(`getComputedStyle(document.querySelector('.dropdown-trigger')).transitionDuration`), '0s');
  await key('Escape'); await send('Emulation.setEmulatedMedia', { features: [] });
  await metrics(1440, 1000); await nav('dashboard');
  assert.deepEqual(await js('window.__errors'), []);
  pass('sound mute and preview controls persist safely, with no runtime errors and reduced-motion page, lesson, and popup effects');
  }

  await fresh('dashboard', `const q=KotobaContent.questions.find(q=>(q.jlptLevel||'n3')==='n3'&&q.skill==='grammar');const a=KotobaEngine.createAttempt([q],'practice');p={...p,attempts:[a],activeAttemptId:a.id};p=KotobaEngine.selectAnswer(p,a.id,q.id,q.correctOptionId);`);
  const savedAnswer = (await progress()).attempts.at(-1);
  const widgetIds = () => js(`[...document.querySelectorAll('#home-widgets > [data-widget]')].map(n=>n.dataset.widget)`);
  assert.deepEqual(await widgetIds(), ['path', 'goal', 'review'], 'A fresh home displays only the three default widgets');
  assert.equal(await js(`document.querySelectorAll('.dashboard-customize input[type=checkbox]').length`), await js('KotobaDashboard.catalog.length'));
  await select('sidebar-level', 'n5');
  await dragWidget('goal', 'path');
  assert.deepEqual(await widgetIds(), ['goal', 'path', 'review'], 'A mouse drag places the goal before the learning path');
  assert.ok(await js(`document.querySelector('.widget-move-status[role=status]').textContent.includes('position 1 of 3')`), 'Completed moves announce the new widget position');
  assert.deepEqual((await progress()).settings.dashboardWidgets, ['goal', 'path', 'review']);
  assert.deepEqual((await progress()).attempts.at(-1), savedAnswer);
  await reload('Boolean(document.querySelector(".dashboard"))');
  assert.deepEqual(await widgetIds(), ['goal', 'path', 'review']);
  await js(`document.querySelector('#home-widgets > [data-widget=goal] .widget-drag-handle').focus()`); await key('ArrowDown');
  assert.deepEqual(await widgetIds(), ['path', 'goal', 'review'], 'Drag handles also support keyboard reordering');
  assert.ok(await js(`document.activeElement.matches('#home-widgets > [data-widget=goal] .widget-drag-handle') && document.querySelector('#home-widgets .widget-move-status[role=status]').textContent.includes('position 2 of 3')`));
  await dragWidget('goal', 'path', { cancel: true });
  assert.deepEqual(await widgetIds(), ['path', 'goal', 'review'], 'Escape restores the provisional drag order');
  assert.ok(await js(`document.querySelector('.widget-move-status[role=status]').textContent.includes('Move canceled') && !document.querySelector('.widget-drag-preview')`));
  assert.deepEqual((await progress()).settings.dashboardWidgets, ['path', 'goal', 'review'], 'A cancelled drag does not save');
  assert.deepEqual((await progress()).attempts.at(-1), savedAnswer);
  await select('sidebar-level', 'n3'); await pause(240);
  const widgetGeometry = () => js(`[...document.querySelectorAll('#home-widgets > [data-widget]')].map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.widget,top:r.top+scrollY,left:r.left,width:r.width,height:r.height};})`);
  const beforePopup = await widgetGeometry();
  await js(`document.getElementById('dashboard-customize-trigger').focus()`); await key('Enter');
  await waitFor(`document.querySelector('.dashboard-customize').open`, 'floating home customization');
  assert.equal(await js(`document.getElementById('dashboard-customize-trigger').getAttribute('aria-expanded')`), 'true');
  assert.equal(await js(`document.getElementById('dashboard-customize-trigger').getAttribute('aria-haspopup')`), 'dialog');
  assert.equal(await js(`document.getElementById('home-customize-panel').getAttribute('role')`), 'dialog');
  assert.equal(await js(`document.getElementById('home-customize-panel').getAttribute('aria-modal')`), 'false');
  assert.ok(await js(`Boolean(document.getElementById(document.getElementById('home-customize-panel').getAttribute('aria-labelledby'))?.textContent)`));
  assert.equal(await js(`getComputedStyle(document.getElementById('home-customize-panel')).position`), 'fixed');
  assert.equal(await js(`getComputedStyle(document.getElementById('home-customize-panel')).animationName`), 'widget-panel-enter');
  assert.deepEqual(await widgetGeometry(), beforePopup, 'Opening the floating panel does not push or resize the dashboard cards');
  await js(`document.getElementById('close-home-customize').click()`);
  assert.equal(await js(`document.getElementById('dashboard-customize-trigger').getAttribute('aria-expanded')`), 'false');
  assert.equal(await js(`document.activeElement.id`), 'dashboard-customize-trigger');
  await key('Enter'); await key('Escape');
  assert.equal(await js(`document.getElementById('dashboard-customize-trigger').getAttribute('aria-expanded')`), 'false');
  assert.equal(await js(`document.activeElement.id`), 'dashboard-customize-trigger');
  await key('Enter'); await mouseClick('.dashboard-welcome h1');
  assert.equal(await js(`document.getElementById('dashboard-customize-trigger').getAttribute('aria-expanded')`), 'false', 'Clicking outside closes the panel');
  assert.ok(['main', 'dashboard-customize-trigger'].includes(await js(`document.activeElement.id`)), 'Outside pointer dismissal keeps focus in the clicked context or returns to the trigger');
  await js(`document.getElementById('dashboard-customize-trigger').focus()`);
  await key('Enter'); await mouseClick('#theme-toggle');
  assert.equal(await js(`document.getElementById('dashboard-customize-trigger').getAttribute('aria-expanded')`), 'false', 'An outside control dismisses the panel before its action');
  assert.equal((await progress()).settings.theme, 'dark', 'The outside theme control still performs its action');
  assert.equal(await js(`document.activeElement.id`), 'theme-toggle');
  await mouseClick('#theme-toggle');
  assert.equal((await progress()).settings.theme, 'light');
  await js(`document.getElementById('dashboard-customize-trigger').focus()`);
  await key('Enter');
  assert.equal(await js(`document.getElementById('dashboard-customize-trigger').getAttribute('aria-expanded')`), 'true', 'The panel reopens after an outside action');
  for (const id of ['activity', 'library', 'goal'])
    await js(`document.getElementById('dashboard-widget-${id}').click()`);
  await js(`document.querySelector('button[aria-label="Move Recent activity up"]').click()`);
  assert.deepEqual(await widgetIds(), ['path', 'activity', 'review', 'library'], 'Selected widgets render in the requested order');
  await js(`document.getElementById('widget-order-activity-up').focus()`); await key('Enter');
  assert.deepEqual(await widgetIds(), ['activity', 'path', 'review', 'library']);
  assert.equal(await js(`document.activeElement.id`), 'widget-order-activity-down', 'Moving a widget to the first position retains keyboard focus on its enabled direction');
  await key('Enter');
  assert.deepEqual(await widgetIds(), ['path', 'activity', 'review', 'library']);
  assert.equal(await js(`document.activeElement.id`), 'widget-order-activity-down', 'A middle-position reorder retains the same enabled control');
  await js(`document.getElementById('widget-order-review-down').focus()`); await key('Enter');
  assert.deepEqual(await widgetIds(), ['path', 'activity', 'library', 'review']);
  assert.equal(await js(`document.activeElement.id`), 'widget-order-review-up', 'Moving a widget to the last position retains keyboard focus on its enabled direction');
  await key('Enter');
  assert.deepEqual(await widgetIds(), ['path', 'activity', 'review', 'library']);
  assert.equal(await js(`document.activeElement.id`), 'widget-order-review-up');
  assert.deepEqual((await progress()).attempts.at(-1), savedAnswer, 'Customizing home preserves a saved answer and session');
  await js(`window.scrollTo({top:0,behavior:'instant'})`);
  await shot('dashboard-custom-desktop.png');
  await reload('Boolean(document.querySelector(".dashboard"))');
  assert.deepEqual(await widgetIds(), ['path', 'activity', 'review', 'library'], 'Widget visibility and order persist through reload');
  assert.deepEqual((await progress()).attempts.at(-1), savedAnswer);
  await js(`document.querySelector('.dashboard-customize>summary').click()`);
  for (const id of ['path', 'activity', 'review', 'library'])
    await js(`document.getElementById('dashboard-widget-${id}').click()`);
  assert.deepEqual(await widgetIds(), [], 'An empty home preference is respected');
  assert.ok(await js(`document.querySelector('.dashboard').textContent.includes('Your home, your choice')`));
  await reload('Boolean(document.querySelector(".dashboard"))');
  assert.deepEqual((await progress()).settings.dashboardWidgets, []);
  assert.deepEqual(await widgetIds(), []);
  await js(`document.querySelector('.dashboard-customize>summary').click()`);
  await click('Restore default widgets');
  assert.deepEqual(await widgetIds(), ['path', 'goal', 'review']);
  assert.deepEqual((await progress()).settings.dashboardWidgets, ['path', 'goal', 'review']);
  assert.deepEqual((await progress()).attempts.at(-1), savedAnswer);
  await js(`document.getElementById('close-home-customize').click()`);
  await nav('grammar');
  const beforeLogo = await progress();
  assert.equal(await js(`document.querySelectorAll('.brand.is-waving').length`), 0, 'The mascot does not wave automatically');
  await mouseClick('.brand');
  await waitFor(`Boolean(document.querySelector('.brand.is-waving img[src$="#wave"]'))`, 'logo greeting');
  assert.equal(await js(`document.querySelector('.nav-list [aria-current=page]').getAttribute('href')`), '#dashboard');
  assert.deepEqual(await progress(), beforeLogo, 'A logo greeting does not change learning progress');
  await js(`(() => {const frame=document.createElement('iframe');frame.id='mascot-motion-probe';frame.src=new URL('./web/mascot.svg#wave',document.baseURI).href;frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;Object.assign(frame.style,{position:'fixed',width:'240px',height:'260px',opacity:'0',pointerEvents:'none'});document.body.append(frame);})()`);
  await waitFor(`Boolean(document.getElementById('mascot-motion-probe').contentDocument?.getElementById('wave'))`, 'local SVG greeting animation');
  assert.equal(await js(`getComputedStyle(document.getElementById('mascot-motion-probe').contentDocument.getElementById('wave')).animationName`), 'momo-paw-hello');
  await waitFor(`!document.querySelector('.brand.is-waving')`, 'finite logo greeting cleanup');
  assert.ok(await js(`!document.querySelector('.brand img').getAttribute('src').includes('#wave')`));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await nav('grammar'); await mouseClick('.brand'); await pause(100);
  assert.equal(await js(`document.querySelector('.nav-list [aria-current=page]').getAttribute('href')`), '#dashboard');
  assert.equal(await js(`document.querySelectorAll('.brand.is-waving').length`), 0);
  assert.equal(await js(`getComputedStyle(document.getElementById('mascot-motion-probe').contentDocument.getElementById('wave')).animationName`), 'none');
  assert.deepEqual(await progress(), beforeLogo);
  await js(`document.getElementById('mascot-motion-probe').remove();document.getElementById('dashboard-customize-trigger').click()`);
  assert.equal(await js(`getComputedStyle(document.getElementById('home-customize-panel')).animationName`), 'none');
  await key('Escape');
  await send('Emulation.setEmulatedMedia', { features: [] });
  await metrics(360, 800, true); await pause(120);
  assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth+1`), 'Home customization fits a narrow mobile screen');
  await js(`window.scrollTo({top:0,behavior:'instant'})`);
  await shot('dashboard-custom-mobile.png');
  await metrics(360, 500, true);
  await js(`document.getElementById('dashboard-customize-trigger').click()`); await pause(210);
  const mobilePanel = await js(`(() => {const p=document.getElementById('home-customize-panel'),r=p.getBoundingClientRect(),bottom=document.querySelector('.mobile-bottom-nav').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,navTop:bottom.top,scroll:p.scrollHeight,height:p.clientHeight};})()`);
  assert.ok(mobilePanel.left >= 0 && mobilePanel.right <= 361 && mobilePanel.top >= 0 && mobilePanel.bottom <= mobilePanel.navTop + 1, 'The floating home panel fits above mobile navigation');
  assert.ok(mobilePanel.scroll > mobilePanel.height, 'A short mobile viewport provides an independently scrolling panel');
  assert.ok(await js(`(() => {const p=document.getElementById('home-customize-panel');p.scrollTop=p.scrollHeight;const b=[...p.querySelectorAll('button')].find(n=>n.textContent.trim()==='Restore default widgets'),r=b.getBoundingClientRect(),bounds=p.getBoundingClientRect();return r.top>=bounds.top&&r.bottom<=bounds.bottom+1;})()`), 'The last customization control is reachable by scrolling');
  assert.ok(await js(`(() => {const p=document.getElementById('home-customize-panel'),b=document.getElementById('close-home-customize'),r=b.getBoundingClientRect(),bounds=p.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.top>=bounds.top&&r.bottom<=bounds.bottom+1&&Boolean(hit?.closest('#close-home-customize'));})()`), 'The sticky close control stays visible and clickable after scrolling');
  await shot('dashboard-popover-mobile.png');
  await key('Escape');
  assert.equal(await js(`document.activeElement.id`), 'dashboard-customize-trigger');
  await metrics(360, 800, true);
  await js(`document.getElementById('bottom-menu-toggle').click()`);
  assert.ok(await js(`getComputedStyle(document.querySelector('.sidebar-bottom')).display!=='none' && document.getElementById('sidebar-level-trigger').getBoundingClientRect().height>=44`), 'Mobile Menu exposes the global learning level');
  await js(`document.getElementById('sidebar-level-trigger').scrollIntoView({block:'center'});document.getElementById('sidebar-level-trigger').focus({preventScroll:true})`);
  await key('ArrowDown'); await key('ArrowDown'); await key('Enter');
  assert.equal((await progress()).settings.studyLevel, 'n2');
  assert.ok(await js(`document.getElementById('path-title').textContent.startsWith('N2')`), 'Mobile level selection updates the integrated home path');
  assert.equal(await js(`document.activeElement.id`), 'sidebar-level-trigger');
  assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth+1`));
  await shot('dashboard-mobile-level.png');
  await key('ArrowUp'); await key('ArrowUp'); await key('Enter');
  assert.equal((await progress()).settings.studyLevel, 'n3');
  assert.ok(await js(`document.getElementById('path-title').textContent.startsWith('N3')`));
  assert.equal(await js(`document.activeElement.id`), 'sidebar-level-trigger');
  assert.deepEqual((await progress()).attempts.at(-1), savedAnswer, 'Changing a mobile home level preserves existing session answers');
  await key('Escape');
  assert.equal(await js(`document.activeElement.id`), 'sidebar-menu-toggle', 'Closing the mobile menu returns keyboard focus');
  assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth+1`));
  await js(`document.getElementById('bottom-menu-toggle').click()`); await select('sidebar-level', 'n5'); await key('Escape');
  // Every level now has a full integrated path. Use the actual compact editor
  // for this short touch drag; long-card scrolling is exercised separately.
  await js(`document.getElementById('dashboard-customize-trigger').click()`);
  await click('Rearrange cards');
  await dragWidget('goal', 'path', { touch: true });
  assert.deepEqual(await widgetIds(), ['goal', 'path', 'review'], 'Touch dragging reorders the compact mobile home');
  assert.deepEqual((await progress()).settings.dashboardWidgets, ['goal', 'path', 'review']);
  assert.deepEqual((await progress()).attempts.at(-1), savedAnswer);
  await reload('Boolean(document.querySelector(".dashboard"))');
  assert.deepEqual(await widgetIds(), ['goal', 'path', 'review'], 'Touch order persists after reload');
  await js(`document.getElementById('dashboard-customize-trigger').click()`); await click('Restore default widgets'); await key('Escape');
  await js(`document.getElementById('bottom-menu-toggle').click()`); await select('sidebar-level', 'n3'); await key('Escape');
  assert.deepEqual(await widgetIds(), ['path', 'goal', 'review']);
  assert.deepEqual((await progress()).attempts.at(-1), savedAnswer);
  await metrics(1440, 1000); await finishSaved();
  pass('floating accessible home editor, mouse/touch/keyboard widget ordering and cancellation, saved preferences and answers, mobile scrolling and levels, and finite logo greetings with reduced motion');

  await runDefaultWidgetDragChecks(harness);

  if (onlyWidgets) {
    assert.deepEqual(await js('window.__errors'), []);
    await fresh('dashboard');
    return;
  }

  await fresh('dashboard');
  const integrated = await js(`(() => {const plan=KotobaContent.learningPath.find(p=>p.level==='n3');for(const unit of plan.units){const lesson=unit.lessons.find(l=>l.kind==='daily'&&l.vocabularyIds.length&&l.kanjiIds.length&&l.grammarIds.length&&l.context.length&&l.readingId&&l.listeningId&&l.retrievalIds.some(id=>!l.questionIds.includes(id)));if(lesson)return {unitId:unit.id,lesson};}return null;})()`);
  assert.ok(integrated, 'An integrated daily lesson joins all skills and earlier retrieval');
  const openLesson = async () => js(`(() => {const d=document.querySelector('.daily-lesson-disclosure');if(d&&!d.open)d.querySelector('summary').click();})()`);
  const chooseLesson = async id => {
    const chosen = await js(`(() => {const n=document.querySelector('button[data-lesson-id="'+${JSON.stringify(id)}+'"]');if(!n)return false;n.click();return true;})()`);
    assert.ok(chosen, `Daily lesson ${id} is available in its learning unit`);
    await pause(50);
  };
  await select('path-unit', integrated.unitId); await chooseLesson(integrated.lesson.id);
  assert.equal((await progress()).settings.pathResume, integrated.lesson.id);
  assert.ok(await js(`document.querySelector('.daily-lesson-disclosure').open`));
  assert.equal(await js(`document.querySelectorAll('.path-word').length`), integrated.lesson.vocabularyIds.length);
  assert.equal(await js(`document.querySelectorAll('.path-grammar').length`), integrated.lesson.grammarIds.length);
  assert.ok(await js(`document.querySelectorAll('.path-context p[lang=ja]').length>0 && document.querySelector('.path-reading .passage-body').textContent.length>50 && Boolean(document.querySelector('.path-listening .audio-player')) && document.querySelectorAll('.path-kanji button').length>0`));
  await js(`document.querySelector('.path-word button').click()`);
  assert.ok(await js(`Boolean(document.querySelector('.vocab-card .word-face-back[aria-hidden=false]'))`), 'Study word opens and reveals its study card');
  await nav('dashboard'); await openLesson();
  await js(`document.querySelector('.path-grammar button').click();document.querySelector('.path-kanji button').click()`);
  assert.ok(await js(`Boolean(document.querySelector('.kanji-card'))`), 'Kanji connections opens its actual character card');
  const studied = await progress();
  assert.ok(['vocabulary', 'grammar', 'kanji'].every(type => studied.studyEvents.some(event => event.type === type)), 'Each integrated study action is recorded by skill');
  await nav('dashboard'); await openLesson();
  await js(`document.getElementById('daily-lesson').scrollIntoView({block:'start',behavior:'instant'})`);
  await shot('integrated-lesson.png');
  await click('Answer reading questions');
  const linkedReading = (await progress()).attempts.at(-1);
  assert.equal(linkedReading.type, 'reading');
  assert.ok(await js(`KotobaContent.questions.filter(q=>${JSON.stringify(linkedReading.questionOrder)}.includes(q.id)).every(q=>q.passageId===${JSON.stringify(integrated.lesson.readingId)})`));
  await finishSaved(); await nav('dashboard'); await openLesson();
  await js(`document.querySelector('.path-listening details>summary').click()`); await pause(80);
  assert.ok(await js(`JSON.parse(sessionStorage.getItem('kotoba-n3-seen-scripts-'+KotobaContent.CONTENT_VERSION)).includes(${JSON.stringify(integrated.lesson.listeningId)})`));
  const startedListening = await js(`(() => {const b=[...document.querySelectorAll('.path-listening button')].find(n=>['Answer listening questions','Unscored listening script practice'].includes(n.textContent.trim()));if(!b)return false;b.click();return true;})()`);
  assert.ok(startedListening);
  const linkedListening = (await progress()).attempts.at(-1);
  assert.equal(linkedListening.type, 'listening'); assert.equal(linkedListening.listeningAccess, 'script');
  assert.ok(await js(`KotobaContent.questions.filter(q=>${JSON.stringify(linkedListening.questionOrder)}.includes(q.id)).every(q=>q.listeningId===${JSON.stringify(integrated.lesson.listeningId)})`));
  await finishSaved(); await nav('dashboard'); await openLesson();
  await js(`(() => {const b=[...document.querySelectorAll('button')].find(n=>n.textContent.trim()==='Start lesson practice');b.click();})()`);
  const mixedLesson = (await progress()).attempts.at(-1);
  assert.equal(mixedLesson.type, 'practice');
  assert.ok(mixedLesson.questionOrder.length > 4 && mixedLesson.questionOrder.length <= 12);
  assert.ok(mixedLesson.questionOrder.some(id => integrated.lesson.retrievalIds.includes(id) && !integrated.lesson.questionIds.includes(id)), 'Lesson practice retrieves earlier material');
  assert.ok(mixedLesson.questionOrder.some(id => integrated.lesson.questionIds.includes(id)), 'Lesson practice retains current material');
  await finishSaved(); await nav('dashboard'); await openLesson();
  const beforeCheckmark = await progress();
  await js(`document.querySelector('input[data-task="path:'+${JSON.stringify(integrated.lesson.id)}+'"]').click()`);
  const checkedLesson = await progress();
  assert.ok(checkedLesson.completedTasks.includes('path:' + integrated.lesson.id));
  assert.deepEqual(checkedLesson.reviews, beforeCheckmark.reviews);
  assert.deepEqual(checkedLesson.attempts, beforeCheckmark.attempts);
  assert.deepEqual(checkedLesson.studyEvents, beforeCheckmark.studyEvents);
  assert.ok(await js(`document.querySelector('.path-evidence').textContent.includes('Spaced review mastery: 0/')`), 'A completion checkmark does not grant assessed mastery');
  await reload('Boolean(document.querySelector(".daily-lesson-node"))');
  assert.equal((await progress()).settings.pathResume, integrated.lesson.id);
  assert.ok(await js(`document.querySelector('button[data-lesson-id="'+${JSON.stringify(integrated.lesson.id)}+'"]').getAttribute('aria-pressed')==='true' && document.querySelector('input[data-task="path:'+${JSON.stringify(integrated.lesson.id)}+'"]').checked`));
  const lessonBackup = await progress();
  await nav('settings');
  await js(`(() => {const input=document.getElementById('progress-import'),dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(JSON.stringify(lessonBackup))}],'integrated-progress.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor(`Boolean(document.querySelector('[role=dialog]'))`, 'integrated lesson backup validation');
  await click('Replace progress');
  assert.deepEqual(await progress(), lessonBackup, 'Import retains lesson resume and completion independently of assessment');
  await nav('dashboard');
  assert.ok(await js(`document.querySelector('button[data-lesson-id="'+${JSON.stringify(integrated.lesson.id)}+'"]').getAttribute('aria-pressed')==='true'`));
  const checkpoint = await js(`(() => {const plan=KotobaContent.learningPath.find(p=>p.level==='n3');const unit=plan.units.find(u=>u.id===${JSON.stringify(integrated.unitId)});return unit.lessons.find(l=>l.kind==='review');})()`);
  await chooseLesson(checkpoint.id);
  assert.ok(await js(`document.querySelector('.daily-lesson .tag').textContent.includes('review')`));
  await js(`[...document.querySelectorAll('button')].find(n=>n.textContent.trim()==='Start cumulative practice').click()`);
  const cumulative = (await progress()).attempts.at(-1);
  assert.ok(cumulative.questionOrder.length >= 12 && cumulative.questionOrder.every(id => checkpoint.questionIds.includes(id) || checkpoint.retrievalIds.includes(id)), 'The weekly checkpoint draws only from the current and earlier units');
  await finishSaved(); await nav('dashboard'); await select('path-unit', 'n3-final');
  assert.equal((await progress()).settings.pathResume, 'n3-revision');
  assert.ok(await js(`document.querySelector('.daily-lesson .tag').textContent.includes('revision') && [...document.querySelectorAll('button')].some(n=>n.textContent.trim()==='Start cumulative practice')`));
  await chooseLesson('n3-path-mock');
  await js(`[...document.querySelectorAll('button')].find(n=>n.textContent.trim().startsWith('Prepare N3 full mock')).click()`);
  assert.equal(await js(`document.getElementById('mock-level').value`), 'n3');
  await js(`document.getElementById('start-full-mock').click()`); await nav('dashboard');
  assert.equal(await js(`document.querySelectorAll('.daily-lesson,.path-word,.path-grammar,.path-reading,.path-listening,.transcript,.translation,.feedback').length`), 0);
  assert.ok(await js(`document.querySelector('#home-widgets > [data-widget=path]').textContent.includes('Your mock test is in progress')`), 'The home lesson widget respects the full-mock answer guard');
  pass('integrated all-skill lessons, linked reading/audio, earlier mixed retrieval, cumulative and final review, independent checkmarks, resume and import, and protected mock preparation');

  await fresh('grammar');
  for (const [level, counts, minutes] of [['n2', [75, 32], [105, 50]], ['n1', [71, 30], [110, 55]]]) {
    await nav('grammar'); await select('sidebar-level', level);
    assert.equal((await progress()).settings.studyLevel, level);
    assert.equal(await js(`document.getElementById('study-level').value`), level);
    const positions = await js(`['study-level-trigger','grammarTopic-trigger','grammar-category-trigger'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,top:r.top,left:r.left,width:r.width};})`);
    assert.ok(Math.max(...positions.map(p => p.top)) - Math.min(...positions.map(p => p.top)) < 2, `${level.toUpperCase()} desktop filters align horizontally: ${JSON.stringify(positions)}`);
    assert.ok(positions[1].left > positions[0].left + positions[0].width && positions[2].left > positions[1].left + positions[1].width);
    for (const route of ['vocabulary', 'grammar', 'reading', 'listening']) {
      await nav(route);
      if (route === 'vocabulary') await click('Word cards');
      assert.equal(await js(`document.getElementById('sidebar-level').value`), level);
      assert.equal(await js(`document.getElementById('study-level').value`), level);
      const contentMatches = await js(`(() => {const route=${JSON.stringify(route)},prefix=route==='grammar'?'grammar-lesson-':route==='reading'?'reading-passage-':route==='listening'?'listening-script-':'bookmark-',selector=route==='grammar'?'.lesson-list button':route==='vocabulary'?'.vocab-card .bookmark-button':'.passage-list button',bank=route==='grammar'?KotobaContent.grammar:route==='reading'?KotobaContent.readings:route==='listening'?KotobaContent.listening:KotobaContent.vocabulary,nodes=[...document.querySelectorAll(selector)];return {count:nodes.length,matches:nodes.every(n=>(bank.find(item=>item.id===n.id.slice(prefix.length))?.jlptLevel||'n3')===${JSON.stringify(level)})};})()`);
      assert.ok(contentMatches.count >= (route === 'vocabulary' ? 20 : 8) && contentMatches.matches, `${level.toUpperCase()} ${route} honors the shared learning level`);
    }
    await reload('Boolean(document.querySelector(".passage-list"))');
    assert.equal((await progress()).settings.studyLevel, level);
    assert.equal(await js(`document.getElementById('sidebar-level').value`), level);
    await nav('vocabulary'); await click('Kanji connections');
    const kanjiExamples = await js(`(() => {const words=[...document.querySelectorAll('.kanji-card>p>span[lang=ja]:first-child')].map(n=>n.textContent);return {count:words.length,matches:words.every(word=>KotobaContent.vocabulary.some(v=>v.word===word&&v.jlptLevel===${JSON.stringify(level)}))};})()`);
    assert.ok(kanjiExamples.count > 0 && kanjiExamples.matches, `${level.toUpperCase()} kanji connections show words from the selected level`);
    await click('Flashcards'); await js(`document.getElementById('flashcard-options-toggle').click()`); await select('flashcard-deck', 'kanji');
    await click('Flip card');
    const flashExamples = await js(`(() => {const words=[...document.querySelectorAll('.flashcard-linked-words li strong')].map(n=>n.textContent);return {count:words.length,matches:words.every(word=>KotobaContent.vocabulary.some(v=>v.word===word&&v.jlptLevel===${JSON.stringify(level)}))};})()`);
    assert.ok(flashExamples.count > 0 && flashExamples.matches, `${level.toUpperCase()} kanji flashcards retain level-specific word examples`);
    await nav('practice'); await number(5); await click('Start practice');
    const higherPractice = (await progress()).attempts.at(-1);
    assert.ok(await js(`KotobaContent.questions.filter(q=>${JSON.stringify(higherPractice.questionOrder)}.includes(q.id)).every(q=>q.jlptLevel===${JSON.stringify(level)})`));
    await finishSaved(); await nav('mock');
    assert.equal(await js(`document.getElementById('mock-level').value`), level);
    const facts = await js(`[...document.querySelectorAll('.full-mock-facts>span')].map(n=>n.textContent)`);
    assert.equal(facts.length, 2);
    facts.forEach((fact, index) => assert.ok(fact.includes(`${counts[index]} questions`) && fact.includes(`${minutes[index]} minutes`), `${level.toUpperCase()} section ${index + 1} advertises its authored count and official duration`));
    await js(`document.getElementById('start-full-mock').click()`);
    const higherMock = (await progress()).attempts.at(-1);
    assert.equal(higherMock.mock.level, level); assert.deepEqual(higherMock.mock.sections.map(s => s.questionIds.length), counts);
    assert.deepEqual(higherMock.mock.sections.map(s => s.durationMinutes), minutes);
    assert.equal(higherMock.mock.sections[0].id, 'language-reading');
    assert.ok(higherMock.deadline > Date.now() + (minutes[0] - 1) * 60000);
    await js(`(() => {const q=KotobaContent.questions.find(q=>q.id===${JSON.stringify(higherMock.questionOrder[0])});document.querySelector('input[value="'+q.correctOptionId+'"]').click();})()`);
    assert.equal(await js(`document.querySelectorAll('.feedback,.translation,.transcript,.result-summary').length`), 0);
    await submitSection();
    const higherBreak = (await progress()).attempts.at(-1);
    assert.equal(higherBreak.status, 'in-progress'); assert.equal(higherBreak.deadline, null);
    assert.equal(higherBreak.mock.sections[0].status, 'submitted'); assert.equal(higherBreak.mock.sections[1].status, 'pending');
    await reload('Boolean(document.querySelector(".mock-break-card"))');
    assert.deepEqual((await progress()).attempts.at(-1), higherBreak);
    await nav('vocabulary');
    assert.equal(await js(`document.querySelectorAll('.vocab-card,.flashcard-shell,.kanji-card').length`), 0);
    await click('Resume mock test'); await click('Start listening');
    const higherListening = (await progress()).attempts.at(-1);
    assert.equal(higherListening.mock.currentSection, 1);
    assert.ok(higherListening.deadline > Date.now() + (minutes[1] - 1) * 60000);
    assert.deepEqual(higherListening.questionOrder, higherMock.questionOrder);
    assert.deepEqual(higherListening.optionOrders, higherMock.optionOrders);
    assert.equal(await js(`document.querySelectorAll('.feedback,.translation,.transcript,.result-summary').length`), 0);
    await shot(`full-mock-${level}.png`);
    await submitSection();
    const higherResult = (await progress()).attempts.at(-1);
    assert.equal(higherResult.status, 'submitted');
    assert.ok(higherResult.mock.sections.every(section => section.status === 'submitted'));
    const grade = await js(`KotobaEngine.gradeAttempt(JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)).attempts.at(-1),Object.fromEntries(KotobaContent.questions.map(q=>[q.id,q])))`);
    assert.equal(grade.correct, 1); assert.equal(grade.total, counts[0] + counts[1]);
    assert.ok(await js(`document.querySelector('.result-summary').textContent.includes('not JLPT scaled scores')`));
    await reload('Boolean(document.querySelector(".result-summary"))');
    assert.deepEqual((await progress()).attempts.at(-1), higherResult);
    await click('Finish review');
  }
  const beforeLevelImport = await progress();
  const resumeId = await js(`KotobaContent.learningPath.find(p=>p.level==='n1').units.flatMap(u=>u.lessons).filter(l=>l.kind==='daily')[1].id`);
  const importedLevelBackup = {
    ...beforeLevelImport,
    settings: { ...beforeLevelImport.settings, studyLevel: 'n1', pathResume: resumeId },
    completedTasks: [...new Set([...beforeLevelImport.completedTasks, 'path:' + resumeId])],
  };
  await select('sidebar-level', 'n2'); await nav('mock');
  assert.equal(await js(`document.getElementById('mock-level').value`), 'n2', 'The transient mock choice differs from the backup before import');
  await nav('settings');
  await js(`(() => {const input=document.getElementById('progress-import'),dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(JSON.stringify(importedLevelBackup))}],'n1-level-and-path.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor(`Boolean(document.querySelector('[role=dialog]'))`, 'advanced global level backup validation');
  await click('Replace progress');
  assert.deepEqual(await progress(), importedLevelBackup);
  assert.equal(await js(`document.getElementById('sidebar-level').value`), 'n1');
  await nav('dashboard');
  assert.ok(await js(`document.getElementById('path-title').textContent.startsWith('N1') && document.querySelector('button[data-lesson-id="'+${JSON.stringify(resumeId)}+'"]').getAttribute('aria-pressed')==='true' && document.querySelector('input[data-task="path:'+${JSON.stringify(resumeId)}+'"]').checked`), 'Imported N1 level, lesson resume, and completion update the home path');
  for (const route of ['vocabulary', 'grammar', 'reading', 'listening', 'practice']) {
    await nav(route);
    assert.equal(await js(`document.getElementById('sidebar-level').value`), 'n1');
    assert.equal(await js(`document.getElementById('study-level').value`), 'n1', `Imported level synchronizes the ${route} selector`);
  }
  await nav('mock');
  assert.equal(await js(`document.getElementById('mock-level').value`), 'n1', 'Imported global level replaces the earlier transient mock selection');
  await nav('settings'); await click('Reset progress'); await click('Reset all progress');
  assert.equal((await progress()).settings.studyLevel, 'n3');
  assert.equal((await progress()).settings.pathResume, null);
  await nav('mock');
  assert.equal(await js(`document.getElementById('sidebar-level').value`), 'n3');
  assert.equal(await js(`document.getElementById('mock-level').value`), 'n3', 'Reset restores the N3 mock selection alongside the global level');
  assert.deepEqual(await js('window.__errors'), []);
  await fresh('dashboard');
  pass('N2/N1 shared level filters, level-specific kanji, both timed two-section mocks, locked reloads and raw results, imported level/path synchronization, and reset defaults');
  await runInterfacePolishChecks(harness);
}

// Covers the ordinary N3 layout, including destinations outside the initial viewport.
// All drag input travels through Chrome's input API; no production drag hooks are used.
export async function runDefaultWidgetDragChecks(harness) {
  const { js, send, pause, progress, waitFor, pass, writeFile, artifacts } = harness;
  const originalUrl = await js('location.href');
  const main = '#home-widgets', rows = '#home-widget-order';
  const item = (container, id) => `${container} > [data-widget="${id}"]`;
  const ids = container => js(`[...document.querySelectorAll(${JSON.stringify(container + ' > [data-widget]')})].map(n=>n.dataset.widget)`);
  const metrics = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const reload = async () => {
    await send('Page.reload'); await pause(250);
    await waitFor(`Boolean(document.getElementById('home-widgets'))`, 'N3 drag reload');
  };
  const fresh = async (savedAnswer = false) => {
    await js(`(() => {let p=KotobaEngine.initialProgress();p.settings.soundEffects=false;${savedAnswer ? "const q=KotobaContent.questions.find(q=>(q.jlptLevel||'n3')==='n3'&&q.skill==='grammar');const a=KotobaEngine.createAttempt([q],'practice');p={...p,attempts:[a],activeAttemptId:a.id};p=KotobaEngine.selectAnswer(p,a.id,q.id,q.correctOptionId);" : ''}localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));location.hash='dashboard';})()`);
    await reload();
    assert.equal((await progress()).settings.studyLevel, 'n3');
    assert.deepEqual(await ids(main), ['path', 'goal', 'review']);
  };
  const unchangedLearning = async before => {
    const after = await progress();
    assert.deepEqual({ ...after, settings: { ...after.settings, dashboardWidgets: before.settings.dashboardWidgets } }, before, 'Dragging changes only the chosen widget order');
  };
  const screenshot = async name => {
    await pause(240);
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(artifacts, name), Buffer.from(image.data, 'base64'));
  };
  const position = async (selector, blank = false) => {
    await js(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
    await pause(50);
    const point = await js(`(() => {const n=document.querySelector(${JSON.stringify(selector)}),r=n.getBoundingClientRect();return ${blank ? "{x:r.left+12,y:r.top+Math.min(120,r.height*.3)}" : "{x:r.left+r.width*.4,y:r.top+r.height/2}"};})()`);
    const hit = await js(`(() => {const point=${JSON.stringify(point)},n=document.querySelector(${JSON.stringify(selector)}),hit=document.elementFromPoint(point.x,point.y),nav=document.querySelector('.mobile-bottom-nav'),bottom=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight;return point.x>0&&point.x<innerWidth&&point.y>0&&point.y<bottom&&${blank ? 'hit===n' : 'Boolean(hit&&n.contains(hit))'};})()`);
    assert.ok(hit, `A real pointer hits the visible ${blank ? 'blank card background' : 'drag surface'}: ${selector} ${JSON.stringify(point)}`);
    return point;
  };
  const move = async (point, touch) => {
    if (touch) await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, radiusX: 2, radiusY: 2, force: 1 }] });
    else await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, ...point });
  };
  const press = async (point, touch) => {
    if (touch) await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 2, radiusY: 2, force: 1 }] });
    else {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...point });
    }
  };
  const release = async (point, touch, cancel = false) => {
    if (touch) await send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    else await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...point });
    await pause(120);
  };
  async function drag(container, source, target, { surface = '.widget-drag-handle', before = true, blank = false, touch = false, cancel = false, requireScroll = false } = {}) {
    const beforeIds = await ids(container), beforeProgress = await progress();
    const start = await position(item(container, source) + (blank ? '' : ' ' + surface), blank);
    const initialScroll = await js('scrollY');
    await press(start, touch);
    await move({ x: start.x - 12, y: start.y }, touch);
    await waitFor(`Boolean(document.querySelector('.widget-drag-preview'))`, 'physical N3 drag begins');
    const previewStart = await js(`(() => {const n=document.querySelector('.widget-drag-preview'),r=n.getBoundingClientRect();return {x:r.left,y:r.top,inert:n.inert,hidden:n.getAttribute('aria-hidden'),card:Boolean(n.querySelector('.widget-drag-card')),ids:n.querySelectorAll('[id]').length,widgets:n.querySelectorAll('[data-widget]').length,tabbable:n.querySelectorAll('[tabindex]:not([tabindex="-1"])').length};})()`);
    assert.ok(previewStart.card && previewStart.inert && previewStart.hidden === 'true', 'The pointer carries a visual card snapshot outside the accessibility tree');
    assert.equal(previewStart.ids + previewStart.widgets + previewStart.tabbable, 0, 'The snapshot cannot duplicate real item IDs or keyboard controls');
    const trace = [];
    // Live placement can move the destination across the expanded lesson a second time.
    // Budget for that real travel distance instead of a fixed number of scroll frames.
    const travelHeight = await js(`(() => {const owner=document.querySelector(${JSON.stringify(container)});return Math.max(owner.scrollHeight,owner.getBoundingClientRect().height);})()`);
    const maximumSteps = Math.max(180,Math.ceil((travelHeight * 2 + 1000) / 24) + 40);
    let maximumScrollDistance = 0;
    let previousTravel = null, stalledSteps = 0;
    let destination;
    for (let step = 0; step < maximumSteps; step++) {
      const state = await js(`(() => {const n=document.querySelector(${JSON.stringify(item(container, target))}),owner=document.querySelector(${JSON.stringify(container)}),r=n.getBoundingClientRect(),panel=n.closest('.dashboard-customize-panel'),bounds=panel?.getBoundingClientRect(),heading=panel?.querySelector('.widget-panel-heading')?.getBoundingClientRect(),nav=document.querySelector('.mobile-bottom-nav'),bottom=Math.min(bounds?.bottom||innerHeight,nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight),top=Math.max(0,heading?.bottom||bounds?.top||0),full=r.width>owner.clientWidth*.7,x=full?r.left+Math.min(80,r.width*.25):r.left+r.width*${before ? '.25' : '.75'},y=full?${before ? 'r.top+Math.min(70,r.height*.25)' : 'r.bottom-Math.min(70,r.height*.25)'}:r.top+Math.min(70,r.height*.4),hit=document.elementFromPoint(x,y);return {x,y,top,bottom,scroll:scrollY,hostScroll:panel?.scrollTop||0,visible:y>=top+60&&y<=bottom-60&&Boolean(hit?.closest(${JSON.stringify(item(container, target))})),target:{top:r.top,bottom:r.bottom,height:r.height},order:[...owner.children].filter(n=>n.dataset.widget).map(n=>n.dataset.widget),active:Boolean(document.querySelector('.widget-drag-preview'))};})()`);
      trace.push(state); if (trace.length > 6) trace.shift();
      maximumScrollDistance = Math.max(maximumScrollDistance, Math.abs(state.scroll - initialScroll));
      assert.ok(state.active, `The drag stays active while reaching an offscreen destination: ${JSON.stringify(trace)}`);
      assert.deepEqual(state.order.slice().sort(), beforeIds.slice().sort(), 'Live movement retains every widget exactly once');
      assert.deepEqual(await progress(), beforeProgress, 'A drag preview does not save widget order or change learning progress');
      if (state.visible) { destination = { x: state.x, y: state.y }; break; }
      const travel = JSON.stringify([state.scroll,state.hostScroll,state.order]);
      stalledSteps = travel === previousTravel ? stalledSteps + 1 : 0; previousTravel = travel;
      assert.ok(stalledSteps < 50, `Edge scrolling continues toward its hit-tested destination: ${JSON.stringify(trace)}`);
      const point = { x: state.x, y: state.y < state.top + 60 ? state.top + 24 : state.bottom - 24 };
      await move(point, touch); await pause(100);
    }
    assert.ok(destination, `Edge scrolling reaches a visible, hit-tested destination within ${maximumSteps} frames for ${Math.round(travelHeight)}px of content: ${JSON.stringify(trace)}`);
    if (requireScroll) {
      const currentScroll = await js('scrollY');
      maximumScrollDistance = Math.max(maximumScrollDistance, Math.abs(currentScroll - initialScroll));
      const layout = await js(`(() => {const n=document.querySelector(${JSON.stringify(item(container, source))});return {sourceHeight:n.getBoundingClientRect().height,expanded:Boolean(document.querySelector('.daily-lesson-disclosure')?.open)};})()`);
      assert.ok(maximumScrollDistance > 200, `Dragging at the edge scrolls through the real long N3 layout: ${JSON.stringify({source,target,initialScroll,currentScroll,maximumScrollDistance,...layout})}`);
    }
    await move(destination, touch); await pause(50);
    const previewEnd = await js(`(() => {const r=document.querySelector('.widget-drag-preview').getBoundingClientRect();return {x:r.left,y:r.top};})()`);
    assert.ok(Math.abs(previewEnd.x - previewStart.x) + Math.abs(previewEnd.y - previewStart.y) > 2, 'The visual card follows the pointer to its destination');
    const insertion = await js(`(() => {const owner=document.querySelector(${JSON.stringify(container)}),destination=${JSON.stringify(destination)},hit=document.elementFromPoint(destination.x,destination.y);return {matches:document.querySelector(${JSON.stringify(item(container, target))}).classList.contains(${JSON.stringify(before ? 'widget-drop-before' : 'widget-drop-after')}),scroll:scrollY,hit:hit?.closest('[data-widget]')?.dataset.widget,items:[...owner.children].filter(n=>n.dataset.widget).map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.widget,top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,marker:n.classList.contains('widget-drop-before')?'before':n.classList.contains('widget-drop-after')?'after':null,transform:getComputedStyle(n).transform,animations:n.getAnimations().length};})};})()`);
    assert.ok(insertion.matches, `The visible insertion indicator matches the requested drop: ${JSON.stringify({container,source,target,before,destination,initialScroll,maximumScrollDistance,trace,insertion})}`);
    const expected = beforeIds.filter(id => id !== source), index = expected.indexOf(target);
    expected.splice(index + (before ? 0 : 1), 0, source);
    assert.deepEqual(await ids(container), expected, 'The widgets visibly rearrange before the pointer is released');
    assert.deepEqual(await progress(), beforeProgress, 'Previewed widget positions are saved only after release');
    if (cancel) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    }
    await release(destination, touch, cancel);
    if (cancel) {
      assert.deepEqual(await ids(container), beforeIds); assert.deepEqual(await progress(), beforeProgress);
      assert.ok(await js(`!document.querySelector('.widget-drag-preview,.widget-drop-before,.widget-drop-after,.widget-dragging')`), 'Escape removes the preview and insertion indicators');
      return beforeIds;
    }
    assert.deepEqual(await ids(container), expected, `The real ${touch ? 'touch' : blank ? 'background' : 'heading/handle'} drop reorders widgets`);
    assert.deepEqual((await progress()).settings.dashboardWidgets, expected);
    await unchangedLearning(beforeProgress);
    return expected;
  }
  const clickVisible = async selector => {
    const point = await position(selector); await press(point, false); await release(point, false);
  };
  const openCustomizer = async () => {
    await clickVisible('#dashboard-customize-trigger');
    await waitFor(`document.querySelector('.dashboard-customize').open`, 'widget reorder editor opens'); await pause(200);
  };
  const cancelRowDropOutside = async clippedHeader => {
    const beforeIds = await ids(rows), beforeProgress = await progress();
    const start = await position(item(rows, beforeIds.at(-1)) + ' .widget-drag-handle');
    await press(start, false); await move({ x: start.x + 12, y: start.y }, false);
    await waitFor(`Boolean(document.querySelector('.widget-drag-preview'))`, 'popup cancellation drag');
    const destination = await js(`(() => {const panel=document.getElementById('home-customize-panel'),r=panel.getBoundingClientRect();return ${clippedHeader ? '{x:r.left+100,y:r.top+4}' : '{x:r.left-60,y:r.top+Math.min(100,r.height*.25)}'};})()`);
    assert.ok(await js(`(() => {const p=${JSON.stringify(destination)},panel=document.getElementById('home-customize-panel'),hit=document.elementFromPoint(p.x,p.y);return p.x>0&&p.x<innerWidth&&p.y>0&&p.y<innerHeight&&Boolean(hit)&&${clippedHeader ? 'panel.contains(hit)&&!hit.closest(".widget-order-item")' : '!panel.contains(hit)'};})()`), 'The cancellation pointer hits a real area outside the visible order rows');
    await move(destination, false); await pause(60);
    assert.ok(await js(`!document.querySelector('#home-widget-order .widget-drop-before,#home-widget-order .widget-drop-after')`), 'An outside drop clears the row insertion indicator');
    await release(destination, false);
    assert.deepEqual(await ids(rows), beforeIds); assert.deepEqual(await progress(), beforeProgress);
    assert.ok(await js(`!document.querySelector('.widget-drag-preview,.widget-dragging')`), 'An outside drop cancels without saving');
  };

  await metrics(1440, 1000);
  await fresh();
  assert.ok(await js(`document.querySelector('#home-widgets > [data-widget=goal] .widget-drag-handle').textContent.includes('Move')`), 'The default dashboard visibly explains its move control');
  const defaultProgress = await progress();
  await drag(main, 'goal', 'path', { surface: '.widget-drag-title' });
  await reload(); assert.deepEqual(await ids(main), ['goal', 'path', 'review']); await unchangedLearning(defaultProgress);
  await drag(main, 'goal', 'path', { before: false, blank: true });
  assert.deepEqual(await ids(main), ['path', 'goal', 'review'], 'Dragging the card background makes a consequential reorder');
  await drag(main, 'goal', 'path', { before: false });
  assert.ok(await js(`document.activeElement.matches('#home-widgets > [data-widget=goal] .widget-drag-handle')`), 'An unchanged started drop keeps focus on its Move control');

  // A genuine expanded lesson creates the long card: no injected size, fake content or N5 shortcut.
  await fresh(true);
  await clickVisible('.daily-lesson-disclosure > summary');
  assert.ok(await js(`document.querySelector('.daily-lesson-disclosure').open && document.querySelector('#home-widgets > [data-widget=path]').getBoundingClientRect().height>innerHeight*2`), 'The real integrated N3 lesson creates a long scrollable path card');
  const longProgress = await progress();
  await drag(main, 'goal', 'path', { surface: '.widget-drag-title', cancel: true, requireScroll: true });
  await drag(main, 'goal', 'path', { surface: '.widget-drag-title', requireScroll: true });
  await screenshot('widgets-n3-long-drop.png');
  assert.deepEqual(await ids(main), ['goal', 'path', 'review']); await unchangedLearning(longProgress);
  await drag(main, 'path', 'review', { before: false, requireScroll: true });
  assert.deepEqual(await ids(main), ['goal', 'review', 'path']);
  await reload(); assert.deepEqual(await ids(main), ['goal', 'review', 'path']); await unchangedLearning(longProgress);
  pass('default N3 heading/background dragging, real expanded-lesson edge scrolling, stable insertion markers, Escape cancellation, and saved-answer preservation through reload');

  await fresh(true); const editorProgress = await progress();
  await openCustomizer();
  await drag(rows, 'review', 'path', { surface: '.widget-order-label' });
  assert.deepEqual(await ids(main), ['review', 'path', 'goal']);
  await cancelRowDropOutside(true);
  await cancelRowDropOutside(false);
  await screenshot('widgets-customize-drag.png');
  await clickVisible('#close-home-customize'); await reload();
  assert.deepEqual(await ids(main), ['review', 'path', 'goal']); await unchangedLearning(editorProgress);
  await metrics(360, 800, true); await openCustomizer();
  await drag(rows, 'goal', 'review', { touch: true });
  assert.deepEqual(await ids(main), ['goal', 'review', 'path']);
  await screenshot('widgets-customize-touch.png');
  await clickVisible('#close-home-customize'); await reload();
  assert.deepEqual(await ids(main), ['goal', 'review', 'path']); await unchangedLearning(editorProgress);
  await metrics(1440, 1000); await openCustomizer();
  await clickVisible('#rearrange-home-widgets');
  await waitFor(`document.getElementById('home-widgets').classList.contains('is-editing')`, 'Customize home enters card rearrangement');
  assert.ok(await js(`document.querySelector('#finish-home-reorder') && document.querySelector('.daily-lesson-disclosure') && getComputedStyle(document.querySelector('.daily-lesson-disclosure')).display==='none'`), 'Rearrangement shows compact controls while retaining the lesson DOM');
  await screenshot('widgets-rearrange-mode.png');
  await drag(main, 'path', 'goal', { surface: '.widget-edit-heading' });
  await metrics(360, 800, true);
  await drag(main, 'review', 'path', { touch: true, blank: true });
  assert.deepEqual(await ids(main), ['review', 'path', 'goal'], 'Compact mode accepts a real touch drag on card padding');
  await screenshot('widgets-rearrange-mobile.png');
  await drag(main, 'review', 'goal', { touch: true, before: false, surface: '.widget-edit-heading' });
  assert.deepEqual(await ids(main), ['path', 'goal', 'review']);
  await clickVisible('#finish-home-reorder');
  assert.ok(await js(`!document.getElementById('home-widgets').classList.contains('is-editing') && getComputedStyle(document.querySelector('.daily-lesson-disclosure')).display!=='none'`), 'Done restores the ordinary full dashboard');
  await reload(); assert.deepEqual(await ids(main), ['path', 'goal', 'review']); await unchangedLearning(editorProgress);
  await metrics(1440, 1000);
  pass('Customize home offers mouse/touch row dragging, outside-drop cancellation, and compact desktop/mobile rearrangement, with Done restoring lessons and saved order');

  const fileUrl = pathToFileURL(fileURLToPath(new URL('../index.html', import.meta.url))).href;
  await send('Page.navigate', { url: fileUrl }); await pause(250);
  await waitFor(`Boolean(document.getElementById('home-widgets'))`, 'direct-file widgets');
  await fresh(); const fileProgress = await progress();
  await drag(main, 'goal', 'path', { surface: '.widget-drag-title' });
  await reload(); assert.deepEqual(await ids(main), ['goal', 'path', 'review']); await unchangedLearning(fileProgress);
  assert.ok(await js(`location.protocol==='file:' && performance.getEntriesByType('resource').every(r=>r.name.startsWith('file:'))`), 'Direct-file dragging loads only local assets');
  assert.deepEqual(await js('window.__errors'), []);
  await fresh();
  await send('Page.navigate', { url: originalUrl }); await pause(250);
  await waitFor(`Boolean(document.querySelector('.app-shell'))`, 'return from direct-file dragging');
  await fresh();
  pass('direct index.html N3 heading drag persists across reload without npm, a server, or remote assets');
}

export async function runInterfacePolishChecks(harness) {
  const { js, send, nav, pause, progress, waitFor, pass, writeFile, artifacts } = harness;
  const reload = async () => {
    await send('Page.reload'); await pause(250); await waitFor(`Boolean(document.querySelector('.app-shell'))`, 'interface polish reload');
  };
  const fresh = async (route = 'dashboard', extra = '') => {
    await js(`(() => {let p=KotobaEngine.initialProgress();p.settings.soundEffects=false;${extra};localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));location.hash=${JSON.stringify(route)};})()`);
    await reload();
  };
  const shot = async name => {
    await pause(240); const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(artifacts, name), Buffer.from(capture.data, 'base64'));
  };
  const widths = {};
  for (const width of [320, 360, 768, 1440]) {
    const height = width > 1000 ? 1000 : 800;
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 360 });
    await fresh();
    const geometry = await js(`(() => {const main=document.getElementById('main').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,main:{left:main.left,right:main.right},items:[...document.querySelectorAll('#home-widgets > [data-widget]')].map(n=>{const r=n.getBoundingClientRect(),h=n.querySelector('.widget-drag-title'),b=n.querySelector('.widget-drag-handle'),a=h.getBoundingClientRect(),c=b.getBoundingClientRect();return {id:n.dataset.widget,left:r.left,right:r.right,width:r.width,overlap:Math.min(a.right,c.right)>Math.max(a.left,c.left)+1&&Math.min(a.bottom,c.bottom)>Math.max(a.top,c.top)+1,headingFits:h.scrollWidth<=h.clientWidth+1,heading:{left:a.left,right:a.right,top:a.top,bottom:a.bottom},move:{left:c.left,right:c.right,top:c.top,bottom:c.bottom}};})};})()`);
    assert.equal(geometry.overflow, false, `The ${width}px dashboard fits its viewport`);
    assert.equal(geometry.items.length, 3);
    for (const item of geometry.items) {
      assert.ok(item.left >= geometry.main.left - 1 && item.right <= geometry.main.right + 1 && item.width > 140, `The ${width}px widget stays within the main column: ${JSON.stringify(item)}`);
      assert.equal(item.overlap, false, `The ${width}px heading never overlaps its Move control: ${JSON.stringify(item)}`);
      assert.ok(item.headingFits, `The ${width}px widget heading wraps within its allotted width`);
    }
    widths[width] = geometry.items.find(n => n.id === 'goal').width;
    if ([320, 768, 1440].includes(width)) await shot(`dashboard-layout-${width}.png`);
    // An empty home and an empty review reveal a footer stranded above the viewport bottom.
    await fresh('dashboard', 'p.settings.dashboardWidgets=[]');
    for (const route of ['dashboard', 'review', 'grammar']) {
      if (route !== 'dashboard') await nav(route);
      await js(`window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})`); await pause(80);
      const footer = await js(`(() => {const n=document.querySelector('.app-footer'),main=document.getElementById('main'),r=n.getBoundingClientRect(),m=main.getBoundingClientRect(),previous=n.previousElementSibling.getBoundingClientRect(),css=getComputedStyle(main),padding=parseFloat(css.paddingBottom),nav=document.querySelector('.mobile-bottom-nav'),safeBottom=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight,shell=document.querySelector('.app-shell'),s=getComputedStyle(shell),sidebar=document.querySelector('.sidebar'),b=getComputedStyle(sidebar);return {top:r.top,bottom:r.bottom,mainTop:m.top,mainBottom:m.bottom,mainHeight:m.height,mainMinHeight:css.minHeight,mainDisplay:css.display,contentBottom:previous.bottom,padding,viewport:innerHeight,visualHeight:visualViewport?.height,scroll:scrollY,documentHeight:document.documentElement.scrollHeight,bodyHeight:document.body.getBoundingClientRect().height,shell:{display:s.display,height:shell.getBoundingClientRect().height,minHeight:s.minHeight},sidebar:{height:sidebar.getBoundingClientRect().height,scrollHeight:sidebar.scrollHeight,overflowY:b.overflowY},mobileMedia:matchMedia('(max-width:760px)').matches,safeBottom,position:getComputedStyle(n).position,overflow:document.documentElement.scrollWidth>innerWidth+1};})()`);
      assert.ok(!footer.overflow && !['fixed', 'sticky'].includes(footer.position), `${width}px ${route} footer remains in normal page flow`);
      assert.ok(footer.top >= footer.contentBottom + 12, `${width}px ${route} footer follows the content with breathing room: ${JSON.stringify(footer)}`);
      assert.ok(Math.abs(footer.mainBottom - footer.bottom - footer.padding) < 2 && footer.mainBottom >= footer.viewport - 1, `${width}px ${route} footer sits at the end of a full-height main column: ${JSON.stringify(footer)}`);
      assert.ok(footer.bottom <= footer.safeBottom + 1, `${width}px ${route} footer stays clear of mobile navigation`);
    }
  }
  assert.ok(widths[360] > widths[320] + 10 && widths[1440] > widths[360] + 30, 'Home widgets grow with the available column width');
  pass('320/360/768/desktop widgets stay fluid with clear Move headings, and short/long page footers sit below content above mobile navigation');

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const script = await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {const p=window.__kotobaAudioChecks={contexts:0,oscillators:0,starts:0,calls:[],results:[]},Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const oscillator=Audio.prototype.createOscillator;Audio.prototype.createOscillator=function(...args){p.oscillators++;const tone=oscillator.apply(this,args),start=tone.start;tone.start=function(...times){p.starts++;return start.apply(this,times);};return tone;};const Observed=new Proxy(Audio,{construct(target,args,newTarget){p.contexts++;return Reflect.construct(target,args,newTarget);}});if(window.AudioContext)window.AudioContext=Observed;else window.webkitAudioContext=Observed;})()` });
  const observe = () => js(`(() => {const play=KotobaSounds.play;KotobaSounds.play=async function(kind,enabled){window.__kotobaAudioChecks.calls.push({kind,enabled});const played=await play.call(this,kind,enabled);window.__kotobaAudioChecks.results.push({kind,played});return played;};})()`);
  const clickNode = async expression => {
    await js(`(() => {const n=${expression};if(!n)throw new Error('Missing real audio interaction');n.scrollIntoView({block:'center',behavior:'instant'});})()`); await pause(50);
    const point = await js(`(() => {const n=${expression},r=n.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);if(!hit||!n.contains(hit))throw new Error('Audio interaction is not visible');return {x,y};})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...point });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...point }); await pause(80);
  };
  const button = label => `[...document.querySelectorAll('button')].find(n=>n.textContent.trim()===${JSON.stringify(label)}&&!n.disabled)`;
  const answer = correct => js(`(() => {const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)),a=p.attempts.at(-1),id=a.questionOrder.find(id=>!a.checkedIds.includes(id)),q=KotobaContent.questions.find(q=>q.id===id);return ${correct ? 'q.correctOptionId' : 'q.options.find(o=>o.id!==q.correctOptionId).id'};})()`);
  const expectCue = async (kind, action) => {
    const before = await js(`({starts:window.__kotobaAudioChecks.starts,results:window.__kotobaAudioChecks.results.length})`);
    await action();
    await waitFor(`window.__kotobaAudioChecks.results.slice(${before.results}).some(r=>r.kind===${JSON.stringify(kind)}&&r.played)&&window.__kotobaAudioChecks.starts>${before.starts}`, `real ${kind} gesture Web Audio schedule`);
  };
  try {
    await fresh('dashboard', 'p.settings.soundEffects=true');
    assert.deepEqual(await js(`({contexts:window.__kotobaAudioChecks.contexts,starts:window.__kotobaAudioChecks.starts})`), { contexts: 0, starts: 0 }, 'Enabled effects do not create or play audio during startup');
    await observe();
    await expectCue('customize', () => clickNode(`document.getElementById('dashboard-customize-trigger')`));
    await expectCue('arrange', () => clickNode(`document.getElementById('rearrange-home-widgets')`));
    await clickNode(`document.querySelector('#home-widgets > [data-widget=review] .widget-drag-handle')`);
    await expectCue('move', async () => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36, nativeVirtualKeyCode: 36 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36, nativeVirtualKeyCode: 36 });
    });
    assert.deepEqual((await progress()).settings.dashboardWidgets, ['review', 'path', 'goal'], 'A real focused Home-key gesture moves the widget');
    await expectCue('settle', () => clickNode(`document.getElementById('finish-home-reorder')`));
    await expectCue('wave', () => clickNode(`document.querySelector('.brand')`));
    await nav('practice');
    await js(`(() => {const n=document.getElementById('practice-count');n.value='2';n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await clickNode(button('Start practice'));
    const correct = await answer(true);
    await clickNode(`document.querySelector('input[value="'+${JSON.stringify(correct)}+'"]').closest('label')`);
    await clickNode(button('Check answer'));
    await waitFor(`window.__kotobaAudioChecks.results.some(r=>r.kind==='correct'&&r.played)&&window.__kotobaAudioChecks.starts>0`, 'actual correct-feedback Web Audio schedule');
    const firstStarts = await js('window.__kotobaAudioChecks.starts');
    assert.ok(await js(`document.querySelector('.feedback')&&window.__kotobaAudioChecks.calls.some(c=>c.kind==='correct'&&c.enabled===true)`));
    await clickNode(button('Next'));
    const incorrect = await answer(false);
    await clickNode(`document.querySelector('input[value="'+${JSON.stringify(incorrect)}+'"]').closest('label')`);
    await clickNode(button('Check answer'));
    await waitFor(`window.__kotobaAudioChecks.results.some(r=>r.kind==='incorrect'&&r.played)&&window.__kotobaAudioChecks.starts>${firstStarts}`, 'actual incorrect-feedback Web Audio schedule');
    await clickNode(button('Submit practice'));
    await waitFor(`window.__kotobaAudioChecks.results.some(r=>r.kind==='complete'&&r.played)`, 'actual completion Web Audio schedule');
    await clickNode(button('Finish review')); await nav('settings');
    await clickNode(`document.getElementById('sound-effects-toggle')`);
    assert.equal((await progress()).settings.soundEffects, false);
    assert.equal(await js(`document.getElementById('preview-sounds').disabled`), true);
    const mutedStarts = await js('window.__kotobaAudioChecks.starts');
    await nav('vocabulary');
    await clickNode(`document.querySelector('.bookmark-button')`);
    await pause(150);
    assert.equal(await js('window.__kotobaAudioChecks.starts'), mutedStarts, 'A muted saved-card gesture does not schedule oscillators');
    assert.ok(await js(`window.__kotobaAudioChecks.calls.some(c=>c.kind==='saved'&&c.enabled===false)`));
    await nav('dashboard'); await clickNode(`document.getElementById('dashboard-customize-trigger')`);
    assert.equal(await js('window.__kotobaAudioChecks.starts'), mutedStarts, 'Muted customization does not schedule oscillators');
    assert.ok(await js(`window.__kotobaAudioChecks.results.some(r=>r.kind==='customize'&&r.played===false)&&window.__kotobaAudioChecks.calls.some(c=>c.kind==='customize'&&c.enabled===false)`));
    await clickNode(`document.getElementById('close-home-customize')`);
    await reload();
    assert.equal((await progress()).settings.soundEffects, false);
    assert.equal(await js('window.__kotobaAudioChecks.contexts'), 0, 'Reload restores mute without creating an audio context');
    await fresh('mock', 'p.settings.soundEffects=true'); await observe();
    await clickNode(`document.getElementById('start-full-mock')`);
    const beforeMockAnswer = await js('window.__kotobaAudioChecks.starts');
    const mockCorrect = await answer(true);
    await clickNode(`document.querySelector('input[value="'+${JSON.stringify(mockCorrect)}+'"]').closest('label')`);
    assert.equal(await js('window.__kotobaAudioChecks.starts'), beforeMockAnswer, 'A full-mock answer gives no audio hint before grading');
    assert.equal(await js(`window.__kotobaAudioChecks.calls.filter(c=>['correct','incorrect'].includes(c.kind)).length`), 0);
    assert.equal(await js(`document.querySelectorAll('.feedback').length`), 0);
    assert.deepEqual(await js('window.__errors'), []);
  } finally {
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier });
  }
  await fresh('dashboard');
  pass('real browser Web Audio follows customization, rearrangement, move, Done, mascot, checked-answer and completion gestures, respects mute/reload, never autoplays at startup, and keeps mock answers silent before grading');
}
