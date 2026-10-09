/* Optional platform speech input. It never grades, submits, or stores recordings. */
(function (global) {
  'use strict';
  let serial = 0;
  function restricted(ctx) {
    const progress = typeof ctx.progress === 'function' ? ctx.progress() : null;
    const prefs = global.KotobaPreferences?.get?.(progress) || progress?.settings?.studyPreferences || {};
    const active = progress?.attempts?.find(attempt => attempt.id === progress.activeAttemptId);
    return !!prefs.quiet || active?.type === 'mock' && active.status === 'in-progress';
  }
  function render(ctx, input) {
    const { el, button } = global.KotobaUI;
    if (restricted(ctx)) return el('p', { className: 'speech-input-note muted' }, 'Speech input is off during quiet practice and mock tests. Typing remains available.');
    const Recognition = global.SpeechRecognition || global.webkitSpeechRecognition;
    const AudioContext = global.AudioContext || global.webkitAudioContext;
    const microphoneAvailable = typeof global.navigator?.mediaDevices?.getUserMedia === 'function' && typeof AudioContext === 'function';
    const id = 'speech-input-' + (++serial);
    const status = el('p', { id: id + '-status', className: 'speech-input-status muted', role: 'status' }, typeof Recognition === 'function' ? 'Start when you are ready. Typing also works.' : 'Speech transcription is unavailable in this browser. Type your answer instead.');
    const start = button('Speak a Japanese answer', startRecognition, 'button secondary small', { disabled: typeof Recognition !== 'function', 'aria-describedby': id + '-notice ' + status.id });
    const stop = button('Stop transcription', () => endRecognition('Transcription stopped. You can type or start again.'), 'button ghost small', { disabled: true });
    const meterButton = button('Show microphone level', toggleMeter, 'button secondary small', { disabled: !microphoneAvailable, 'aria-pressed': 'false', 'aria-describedby': id + '-meter-note' });
    const canvas = el('canvas', { width: 320, height: 48, className: 'speech-input-wave', hidden: true, role: 'img', 'aria-label': 'Live microphone waveform' });
    const level = el('span', { className: 'speech-input-level', hidden: true });
    const node = el('div', { className: 'speech-input-tools' },
      el('p', { id: id + '-notice', className: 'speech-input-note muted' }, 'Transcript practice, not pronunciation assessment. Your browser may use an online speech service; typing works offline.'),
      el('div', { className: 'inline-actions' }, start, stop), status,
      el('details', { className: 'speech-input-meter' }, el('summary', {}, 'Optional microphone level'), el('p', { id: id + '-meter-note', className: 'speech-input-note muted' }, 'This independent level meter reads your microphone signal. It does not feed or filter speech transcription. No recording is saved.'), meterButton, canvas, level));
    let disposed = false, generation = 0, recognition = null, recognizing = false, watchdog = null;
    let meterGeneration = 0, meterStarting = false, stream = null, audioContext = null, source = null, analyser = null, frame = null;
    function allowed() { return !disposed && !restricted(ctx); }
    function live(token) {
      if (disposed || token !== generation) return false;
      if (restricted(ctx)) { endRecognition('Speech input is off. Typing remains available.'); return false; }
      return true;
    }
    function resetButtons() { start.disabled = typeof Recognition !== 'function' || !allowed(); stop.disabled = true; }
    function endRecognition(message) {
      generation++;
      clearTimeout(watchdog); watchdog = null;
      const current = recognition; recognition = null; recognizing = false;
      if (current) { current.onstart = null; current.onresult = null; current.onerror = null; current.onend = null; try { current.abort(); } catch {} }
      resetButtons();
      if (!disposed && message) status.textContent = message;
    }
    function startRecognition() {
      if (!allowed() || recognizing || typeof Recognition !== 'function') return;
      endRecognition();
      const token = ++generation;
      let receivedText = false, started = false;
      try {
        const current = new Recognition(); recognition = current; recognizing = true;
        current.lang = 'ja-JP'; current.continuous = false; current.interimResults = true; current.maxAlternatives = 1;
        start.disabled = true; stop.disabled = false; status.textContent = 'Starting Japanese transcription…';
        current.onstart = () => { if (!live(token)) return; started = true; clearTimeout(watchdog); status.textContent = 'Listening. Speak, then check the transcript yourself.'; };
        current.onresult = event => {
          if (!live(token) || !input.isConnected) return;
          const finalParts = [], interimParts = [];
          for (let i = event.resultIndex || 0; i < event.results.length; i++) {
            const result = event.results[i], transcript = result?.[0]?.transcript;
            if (typeof transcript !== 'string') continue;
            (result.isFinal ? finalParts : interimParts).push(transcript);
          }
          if (finalParts.length) {
            const transcript = finalParts.join('').trim().slice(0, 2000);
            if (!transcript) return;
            input.value = transcript; receivedText = true;
            let inputEvent;
            try { inputEvent = new global.InputEvent('input', { bubbles: true, inputType: 'insertFromDictation', data: transcript }); }
            catch { inputEvent = new global.Event('input', { bubbles: true }); }
            input.dispatchEvent(inputEvent);
            status.textContent = 'Transcript added. Edit it if needed, then check your answer yourself.';
          } else if (interimParts.length) status.textContent = 'Listening: ' + interimParts.join('').slice(0, 2000);
        };
        current.onerror = event => {
          if (!live(token)) return;
          const messages = {
            'not-allowed': 'Microphone permission was denied. Type your answer or try again.',
            'service-not-allowed': 'Speech service permission was denied. Typing remains available.',
            'audio-capture': 'No microphone is available. Type your answer instead.',
            'no-speech': 'No speech was detected. Type your answer or try again.',
            network: 'The speech service is unavailable. Typing still works offline.',
            aborted: 'Transcription stopped. You can type or start again.',
            'language-not-supported': 'Japanese transcription is unavailable here. Type your answer instead.',
          };
          endRecognition(messages[event.error] || 'Transcription could not finish. You can type or try again.');
        };
        current.onend = () => { if (!live(token)) return; endRecognition(receivedText ? 'Transcript added. Edit it if needed, then check your answer yourself.' : 'No transcript was added. Type your answer or try again.'); };
        watchdog = setTimeout(() => { if (live(token) && !started) endRecognition('Transcription did not start. Type your answer or try again.'); }, 8000);
        current.start();
      } catch { if (live(token)) endRecognition('Speech transcription could not start. Type your answer instead.'); }
    }
    function closeContext(context) { try { const closed = context?.close(); closed?.catch?.(() => {}); } catch {} }
    function stopMeter(message) {
      meterGeneration++; meterStarting = false;
      if (frame !== null) global.cancelAnimationFrame(frame); frame = null;
      try { source?.disconnect(); } catch {} try { analyser?.disconnect(); } catch {}
      stream?.getTracks?.().forEach(track => { try { track.stop(); } catch {} }); stream = null;
      closeContext(audioContext); audioContext = null; source = null; analyser = null;
      meterButton.textContent = 'Show microphone level'; meterButton.disabled = !microphoneAvailable || !allowed(); meterButton.setAttribute('aria-pressed', 'false');
      canvas.hidden = true; level.hidden = true;
      if (!disposed && message) status.textContent = message;
    }
    async function toggleMeter() {
      if (stream || meterStarting) { stopMeter('Microphone level stopped. Typing remains available.'); return; }
      if (!allowed() || !microphoneAvailable) return;
      const token = ++meterGeneration; meterStarting = true;
      meterButton.textContent = 'Cancel microphone level'; meterButton.setAttribute('aria-pressed', 'true'); status.textContent = 'Waiting for microphone permission…';
      try {
        const captured = await global.navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!allowed() || token !== meterGeneration) { captured.getTracks().forEach(track => track.stop()); return; }
        stream = captured; audioContext = new AudioContext(); source = audioContext.createMediaStreamSource(stream); analyser = audioContext.createAnalyser(); analyser.fftSize = 512; source.connect(analyser);
        await audioContext.resume?.();
        if (token !== meterGeneration) return;
        if (!allowed()) { stopMeter(); return; }
        meterStarting = false; meterButton.textContent = 'Hide microphone level'; canvas.hidden = false; level.hidden = false; status.textContent = 'Microphone level is live. No recording is stored.';
        const samples = new Uint8Array(analyser.fftSize), drawing = canvas.getContext('2d');
        const paint = () => {
          if (disposed || token !== meterGeneration) return;
          if (!allowed() || !analyser) { stopMeter(); return; }
          analyser.getByteTimeDomainData(samples);
          let peak = 0; for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128) / 128);
          level.textContent = `Microphone signal: ${Math.round(peak * 100)}%`;
          if (drawing) { drawing.clearRect(0, 0, canvas.width, canvas.height); drawing.strokeStyle = '#39a373'; drawing.lineWidth = 2; drawing.beginPath(); for (let i = 0; i < samples.length; i++) { const x = i * canvas.width / (samples.length - 1), y = samples[i] / 255 * canvas.height; if (i) drawing.lineTo(x, y); else drawing.moveTo(x, y); } drawing.stroke(); }
          frame = global.requestAnimationFrame(paint);
        };
        paint();
      } catch (error) { if (!disposed && token === meterGeneration) stopMeter(error?.name === 'NotAllowedError' ? 'Microphone permission was denied. Typing remains available.' : 'Microphone level is unavailable. Typing remains available.'); }
    }
    ctx.cleanup(() => { disposed = true; endRecognition(); stopMeter(); });
    return node;
  }
  global.KotobaSpeechInput = { render };
})(window);
