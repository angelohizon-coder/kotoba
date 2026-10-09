// Exercise the actual browser helper against controllable Web Speech/media APIs.
// No microphone, recording, network, browser download, or npm dependency is used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../web/speech-input.js', import.meta.url), 'utf8');

class Element {
  constructor(tag, attrs = {}, children = []) {
    this.tagName = tag.toUpperCase(); this.children = children.flat().filter(value => value != null && value !== false); this.attrs = {}; this.handlers = {}; this.value = ''; this.isConnected = true;
    for (const [key, value] of Object.entries(attrs)) {
      if (/^on[A-Z]/.test(key)) this.handlers[key.slice(2).toLowerCase()] = value;
      else if (key === 'className') this.className = value;
      else { this[key] = value; this.attrs[key] = value; }
    }
  }
  set textContent(value) { this._text = String(value); }
  get textContent() { return this._text ?? this.children.map(value => typeof value === 'string' ? value : value.textContent).join(''); }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key]; }
  dispatchEvent(event) { this.events ||= []; this.events.push(event); this.handlers[event.type]?.(event); return true; }
  click() { if (!this.disabled) this.dispatchEvent({ type: 'click' }); }
  getContext() { return this.drawing; }
}
function fixture(options = {}) {
  const stats = { constructed: 0, starts: 0, aborts: 0, microphoneRequests: 0, tracksStopped: 0, contexts: 0, closes: 0, strokes: 0, samplesRead: 0, recordings: 0, updates: 0 };
  const recognizers = [], disposers = [], timers = new Map(), frames = new Map(); let serial = 0;
  const el = (tag, attrs = {}, ...children) => { const node = new Element(tag, attrs, children); if (tag === 'canvas') node.drawing = { clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() { stats.strokes++; } }; return node; };
  const input = el('input', { value: '' });
  const state = { settings: { studyPreferences: { quiet: !!options.quiet } }, attempts: options.mock ? [{ id: 'test-mock', type: 'mock', status: 'in-progress' }] : [], activeAttemptId: options.mock ? 'test-mock' : null };
  class Recognition {
    constructor() { stats.constructed++; recognizers.push(this); }
    start() { stats.starts++; if (options.startThrows) throw new Error('Unsupported speech service'); }
    abort() { stats.aborts++; }
  }
  const stream = { getTracks: () => [{ stop() { stats.tracksStopped++; } }, { stop() { stats.tracksStopped++; } }] };
  class AudioContext {
    constructor() { stats.contexts++; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() { return { fftSize: 512, disconnect() {}, getByteTimeDomainData(data) { stats.samplesRead++; data.fill(128); data[0] = 192; data[1] = 64; } }; }
    resume() { return options.resume ? options.resume(stats.contexts) : Promise.resolve(); }
    close() { stats.closes++; return Promise.resolve(); }
  }
  class InputEvent { constructor(type, init = {}) { this.type = type; Object.assign(this, init); } }
  const window = {
    KotobaUI: { el, button: (label, handler, className, attrs = {}) => el('button', { type: 'button', className, ...attrs, onClick: handler }, label) },
    InputEvent: options.noInputEvent ? undefined : InputEvent, Event: InputEvent,
    navigator: { mediaDevices: { getUserMedia: constraints => { stats.microphoneRequests++; assert.deepEqual(JSON.parse(JSON.stringify(constraints)), { audio: true, video: false }); return options.capture ? options.capture(stream) : Promise.resolve(stream); } } },
    AudioContext,
    requestAnimationFrame: callback => { const id = ++serial; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    MediaRecorder: class { constructor() { stats.recordings++; throw new Error('Recording must never start'); } },
  };
  if (!options.unsupported) window[options.webkit ? 'webkitSpeechRecognition' : 'SpeechRecognition'] = Recognition;
  if (options.noMeter) delete window.navigator.mediaDevices;
  vm.runInNewContext(source, { window, Uint8Array, setTimeout: callback => { const id = ++serial; timers.set(id, callback); return id; }, clearTimeout: id => timers.delete(id) }, { filename: 'web/speech-input.js' });
  const ctx = { progress: () => state, cleanup: fn => disposers.push(fn), update: () => stats.updates++ };
  const node = window.KotobaSpeechInput.render(ctx, input);
  const descendants = function* (parent) { yield parent; for (const child of parent.children || []) if (child instanceof Element) yield* descendants(child); };
  const find = predicate => [...descendants(node)].find(predicate);
  const button = text => { const found = find(item => item.tagName === 'BUTTON' && item.textContent === text); assert.ok(found, `Button: ${text}`); return found; };
  return { stats, recognizers, input, node, state, button, find, frames, timers, cleanup: () => disposers.forEach(fn => fn()), tick: () => { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn()); }, timeout: () => { const batch = [...timers.values()]; timers.clear(); batch.forEach(fn => fn()); } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const result = (transcript, final = true, confidence = .99) => ({ resultIndex: 0, results: [{ 0: { transcript, confidence }, isFinal: final, length: 1 }] });
let checks = 0;
async function check(label, run) { await run(); checks++; console.log('PASS ' + label); }

await check('creating the helper never opens a microphone, starts speech, records, or grades', () => {
  const f = fixture(); assert.equal(f.stats.constructed, 0); assert.equal(f.stats.starts, 0); assert.equal(f.stats.microphoneRequests, 0); assert.equal(f.stats.recordings, 0); assert.equal(f.stats.updates, 0);
  assert.ok(f.node.textContent.includes('not pronunciation assessment')); assert.ok(f.node.textContent.includes('online speech service')); assert.ok(f.node.textContent.includes('typing works offline')); f.cleanup();
});
await check('unsupported browsers keep ordinary typed input functional', () => {
  const f = fixture({ unsupported: true, noMeter: true }); assert.equal(f.button('Speak a Japanese answer').disabled, true); assert.ok(f.node.textContent.includes('unavailable')); f.input.value = 'れんらく'; f.input.dispatchEvent({ type: 'input' }); assert.equal(f.input.value, 'れんらく'); assert.equal(f.stats.starts, 0); f.cleanup();
});
await check('speech starts only from a user click and requests Japanese transcription', () => {
  const f = fixture({ webkit: true }); f.button('Speak a Japanese answer').click(); assert.equal(f.stats.starts, 1); assert.equal(f.recognizers[0].lang, 'ja-JP'); assert.equal(f.recognizers[0].continuous, false); assert.equal(f.stats.microphoneRequests, 0, 'Independent level meter is not requested for transcription'); f.button('Speak a Japanese answer').click(); assert.equal(f.stats.starts, 1, 'A double click cannot launch a second recognition'); f.cleanup();
});
await check('actual final transcripts populate the input without grading or submitting', () => {
  const f = fixture(); f.button('Speak a Japanese answer').click(); const r = f.recognizers[0]; r.onstart(); r.onresult(result('途中', false)); assert.equal(f.input.value, '', 'Interim recognition remains a preview'); r.onresult(result('連絡', true, .01)); assert.equal(f.input.value, '連絡'); assert.equal(f.input.events.length, 1); assert.equal(f.input.events[0].type, 'input'); assert.equal(f.input.events[0].bubbles, true); assert.equal(f.stats.updates, 0); assert.ok(!f.node.textContent.includes('1%'), 'Recognition confidence is not a pronunciation score'); r.onend(); assert.equal(f.button('Speak a Japanese answer').disabled, false); f.cleanup();
});
await check('input-event fallback still supplies a real editable transcript', () => {
  const f = fixture({ noInputEvent: true }); f.button('Speak a Japanese answer').click(); f.recognizers[0].onresult(result('予定')); assert.equal(f.input.value, '予定'); assert.equal(f.input.events[0].type, 'input'); assert.equal(f.stats.updates, 0); f.cleanup();
});
await check('disposed and detached inputs ignore stale recognition callbacks', () => {
  const f = fixture(); f.button('Speak a Japanese answer').click(); const callback = f.recognizers[0].onresult; f.input.isConnected = false; callback(result('古い結果')); assert.equal(f.input.value, ''); f.input.isConnected = true; f.cleanup(); callback(result('さらに古い結果')); assert.equal(f.input.value, ''); assert.equal(f.stats.aborts, 1); assert.equal(f.timers.size, 0);
});
await check('stopping and restarting cannot let an old recognition overwrite the new input', () => {
  const f = fixture(); f.button('Speak a Japanese answer').click(); const oldCallback = f.recognizers[0].onresult; f.button('Stop transcription').click(); assert.equal(f.stats.aborts, 1); f.button('Speak a Japanese answer').click(); assert.equal(f.stats.starts, 2); oldCallback(result('古い結果')); assert.equal(f.input.value, ''); f.recognizers[1].onresult(result('新しい結果')); assert.equal(f.input.value, '新しい結果'); f.cleanup();
});
await check('denied permission, no speech, network failure and start errors leave typing and retry available', () => {
  for (const error of ['not-allowed', 'no-speech', 'network']) { const f = fixture(); f.button('Speak a Japanese answer').click(); f.recognizers[0].onerror({ error }); assert.equal(f.button('Speak a Japanese answer').disabled, false); assert.equal(f.button('Stop transcription').disabled, true); assert.ok(/typ(?:e|ing)/i.test(f.node.textContent)); f.button('Speak a Japanese answer').click(); assert.equal(f.stats.starts, 2); f.cleanup(); }
  const f = fixture({ startThrows: true }); f.button('Speak a Japanese answer').click(); assert.equal(f.button('Speak a Japanese answer').disabled, false); assert.ok(f.node.textContent.includes('could not start')); f.cleanup();
});
await check('quiet mode and active mocks expose no speech or microphone request controls', () => {
  for (const options of [{ quiet: true }, { mock: true }]) { const f = fixture(options); assert.equal(f.find(item => item.tagName === 'BUTTON'), undefined); assert.equal(f.stats.constructed, 0); assert.equal(f.stats.microphoneRequests, 0); assert.ok(f.node.textContent.includes('Typing remains available')); }
  const f = fixture(); f.button('Speak a Japanese answer').click(); f.state.settings.studyPreferences.quiet = true; f.recognizers[0].onresult(result('聞かない結果')); assert.equal(f.input.value, ''); assert.equal(f.stats.aborts, 1, 'A new quiet restriction stops an existing recognizer'); f.cleanup();
});
await check('the independent meter draws actual samples and releases tracks and audio resources', async () => {
  const f = fixture(); f.button('Show microphone level').click(); await flush(); assert.equal(f.stats.microphoneRequests, 1); assert.equal(f.stats.contexts, 1); assert.equal(f.stats.samplesRead, 1); assert.equal(f.stats.strokes, 1); assert.ok(f.node.textContent.includes('50%'), 'Level comes from the supplied microphone samples'); assert.equal(f.stats.starts, 0, 'Level meter does not feed or start recognition'); f.tick(); assert.equal(f.stats.samplesRead, 2); f.cleanup(); assert.equal(f.stats.tracksStopped, 2); assert.equal(f.stats.closes, 1); assert.equal(f.frames.size, 0); assert.equal(f.stats.recordings, 0);
});
await check('a late microphone permission result is stopped immediately after cancellation or disposal', async () => {
  for (const dispose of [false, true]) { let resolveCapture; const capture = new Promise(resolve => { resolveCapture = resolve; }); let stream; const f = fixture({ capture: value => { stream = value; return capture; } }); f.button('Show microphone level').click(); if (dispose) f.cleanup(); else f.button('Cancel microphone level').click(); resolveCapture(stream); await flush(); assert.equal(f.stats.tracksStopped, 2); assert.equal(f.stats.contexts, 0); assert.equal(f.frames.size, 0); }
});
await check('a denied level request can be retried and an unstarted speech request times out safely', async () => {
  let first = true; const f = fixture({ capture: stream => { if (first) { first = false; return Promise.reject(Object.assign(new Error('Denied'), { name: 'NotAllowedError' })); } return Promise.resolve(stream); } }); f.button('Show microphone level').click(); await flush(); assert.ok(f.node.textContent.includes('permission was denied')); assert.equal(f.button('Show microphone level').disabled, false); f.button('Show microphone level').click(); await flush(); assert.equal(f.stats.contexts, 1); f.cleanup(); assert.equal(f.stats.tracksStopped, 2);
  const stuck = fixture(); stuck.button('Speak a Japanese answer').click(); stuck.timeout(); assert.equal(stuck.button('Speak a Japanese answer').disabled, false); assert.ok(stuck.node.textContent.includes('did not start')); assert.equal(stuck.stats.aborts, 1); stuck.cleanup();
});
await check('an old audio-context resume cannot stop a newer live microphone session', async () => {
  let resumeOld; const pending = new Promise(resolve => { resumeOld = resolve; }); const f = fixture({ resume: ordinal => ordinal === 1 ? pending : Promise.resolve() });
  f.button('Show microphone level').click(); await flush(); assert.equal(f.stats.contexts, 1); f.button('Cancel microphone level').click(); f.button('Show microphone level').click(); await flush(); assert.equal(f.stats.contexts, 2); assert.equal(f.frames.size, 1); resumeOld(); await flush(); assert.equal(f.stats.tracksStopped, 2, 'Only the canceled stream was stopped'); assert.equal(f.stats.closes, 1); assert.equal(f.frames.size, 1, 'New live waveform remains active'); f.cleanup(); assert.equal(f.stats.tracksStopped, 4); assert.equal(f.stats.closes, 2);
});
await check('a stale animation callback cannot close a restarted microphone meter', async () => {
  const f = fixture(); f.button('Show microphone level').click(); await flush(); const oldFrame = [...f.frames.values()][0]; f.button('Hide microphone level').click(); f.button('Show microphone level').click(); await flush(); oldFrame(); assert.equal(f.stats.closes, 1); assert.equal(f.stats.tracksStopped, 2); assert.equal(f.frames.size, 1); f.cleanup(); assert.equal(f.stats.closes, 2);
});
console.log(`${checks} speech-input checks passed. Real transcription and permissions remain browser/platform dependent.`);
