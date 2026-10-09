// Real browser journeys for newly authored content, references and saved lessons.
import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function runDatasetChecks(h) {
  const { js, send, nav, click, pause, progress, waitFor, pass } = h;
  const levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
  const reload = async () => { await send('Page.reload'); await pause(160); await waitFor('Boolean(document.querySelector(".app-shell"))', 'expanded library'); };
  const fresh = async (route, level = 'n3', seed = '') => {
    await js(`(() => {let p=KotobaEngine.initialProgress();p.settings.soundEffects=false;p.settings.studyLevel=${JSON.stringify(level)};${seed};localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));sessionStorage.removeItem('kotoba-n3-seen-scripts-'+KotobaContent.CONTENT_VERSION);location.hash=${JSON.stringify(route)};})()`);
    await reload();
  };
  const select = async (id, value) => {
    assert.ok(await js(`(() => {const n=document.getElementById(${JSON.stringify(id)});if(!n)return false;n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`), id);
    await pause(40);
  };
  const clickId = async id => assert.ok(await js(`(() => {const n=document.getElementById(${JSON.stringify(id)});if(!n||n.disabled)return false;n.click();return true;})()`), id);
  const metrics = async width => { await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:width<768}); await pause(100); };
  const screenshot = async (name, selector) => {
    await js(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'})`);
    await pause(120); const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await h.writeFile(join(h.artifacts,name),Buffer.from(shot.data,'base64'));
  };

  await metrics(1440); await fresh('settings');
  const library = await js(`(() => {const section=document.getElementById('content-source-guide');return {heading:section.querySelector('h2').textContent,rows:[...section.querySelectorAll('[data-library-level]')].map(n=>({level:n.dataset.libraryLevel,counts:[...n.querySelectorAll('dd')].map(d=>Number(d.textContent))})),expected:KotobaContent.datasetInventory.map(r=>({level:r.level,counts:[r.vocabulary,r.kanji,r.grammar,r.readings,r.listening,r.questions]})),links:[...section.querySelectorAll('a')].map(a=>({href:a.href,rel:a.rel,target:a.target})),sources:KotobaContent.datasetSources.length};})()`);
  assert.equal(library.heading,'Library and sources'); assert.deepEqual(library.rows,library.expected); assert.equal(library.rows.length,5); assert.ok(library.sources>=48);
  for(const link of library.links){assert.match(link.href,/^https:\/\//);assert.equal(link.target,'_blank');assert.ok(link.rel.includes('noopener')&&link.rel.includes('noreferrer'));}
  for(const level of ['n5','n2']) await js(`document.querySelector('[data-source-level="${level}"]').open=true`);
  assert.ok(await js(`document.querySelector('[data-source-level="n5"]').textContent.includes('Irodori')`));
  assert.ok(await js(`document.querySelector('[data-source-level="n2"]').textContent.includes('Shin Kanzen Master')`));
  const sourceOnly = await progress(); await reload(); assert.deepEqual((await progress()).completedTasks,sourceOnly.completedTasks); assert.deepEqual((await progress()).reviews,sourceOnly.reviews);
  pass('Settings shows measured N5–N1 inventory, inspected primary sources and safe external links without recording mastery');

  for(const level of levels){
    await fresh('vocabulary',level,`p.bookmarks=[KotobaContent.vocabulary.find(w=>w.id.startsWith('ds-v-')&&w.jlptLevel===${JSON.stringify(level)}&&/\\p{Script=Han}/u.test(w.word)).id];`);
    await clickId('vocabulary-tab-flashcards'); await clickId('flashcard-options-toggle'); await clickId('flashcard-bookmarks');
    const word = await js(`KotobaContent.vocabulary.find(w=>w.id===document.getElementById('flashcard-display').dataset.cardId)`);
    assert.equal(word.jlptLevel,level); assert.ok(word.id.startsWith('ds-v-'));
    const shape = () => js(`(() => {const n=document.getElementById('flashcard-display'),r=n.getBoundingClientRect();return {width:r.width,height:r.height,font:getComputedStyle(document.getElementById('flashcard-word')).fontSize,innerScroll:n.scrollHeight>n.clientHeight+1};})()`);
    const before=await shape(); await clickId('flashcard-flip'); await pause(250); const after=await shape(); assert.deepEqual(after,before); assert.equal(after.innerScroll,false);
    assert.ok(await js(`document.querySelector('.flashcard-side[aria-hidden="false"]').textContent.includes(${JSON.stringify(word.meaning)})`));
    await clickId('flashcard-got-it'); assert.ok((await progress()).completedTasks.includes('vocabulary:'+word.id));
    await select('flashcard-completion','completed'); assert.equal(await js(`document.getElementById('flashcard-display').dataset.cardId`),word.id);
    await select('flashcard-deck','kanji');
    const connection=await js(`(() => {const id=document.getElementById('flashcard-display')?.dataset.cardId;return KotobaContent.kanji.find(k=>k.id===id)?.wordIds.includes(${JSON.stringify(word.id)})||false;})()`);
    // The completed filter belongs to the selected deck, so no kanji is inferred completed.
    assert.equal(connection,false); await select('flashcard-completion','all');
    assert.ok(await js(`KotobaContent.kanji.find(k=>k.id===document.getElementById('flashcard-display').dataset.cardId).wordIds.includes(${JSON.stringify(word.id)})`));
  }
  pass('new words at all five levels reach flashcards, keep stable faces, save completion and connect to real linked kanji');

  for(const level of levels){
    await fresh('grammar',level);
    const grammar=await js(`KotobaContent.grammar.find(g=>g.id.startsWith('ds-g-')&&g.jlptLevel===${JSON.stringify(level)})`);
    await clickId('grammar-lesson-'+grammar.id);
    assert.ok(await js(`document.querySelector('.lesson-detail').textContent.includes(${JSON.stringify(grammar.comparison)})`));
    assert.equal(await js(`document.querySelector('.study-reference').dataset.referenceLevel`),level);
    await nav('reading'); const reading=await js(`KotobaContent.readings.find(r=>r.id.startsWith('ds-r-')&&r.jlptLevel===${JSON.stringify(level)})`);
    await clickId('reading-passage-'+reading.id); assert.equal(await js(`document.querySelector('.passage-body').textContent`),reading.body);
    await click('Answer 2 questions'); await waitFor('Boolean(document.querySelector(".quiz-card"))','new reading questions');
    const readingProgress=await progress(),attempt=readingProgress.attempts.find(a=>a.id===readingProgress.activeAttemptId);
    assert.deepEqual(new Set(attempt.questionOrder),new Set(reading.questionIds)); assert.equal(await js(`document.querySelectorAll('.quiz-card .feedback').length`),0);
    assert.equal(await js(`document.querySelectorAll('.quiz-card .translation').length`),0);

    await fresh('listening',level);
    const audio=await js(`KotobaContent.listening.find(l=>l.id.startsWith('ds-l-')&&l.jlptLevel===${JSON.stringify(level)})`);
    await clickId('listening-script-'+audio.id);
    assert.equal(await js(`document.querySelector('.audio-player').dataset.audioId`),audio.id);
    await clickId('listening-script-toggle'); assert.equal(await js(`document.querySelector('.transcript').textContent`),audio.script);
    await click('Start script-study questions'); const p=await progress(),a=p.attempts.find(a=>a.id===p.activeAttemptId);
    assert.deepEqual(new Set(a.questionOrder),new Set(audio.questionIds)); assert.equal(a.listeningAccess,'script');
    assert.equal(await js(`KotobaEngine.gradeAttempt(${JSON.stringify(a)},Object.fromEntries(KotobaContent.questions.map(q=>[q.id,q]))).total`),0);
  }
  pass('new grammar, reading and listening at every level open their own references and canonical questions with answer and scoring protections');

  for(const level of levels){
    const newPrefix=['n5','n4'].includes(level)?level:'ds-'+level;
    await fresh('dashboard',level,`p.settings.pathResume=KotobaContent.learningPath.find(p=>p.level===${JSON.stringify(level)}).units.flatMap(u=>u.lessons).find(l=>l.kind==='daily'&&l.id.startsWith(${JSON.stringify(newPrefix+'-day-')})).id;p.completedTasks=['path:n3-day-1'];`);
    await click('Continue lesson');
    const lesson=await js(`(() => {const id=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)).settings.pathResume;return KotobaContent.learningPath.flatMap(p=>p.units.flatMap(u=>u.lessons)).find(l=>l.id===id);})()`);
    assert.ok(await js(`document.querySelector('[data-study-word]')&&document.querySelector('.path-reading .passage-body')&&document.querySelector('.path-listening .audio-player')`));
    assert.ok(await js(`document.querySelector('[data-study-word]').dataset.studyWord===${JSON.stringify(lesson.vocabularyIds[0])}`));
    assert.equal(await js(`document.querySelector('.path-listening .audio-player').dataset.audioId`),lesson.listeningId);
    const linked=await js(`(() => {const b=document.querySelector('[data-study-word]');b.click();return b.dataset.studyWord;})()`);
    assert.ok(await js(`document.getElementById('hide-'+${JSON.stringify(linked)})`));
    await reload(); const saved=await progress(); assert.equal(saved.settings.pathResume,lesson.id); assert.ok(saved.completedTasks.includes('path:n3-day-1'));
    assert.deepEqual(await js(`KotobaStorage.validateProgress(JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY))).settings.pathResume`),lesson.id);
  }
  pass('new integrated N5/N4 and appended N3–N1 lessons open study links, include reading/audio and preserve resume plus established checkmarks');

  await fresh('settings');
  await js(`document.querySelector('[data-source-level="n5"]').open=true;document.querySelector('[data-source-level="n2"]').open=true`);
  for(const width of [320,360,768,1440]){
    await metrics(width); assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth+1`),width+'px source guide overflow');
    assert.equal(await js(`document.querySelectorAll('[data-library-level]').length`),5);
  }
  await screenshot('dataset-sources-1440.png','#content-source-guide'); await metrics(360); await screenshot('dataset-sources-360.png','#content-source-guide');
  await fresh('dashboard','n5'); await click('Start lesson');
  assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth+1`),'N5 integrated mobile path overflow');
  await screenshot('dataset-path-n5-360.png','#daily-lesson'); await metrics(1440);
  assert.deepEqual(await js(`window.__errors||[]`),[]);
  pass('expanded library references and foundation learning path remain fluid on mobile and desktop');
}
