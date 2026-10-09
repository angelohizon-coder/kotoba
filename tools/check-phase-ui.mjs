import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function runPhaseChecks(h) {
  const { js, send, nav, click, pause, progress, waitFor, pass, baseUrl } = h;
  const shot = async (name, selector) => {
    await js(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'start',behavior:'instant'})`);
    await pause(240);
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await h.writeFile(join(h.artifacts, name), Buffer.from(image.data, 'base64'));
  };
  const reload = async () => { await send('Page.reload'); await pause(200); await waitFor('Boolean(document.querySelector(".app-shell"))', 'local feature reload'); };
  const select = (id, value) => js(`(() => {const n=document.getElementById(${JSON.stringify(id)});if(!n)throw new Error('Missing select '+${JSON.stringify(id)});n.value=${JSON.stringify(String(value))};n.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const input = (id, value) => js(`(() => {const n=document.getElementById(${JSON.stringify(id)});n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await js(`(() => {const p=KotobaEngine.initialProgress();p.settings.studyPreferences={...KotobaPreferenceModel.initialStudyPreferences(),autoAdvance:false};p.settings.offlineCaching=false;KotobaStorage.saveProgress(p);})()`);
  await reload(); await nav('settings');
  const standardTextSize = await js('parseFloat(getComputedStyle(document.body).fontSize)');
  await js(`document.getElementById('study-pref-highContrast').click()`);
  await js(`document.getElementById('study-pref-reduceMotion').click()`);
  await select('study-pref-fontScale', 1.3);
  assert.equal(await js('document.documentElement.dataset.contrast'), 'high');
  assert.equal(await js('document.documentElement.dataset.reduceMotion'), 'true');
  assert.equal(await js('document.documentElement.style.fontSize'), '130%');
  assert.ok(await js('parseFloat(getComputedStyle(document.body).fontSize)') > standardTextSize * 1.25, 'Visible text follows the selected scale');
  await shot('comfort-high-contrast.png', '#study-pref-highContrast');
  await reload();
  assert.equal(await js('document.documentElement.dataset.contrast'), 'high');
  assert.equal((await progress()).settings.studyPreferences.reduceMotion, true);
  await js(`document.getElementById('study-pref-highContrast').click()`);
  await js(`document.getElementById('study-pref-reduceMotion').click()`);
  await select('study-pref-fontScale', 1);
  pass('comfort choices change the actual palette, motion and text scale and survive a reload');

  await js(`document.getElementById('motivation-enable').click()`);
  assert.equal((await progress()).motivation.xp, 0);
  assert.equal((await progress()).attempts.length, 0);
  await nav('dashboard');
  assert.deepEqual(await js('[...document.querySelectorAll(".dashboard-widget")].map(n=>n.dataset.widget)'), ['path', 'goal', 'review']);
  await js(`document.getElementById('dashboard-customize-trigger').click()`);
  const widgetAdded = await js(`(() => {const input=[...document.querySelectorAll('input[type=checkbox]')].find(n=>n.value==='motivation'||n.dataset.widget==='motivation'||n.closest('label')?.textContent.includes('Goals and rewards'));if(!input)return false;input.click();return true;})()`);
  assert.ok(widgetAdded, 'Rewards widget selectable');
  assert.ok(await js(`Boolean(document.querySelector('[data-widget="motivation"]'))`));
  assert.equal((await progress()).motivation.xp, 0);
  pass('optional goals enable without an account or past rewards and can be added as a home widget');

  async function completeLab(mode, forceMiss = false) {
    await nav('practice');
    const newButton = await js(`document.getElementById('lab-new-lesson')?.click();Boolean(document.getElementById('lab-mode'))`);
    assert.ok(newButton, 'Short lesson setup available');
    await select('lab-mode', mode); await select('lab-count', 3);
    await js(`document.getElementById('lab-start').click()`);
    let p = await progress();
    const session = p.learnlab.sessions.find(s => s.id === p.learnlab.activeSessionId);
    assert.equal(session.mode, mode);
    assert.equal(session.newWordIds.length || session.queue.filter(item => !item.retrieval).length, 3);
    if (mode === 'recall') await shot('learning-lab-desktop.png', '.learnlab-panel');
    await js(`document.getElementById('lab-begin').click()`);
    if (mode === 'recall') { await reload(); assert.ok(await js(`Boolean(document.getElementById('lab-answer'))`)); }
    let first = true;
    for (let step = 0; step < 13; step++) {
      const exercise = await js(`(() => {const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));const s=p.learnlab.sessions.find(s=>s.id===p.learnlab.activeSessionId);return KotobaLearnLabModel.currentExercise(s);})()`);
      assert.ok(exercise, 'A real queued exercise remains');
      if (['recall', 'dictation'].includes(exercise.kind)) {
        await input('lab-answer', forceMiss && first ? '???' : exercise.target.reading);
        await js(`document.getElementById('lab-check-answer').click()`);
      } else if (exercise.kind === 'sentence') {
        for (const part of exercise.bank.slice().sort((a,b) => Number(a.id)-Number(b.id))) {
          assert.ok(await js(`(() => {const n=[...document.querySelectorAll('.lab-bank button')].find(n=>n.textContent===${JSON.stringify(part.text)}&&!n.disabled);n?.click();return Boolean(n);})()`));
        }
        await js(`document.getElementById('lab-check-sentence').click()`);
      } else if (exercise.kind === 'pairs') {
        for (const word of exercise.words) {
          await js(`(() => {const n=[...document.querySelectorAll('.lab-pairs > div:first-child button')].find(n=>n.textContent===${JSON.stringify(word.word)});n.click();const m=[...document.querySelectorAll('.lab-pairs > div:last-child button')].find(n=>n.textContent===${JSON.stringify(word.meaning)});m.click();})()`);
        }
        await js(`document.getElementById('lab-check-pairs').click()`);
      } else {
        const answer = exercise.kind === 'bonus' ? String(exercise.bonus.correct) : exercise.target.id;
        const index = exercise.options.findIndex(option => option.id === answer) + 1;
        await js(`document.querySelector('[data-lab-choice="${index}"]').click()`);
      }
      first = false;
      p = await progress();
      const current = p.learnlab.sessions.find(s => s.id === p.learnlab.activeSessionId);
      if (current.cursor === current.queue.length) {
        await js(`document.getElementById('lab-next').click()`);
        break;
      }
      await js(`document.getElementById('lab-next').click()`);
    }
    p = await progress();
    assert.equal(p.learnlab.activeSessionId, null);
    const finished = p.learnlab.sessions.find(s => s.id === session.id);
    assert.equal(finished.status, 'complete');
    assert.equal(p.attempts.length, 0, 'Lab does not create assessed exam attempts');
    assert.equal(Object.keys(p.reviews).length, 0, 'Lab does not claim mistake mastery');
    assert.equal(Object.keys(p.srs || {}).length, 0, 'Lab does not choose an SM2 recall rating');
    assert.ok(await js(`document.querySelector('.learnlab-panel').textContent.includes('Lesson completed')`));
    return finished;
  }
  await completeLab('recall', true);
  assert.ok((await progress()).motivation.xp > 0, 'Completed real lesson earns engagement XP');
  pass('typed recall resumes after reload, preserves misses and earns engagement without exam or mastery claims');
  for (const mode of ['sentence', 'pairs', 'bonus', 'dictation']) {
    await completeLab(mode);
    pass(mode + ' lesson responds to real controls, completes its final challenge and persists');
  }
  await reload();
  const before = await progress();
  assert.ok(before.learnlab.sessions.length >= 5);
  assert.ok(await js(`(() => {const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));return JSON.stringify(KotobaStorage.validateProgress(p))===JSON.stringify(p);})()`));
  await nav('settings');
  await js(`document.getElementById('study-pref-quiet').click()`);
  await nav('practice');
  await js(`document.getElementById('lab-new-lesson')?.click()`);
  assert.ok(await js(`![...document.getElementById('lab-mode').options].some(n=>n.value==='dictation')`));
  assert.ok(!(await js(`Boolean(document.querySelector('.speech-input'))`)));
  await nav('settings');
  await js(`document.getElementById('study-pref-quiet').click()`);
  pass('combined lab and rewards backup validates after reload; quiet mode removes audio activities');

  await click('Load an example template'); await click('Preview draft'); await click('Save draft on this device');
  assert.equal((await progress()).learnlab.drafts.length, 1);
  await input('lab-report-message', 'Please review the reading in my local notes.');
  await click('Save local issue note');
  assert.equal((await progress()).learnlab.reports.length, 1);
  await reload();
  assert.equal((await progress()).learnlab.drafts.length, 1);
  assert.equal((await progress()).learnlab.reports.length, 1);
  assert.equal(await js('KotobaContent.vocabulary.some(w=>w.id==="draft-my-example")'), false);
  pass('draft preview, local save and content issue notes survive reload without changing assessment content');

  const personalBefore = await progress();
  await js(`document.getElementById('local-data-summary').click()`);
  assert.equal(await js(`document.getElementById('local-data-include-rewards').checked`), false);
  await js(`document.getElementById('local-data-select-drafts').click();document.getElementById('local-data-review-delete').click()`);
  assert.equal(await js('document.activeElement.id'), 'local-data-cancel-delete');
  await js(`document.getElementById('local-data-cancel-delete').click()`);
  assert.deepEqual(await progress(), personalBefore, 'Cancel keeps all data');
  await js(`document.getElementById('local-data-review-delete').click();document.getElementById('local-data-confirm-delete').click()`);
  const personalAfter = await progress();
  assert.equal(personalAfter.learnlab.drafts.length, 0);
  assert.deepEqual(personalAfter.learnlab.reports, personalBefore.learnlab.reports);
  assert.deepEqual(personalAfter.learnlab.sessions, personalBefore.learnlab.sessions);
  for (const key of ['attempts', 'reviews', 'srs', 'motivation', 'bookmarks', 'completedTasks', 'settings']) assert.deepEqual(personalAfter[key], personalBefore[key]);
  await reload(); assert.equal((await progress()).learnlab.drafts.length, 0);
  pass('private summary controls and confirmed draft-only cleanup preserve notes and every learning/reward record');

  await js(`document.getElementById('study-pref-untimedPractice').click()`);
  await nav('mock');
  assert.ok(await js(`(() => {const b=document.getElementById('start-full-mock');b?.click();return Boolean(b);})()`));
  const untimedProgress = await progress();
  const untimed = untimedProgress.attempts.find(a => a.id === untimedProgress.activeAttemptId);
  assert.equal(untimed.type, 'practice'); assert.equal(untimed.deadline, null);
  assert.ok(untimed.questionOrder.length > 50);
  pass('untimed preference starts the complete question pool without altering timed-mock section rules');

  await js(`(() => {const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));p.activeAttemptId=null;p.attempts=[];KotobaStorage.saveProgress(p);})()`);
  await reload(); await nav('settings');
  await js(`document.getElementById('offline-cache-toggle').click()`);
  await waitFor('KotobaOffline.state().cache === "ready"', 'installed offline library');
  await waitFor('Boolean(navigator.serviceWorker.controller)', 'service worker controller');
  await js(`document.getElementById('offline-cache-toggle').click();document.getElementById('offline-cache-toggle').click();document.getElementById('offline-cache-toggle').click();document.getElementById('offline-cache-toggle').click()`);
  await js('KotobaOffline.ensure(JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)).settings)');
  assert.equal(await js('KotobaOffline.state().cache'), 'ready', 'Rapid toggles honor the final enabled choice');
  await waitFor('KotobaOffline.state().archive === "saved"', 'ordered IndexedDB archive');
  assert.equal(await js(`navigator.serviceWorker.controller.scriptURL`), new URL('sw.js', baseUrl).href);
  await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await reload();
  for (const route of ['dashboard', 'vocabulary', 'grammar', 'reading', 'listening', 'practice', 'mock', 'review', 'settings']) {
    await nav(route); await reload();
    assert.equal(await js('location.hash'), '#' + route);
    assert.ok(!(await js(`document.querySelector('main').textContent.includes('This view could not open')`)));
  }
  await nav('vocabulary');
  await js(`document.querySelector('.bookmark-button').click()`);
  await waitFor('KotobaOffline.state().archive === "saved"', 'offline saved archive');
  const saved = await progress();
  const archive = await js('KotobaOffline.readArchive()');
  assert.deepEqual(archive.progress, saved);
  await reload(); assert.deepEqual(await progress(), saved);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await nav('settings'); await js(`document.getElementById('offline-cache-toggle').click()`);
  await waitFor('KotobaOffline.state().cache === "not-enabled"', 'offline library opt-out');
  assert.equal(await js(`caches.keys().then(names=>names.filter(n=>n.startsWith('kotoba-library-'+new URL('./',location.href).pathname+':')).length)`), 0);
  assert.equal(await js(`navigator.serviceWorker.getRegistration(new URL('./',location.href).href).then(r=>Boolean(r))`), false);
  assert.equal((await progress()).bookmarks.length, saved.bookmarks.length);
  assert.ok(await js(`KotobaOffline.readArchive().then(r=>Boolean(r))`));
  pass('packaged subpath reloads all nine screens offline, saves and archives progress, and removes only its library on opt-out');
  await js(`(() => {
    const p=KotobaEngine.initialProgress(),lesson=KotobaContent.learningPath.find(p=>p.level==='n3').units[0].lessons[0];
    const at=days=>new Date(Date.now()-days*86400000).toISOString();
    for(const id of lesson.questionIds){const q=KotobaContent.questions.find(q=>q.id===id);p.reviews[id]={questionId:id,lastAnswerId:q.options.find(o=>o.id!==q.correctOptionId).id,firstMissedAt:at(60),lastMissedAt:at(50),lastReviewedAt:at(35),dueAt:at(28),streak:3,mastered:true};}
    KotobaStorage.saveProgress(KotobaStorage.validateProgress(p));location.hash='dashboard';
  })()`);
  await reload();
  assert.ok(await js(`Boolean(document.querySelector('.path-recall-gold.path-recall-attention'))`));
  assert.ok(await js(`document.querySelector('.path-recall-gold').textContent.includes('Review attention')`));
  const priorReviews = (await progress()).reviews;
  await js(`document.querySelector('.path-start').click()`);
  assert.deepEqual((await progress()).reviews, priorReviews);
  const declared = await js(`(() => {const p=JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY));const lesson=KotobaContent.learningPath.find(p=>p.level==='n3').units[0].lessons[0];return KotobaPathRecall.selectRapidReview(p,lesson);})()`);
  await js(`document.getElementById('path-rapid-review').click()`);
  const rapid = await progress();
  const attempt = rapid.attempts.find(a=>a.id===rapid.activeAttemptId);
  assert.equal(attempt.questionOrder.length, declared.questions.length);
  assert.ok(attempt.questionOrder.length > 0 && attempt.questionOrder.length <= 10);
  assert.equal(new Set(attempt.questionOrder.map(id=>declared.questions.find(q=>q.id===id).vocabularyId)).size, attempt.questionOrder.length);
  assert.deepEqual(rapid.reviews, priorReviews);
  assert.equal(rapid.completedTasks.length, 0);
  await nav('dashboard');
  await shot('path-review-attention.png', '.path-recall-panel');
  pass('mastered path nodes show a 30-day reminder and start an honest existing-word review without clearing mastery');
  assert.deepEqual(await js('window.__errors'), []);
}
