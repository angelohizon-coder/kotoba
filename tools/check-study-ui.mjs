// Focused study journeys reuse the Chrome/CDP harness and actual course records.
import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function runStudyChecks({ js, send, nav, click, pause, progress, waitFor, pass, writeFile, artifacts, baseUrl }) {
  const metrics = async (width, height = 900) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 360 });
    await pause(100);
  };
  const reload = async () => {
    await send('Page.reload');
    await pause(220);
    await waitFor('Boolean(window.KotobaContent && document.querySelector(".app-shell"))', `study app at ${baseUrl}`);
  };
  const fresh = async (route = 'vocabulary', seed = '') => {
    await js(`(() => {let p=KotobaEngine.initialProgress();p.settings.soundEffects=false;${seed};localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));sessionStorage.removeItem('kotoba-n3-seen-scripts-'+KotobaContent.CONTENT_VERSION);location.hash=${JSON.stringify(route)};})()`);
    await reload();
  };
  const select = async (id, value) => {
    assert.ok(await js(`(() => {const n=document.getElementById(${JSON.stringify(id)});if(!n||![...n.options].some(o=>o.value===${JSON.stringify(value)}))return false;n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`), `${id} offers ${value}`);
    await pause(30);
  };
  const input = async (id, value) => js(`(() => {const n=document.getElementById(${JSON.stringify(id)});n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const taskClick = async taskId => {
    assert.ok(await js(`(() => {const n=document.getElementById(${JSON.stringify('completed-task-' + taskId)});if(!n)return false;n.click();return true;})()`), `Visible completion control for ${taskId}`);
  };
  const visibleCards = kind => js(`([...document.querySelectorAll('.${kind === 'kanji' ? 'kanji' : 'vocab'}-grid input[data-task]')].map(n=>n.dataset.task.slice(${kind.length + 1})))`);
  const pages = kind => js(`(() => {const ids=[];for(let page=0;page<200;page++){ids.push(...[...document.querySelectorAll('.${kind === 'kanji' ? 'kanji' : 'vocab'}-grid input[data-task]')].map(n=>n.dataset.task.slice(${kind.length + 1})));const next=[...document.querySelectorAll('.pagination button')].find(n=>n.textContent.trim()==='Next cards');if(!next||next.disabled)return ids;next.click();}throw new Error('Pagination never reached its final page');})()`);
  const shot = async name => {
    await pause(220);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(artifacts, name), Buffer.from(screenshot.data, 'base64'));
  };
  const sourceWords = () => js(`KotobaContent.vocabulary.filter(w=>(w.jlptLevel||'n3')==='n3').map(w=>w.id)`);
  const sourceKanji = () => js(`KotobaContent.kanji.filter(k=>k.wordIds.some(id=>(KotobaContent.vocabulary.find(w=>w.id===id)?.jlptLevel||'n3')==='n3')).map(k=>k.id)`);
  const grouped = (ids, completed) => [...ids.filter(id => !completed.includes(id)), ...ids.filter(id => completed.includes(id))];
  const filterField = async id => {
    assert.ok(await js(`(() => {const n=document.getElementById(${JSON.stringify(id)}),b=document.getElementById(${JSON.stringify(id + '-trigger')});return Boolean(n&&b&&n.closest('.filter-bar')&&b.getBoundingClientRect().width>0);})()`), `${id} remains available in the filter bar`);
    assert.deepEqual(await js(`[...document.getElementById(${JSON.stringify(id)}).options].map(o=>[o.value,o.textContent])`), [['all', 'All items'], ['unfinished', 'Unfinished'], ['completed', 'Completed']]);
  };

  await metrics(1440, 1000);
  await fresh();
  const wordOrder = await sourceWords();
  assert.ok(wordOrder.length > 48, 'Vocabulary spans several pages');
  const completedWords = [wordOrder[0], wordOrder[1], wordOrder[25]];
  await fresh('vocabulary', `p.completedTasks=${JSON.stringify(completedWords.map(id => 'vocabulary:' + id))}`);
  assert.deepEqual(await pages('vocabulary'), grouped(wordOrder, completedWords), 'Completed words move after every unfinished word before pagination');
  await reload();
  assert.deepEqual(await visibleCards('vocabulary'), grouped(wordOrder, completedWords).slice(0, 24), 'Saved completion sorting survives reload');
  assert.deepEqual((await progress()).completedTasks, completedWords.map(id => 'vocabulary:' + id));
  const marksBeforeReveal = (await progress()).completedTasks.slice();
  await js(`document.querySelector('.word-reveal-toggle').click()`);
  assert.equal((await progress()).studyEvents.length, 1);
  assert.deepEqual((await progress()).completedTasks, marksBeforeReveal, 'Revealing a word records study without completing it');
  await select('vocabulary-completion', 'completed');
  assert.deepEqual(await visibleCards('vocabulary'), completedWords);
  await taskClick('vocabulary:' + wordOrder[0]);
  assert.deepEqual(await visibleCards('vocabulary'), completedWords.slice(1));
  assert.equal(await js('document.activeElement.dataset.task'), 'vocabulary:' + wordOrder[1], 'Removing a filtered card keeps focus on the nearest remaining card');
  await select('vocabulary-completion', 'all');
  assert.deepEqual(await pages('vocabulary'), grouped(wordOrder, completedWords.slice(1)), 'Undo returns a word to its original position among unfinished words');
  pass('vocabulary completion sorts across all pages, persists after reload, supports undo, retains focus, and stays separate from studying');

  await fresh();
  const kanjiOrder = await sourceKanji();
  assert.ok(kanjiOrder.length > 48, 'Kanji spans several pages');
  const completedKanji = [kanjiOrder[0], kanjiOrder[25]];
  await fresh('vocabulary', `p.completedTasks=${JSON.stringify(completedKanji.map(id => 'kanji:' + id))}`);
  await js(`document.getElementById('vocabulary-tab-kanji').click()`);
  assert.deepEqual(await pages('kanji'), grouped(kanjiOrder, completedKanji), 'Completed kanji moves after unfinished kanji across page boundaries');
  await reload();
  await js(`document.getElementById('vocabulary-tab-kanji').click()`);
  assert.deepEqual(await visibleCards('kanji'), grouped(kanjiOrder, completedKanji).slice(0, 24));
  await select('vocabulary-completion', 'completed');
  assert.deepEqual(await visibleCards('kanji'), completedKanji);
  await taskClick('kanji:' + kanjiOrder[0]);
  assert.equal(await js('document.activeElement.dataset.task'), 'kanji:' + kanjiOrder[25]);
  await select('vocabulary-completion', 'all');
  assert.deepEqual(await pages('kanji'), grouped(kanjiOrder, completedKanji.slice(1)), 'Unmarking kanji restores its source order');
  pass('kanji completion sorts globally before pagination, persists after reload, and restores original unfinished order on undo');

  await fresh('vocabulary', `const n3=KotobaContent.vocabulary.filter(w=>(w.jlptLevel||'n3')==='n3');const a=n3[0],b=n3.find(w=>w.id!==a.id&&w.topicId===a.topicId),c=KotobaContent.vocabulary.find(w=>w.jlptLevel==='n5');if(!b||!c)throw new Error('Missing mixed-status filter fixtures');p.bookmarks=[a.id,b.id,c.id];p.completedTasks=['vocabulary:'+a.id,'vocabulary:'+c.id];`);
  const bookmarks = await js(`(() => {const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));return p.bookmarks.map(id=>KotobaContent.vocabulary.find(w=>w.id===id));})()`);
  const [doneWord, unfinishedWord, foundationWord] = bookmarks;
  await js(`document.getElementById('vocabulary-tab-bookmarks').click()`);
  await select('vocabularyTopic', doneWord.topicId);
  await select('vocabulary-completion', 'completed');
  assert.deepEqual(await visibleCards('vocabulary'), [doneWord.id], 'Completed combines with N3, topic, and bookmarks');
  assert.equal(await js('document.activeElement.id'), 'vocabulary-completion-trigger');
  await input('vocabulary-search', doneWord.word);
  assert.deepEqual(await visibleCards('vocabulary'), [doneWord.id], 'Japanese search keeps the completed bookmarked word');
  await select('vocabulary-completion', 'unfinished');
  assert.ok(!(await visibleCards('vocabulary')).includes(doneWord.id));
  await input('vocabulary-search', '');
  assert.deepEqual(await visibleCards('vocabulary'), [unfinishedWord.id]);
  await select('vocabulary-completion', 'all');
  assert.deepEqual(await visibleCards('vocabulary'), [unfinishedWord.id, doneWord.id]);
  await select('study-level', 'n5');
  await select('vocabulary-completion', 'completed');
  assert.deepEqual(await visibleCards('vocabulary'), [foundationWord.id], 'The same completion filter follows the selected level');
  await select('vocabulary-completion', 'unfinished');
  assert.deepEqual(await visibleCards('vocabulary'), []);
  assert.ok(await js(`document.querySelector('.empty-state').textContent.includes('No matching bookmarked words')`));
  await filterField('vocabulary-completion');
  await fresh('vocabulary', `const k=KotobaContent.kanji.find(k=>k.wordIds.some(id=>(KotobaContent.vocabulary.find(w=>w.id===id)?.jlptLevel||'n3')==='n3'));p.completedTasks=['kanji:'+k.id];`);
  await js(`document.getElementById('vocabulary-tab-kanji').click()`);
  await select('vocabulary-completion', 'completed');
  const doneKanji = await js(`KotobaContent.kanji.find(k=>'kanji:'+k.id===JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)).completedTasks[0])`);
  const kanjiTopic = await js(`KotobaContent.vocabulary.find(w=>${JSON.stringify(doneKanji.wordIds)}.includes(w.id)&&(w.jlptLevel||'n3')==='n3').topicId`);
  await select('vocabularyTopic', kanjiTopic);
  await input('vocabulary-search', doneKanji.character);
  assert.deepEqual(await visibleCards('kanji'), [doneKanji.id], 'Kanji completion combines with linked-word level, topic, and character search');
  await select('vocabulary-completion', 'unfinished');
  assert.ok(!(await visibleCards('kanji')).includes(doneKanji.id));
  await select('vocabulary-completion', 'completed');
  await input('vocabulary-search', 'no-such-kanji-zz');
  assert.deepEqual(await visibleCards('kanji'), []);
  await filterField('vocabulary-completion');
  pass('All, Unfinished, and Completed combine with level, topic, search, Bookmarks, and kanji linked-word filters without losing empty-state controls');

  for (const route of ['grammar', 'reading', 'listening']) {
    const bank = route === 'reading' ? 'readings' : route;
    const topicKey = route + 'Topic';
    const listSelector = route === 'grammar' ? '.lesson-list button' : '.passage-list button';
    const prefix = route === 'grammar' ? 'grammar-lesson-' : route === 'reading' ? 'reading-passage-' : 'listening-script-';
    await fresh(route, `const x=KotobaContent.${bank}.find(x=>(x.jlptLevel||'n3')==='n3');p.completedTasks=[${JSON.stringify(route + ':')}+x.id];`);
    const selected = await js(`KotobaContent.${bank}.find(x=>${JSON.stringify(route + ':')}+x.id===JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)).completedTasks[0])`);
    await select(topicKey, selected.topicId);
    await select(route + '-completion', 'completed');
    assert.deepEqual(await js(`[...document.querySelectorAll(${JSON.stringify(listSelector)})].map(n=>n.id.slice(${prefix.length}))`), [selected.id], `${route} completed filter combines with topic and level`);
    await select(route + '-completion', 'unfinished');
    assert.ok(await js(`![...document.querySelectorAll(${JSON.stringify(listSelector)})].some(n=>n.id===${JSON.stringify(prefix + selected.id)})`));
    await select('study-level', 'n5');
    await select(route + '-completion', 'completed');
    assert.equal(await js(`document.querySelectorAll(${JSON.stringify(listSelector)}).length`), 0, `${route} does not borrow completed N3 items for N5`);
    assert.ok(await js(`document.querySelector('.empty-state').textContent.includes('match')`));
    await filterField(route + '-completion');
    await select('study-level', 'n3');
    await select(route + '-completion', 'all');
    if (route === 'grammar') {
      const before = (await progress()).completedTasks.slice();
      await click('Mark studied');
      assert.deepEqual((await progress()).completedTasks, before, 'Mark studied does not set lesson completion');
    }
  }
  pass('grammar, reading, and listening completion filters combine with level/topic, exclude opposite states, and remain usable with no results');

  await fresh('grammar');
  for (const level of ['n3', 'n2', 'n1', 'n5', 'n4']) {
    await select('study-level', level);
    const checked = await js(`(() => {const id=document.querySelector('.lesson-card.active').id.slice('grammar-lesson-'.length),lesson=KotobaContent.grammar.find(g=>g.id===id),section=document.querySelector('.study-reference'),refs=KotobaContent.referenceMap.filter(r=>r.level===(lesson.jlptLevel||'n3')&&r.skill==='grammar');return {id,actualLevel:lesson.jlptLevel||'n3',shownLevel:section?.dataset.referenceLevel,shownSkill:section?.dataset.referenceSkill,urls:[...section.querySelectorAll('a.study-reference-link')].map(a=>a.href),expectedUrls:refs.map(r=>r.sourceUrl),entries:[...section.querySelectorAll('.study-reference-entry')].map(n=>({id:n.dataset.referenceId,linkage:n.dataset.referenceLinkage,text:n.textContent})),refs,text:section.textContent};})()`);
    assert.equal(checked.actualLevel, level);
    assert.equal(checked.shownLevel, checked.actualLevel);
    assert.equal(checked.shownSkill, 'grammar');
    assert.deepEqual(checked.urls, checked.expectedUrls, `${level} links only actual-level grammar volumes`);
    if (!checked.refs.length) assert.match(checked.text, /No verified textbook volume mapping/);
    for (const ref of checked.refs) {
      const entry = checked.entries.find(entry => entry.id === ref.id);
      assert.ok(entry, `${ref.id} explains its scope`);
      const representative = ref.appContentIds.includes(checked.id);
      assert.equal(entry.linkage, representative ? 'representative' : 'general');
      assert.ok(entry.text.includes(representative ? 'Representative topic link' : 'General reference for this level'));
      for (const gap of ref.gaps || []) assert.ok(entry.text.includes(gap), `${ref.id} exposes its documented gap`);
    }
  }
  await select('study-level', 'all');
  const representative = await js(`KotobaContent.grammar.find(g=>KotobaContent.referenceMap.some(r=>r.skill==='grammar'&&r.level===(g.jlptLevel||'n3')&&r.appContentIds.includes(g.id)))?.id`);
  const general = await js(`KotobaContent.grammar.find(g=>KotobaContent.referenceMap.some(r=>r.skill==='grammar'&&r.level===(g.jlptLevel||'n3')&&!r.appContentIds.includes(g.id)))?.id`);
  assert.ok(representative && general, 'The dataset contains both linked and general lesson references');
  for (const [id, linkage] of [[representative, 'representative'], [general, 'general']]) {
    await js(`document.getElementById(${JSON.stringify('grammar-lesson-' + id)}).click()`);
    assert.ok(await js(`document.querySelector('.study-reference-entry[data-reference-linkage="${linkage}"]')!==null`));
    assert.ok(await js(`(() => {const lesson=KotobaContent.grammar.find(g=>g.id===${JSON.stringify(id)});return document.querySelector('.study-reference').dataset.referenceLevel===(lesson.jlptLevel||'n3');})()`), 'All-level view still references the selected lesson’s own level');
  }
  await metrics(360, 900);
  await js(`document.querySelector('.study-reference').scrollIntoView({block:'center',behavior:'instant'})`);
  await shot('study-reference-360.png');
  pass('grammar references follow the selected N5–N1 lesson, match publisher-map URLs, and distinguish representative links, general references, and verified gaps');

  await metrics(1440, 1000);
  await fresh('dashboard', `const lesson=KotobaContent.learningPath.find(p=>p.level==='n3').units[0].lessons[0];p.completedTasks=['vocabulary:'+lesson.vocabularyIds[0],'kanji:'+lesson.kanjiIds[0]];`);
  await nav('vocabulary');
  await select('vocabulary-completion', 'unfinished');
  await input('vocabulary-search', 'stale-search-no-results');
  await nav('dashboard');
  await js(`document.querySelector('.path-start').click()`);
  const pathWord = await js(`(() => {const button=document.querySelector('[data-study-word]');return KotobaContent.vocabulary.find(w=>w.id===button.dataset.studyWord);})()`);
  await js(`document.querySelector('[data-study-word]').click()`);
  await pause(240);
  assert.equal(await js('location.hash'), '#vocabulary');
  assert.equal(await js('document.getElementById("vocabulary-completion").value'), 'all', 'Study word clears a stale Unfinished filter for an already completed word');
  assert.equal(await js('document.getElementById("vocabularyTopic").value'), 'all');
  assert.equal(await js('document.getElementById("vocabulary-search").value'), pathWord.word);
  assert.ok(await js(`document.getElementById(${JSON.stringify('hide-' + pathWord.id)})?.closest('.vocab-card').querySelector('.word-face-back[aria-hidden=false]').textContent.includes(${JSON.stringify(pathWord.meaning)})`), 'Study word opens the actual word with its definition revealed');
  assert.ok(await js(`document.getElementById(${JSON.stringify('completed-task-vocabulary:' + pathWord.id)}).checked`), 'Navigation preserves the completed word mark');
  assert.equal(await js('document.activeElement.id'), 'hide-' + pathWord.id);
  assert.equal((await progress()).studyEvents.filter(e => e.type === 'vocabulary' && e.contentId === pathWord.id).length, 1);
  await nav('dashboard');
  await js(`document.querySelector('.path-start').click();document.querySelector('[data-study-word]').click()`);
  assert.equal((await progress()).studyEvents.filter(e => e.type === 'vocabulary' && e.contentId === pathWord.id).length, 1, 'Repeated path navigation does not double-count the same day’s study');
  await select('vocabulary-completion', 'unfinished');
  await input('vocabulary-search', 'another-stale-search');
  await nav('dashboard');
  await js(`document.querySelector('.path-start').click()`);
  const pathKanji = await js(`(() => {const button=document.querySelector('[data-study-kanji]');return KotobaContent.kanji.find(k=>k.id===button.dataset.studyKanji);})()`);
  await js(`document.querySelector('[data-study-kanji]').click()`);
  await pause(240);
  assert.equal(await js('location.hash'), '#vocabulary');
  assert.equal(await js('document.getElementById("vocabulary-tab-kanji").getAttribute("aria-pressed")'), 'true');
  assert.equal(await js('document.getElementById("vocabulary-completion").value'), 'all');
  assert.equal(await js('document.getElementById("vocabulary-search").value'), pathKanji.character);
  assert.ok(await js(`document.getElementById(${JSON.stringify('completed-task-kanji:' + pathKanji.id)}).closest('.kanji-card').textContent.includes(${JSON.stringify(pathKanji.meaning)})`), 'Kanji connections opens the chosen character and meaning');
  assert.ok(await js(`document.getElementById(${JSON.stringify('completed-task-kanji:' + pathKanji.id)}).checked`));
  assert.equal(await js('document.activeElement.id'), 'completed-task-kanji:' + pathKanji.id);
  assert.equal((await progress()).studyEvents.filter(e => e.type === 'kanji' && e.contentId === pathKanji.id).length, 1);
  pass('Learn-path Study word and Kanji connections open the correct study cards, clear stale filters, preserve completed marks, and record each study once');

  await metrics(1440, 1000);
  await fresh();
  await js(`document.getElementById('vocabulary-tab-flashcards').click()`);
  assert.equal(await js('document.getElementById("flashcard-options").open'), false);
  for (const id of ['study-level', 'flashcard-deck', 'flashcard-topic', 'flashcard-completion']) {
    assert.ok(await js(`(() => {const n=document.getElementById(${JSON.stringify(id + '-trigger')});return Boolean(n&&n.closest('.filter-bar')&&!n.closest('#flashcard-options')&&n.getBoundingClientRect().width>0);})()`), `${id} is visible outside More options`);
  }
  await select('flashcard-completion', 'unfinished');
  const flashcardId = await js('document.getElementById("flashcard-display").dataset.cardId');
  await js('document.getElementById("flashcard-flip").click()');
  await js('document.getElementById("flashcard-got-it").click()');
  assert.ok((await progress()).completedTasks.includes('vocabulary:' + flashcardId));
  assert.notEqual(await js('document.getElementById("flashcard-display").dataset.cardId'), flashcardId, 'Got it removes the card from an unfinished deck');
  await select('flashcard-completion', 'completed');
  assert.equal(await js('document.getElementById("flashcard-display").dataset.cardId'), flashcardId);
  await reload();
  await js('document.getElementById("vocabulary-tab-flashcards").click()');
  await select('flashcard-completion', 'completed');
  assert.equal(await js('document.getElementById("flashcard-display").dataset.cardId'), flashcardId, 'Got it completion survives reload');
  await js('document.getElementById("flashcard-flip").click()');
  await js('document.getElementById("flashcard-again").click()');
  assert.ok(!(await progress()).completedTasks.includes('vocabulary:' + flashcardId));
  assert.ok(await js('document.querySelector(".flashcard-empty").textContent.includes("No cards match")'));
  assert.equal((await progress()).attempts.length, 0, 'Flashcard ratings do not create assessed attempts');
  await select('flashcard-completion', 'all');
  assert.ok(await js('Boolean(document.getElementById("flashcard-display"))'));
  pass('flashcard Level, Deck, Topic, and Completion remain visible; Got it and Again update saved status and filtered decks without assessment side effects');

  await fresh();
  await js('document.getElementById("vocabulary-tab-flashcards").click()');
  await select('study-level', 'all');
  await select('flashcard-deck', 'kanji');
  const longCard = await js(`(() => {const ranked=KotobaContent.kanji.slice(0,120).map((k,index)=>({id:k.id,count:k.wordIds.filter(id=>KotobaContent.vocabulary.some(w=>w.id===id)).length,index})).sort((a,b)=>b.count-a.count||a.index-b.index);return ranked[0];})()`);
  assert.ok(longCard.count >= 4, 'A real kanji card has enough linked words to exercise document scrolling');
  await js(`(() => {for(let i=0;i<${longCard.index};i++)document.getElementById('flashcard-next').click();})()`);
  assert.equal(await js('document.getElementById("flashcard-display").dataset.cardId'), longCard.id);
  const geometry = () => js(`(() => {const d=document.getElementById('flashcard-display'),r=d.getBoundingClientRect(),active=d.querySelector('.flashcard-side[aria-hidden="false"]'),hidden=d.querySelector('.flashcard-side[aria-hidden="true"]'),type=getComputedStyle(active.querySelector('.flashcard-face > h3'));const nodes=[d,active,...active.querySelectorAll('*')].filter(n=>n instanceof HTMLElement);return {id:d.dataset.cardId,side:d.dataset.side,width:r.width,height:r.height,top:r.top+scrollY,left:r.left+scrollX,x:scrollX,y:scrollY,documentHeight:document.documentElement.scrollHeight,fontSize:type.fontSize,lineHeight:type.lineHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,activeHidden:active.inert||getComputedStyle(active).visibility==='hidden',inactiveInert:hidden.inert,inactiveHidden:getComputedStyle(hidden).visibility==='hidden',badOverflow:nodes.filter(n=>{const s=getComputedStyle(n);return n.scrollHeight>n.clientHeight+2&&['auto','scroll','hidden','clip'].includes(s.overflowY)||n.scrollWidth>n.clientWidth+2&&['auto','scroll','hidden','clip'].includes(s.overflowX);}).map(n=>n.className),meaning:active.querySelector('.flashcard-meaning')?.textContent||d.querySelector('.flashcard-meaning').textContent};})()`);
  const furiganaFonts = async (expected, label) => {
    for (const enabled of [false, true]) {
      await js(`document.getElementById('flashcard-options').open=true`);
      await pause(30);
      await js(`(() => {const input=document.getElementById('flashcard-furigana');if(input.checked!==${enabled})input.click();})()`);
      await js(`document.getElementById('flashcard-options').open=false`);
      await pause(50);
      const changed = await geometry();
      assert.equal(changed.fontSize, expected.fontSize, `${label} furigana ${enabled ? 'on' : 'off'} preserves font size`);
      assert.equal(changed.lineHeight, expected.lineHeight, `${label} furigana ${enabled ? 'on' : 'off'} preserves line height`);
    }
  };
  for (const width of [320, 360, 768, 1440]) {
    await metrics(width, width < 400 ? 800 : 1000);
    if (await js('document.getElementById("flashcard-display").dataset.side==="back"')) await js('document.getElementById("flashcard-flip").click()');
    await pause(200);
    await js(`document.getElementById('flashcard-display').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy({top:70,behavior:'instant'});document.getElementById('flashcard-display').focus({preventScroll:true})`);
    const before = await geometry();
    assert.equal(before.overflow, false, `${width}px front fits horizontally`);
    assert.deepEqual(before.badOverflow, [], `${width}px front has no nested scrolling or clipped content`);
    assert.equal(before.activeHidden, false);
    assert.equal(before.inactiveInert, true);
    assert.equal(before.inactiveHidden, true);
    const frontAX = await send('Accessibility.getFullAXTree');
    assert.ok(!frontAX.nodes.some(n => !n.ignored && n.name?.value === before.meaning), `${width}px unrevealed definition is outside the accessibility tree`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32, text: ' ' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 });
    await pause(220);
    const after = await geometry();
    assert.equal(after.side, 'back', `${width}px real keyboard flip reveals the answer`);
    for (const key of ['width', 'height', 'top', 'left', 'x', 'y', 'documentHeight']) assert.ok(Math.abs(before[key] - after[key]) < 1, `${width}px flip preserves ${key}: ${before[key]} → ${after[key]}`);
    assert.equal(after.fontSize, before.fontSize, `${width}px kanji uses the same front/back font size`);
    assert.equal(after.lineHeight, before.lineHeight, `${width}px kanji uses the same front/back line height`);
    assert.deepEqual(after.badOverflow, [], `${width}px answer has no internal scrollbars or clipping`);
    assert.equal(after.overflow, false);
    assert.equal(after.activeHidden, false);
    assert.equal(after.inactiveInert, true);
    assert.equal(after.inactiveHidden, true);
    const backAX = await send('Accessibility.getFullAXTree');
    assert.ok(backAX.nodes.some(n => !n.ignored && n.name?.value === after.meaning), `${width}px revealed meaning is accessible`);
    assert.equal(await js('document.querySelectorAll(".flashcard-side[aria-hidden=false] .flashcard-linked-words li").length'), longCard.count);
    await furiganaFonts(after, `${width}px kanji`);
    const reached = await js(`(() => {const items=document.querySelectorAll('.flashcard-side[aria-hidden=false] .flashcard-linked-words li'),last=items[items.length-1];last.scrollIntoView({block:'center',behavior:'instant'});const r=last.getBoundingClientRect(),nav=document.querySelector('.mobile-bottom-nav'),limit=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight;if(r.bottom>limit-8)window.scrollBy({top:r.bottom-limit+8,behavior:'instant'});const final=last.getBoundingClientRect();return {top:final.top,bottom:final.bottom,height:final.height,limit,scroll:scrollY};})()`);
    assert.ok(reached.top >= -1 && reached.bottom <= reached.limit + 1 && reached.height > 40 && reached.scroll > 0, `${width}px normal page scrolling reaches the full final linked word: ${JSON.stringify(reached)}`);
    if (width === 320) await shot('study-flashcard-320.png');
  }
  await select('flashcard-deck', 'vocabulary');
  for (const width of [320, 360, 768, 1440]) {
    await metrics(width, width < 400 ? 800 : 1000);
    if (await js('document.getElementById("flashcard-display").dataset.side==="back"')) await js('document.getElementById("flashcard-flip").click()');
    await js(`document.getElementById('flashcard-display').scrollIntoView({block:'center',behavior:'instant'})`);
    await pause(200);
    const before = await geometry();
    await js('document.getElementById("flashcard-flip").click()');
    await pause(200);
    const after = await geometry();
    for (const key of ['width', 'height', 'top', 'left', 'x', 'y', 'documentHeight']) assert.ok(Math.abs(before[key] - after[key]) < 1, `${width}px vocabulary flip preserves ${key}`);
    assert.equal(after.fontSize, before.fontSize, `${width}px vocabulary uses the same front/back font size`);
    assert.equal(after.lineHeight, before.lineHeight, `${width}px vocabulary uses the same front/back line height`);
    assert.deepEqual(before.badOverflow, []);
    assert.deepEqual(after.badOverflow, []);
    assert.equal(after.overflow, false);
    await furiganaFonts(after, `${width}px vocabulary`);
  }
  pass('actual kanji and vocabulary flips keep dimensions, document position, and front/back fonts at 320/360/768/1440 with furigana on/off; hidden answers stay inaccessible and long answers use normal page scrolling');

  await metrics(360, 800);
  await fresh('reading');
  await waitFor('Boolean(document.querySelector(".passage-body .gloss-word"))', 'reading vocabulary help');
  await js(`document.querySelector('.passage-body .gloss-word').scrollIntoView({block:'center',behavior:'instant'})`);
  const readingBox = () => js(`(() => {const r=document.querySelector('.passage-body').getBoundingClientRect();return {top:r.top+scrollY,height:r.height,width:r.width};})()`);
  const beforeGloss = await readingBox();
  const definition = await js(`(() => {const word=document.querySelector('.passage-body .gloss-word'),entry=KotobaContent.vocabulary.find(w=>w.id===word.dataset.vocabularyId);word.focus({preventScroll:true});return {reading:entry.reading,meaning:entry.meaning};})()`);
  const popupCheck = async () => {
    const state = await js(`(() => {const word=document.querySelector('.passage-body .gloss-word'),tip=document.getElementById(word.getAttribute('aria-describedby')),r=tip?.getBoundingClientRect();return {visible:Boolean(tip&&!tip.hidden),role:tip?.getAttribute('role'),position:tip&&getComputedStyle(tip).position,text:tip?.textContent,reading:tip?.querySelector('[lang=ja]')?.textContent,meaning:tip?.querySelector('.gloss-tooltip-meaning')?.textContent,left:r?.left,right:r?.right,top:r?.top,bottom:r?.bottom};})()`);
    assert.ok(state.visible);
    assert.equal(state.role, 'tooltip');
    assert.equal(state.position, 'fixed');
    assert.equal(state.reading, definition.reading);
    assert.equal(state.meaning, definition.meaning);
    assert.ok(state.left >= 0 && state.right <= 361 && state.top >= 0 && state.bottom <= 801, 'Definition popup fits the mobile viewport');
    assert.deepEqual(await readingBox(), beforeGloss, 'Showing a definition does not change reading layout');
  };
  await popupCheck();
  await js(`document.querySelector('.passage-body .gloss-word').click()`);
  await popupCheck();
  await js(`document.querySelector('.passage-body .gloss-word').click()`);
  assert.equal(await js('document.querySelector(".gloss-tooltip").hidden'), true);
  await js(`document.getElementById('main').focus({preventScroll:true})`);
  const point = await js(`(() => {const r=document.querySelector('.passage-body .gloss-word').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 2, radiusY: 2, force: 1 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(120);
  await popupCheck();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  assert.equal(await js('document.querySelector(".gloss-tooltip").hidden'), true);
  await nav('grammar');
  assert.equal(await js('document.querySelectorAll(".gloss-tooltip").length'), 0, 'Route cleanup removes the reading popup');
  await fresh('mock', `const a=KotobaEngine.createFullMockAttempt('n3',KotobaContent.questions);p.attempts=[a];p.activeAttemptId=a.id;`);
  await nav('reading');
  assert.equal(await js('document.querySelectorAll(".passage-body,.gloss-word,.gloss-tooltip").length'), 0, 'An active mock exposes no study passage or vocabulary help');
  await fresh('dashboard');
  assert.deepEqual(await js('window.__errors'), []);
  await metrics(1440, 1000);
  pass('reading definitions work on focus, click, and touch with fixed accessible popups, unchanged layout, route cleanup, and mock-study protection');
}
