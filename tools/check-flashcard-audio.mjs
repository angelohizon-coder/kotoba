// Exercise flashcard gestures and the actual audio helper through the same
// disposal/replacement lifecycle as the app. No browser or system voice needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const sources = ['content.js', 'engine.js', 'audio.js', 'flashcards.js'].map(name => [name, readFileSync(new URL('../web/' + name, import.meta.url), 'utf8')]);
class Element {
  constructor(tag, attrs = {}, children = []) {
    this.tagName = tag.toUpperCase(); this.attrs = {}; this.handlers = {}; this.children = []; this.value = ''; this.parentNode = null; this.attached = false;
    for (const [key, value] of Object.entries(attrs)) {
      if (/^on[A-Z]/.test(key)) this.handlers[key.slice(2).toLowerCase()] = value;
      else { this[key] = value; this.attrs[key] = value; }
    }
    this.append(...children);
  }
  set textContent(value) { this._text = String(value); }
  get textContent() { return this._text ?? this.children.map(value => typeof value === 'string' ? value : value.textContent).join(''); }
  get isConnected() { return this.attached || !!this.parentNode?.isConnected; }
  append(...children) { for (const child of children.flat()) if (child != null && child !== false) { this.children.push(child); if (child instanceof Element) child.parentNode = this; } }
  replaceChildren(...children) { for (const child of this.children) if (child instanceof Element) child.parentNode = null; this.children = []; this.append(...children); }
  contains(other) { return this === other || this.children.some(child => child instanceof Element && child.contains(other)); }
  closest(selector) { for (let node = this; node; node = node.parentNode) if (selector.split(',').some(part => matches(node, part.trim()))) return node; return null; }
  click() { if (!this.disabled) this.handlers.click?.({ type: 'click', target: this, currentTarget: this, detail: 0 }); }
  focus() { this.owner.activeElement = this; }
}
function matches(node, selector) {
  if (selector.startsWith('#')) return node.id === selector.slice(1);
  if (selector.startsWith('.')) return node.className?.split(' ').includes(selector.slice(1));
  return node.tagName.toLowerCase() === selector;
}
const descend = function* (node) { yield node; for (const child of node.children || []) if (child instanceof Element) yield* descend(child); };
function fixture(options = {}) {
  let available = options.voices ?? [
    { lang: 'en-US', voiceURI: 'en', name: 'English', default: true, localService: true },
    { lang: 'ja-JP', voiceURI: 'ja-one', name: 'Japanese one', default: true, localService: true },
    { lang: 'ja-JP', voiceURI: 'ja-two', name: 'Japanese two', default: false, localService: true },
  ];
  const root = new Element('body'); root.attached = true;
  const keyboard = new Set(), listeners = new Set(), timers = new Map(), speech = [], disposers = []; let timerId = 0;
  const stats = { updates: 0, canceled: 0, srsRenders: 0 };
  const document = {
    body: root, documentElement: root, activeElement: root,
    getElementById: id => [...descend(root)].find(node => node.id === id), querySelector: () => null,
    addEventListener: (type, callback) => { assert.equal(type, 'keydown'); keyboard.add(callback); },
    removeEventListener: (type, callback) => keyboard.delete(callback),
  };
  const el = (tag, attrs = {}, ...children) => { const node = new Element(tag, attrs, children); node.owner = document; return node; };
  const window = {
    document, scrollX: 0, scrollY: 137, scrollTo() {}, getSelection: () => ({ isCollapsed: true }),
    KotobaUI: { el, button: (text, callback, className, attrs = {}) => el('button', { type: 'button', className, ...attrs, onClick: callback }, text), ja: text => el('span', { lang: 'ja' }, text), icon: name => el('span', { className: 'icon', 'data-icon': name }) },
    KotobaPreferences: { get: progress => ({ quiet: false, autoSpeak: false, ...progress.settings.studyPreferences }) },
    speechSynthesis: { getVoices: () => available, addEventListener: (type, callback) => listeners.add(callback), removeEventListener: (type, callback) => listeners.delete(callback), cancel: () => stats.canceled++, speak: utterance => { speech.push(utterance); utterance.onstart?.(); } },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
  };
  const sandbox = vm.createContext({ window, document, queueMicrotask, setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; }, clearTimeout: id => timers.delete(id) });
  for (const [name, source] of sources) vm.runInContext(source, sandbox, { filename: 'web/' + name });
  let progress = window.KotobaEngine.initialProgress(); progress.settings.studyPreferences = { autoSpeak: !!options.autoSpeak, quiet: !!options.quiet }; progress.settings.speechStyle = 'bright'; progress.settings.speechVoice = 'ja-two';
  if (options.active) { progress.attempts = [options.active]; progress.activeAttemptId = options.active.id; }
  const included = new Set(['v-plan', 'v-change', 'v-availability', 'v-participate', 'k-yo', 'k-hen', 'k-san']);
  const view = {};
  const ctx = {
    view, progress: () => progress, cleanup: callback => disposers.push(callback), levelMatches: item => included.has(item.id),
    rerender: render, update: updater => { stats.updates++; progress = updater(progress); render(); },
  };
  function dispose() { disposers.splice(0).forEach(callback => callback()); root.replaceChildren(); }
  function render() { disposers.splice(0).forEach(callback => callback()); root.replaceChildren(window.KotobaFlashcards.render(ctx)); }
  function byId(id) { const node = document.getElementById(id); assert.ok(node, id); return node; }
  function choose(id, value) { const node = byId(id); if (node.type === 'checkbox') node.checked = value; else node.value = value; node.handlers.change({ type: 'change', currentTarget: node, target: node }); }
  render();
  return { window, ctx, view, root, stats, speech, timers, listeners, keyboard, byId, choose, render, dispose,
    progress: () => progress,
    voicesChanged: next => { available = next; for (const callback of [...listeners]) callback(); },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const currentWord = f => f.window.KotobaContent.vocabulary.find(word => word.id === f.byId('flashcard-display').attrs['data-card-id']);
let checks = 0;
async function check(label, run) { await run(); checks++; console.log('PASS ' + label); }

await check('opening, redrawing and reopening a saved deck remain silent even with auto audio enabled', async () => {
  const f = fixture({ autoSpeak: true }); await flush(); assert.equal(f.speech.length, 0);
  f.render(); await flush(); assert.equal(f.speech.length, 0); f.dispose(); f.render(); await flush(); assert.equal(f.speech.length, 0);
  assert.equal(f.stats.updates, 0); assert.equal(f.progress().studyEvents.length, 0); f.dispose();
});
await check('manual Listen and Slow speak the authored reading with the actual selected voice without changing any progress', async () => {
  const f = fixture(); await flush(); const before = JSON.stringify(f.progress()); const display = f.byId('flashcard-display'), text = f.byId('flashcard-word').textContent, className = f.byId('flashcard-word').className;
  assert.equal(display.contains(f.byId('flashcard-listen')), false, 'Audio buttons do not sit inside either card face');
  f.byId('flashcard-listen').click(); f.byId('flashcard-slow').click(); assert.equal(f.speech.length, 2);
  for (const utterance of f.speech) { assert.equal(utterance.text, 'よてい'); assert.equal(utterance.voice.voiceURI, 'ja-two'); assert.equal(utterance.pitch, 1.25); }
  assert.equal(f.speech[0].rate, 1.02); assert.equal(f.speech[1].rate, .51); assert.equal(f.stats.canceled, 1);
  assert.equal(JSON.stringify(f.progress()), before); assert.equal(f.byId('flashcard-display'), display); assert.equal(f.byId('flashcard-word').textContent, text); assert.equal(f.byId('flashcard-word').className, className); assert.equal(display.attrs['data-side'], 'front'); f.dispose();
});
await check('ordinary flashcard actions stay silent until automatic audio is explicitly enabled', async () => {
  const f = fixture(); await flush();
  f.byId('flashcard-flip').click(); await flush(); f.byId('flashcard-next').click(); await flush(); f.byId('flashcard-previous').click(); await flush(); f.choose('flashcard-topic', 'community'); await flush(); f.choose('flashcard-topic', 'all'); await flush(); f.byId('flashcard-shuffle').click(); await flush();
  assert.equal(f.speech.length, 0); assert.equal(f.progress().attempts.length, 0); assert.equal(Object.keys(f.progress().reviews).length, 0); f.dispose();
});
await check('enabled automatic audio reads each explicitly flipped or moved current word once', async () => {
  const f = fixture({ autoSpeak: true }); await flush(); f.byId('flashcard-flip').click(); await flush(); assert.equal(f.speech.length, 1); assert.equal(f.speech.at(-1).text, 'よてい');
  assert.equal(f.progress().studyEvents.length, 1, 'Only the existing flip action records study');
  f.render(); await flush(); assert.equal(f.speech.length, 1, 'An unrelated redraw cannot replay the card');
  f.byId('flashcard-next').click(); await flush(); assert.equal(f.speech.length, 2); assert.equal(f.speech.at(-1).text, 'へんこう');
  f.byId('flashcard-previous').click(); await flush(); assert.equal(f.speech.length, 3); assert.equal(f.speech.at(-1).text, 'よてい');
  f.byId('flashcard-previous').click(); await flush(); assert.equal(f.speech.length, 3, 'Disabled navigation cannot queue audio');
  f.byId('flashcard-flip').click(); await flush(); assert.equal(f.speech.length, 4); assert.equal(f.speech.at(-1).text, 'よてい'); f.dispose();
});
await check('topic, completion and shuffle gestures read the resulting card, while empty decks remain silent', async () => {
  const f = fixture({ autoSpeak: true }); await flush(); f.choose('flashcard-topic', 'community'); await flush(); assert.equal(f.speech.length, 1); assert.equal(f.speech.at(-1).text, 'さんか');
  f.choose('flashcard-topic', 'all'); await flush(); assert.equal(f.speech.length, 2); assert.equal(f.speech.at(-1).text, 'よてい');
  f.byId('flashcard-shuffle').click(); await flush(); assert.equal(f.speech.length, 3); assert.equal(f.speech.at(-1).text, currentWord(f).reading);
  f.choose('flashcard-completion', 'completed'); await flush(); assert.equal(f.speech.length, 3); assert.equal(f.window.document.getElementById('flashcard-listen'), undefined);
  f.choose('flashcard-completion', 'all'); await flush(); assert.equal(f.speech.length, 4); assert.equal(f.speech.at(-1).text, currentWord(f).reading);
  assert.equal(f.progress().completedTasks.length, 0); f.dispose();
});
await check('rapid gestures and navigation disposal discard stale requests before speaking', async () => {
  const f = fixture({ autoSpeak: true }); await flush(); const oldListen = f.byId('flashcard-listen');
  f.byId('flashcard-next').click(); f.byId('flashcard-next').click(); await flush(); assert.equal(f.speech.length, 1); assert.equal(f.speech[0].text, 'つごう');
  oldListen.click(); assert.equal(f.speech.length, 1, 'A detached control cannot speak the old word');
  f.byId('flashcard-next').click(); f.dispose(); await flush(); assert.equal(f.speech.length, 1);
  f.render(); await flush(); assert.equal(f.speech.length, 1, 'Returning to a card never revives a disposed automatic request'); f.dispose();
});
await check('quiet mode, timed attempts and active mocks expose no flashcard audio controls or automatic playback', async () => {
  for (const options of [
    { quiet: true, autoSpeak: true },
    { autoSpeak: true, active: { id: 'mock', type: 'mock', status: 'in-progress', deadline: null } },
    { autoSpeak: true, active: { id: 'timed', type: 'practice', status: 'in-progress', deadline: Date.now() + 60000 } },
  ]) {
    const f = fixture(options); await flush(); assert.equal(f.window.document.getElementById('flashcard-listen'), undefined); assert.equal(f.window.document.getElementById('flashcard-slow'), undefined);
    f.byId('flashcard-next').click(); await flush(); assert.equal(f.speech.length, 0); f.dispose();
  }
  const f = fixture({ autoSpeak: true }); await flush(); f.byId('flashcard-next').click(); f.progress().settings.studyPreferences.quiet = true; await flush(); assert.equal(f.speech.length, 0); f.dispose();
});
await check('kanji audio uses an original linked word reading and never guesses a standalone character reading', async () => {
  const f = fixture({ autoSpeak: true }); await flush(); f.choose('flashcard-deck', 'kanji'); await flush();
  assert.equal(f.byId('flashcard-word').textContent, '予'); assert.equal(f.speech.length, 1); assert.equal(f.speech[0].text, 'よてい');
  assert.equal(f.byId('flashcard-listen').attrs['aria-label'], 'Listen to a linked example word');
  f.byId('flashcard-next').click(); await flush(); assert.equal(f.byId('flashcard-word').textContent, '変'); assert.equal(f.speech.at(-1).text, 'へんこう');
  f.byId('flashcard-slow').click(); assert.equal(f.speech.at(-1).text, 'へんこう'); assert.equal(f.speech.at(-1).rate, .51); assert.equal(f.progress().studyEvents.length, 0); f.dispose();
});
await check('asynchronous voice discovery speaks only the latest card and cannot revive a departed session', async () => {
  const f = fixture({ autoSpeak: true, voices: [] }); await flush(); f.byId('flashcard-flip').click(); await flush(); assert.equal(f.speech.length, 0); assert.equal(f.listeners.size, 1);
  f.byId('flashcard-next').click(); await flush(); assert.equal(f.listeners.size, 1, 'Old discovery was removed on replacement');
  f.voicesChanged([{ lang: 'ja-JP', voiceURI: 'ja-two', name: 'Japanese', default: true, localService: true }]); assert.equal(f.speech.length, 1); assert.equal(f.speech[0].text, 'へんこう'); f.dispose(); assert.equal(f.listeners.size, 0); assert.equal(f.timers.size, 0);
  const left = fixture({ autoSpeak: true, voices: [] }); await flush(); left.byId('flashcard-next').click(); await flush(); left.dispose(); left.voicesChanged([{ lang: 'ja-JP', voiceURI: 'ja-two' }]); assert.equal(left.speech.length, 0); assert.equal(left.listeners.size, 0);
});
await check('audio preserves explicit completion behavior and does not turn ratings or furigana redraws into automatic requests', async () => {
  const f = fixture({ autoSpeak: true }); await flush(); f.byId('flashcard-flip').click(); await flush(); const beforeAudio = f.speech.length;
  f.byId('flashcard-got-it').click(); await flush(); assert.equal(f.speech.length, beforeAudio); assert.ok(f.progress().completedTasks.includes('vocabulary:v-plan'));
  assert.equal(f.byId('flashcard-display').attrs['data-card-id'], 'v-change'); assert.equal(f.progress().attempts.length, 0); assert.equal(Object.keys(f.progress().reviews).length, 0);
  f.choose('flashcard-furigana', true); await flush(); assert.equal(f.speech.length, beforeAudio); f.byId('flashcard-listen').click(); assert.equal(f.speech.at(-1).text, 'へんこう');
  f.byId('flashcard-previous').click(); await flush(); f.byId('flashcard-flip').click(); await flush(); f.byId('flashcard-again').click(); await flush(); assert.equal(f.progress().completedTasks.includes('vocabulary:v-plan'), false);
  assert.equal(Object.hasOwn(f.progress(), 'srs'), false, 'Word audio never chooses a saved recall quality'); assert.equal(f.keyboard.size, 1); f.dispose(); assert.equal(f.keyboard.size, 0);
});
console.log(`${checks} flashcard-audio checks passed. Card geometry is checked separately in the browser suite.`);
