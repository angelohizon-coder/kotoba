// Focused speech-style journeys reuse the main Chrome/CDP harness.
// Speech is simulated locally; these checks never download voices or audio.
import assert from 'node:assert/strict';

export async function runAudioChecks(harness) {
  const { js, send, nav, click, pause, progress, waitFor, pass } = harness;
  const script = await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    (() => {
      const listeners = new Set();
      const voices = [
        {voiceURI:'test-ja-natural',name:'Test Japanese Natural',lang:'ja-JP',default:true,localService:true},
        {voiceURI:'test-ja-bright',name:'Test Japanese Bright',lang:'ja-JP',default:false,localService:false},
        {voiceURI:'test-en-ignored',name:'English Only',lang:'en-US',default:false,localService:true},
      ];
      window.__speechAvailable = false;
      window.__speechCalls = [];
      window.__speechCancels = 0;
      window.__enableSpeechVoices = () => {
        window.__speechAvailable = true;
        [...listeners].forEach(listener => listener(new Event('voiceschanged')));
      };
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {configurable:true,value:function(text){this.text=text;}});
      Object.defineProperty(window, 'speechSynthesis', {configurable:true,value:{
        getVoices:() => window.__speechAvailable ? voices : [],
        addEventListener(type, listener){if(type==='voiceschanged')listeners.add(listener);},
        removeEventListener(type, listener){if(type==='voiceschanged')listeners.delete(listener);},
        cancel(){window.__speechCancels++;},
        speak(utterance){
          window.__speechCalls.push({text:utterance.text,voiceURI:utterance.voice?.voiceURI,lang:utterance.lang,rate:utterance.rate,pitch:utterance.pitch});
          queueMicrotask(() => utterance.onstart?.());
        },
      }});
    })();
  ` });
  const reload = async (ready = 'Boolean(document.querySelector(".app-shell"))') => {
    await send('Page.reload');
    await pause(200);
    await waitFor(ready, 'audio journey reload');
  };
  const fresh = async (route = 'listening', extra = '') => {
    await js(`(() => {let p=KotobaEngine.initialProgress();p.settings.soundEffects=false;${extra};localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));location.hash=${JSON.stringify(route)};})()`);
    await reload('Boolean(document.querySelector(".app-shell"))');
  };
  const voicesReady = async () => {
    await js('window.__enableSpeechVoices()');
    await waitFor(`Boolean(document.querySelector('.audio-player button') && [...document.querySelectorAll('.audio-player button')].some(n=>n.textContent==='Play / replay'&&!n.disabled))`, 'Japanese voices ready');
  };
  const choose = async (selector, value) => {
    const available = await js(`(() => {
      const select=document.querySelector(${JSON.stringify(selector)});
      if(!select)return false;
      const index=[...select.options].findIndex(option=>option.value===${JSON.stringify(value)});
      if(index<0)return false;
      const trigger=document.getElementById(select.id+'-trigger');
      if(!trigger)return false;
      if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();
      const option=document.getElementById(select.id+'-option-'+index);
      if(!option)return false;
      option.click();return true;
    })()`);
    assert.ok(available, `Selectable speech preference ${selector}=${value}`);
    await pause(40);
  };
  const withoutSpeechPreferences = state => {
    const copy = structuredClone(state);
    delete copy.settings.speechStyle;
    delete copy.settings.speechVoice;
    return copy;
  };
  const lastSpeech = () => js('window.__speechCalls.at(-1)');
  try {
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await fresh();
    await waitFor('Boolean(document.querySelector(".speech-voice-select"))', 'speech preferences');
    const untouched = await progress();
    assert.equal(untouched.settings.speechStyle, 'natural');
    assert.equal(untouched.settings.speechVoice, '');
    assert.deepEqual(await js('window.__speechCalls'), [], 'Entering Listening does not autoplay');
    assert.equal(await js('document.querySelector(".speech-voice-select").options.length'), 1, 'Only Automatic is offered before voices arrive');
    assert.ok(await js('[...document.querySelectorAll(".audio-player button")].find(n=>n.textContent==="Play / replay").disabled'));
    await js(`(() => {const select=document.querySelector('.speech-voice-select');document.getElementById(select.id+'-trigger').click();})()`);
    await voicesReady();
    await waitFor('document.querySelectorAll(".dropdown-menu [role=option]").length===3', 'open voice menu receives asynchronous options');
    assert.deepEqual(await js('[...document.querySelector(".speech-voice-select").options].map(n=>n.value)'), ['', 'test-ja-natural', 'test-ja-bright'], 'Only Japanese voices appear');
    assert.deepEqual(await js('window.__speechCalls'), [], 'Discovering voices does not autoplay');
    await choose('.speech-voice-select', 'test-ja-bright');
    assert.equal((await progress()).settings.speechVoice, 'test-ja-bright');
    await choose('.speech-style-select', 'bright');
    await click('Play / replay');
    await waitFor('window.__speechCalls.length===1', 'bright style playback');
    assert.deepEqual({ voiceURI: (await lastSpeech()).voiceURI, rate: (await lastSpeech()).rate, pitch: (await lastSpeech()).pitch }, { voiceURI: 'test-ja-bright', rate: 1.02, pitch: 1.25 });
    const beforeChange = await js('window.__speechCancels');
    await choose('.speech-style-select', 'calm');
    assert.ok(await js(`window.__speechCancels>${beforeChange}`), 'Changing a style cancels the active utterance');
    assert.ok(await js('[...document.querySelectorAll(".audio-player button")].find(n=>n.textContent==="Stop").disabled'), 'Changing a style leaves playback stopped');
    assert.deepEqual(withoutSpeechPreferences(await progress()), withoutSpeechPreferences(untouched), 'Voice preferences do not affect assessment, completion, reviews, or study events');
    for (const [style, rate, pitch] of [['calm', .8, .95], ['deep', .88, .8], ['natural', .9, 1]]) {
      if ((await progress()).settings.speechStyle !== style) await choose('.speech-style-select', style);
      const count = await js('window.__speechCalls.length');
      await click('Play / replay');
      await waitFor(`window.__speechCalls.length===${count + 1}`, `${style} style playback`);
      const speech = await lastSpeech();
      assert.equal(speech.voiceURI, 'test-ja-bright');
      assert.equal(speech.rate, rate, `${style} rate`);
      assert.equal(speech.pitch, pitch, `${style} pitch`);
      await click('Stop');
    }
    await choose('.speech-style-select', 'bright');
    const saved = await progress();
    assert.deepEqual(await js('KotobaStorage.validateProgress(JSON.parse(JSON.stringify(JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)))))'), saved, 'Selected voice and style round-trip through validated JSON backups');
    await reload('Boolean(document.querySelector(".speech-voice-select"))');
    assert.deepEqual(await js('window.__speechCalls'), [], 'Reload does not autoplay');
    await voicesReady();
    assert.equal(await js('document.querySelector(".speech-style-select").value'), 'bright');
    assert.equal(await js('document.querySelector(".speech-voice-select").value'), 'test-ja-bright');
    assert.deepEqual(await progress(), saved, 'Voice preference and study records survive reload');
    pass('asynchronous Japanese voices, live dropdown options, all four speech presets, saved choices, and playback cancellation without score changes');

    await fresh('listening', `p.settings.speechStyle='deep';p.settings.speechVoice='test-ja-uninstalled';`);
    await voicesReady();
    assert.equal(await js('document.querySelector(".speech-voice-select").value'), 'test-ja-uninstalled');
    assert.ok(await js('document.querySelector(".speech-voice-select").selectedOptions[0].textContent.includes("unavailable")'));
    assert.ok(await js('document.querySelector(".audio-status").textContent.includes("Saved voice unavailable")'));
    const unavailable = await progress();
    await click('Play / replay');
    await waitFor('window.__speechCalls.length===1', 'unavailable preference fallback');
    const fallback = await lastSpeech();
    assert.equal(fallback.voiceURI, 'test-ja-natural', 'Unavailable preferences fall back to a Japanese default');
    assert.equal(fallback.pitch, .8);
    assert.equal(fallback.rate, .88);
    await click('Stop');
    assert.deepEqual(await progress(), unavailable, 'Using a fallback does not erase the saved URI or alter progress');
    const validated = await js(`(() => {
      const original=KotobaEngine.initialProgress();
      const old=structuredClone(original);delete old.settings.speechStyle;delete old.settings.speechVoice;
      const before=JSON.stringify(old);const migrated=KotobaStorage.validateProgress(old);
      const invalid=[...['anime','',null,4,'constructor'].map(value=>['speechStyle',value]),...[null,4,{},'x'.repeat(301)].map(value=>['speechVoice',value])];
      const rejected=invalid.map(([key,value])=>{const p=structuredClone(original);p.settings[key]=value;try{KotobaStorage.validateProgress(p);return false;}catch(error){return /speech (?:style|voice) setting/.test(error.message);}});
      const longest=structuredClone(original);longest.settings.speechVoice='x'.repeat(300);
      return {defaults:{style:migrated.settings.speechStyle,voice:migrated.settings.speechVoice},unchanged:JSON.stringify(old)===before,rejected,maxLength:KotobaStorage.validateProgress(longest).settings.speechVoice.length};
    })()`);
    assert.deepEqual(validated.defaults, { style: 'natural', voice: '' }, 'Older backups receive neutral speech defaults');
    assert.equal(validated.unchanged, true, 'Migration does not mutate old backup data');
    assert.equal(validated.rejected.length, 9);
    assert.ok(validated.rejected.every(Boolean), 'Malformed styles, non-string voices, and oversized URIs are rejected');
    assert.equal(validated.maxLength, 300, 'The documented URI boundary is accepted');
    await reload('Boolean(document.querySelector(".speech-voice-select"))');
    await voicesReady();
    assert.equal((await progress()).settings.speechVoice, 'test-ja-uninstalled', 'Unavailable preference survives another reload');
    pass('unavailable Japanese voice fallback preserves preferences, validates backup limits, and migrates older settings safely');

    await fresh('mock', `
      p.settings.speechStyle='bright';p.settings.speechVoice='test-ja-bright';
      const now=Date.now()-1000;const a=KotobaEngine.createFullMockAttempt('n3',KotobaContent.questions,{now,random:()=>0});
      p={...p,attempts:[a],activeAttemptId:a.id};
      const map=Object.fromEntries(KotobaContent.questions.map(q=>[q.id,q]));
      p=KotobaEngine.finishMockSection(p,a.id,map,now+100);p=KotobaEngine.startNextMockSection(p,a.id,now+200);
      p=KotobaEngine.finishMockSection(p,a.id,map,now+300);p=KotobaEngine.startNextMockSection(p,a.id,now+400);
    `);
    await waitFor('Boolean(document.querySelector(".quiz-card .audio-player"))', 'full mock listening section');
    assert.equal((await progress()).attempts.at(-1).mock.currentSection, 2);
    assert.equal(await js('document.querySelectorAll(".speech-style-select,.speech-voice-select").length'), 0, 'Full mocks expose no style or voice chooser');
    assert.ok(await js('document.querySelector(".audio-style-note").textContent.includes("natural, neutral")'));
    await voicesReady();
    const neutralBefore = await progress();
    await click('Play / replay');
    await waitFor('window.__speechCalls.length===1', 'neutral full mock playback');
    const neutral = await lastSpeech();
    assert.deepEqual({ voiceURI: neutral.voiceURI, rate: neutral.rate, pitch: neutral.pitch }, { voiceURI: 'test-ja-natural', rate: .9, pitch: 1 }, 'Mocks ignore playful style and preferred voice settings');
    await click('Stop');
    assert.deepEqual(await progress(), neutralBefore, 'Neutral playback does not alter the active mock');
    await fresh('listening', `p.settings.speechStyle='bright';p.settings.speechVoice='test-ja-bright';`);
    await voicesReady();
    const probes = await js(`(() => {
      const item=KotobaContent.listening.find(item=>item.id===document.querySelector('.audio-player').dataset.audioId);
      const cleanups=[];const ctx={progress:()=>JSON.parse(localStorage.getItem(KotobaStorage.STORAGE_KEY)),cleanup:fn=>cleanups.push(fn)};
      const duplicate=KotobaAudio.render(ctx,item);duplicate.id='duplicate-audio-probe';document.body.append(duplicate);
      const supplied=KotobaAudio.render(ctx,{...item,audioUrl:'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='});supplied.id='supplied-audio-probe';document.body.append(supplied);
      const selectors=[...document.querySelectorAll('.speech-style-select,.speech-voice-select')];
      const result={ids:selectors.map(n=>n.id),suppliedChoices:supplied.querySelectorAll('.speech-style-select,.speech-voice-select').length,suppliedPreload:supplied.querySelector('audio').preload,speechCalls:window.__speechCalls.length,labels:selectors.every(n=>[...document.querySelectorAll('label')].some(label=>label.htmlFor===n.id||label.htmlFor===n.id+'-trigger'))};
      cleanups.forEach(fn=>fn());duplicate.remove();supplied.remove();return result;
    })()`);
    assert.equal(probes.ids.length, 4, 'Two live speech players each have their own pair of controls');
    assert.equal(new Set(probes.ids).size, probes.ids.length, 'Repeated scripts get unique control IDs');
    assert.equal(probes.labels, true, 'Each speech control has its own label');
    assert.equal(probes.suppliedChoices, 0, 'Supplied recordings expose no synthesized voice controls');
    assert.equal(probes.suppliedPreload, 'none', 'Supplied recordings wait for an explicit play gesture');
    assert.equal(probes.speechCalls, 0, 'Creating players does not autoplay');
    assert.deepEqual(await js('window.__errors'), [], 'Speech journeys introduce no browser runtime errors');
    pass('full mock listening keeps a neutral voice, repeated players keep unique controls, and supplied recordings have no speech chooser');
  } finally {
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier });
    await js(`(() => {const p=KotobaEngine.initialProgress();p.settings.soundEffects=false;localStorage.setItem(KotobaStorage.STORAGE_KEY,JSON.stringify(p));location.hash='dashboard';})()`);
    await reload();
  }
}
