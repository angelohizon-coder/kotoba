// Run the actual browser audio helper with controllable speech and audio APIs.
// No network, npm dependency, system voice, or microphone is used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../web/audio.js', import.meta.url), 'utf8');
const voices = [
  { voiceURI: 'english', name: 'English', lang: 'en-US', default: true, localService: true },
  { voiceURI: 'ja-default', name: 'Japanese default', lang: 'ja-JP', default: true, localService: true },
  { voiceURI: 'ja-online', name: 'Japanese alternate', lang: 'ja_JP', default: false, localService: false },
];
class Element {
  constructor(tag, attrs = {}, children = []) {
    this.tagName = tag.toUpperCase(); this.attrs = {}; this.handlers = {}; this.children = children.flat().filter(value => value != null && value !== false); this.value = '';
    this.currentTime = 0; this.playbackRate = 1; this.plays = 0; this.pauses = 0; this.loads = 0;
    for (const [key, value] of Object.entries(attrs)) {
      if (/^on[A-Z]/.test(key)) this.handlers[key.slice(2).toLowerCase()] = value;
      else { this[key] = value; this.attrs[key] = value; }
    }
  }
  set textContent(value) { this._text = String(value); }
  get textContent() { return this._text ?? this.children.map(value => typeof value === 'string' ? value : value.textContent).join(''); }
  append(...children) { this.children.push(...children.flat().filter(value => value != null && value !== false)); }
  replaceChildren(...children) { this.children = children.flat(); }
  addEventListener(type, handler) { this.handlers[type] = handler; }
  removeAttribute(name) { delete this.attrs[name]; delete this[name]; }
  click() { if (!this.disabled) this.handlers.click?.({ type: 'click', target: this }); }
  play() { this.plays++; return Promise.resolve(); }
  pause() { this.pauses++; }
  load() { this.loads++; }
}
const descend = function* (node) { yield node; for (const child of node.children || []) if (child instanceof Element) yield* descend(child); };
const find = (node, predicate) => [...descend(node)].find(predicate);
const getButton = (node, text) => { const button = find(node, item => item.tagName === 'BUTTON' && item.textContent === text); assert.ok(button, `Button: ${text}`); return button; };
function fixture(options = {}) {
  let serial = 0, available = options.voices ?? voices;
  const timers = new Map(), listeners = new Set(), utterances = [], contexts = [];
  const stats = { cancel: 0, updates: 0, failures: 0 };
  const el = (tag, attrs = {}, ...children) => new Element(tag, attrs, children);
  const synth = {
    getVoices: () => { if (options.voiceThrows) throw new Error('Unavailable'); return available; },
    addEventListener: (type, callback) => { assert.equal(type, 'voiceschanged'); listeners.add(callback); },
    removeEventListener: (type, callback) => listeners.delete(callback),
    speak: utterance => { utterances.push(utterance); if (options.speakThrows) throw new Error('Rejected'); },
    cancel: () => stats.cancel++,
  };
  class Speech { constructor(text) { this.text = text; } }
  const window = {
    KotobaUI: { el, button: (text, callback, className, attrs = {}) => el('button', { type: 'button', className, ...attrs, onClick: callback }, text) },
    speechSynthesis: options.unsupported ? undefined : synth,
    SpeechSynthesisUtterance: options.noUtterance ? undefined : Speech,
  };
  if (options.preferencesAPI) window.KotobaPreferences = { get: progress => ({ quiet: false, autoSpeak: false, ...progress.settings.studyPreferences }) };
  vm.runInNewContext(source, {
    window,
    setTimeout: (callback, delay) => { const id = ++serial; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  }, { filename: 'web/audio.js' });
  function context(settings = {}, active = null) {
    const state = { settings: { speechStyle: 'natural', speechVoice: '', ...settings }, attempts: active ? [active] : [], activeAttemptId: active?.id ?? null };
    const disposers = [];
    const ctx = { progress: () => state, cleanup: callback => disposers.push(callback), update: callback => { stats.updates++; Object.assign(state, callback(state)); } };
    const result = { ctx, state, cleanup: () => disposers.forEach(callback => callback()) };
    contexts.push(result); return result;
  }
  return {
    api: window.KotobaAudio, stats, utterances, timers, listeners, context,
    voicesChanged: next => { available = next; for (const callback of [...listeners]) callback(); },
    timeout: delay => { const batch = [...timers.entries()].filter(([, timer]) => timer.delay === delay); for (const [id, timer] of batch) { timers.delete(id); timer.callback(); } },
    render: (ctx, item = { id: 'one', script: '連絡' }) => window.KotobaAudio.render(ctx, item, () => stats.failures++),
    cleanup: () => contexts.forEach(item => item.cleanup()),
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const activeMock = { id: 'mock', type: 'mock', status: 'in-progress', deadline: null };
const activeTimed = { id: 'timed', type: 'practice', status: 'in-progress', deadline: Date.now() + 60000 };
let checks = 0;
async function check(label, run) { await run(); checks++; console.log('PASS ' + label); }

await check('rendering and voice discovery never autoplay or change study/assessment data', () => {
  const f = fixture({ voices: [] }), c = f.context(); const before = JSON.stringify(c.state); const node = f.render(c.ctx);
  assert.equal(f.utterances.length, 0); assert.equal(getButton(node, 'Slow · 0.5x').disabled, true);
  f.voicesChanged(voices); assert.equal(getButton(node, 'Slow · 0.5x').disabled, false); assert.equal(f.utterances.length, 0);
  assert.equal(JSON.stringify(c.state), before); assert.equal(f.stats.updates, 0); f.cleanup();
});
await check('ordinary and half-speed playback use the selected Japanese voice and preset', () => {
  const f = fixture(), c = f.context({ speechStyle: 'bright', speechVoice: 'ja-online' }); const node = f.render(c.ctx);
  getButton(node, 'Play / replay').click(); const ordinary = f.utterances[0];
  assert.equal(ordinary.voice.voiceURI, 'ja-online'); assert.equal(ordinary.lang, 'ja_JP'); assert.equal(ordinary.rate, 1.02); assert.equal(ordinary.pitch, 1.25);
  ordinary.onstart(); getButton(node, 'Slow · 0.5x').click(); const slow = f.utterances[1];
  assert.equal(slow.text, '連絡'); assert.equal(slow.voice.voiceURI, 'ja-online'); assert.equal(slow.rate, .51); assert.equal(slow.pitch, 1.25); assert.equal(f.stats.cancel, 1);
  slow.onstart(); assert.ok(node.textContent.includes('half speed')); slow.onend(); assert.equal(getButton(node, 'Stop').disabled, true); assert.equal(f.stats.failures, 0); assert.equal(f.stats.updates, 0); f.cleanup();
});
await check('a mock keeps neutral ordinary playback and exposes no Slow or preferred-voice selectors', () => {
  const f = fixture(), c = f.context({ speechStyle: 'bright', speechVoice: 'ja-online' }, activeMock); const node = f.render(c.ctx);
  assert.equal(find(node, item => item.tagName === 'BUTTON' && item.textContent.includes('0.5x')), undefined);
  assert.equal(find(node, item => item.tagName === 'SELECT'), undefined); assert.ok(node.textContent.includes('natural, neutral'));
  getButton(node, 'Play / replay').click(); assert.equal(f.utterances[0].rate, .9); assert.equal(f.utterances[0].pitch, 1); assert.equal(f.utterances[0].voice.voiceURI, 'ja-default');
  assert.equal(f.api.speakText(c.ctx, '答え', { slow: true }).reason, 'assessment'); assert.equal(f.utterances.length, 1); f.cleanup();
});
await check('timed assessment never exposes slow playback and a stale study Slow button cannot bypass it', () => {
  const f = fixture(), timed = f.context({ speechStyle: 'calm' }, activeTimed); const timedNode = f.render(timed.ctx);
  assert.equal(find(timedNode, item => item.tagName === 'BUTTON' && item.textContent.includes('0.5x')), undefined);
  getButton(timedNode, 'Play / replay').click(); assert.equal(f.utterances[0].rate, .8, 'Existing timed non-mock style behavior is preserved');
  const study = f.context(), studyNode = f.render(study.ctx); study.state.attempts = [activeTimed]; study.state.activeAttemptId = activeTimed.id;
  getButton(studyNode, 'Slow · 0.5x').click(); assert.equal(f.utterances.length, 1);
  assert.equal(f.api.speakText(study.ctx, '目標').reason, 'assessment'); assert.equal(f.stats.updates, 0); f.cleanup();
});
await check('supplied recordings use real audio half-speed and return to normal on ordinary replay', async () => {
  const f = fixture(), c = f.context({ speechStyle: 'deep', speechVoice: 'ja-online' }); const node = f.render(c.ctx, { id: 'recorded', audioUrl: './example.ogg', script: 'unused' });
  const audio = find(node, item => item.tagName === 'AUDIO'); assert.equal(find(node, item => item.tagName === 'SELECT'), undefined); assert.equal(audio.plays, 0);
  getButton(node, 'Slow · 0.5x').click(); await flush(); assert.equal(audio.playbackRate, .5); assert.equal(audio.plays, 1);
  getButton(node, 'Play / replay').click(); await flush(); assert.equal(audio.playbackRate, 1); assert.equal(audio.plays, 2); assert.equal(f.utterances.length, 0); assert.equal(f.stats.failures, 0);
  c.cleanup(); assert.equal(audio.loads, 1); assert.equal(audio.attrs.src, undefined);
});
await check('self-study speech requires opt-in for auto and respects quiet and assessment restrictions', () => {
  const f = fixture({ preferencesAPI: true });
  for (const [settings, active, options, reason] of [
    [{}, null, { auto: true }, 'automatic-disabled'],
    [{ studyPreferences: { quiet: true, autoSpeak: true } }, null, {}, 'quiet'],
    [{ studyPreferences: { quiet: true, autoSpeak: true } }, null, { auto: true }, 'quiet'],
    [{ studyPreferences: { autoSpeak: true } }, activeMock, { auto: true }, 'assessment'],
    [{}, activeTimed, { slow: true }, 'assessment'],
  ]) {
    const c = f.context(settings, active); const result = f.api.speakText(c.ctx, '予定', options);
    assert.equal(result.reason, reason); assert.equal(result.pending, false); result.cancel();
  }
  assert.equal(f.utterances.length, 0); assert.equal(f.listeners.size, 0); assert.equal(f.timers.size, 0); assert.equal(f.stats.cancel, 0); assert.equal(f.stats.updates, 0);
  const enabled = f.context({ studyPreferences: { autoSpeak: true } }); const handle = f.api.speakText(enabled.ctx, '予定', { auto: true });
  assert.equal(f.utterances.length, 1); assert.equal(handle.started, false); f.utterances[0].onstart(); assert.equal(handle.started, true); assert.equal(handle.pending, false); f.cleanup();
});
await check('the helper preserves actual voice selection, all four styles and explicit half speed', () => {
  const expected = { natural: [1, .9], bright: [1.25, 1.02], calm: [.95, .8], deep: [.8, .88] };
  const f = fixture();
  for (const [style, [pitch, rate]] of Object.entries(expected)) {
    const c = f.context({ speechStyle: style, speechVoice: 'ja-online' }); const before = JSON.stringify(c.state); const handle = f.api.speakText(c.ctx, '待ち合わせ', { slow: true }); const utterance = f.utterances.at(-1);
    assert.equal(utterance.text, '待ち合わせ'); assert.equal(utterance.voice.voiceURI, 'ja-online'); assert.equal(utterance.rate, rate * .5); assert.equal(utterance.pitch, pitch);
    utterance.onstart(); utterance.onend(); assert.equal(handle.reason, 'finished'); assert.equal(JSON.stringify(c.state), before);
  }
  assert.equal(f.stats.updates, 0); assert.equal(f.stats.failures, 0); f.cleanup();
});
await check('missing saved voices fall back to an actual Japanese default without changing preferences', () => {
  const f = fixture(), c = f.context({ speechStyle: 'not-a-style', speechVoice: 'missing-system-voice' });
  const handle = f.api.speakText(c.ctx, '健康'); assert.equal(f.utterances[0].voice.voiceURI, 'ja-default'); assert.equal(f.utterances[0].rate, .9); assert.equal(f.utterances[0].pitch, 1);
  assert.equal(c.state.settings.speechVoice, 'missing-system-voice'); assert.equal(f.stats.updates, 0); handle.cancel(); f.cleanup();
});
await check('delayed Japanese voices resolve one pending request without autoplaying anything else', () => {
  const f = fixture({ voices: [voices[0]] }), c = f.context(); const handle = f.api.speakText(c.ctx, '予約');
  assert.equal(handle.pending, true); assert.equal(f.utterances.length, 0); assert.equal(f.listeners.size, 1);
  f.voicesChanged(voices); assert.equal(f.utterances.length, 1); assert.equal(f.listeners.size, 0); f.voicesChanged(voices); assert.equal(f.utterances.length, 1);
  f.utterances[0].onstart(); assert.equal(handle.started, true); assert.equal(f.timers.size, 0); f.cleanup();
});
await check('pending discovery rechecks quiet, automatic opt-in and assessment state before speech', () => {
  for (const restrict of ['quiet', 'automatic-disabled', 'assessment']) {
    const f = fixture({ voices: [] }), c = f.context({ studyPreferences: { autoSpeak: true } }); const handle = f.api.speakText(c.ctx, '安全', { auto: true });
    if (restrict === 'quiet') c.state.settings.studyPreferences.quiet = true;
    else if (restrict === 'automatic-disabled') c.state.settings.studyPreferences.autoSpeak = false;
    else { c.state.attempts = [activeMock]; c.state.activeAttemptId = activeMock.id; }
    f.voicesChanged(voices); assert.equal(handle.reason, restrict); assert.equal(f.utterances.length, 0); assert.equal(f.listeners.size, 0); assert.equal(f.timers.size, 0); f.cleanup();
  }
});
await check('disposed requests and old speech callbacks cannot stop or mutate a newer helper', () => {
  const f = fixture(), old = f.context(), newer = f.context(); const first = f.api.speakText(old.ctx, '古い言葉'); const oldSpeech = f.utterances[0], staleStart = oldSpeech.onstart, staleError = oldSpeech.onerror;
  const second = f.api.speakText(newer.ctx, '新しい言葉'); assert.equal(first.reason, 'canceled'); assert.equal(f.stats.cancel, 1);
  const newSpeech = f.utterances[1]; newSpeech.onstart(); old.cleanup(); staleStart(); staleError({ error: 'network' });
  assert.equal(f.stats.cancel, 1, 'Old cleanup cannot cancel the newer owner'); assert.equal(second.started, true); assert.equal(second.reason, ''); assert.equal(f.stats.updates, 0);
  f.api.stop(); assert.equal(second.reason, 'canceled'); assert.equal(f.stats.cancel, 2); assert.equal(f.timers.size, 0); f.cleanup();
});
await check('rendered players and helpers share playback ownership without stale-cleanup cancellation', () => {
  const f = fixture(), rendered = f.context(), helper = f.context(); const node = f.render(rendered.ctx); getButton(node, 'Play / replay').click(); const staleStart = f.utterances[0].onstart;
  const handle = f.api.speakText(helper.ctx, '復習'); assert.equal(f.stats.cancel, 1); f.utterances[1].onstart(); rendered.cleanup(); staleStart();
  assert.equal(f.stats.cancel, 1); assert.equal(handle.started, true); assert.equal(f.stats.failures, 0);
  const latest = f.context(); const latestNode = f.render(latest.ctx, { id: 'two', script: '次' }); getButton(latestNode, 'Play / replay').click(); assert.equal(handle.reason, 'canceled'); assert.equal(f.stats.cancel, 2);
  helper.cleanup(); assert.equal(f.stats.cancel, 2); f.utterances[2].onstart(); assert.ok(latestNode.textContent.includes('Playing Japanese')); f.cleanup(); assert.equal(f.stats.cancel, 3);
});
await check('voice discovery disposal, missing voices and failed starts return safely without a grade', () => {
  const delayed = fixture({ voices: [] }), old = delayed.context(); const handle = delayed.api.speakText(old.ctx, '場所'); const staleDiscovery = [...delayed.listeners][0]; old.cleanup(); delayed.voicesChanged(voices); staleDiscovery();
  assert.equal(handle.reason, 'canceled'); assert.equal(delayed.utterances.length, 0); assert.equal(delayed.timers.size, 0);
  const missing = fixture({ voices: [voices[0]] }), missingCtx = missing.context(); const noVoice = missing.api.speakText(missingCtx.ctx, '場所'); missing.timeout(3000); assert.equal(noVoice.reason, 'no-japanese-voice'); assert.equal(missing.utterances.length, 0); assert.equal(missing.listeners.size, 0);
  const stuck = fixture(), stuckCtx = stuck.context(); const notStarted = stuck.api.speakText(stuckCtx.ctx, '場所'); stuck.timeout(8000); assert.equal(notStarted.reason, 'start-timeout'); assert.equal(stuck.stats.cancel, 1);
  const rejected = fixture({ speakThrows: true }), rejectedCtx = rejected.context(); assert.equal(rejected.api.speakText(rejectedCtx.ctx, '場所').reason, 'playback-failed'); assert.equal(rejected.timers.size, 0);
  for (const f of [delayed, missing, stuck, rejected]) { assert.equal(f.stats.updates, 0); assert.equal(f.stats.failures, 0); f.cleanup(); }
});
await check('unavailable speech and empty input are harmless, and a late quiet restriction cancels a queued start', () => {
  for (const option of [{ unsupported: true }, { noUtterance: true }, { voiceThrows: true }]) {
    const f = fixture(option), c = f.context(); const handle = f.api.speakText(c.ctx, '言葉'); assert.equal(handle.reason, 'unavailable'); assert.equal(f.utterances.length, 0); assert.equal(f.timers.size, 0); assert.equal(f.listeners.size, 0); f.cleanup();
  }
  const f = fixture(), c = f.context({ studyPreferences: { quiet: false } }); assert.equal(f.api.speakText(c.ctx, '  ').reason, 'empty'); assert.equal(f.api.speakText(c.ctx, null).reason, 'empty');
  const handle = f.api.speakText(c.ctx, '言葉'); c.state.settings.studyPreferences.quiet = true; f.utterances[0].onstart(); assert.equal(handle.reason, 'quiet'); assert.equal(handle.started, false); assert.equal(f.stats.cancel, 1); assert.equal(f.stats.updates, 0); f.cleanup();
});
console.log(`${checks} audio-feature checks passed. Real voice availability and playback remain browser/platform dependent.`);
