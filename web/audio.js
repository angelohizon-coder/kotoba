(function (global) {
  'use strict';
  const sessions = new Set();
  let speechOwner = null;
  const styles = {
    natural: { label: 'Natural', pitch: 1, rate: .9 },
    bright: { label: 'Anime-inspired · Bright', pitch: 1.25, rate: 1.02 },
    calm: { label: 'Calm', pitch: .95, rate: .8 },
    deep: { label: 'Deep', pitch: .8, rate: .88 },
  };

  function studyAccess(ctx, automatic = false) {
    const progress = typeof ctx.progress === 'function' ? ctx.progress() : null;
    const active = progress?.attempts?.find(attempt => attempt.id === progress.activeAttemptId);
    const prefs = global.KotobaPreferences?.get?.(progress) || progress?.settings?.studyPreferences || {};
    if (active?.status === 'in-progress' && (active.type === 'mock' || Number.isFinite(active.deadline))) return 'assessment';
    if (prefs.quiet) return 'quiet';
    if (automatic && prefs.autoSpeak !== true) return 'automatic-disabled';
    return '';
  }

  function japaneseVoices(synth) {
    return Array.from(synth.getVoices()).filter(voice => /^ja(?:-|_|$)/i.test(voice.lang));
  }

  function chooseVoice(voices, savedVoice = '') {
    const preferred = typeof savedVoice === 'string' && savedVoice ? voices.find(voice => voice.voiceURI === savedVoice) : null;
    return preferred || voices.find(voice => voice.default) || voices.find(voice => voice.localService) || voices[0];
  }

  // This self-study helper has no assessment callback and never persists a grade.
  // Browser voices may be local or online; this does not cache or provide offline audio.
  function speakText(ctx, text, options = {}) {
    const automatic = options.auto === true;
    const handle = { pending: false, started: false, reason: '', cancel() {} };
    const blocked = studyAccess(ctx, automatic);
    if (blocked) { handle.reason = blocked; return handle; }
    if (typeof text !== 'string' || !text.trim()) { handle.reason = 'empty'; return handle; }
    let synth = null;
    try { synth = global.speechSynthesis ?? null; } catch {}
    if (!synth || typeof global.SpeechSynthesisUtterance !== 'function') { handle.reason = 'unavailable'; return handle; }
    let live = true, generation = 0, utterance = null, discovery = null, watchdog = null;
    const session = { stop: () => dispose('canceled'), dispose: () => dispose('canceled') };
    handle.pending = true;
    handle.cancel = () => dispose('canceled');
    sessions.add(session);
    if (typeof ctx.cleanup === 'function') ctx.cleanup(() => dispose('canceled'));
    for (const other of sessions) if (other !== session) other.stop();

    function dispose(reason) {
      if (!live) return;
      live = false;
      generation++;
      handle.pending = false;
      handle.reason = reason;
      clearTimeout(discovery); clearTimeout(watchdog);
      try { synth.removeEventListener('voiceschanged', discover); } catch {}
      const own = utterance;
      utterance = null;
      if (own) {
        own.onstart = null; own.onend = null; own.onerror = null;
        if (speechOwner === own) {
          speechOwner = null;
          try { synth.cancel(); } catch {}
        }
      }
      sessions.delete(session);
    }
    function discover() {
      if (!live || utterance) return;
      const restricted = studyAccess(ctx, automatic);
      if (restricted) { dispose(restricted); return; }
      let voices;
      try { voices = japaneseVoices(synth); } catch { dispose('unavailable'); return; }
      if (!voices.length) return;
      clearTimeout(discovery);
      try { synth.removeEventListener('voiceschanged', discover); } catch {}
      const settings = (typeof ctx.progress === 'function' ? ctx.progress()?.settings : null) || {};
      const style = styles[Object.hasOwn(styles, settings.speechStyle) ? settings.speechStyle : 'natural'];
      const request = ++generation;
      try {
        const speech = new global.SpeechSynthesisUtterance(text);
        utterance = speech;
        speech.voice = chooseVoice(voices, settings.speechVoice);
        speech.lang = speech.voice.lang;
        speech.rate = style.rate * (options.slow === true ? .5 : 1);
        speech.pitch = style.pitch;
        speech.onstart = () => {
          if (!live || request !== generation) return;
          const restrictedNow = studyAccess(ctx, automatic);
          if (restrictedNow) { dispose(restrictedNow); return; }
          handle.started = true;
          handle.pending = false;
          clearTimeout(watchdog);
        };
        speech.onend = () => {
          if (!live || request !== generation) return;
          if (speechOwner === speech) speechOwner = null;
          dispose('finished');
        };
        speech.onerror = event => {
          if (!live || request !== generation) return;
          dispose(['interrupted', 'canceled'].includes(event.error) ? 'canceled' : 'playback-failed');
        };
        watchdog = setTimeout(() => { if (live && request === generation && !handle.started) dispose('start-timeout'); }, 8000);
        speechOwner = speech;
        synth.speak(speech);
      } catch { if (live && request === generation) dispose('playback-failed'); }
    }
    try { synth.addEventListener('voiceschanged', discover); } catch {}
    discovery = setTimeout(() => { discover(); if (live && !utterance) dispose('no-japanese-voice'); }, 3000);
    discover();
    return handle;
  }

  function renderAudio(ctx, item, onFailure) {
    const { el, button } = global.KotobaUI;
    const progress = typeof ctx.progress === 'function' ? ctx.progress() : null;
    const settings = progress?.settings || {};
    const active = progress?.attempts?.find(attempt => attempt.id === progress.activeAttemptId);
    const neutralMock = active?.type === 'mock' && active.status === 'in-progress';
    const studyControls = !neutralMock && !(active?.status === 'in-progress' && Number.isFinite(active.deadline));
    const styleId = Object.hasOwn(styles, settings.speechStyle) ? settings.speechStyle : 'natural';
    const savedVoice = typeof settings.speechVoice === 'string' ? settings.speechVoice : '';
    const baseId = 'speech-' + encodeURIComponent(String(item.id || 'player')).replace(/%/g, '_');
    let playerId = baseId, ordinal = 1;
    while (Array.from(sessions).some(session => session.id === playerId)) playerId = baseId + '-' + (++ordinal);
    const statusNode = el('p', { className: 'audio-status', role: 'status' }, 'Checking for a Japanese voice…');
    const playButton = button('Play / replay', () => play(false), 'button primary small', { disabled: true });
    const slowButton = studyControls ? button('Slow · 0.5x', () => play(true), 'button secondary small', { disabled: true, 'aria-label': 'Play at half speed' }) : null;
    const stopButton = button('Stop', stopPlayback, 'button secondary small', { disabled: true });
    const controls = el('div', { className: 'inline-actions' }, playButton, slowButton, stopButton);
    const node = el('div', { className: 'audio-player', 'data-audio-id': item.id },
      el('div', { className: 'inline-actions' }, el('strong', {}, item.audioUrl ? 'Audio practice' : 'Browser speech practice'), el('span', { className: 'badge' }, item.audioUrl ? 'Supplied audio' : 'Text-to-speech')));
    let live = true, voices = [], state = 'loading', synth = null, audio = null, utterance = null;
    let discovery = null, watchdog = null, playGeneration = 0, voiceSelect = null;

    if (!item.audioUrl) {
      if (neutralMock) node.append(el('p', { className: 'audio-style-note' }, 'Full mocks use a natural, neutral voice.'));
      else {
        const noteId = playerId + '-help';
        const styleSelect = el('select', {
          id: playerId + '-style', className: 'speech-style-select', 'aria-describedby': noteId,
          disabled: typeof ctx.update !== 'function',
          onChange: event => changePreference('speechStyle', event.target.value, event.target.id),
        }, Object.entries(styles).map(([id, style]) => el('option', { value: id }, style.label)));
        styleSelect.value = styleId;
        voiceSelect = el('select', {
          id: playerId + '-voice', className: 'speech-voice-select', 'aria-describedby': noteId,
          disabled: typeof ctx.update !== 'function',
          onChange: event => changePreference('speechVoice', event.target.value, event.target.id),
        });
        refreshVoiceOptions();
        node.append(el('div', { className: 'audio-preferences' },
          el('label', { className: 'field', for: styleSelect.id }, el('span', { className: 'field-label' }, 'Voice style'), styleSelect),
          el('label', { className: 'field', for: voiceSelect.id }, el('span', { className: 'field-label' }, 'Japanese voice'), voiceSelect)),
          el('p', { className: 'audio-style-note', id: noteId }, 'Anime-inspired adds a playful pitch and pace, using your browser voice. Available voices and style effects vary by device.'));
      }
    }
    node.append(statusNode, controls);

    function changePreference(key, value, controlId) {
      if (!live || neutralMock || item.audioUrl || typeof ctx.update !== 'function') return;
      if (key === 'speechStyle' && !Object.hasOwn(styles, value)) return;
      if (key === 'speechVoice' && (typeof value !== 'string' || value.length > 300)) return;
      stopPlayback();
      ctx.update(current => ({ ...current, settings: { ...current.settings, [key]: value } }));
      const replacement = global.document?.getElementById(controlId + '-trigger') || global.document?.getElementById(controlId);
      replacement?.focus({ preventScroll: true });
    }
    function voiceKey(voice) {
      return typeof voice.voiceURI === 'string' && voice.voiceURI.length <= 300 ? voice.voiceURI : '';
    }
    function refreshVoiceOptions() {
      if (!voiceSelect) return;
      const options = [el('option', { value: '' }, 'Automatic · Japanese')], seen = new Set();
      for (const voice of voices) {
        const key = voiceKey(voice);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        options.push(el('option', { value: key }, voice.name + (voice.localService === false ? ' · online' : '')));
      }
      if (savedVoice && !seen.has(savedVoice)) options.push(el('option', { value: savedVoice }, 'Saved voice · unavailable here'));
      voiceSelect.replaceChildren(...options);
      voiceSelect.value = savedVoice;
    }
    function selectedVoice() {
      const preferred = !neutralMock && savedVoice ? voices.find(voice => voiceKey(voice) === savedVoice) : null;
      return preferred || chooseVoice(voices);
    }
    function readyMessage() {
      const fallback = !neutralMock && savedVoice && !voices.some(voice => voiceKey(voice) === savedVoice);
      return fallback ? 'Saved voice unavailable · using Automatic Japanese voice' : 'Japanese browser voice · text-to-speech practice';
    }
    function paint(next, message) {
      if (!live) return;
      state = next;
      statusNode.textContent = message;
      playButton.textContent = next === 'error' ? 'Retry playback' : 'Play / replay';
      playButton.disabled = next === 'loading' || next === 'missing';
      if (slowButton) slowButton.disabled = playButton.disabled;
      stopButton.disabled = next !== 'playing' && next !== 'starting';
    }
    function fail(message = 'Playback failed. Try again, or exclude this question from assessment.') {
      if (!live) return;
      playGeneration++;
      clearTimeout(watchdog);
      cancelSpeech();
      if (audio) audio.pause();
      paint('error', message);
      if (typeof onFailure === 'function') onFailure();
    }
    function missing(message) {
      if (!live) return;
      paint('missing', message);
      if (typeof onFailure === 'function') onFailure();
    }
    function discover() {
      if (!live || !synth) return;
      try {
        voices = japaneseVoices(synth);
        refreshVoiceOptions();
        if (voices.length && state !== 'playing' && state !== 'starting') paint('ready', readyMessage());
      } catch { missing('Speech voices could not be loaded. You can study the script instead.'); }
    }
    function cancelSpeech() {
      const own = utterance;
      utterance = null;
      if (own) {
        own.onstart = null; own.onend = null; own.onerror = null;
        if (speechOwner === own) {
          speechOwner = null;
          try { synth?.cancel(); } catch { /* Playback cancellation has no score effect. */ }
        }
      }
    }
    function stopPlayback() {
      playGeneration++;
      clearTimeout(watchdog);
      cancelSpeech();
      if (audio) { audio.pause(); try { audio.currentTime = 0; } catch {} }
      if (live) paint(item.audioUrl || voices.length ? 'ready' : 'missing', 'Playback stopped');
    }
    async function play(slow = false) {
      if (!live || state === 'loading' || state === 'missing') return;
      slow = slow === true && studyControls;
      if (slow && studyAccess(ctx)) return;
      for (const other of sessions) if (other !== session) other.stop();
      clearTimeout(watchdog);
      if (audio) {
        const request = ++playGeneration;
        try {
          audio.currentTime = 0;
          audio.playbackRate = slow ? .5 : 1;
          paint('starting', 'Starting supplied audio…');
          watchdog = setTimeout(() => {
            if (live && request === playGeneration && state === 'starting') fail('Audio did not start. Retry playback, or use script study without a penalty.');
          }, 8000);
          await audio.play();
          if (!live || request !== playGeneration) return;
          clearTimeout(watchdog);
          paint('playing', slow ? 'Playing supplied audio · half speed' : 'Playing supplied audio…');
        } catch { if (live && request === playGeneration) fail(); }
        return;
      }
      if (!synth || voices.length === 0 || typeof global.SpeechSynthesisUtterance !== 'function') { fail(); return; }
      cancelSpeech();
      const request = ++playGeneration;
      try {
        const speech = new global.SpeechSynthesisUtterance(item.script);
        utterance = speech;
        const style = styles[neutralMock ? 'natural' : styleId];
        speech.voice = selectedVoice(); speech.lang = speech.voice?.lang || 'ja-JP';
        speech.rate = style.rate * (slow ? .5 : 1); speech.pitch = style.pitch;
        let started = false;
        speech.onstart = () => { if (!live || request !== playGeneration) return; started = true; clearTimeout(watchdog); paint('playing', slow ? 'Playing Japanese text-to-speech · half speed' : 'Playing Japanese text-to-speech…'); };
        speech.onend = () => { if (!live || request !== playGeneration) return; clearTimeout(watchdog); if (speechOwner === speech) speechOwner = null; utterance = null; playGeneration++; paint(voices.length ? 'ready' : 'missing', 'Finished · replay whenever you need'); };
        speech.onerror = event => { if (live && request === playGeneration && !['interrupted', 'canceled'].includes(event.error)) fail(); };
        paint('starting', 'Starting playback…');
        watchdog = setTimeout(() => { if (!started && live && request === playGeneration) fail(); }, 8000);
        speechOwner = speech;
        synth.speak(speech);
      } catch { if (live && request === playGeneration) fail(); }
    }
    function dispose() {
      if (!live) return;
      live = false;
      playGeneration++;
      clearTimeout(discovery); clearTimeout(watchdog);
      try { synth?.removeEventListener('voiceschanged', discover); } catch {}
      cancelSpeech();
      if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
      sessions.delete(session);
    }
    const session = { id: playerId, stop: stopPlayback, dispose };
    sessions.add(session);
    ctx.cleanup(dispose);

    if (item.audioUrl) {
      audio = el('audio', { src: item.audioUrl, preload: 'none' });
      audio.addEventListener('error', () => fail());
      audio.addEventListener('ended', () => { if (state === 'playing') paint('ready', 'Finished · replay whenever you need'); });
      node.append(audio);
      paint('ready', 'Supplied audio');
    } else {
      try { synth = global.speechSynthesis ?? null; } catch { synth = null; }
      if (!synth) missing('Speech playback is unavailable in this browser. You can study the script instead.');
      else {
        discover();
        try { synth.addEventListener('voiceschanged', discover); } catch {}
        discovery = setTimeout(() => {
          discover();
          if (live && voices.length === 0) missing('No Japanese voice was found. Install a Japanese system voice or use script study.');
        }, 3000);
      }
    }
    return node;
  }

  global.KotobaAudio = { render: renderAudio, speakText, stop() { for (const session of sessions) session.stop(); } };
})(window);
