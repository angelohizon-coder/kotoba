/* Soft local feedback. Call play only from a learner's explicit action. */
(function (global) {
  'use strict';
  let context;
  let generation = 0;
  const playing = new Set();
  const lastRequested = Object.create(null);
  // Frequency, start offset, duration, optional finish pitch, waveform, and peak.
  // Keep the original cues' pitches/counts stable; small glides add a warmer finish.
  const cues = {
    correct: [[660, 0, .09, 690], [880, .075, .18, 900]],
    incorrect: [[280, 0, .12, 260, 'sine', .034], [220, .09, .18, 205, 'sine', .03]],
    complete: [[523, 0, .12, 530], [659, .09, .13, 665], [784, .18, .24, 800]],
    saved: [[740, 0, .085, 780, 'sine', .032]],
    customize: [[520, 0, .09, 570, 'sine', .032], [780, .06, .14, 820, 'sine', .028]],
    arrange: [[440, 0, .1, 465, 'triangle', .024], [554, .07, .14, 587, 'sine', .028]],
    move: [[740, 0, .065, 820, 'sine', .026], [988, .04, .1, 1047, 'sine', .022]],
    settle: [[587, 0, .09, 600, 'sine', .029], [784, .07, .16, 790, 'sine', .029]],
    wave: [[784, 0, .085, 830, 'sine', .028], [659, .065, .085, 700, 'sine', .025], [880, .13, .17, 920, 'sine', .028]],
  };
  const cooldown = { correct: 110, incorrect: 180, complete: 450, saved: 120, customize: 220, arrange: 260, move: 95, settle: 260, wave: 600 };
  function available() {
    try { return !!(global.AudioContext || global.webkitAudioContext); }
    catch { return false; }
  }
  function studyAudioPlaying() {
    try {
      const speech = global.speechSynthesis;
      if (speech?.speaking || speech?.pending) return true;
      return Array.from(global.document?.querySelectorAll('.audio-player audio') || []).some(audio => !audio.paused && !audio.ended);
    } catch { return false; }
  }
  function stop() {
    generation += 1;
    for (const tone of playing) { try { tone.stop(); } catch {} }
    playing.clear();
  }
  async function play(kind, enabled = true) {
    if (!enabled) { stop(); return false; }
    if (!available() || !Object.hasOwn(cues, kind)) return false;
    if (studyAudioPlaying()) { stop(); return false; }
    const now = global.performance?.now?.() ?? Date.now();
    const previous = lastRequested[kind];
    if (previous !== undefined && now >= previous && now - previous < cooldown[kind]) return false;
    lastRequested[kind] = now;
    let request;
    try {
      stop();
      request = generation;
      const Audio = global.AudioContext || global.webkitAudioContext;
      if (!context || context.state === 'closed') context = new Audio();
      if (context.state !== 'running') await context.resume();
      if (context.state !== 'running' || request !== generation || studyAudioPlaying()) return false;
      const start = context.currentTime;
      for (const [frequency, delay, duration, finishPitch, waveform = 'sine', peak = .04] of cues[kind]) {
        const tone = context.createOscillator();
        const volume = context.createGain();
        const at = start + delay;
        tone.type = waveform;
        tone.frequency.setValueAtTime(frequency, at);
        if (finishPitch) tone.frequency.exponentialRampToValueAtTime?.(finishPitch, at + duration);
        volume.gain.setValueAtTime(0, at);
        volume.gain.linearRampToValueAtTime(peak, at + .009);
        volume.gain.exponentialRampToValueAtTime(.0001, at + duration);
        tone.connect(volume); volume.connect(context.destination);
        tone.onended = () => { playing.delete(tone); tone.disconnect(); volume.disconnect(); };
        playing.add(tone);
        tone.start(at); tone.stop(at + duration + .02);
      }
      return true;
    } catch {
      if (lastRequested[kind] === now) delete lastRequested[kind];
      if (request === generation) stop();
      return false;
    }
  }
  // Stop an existing cue before mouse, touch, or keyboard activation starts a lesson recording.
  global.document?.addEventListener('click', event => {
    if (event.target?.closest?.('.audio-player button')) stop();
  }, true);
  global.document?.addEventListener('play', event => {
    if (event.target?.closest?.('.audio-player')) stop();
  }, true);
  global.document?.addEventListener('visibilitychange', () => {
    if (global.document.hidden) stop();
  });
  global.addEventListener?.('pagehide', stop);
  global.KotobaSounds = { available, play, stop };
})(window);
