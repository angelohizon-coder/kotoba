(function (global) {
  'use strict';
  const model = () => global.KotobaPreferenceModel;
  const get = progress => progress?.settings?.studyPreferences || model().initialStudyPreferences();
  const motionReduced = progress => get(progress).reduceMotion || document.documentElement.dataset.reduceMotion === 'true' || global.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function apply(progress) {
    const prefs = get(progress), doc = document.documentElement;
    doc.dataset.contrast = prefs.highContrast ? 'high' : 'standard';
    const reduced = prefs.reduceMotion || !!progress.motivation?.preferences.disableAnimations;
    doc.dataset.reduceMotion = reduced ? 'true' : 'false';
    doc.style.fontSize = prefs.fontScale === 1 ? '' : (100 * prefs.fontScale) + '%';
    if (reduced) for (const animation of document.getAnimations?.() || []) animation.cancel();
  }
  function change(ctx, key, value) {
    ctx.update(current => ({ ...current, settings: { ...current.settings, studyPreferences: { ...get(current), [key]: value } } }));
  }
  function render(ctx) {
    const { el, button, card, paragraph: p } = global.KotobaUI;
    const prefs = get(ctx.progress());
    const toggle = (key, label, description) => el('label', { className: 'study-pref-toggle' },
      el('input', { id: 'study-pref-' + key, type: 'checkbox', checked: prefs[key], onChange: event => change(ctx, key, event.target.checked) }),
      el('span', {}, el('strong', {}, label), p(description)));
    const size = el('select', { id: 'study-pref-fontScale', onChange: event => change(ctx, 'fontScale', Number(event.target.value)) },
      [[1, 'Standard'], [1.15, 'Larger'], [1.3, 'Largest']].map(([value, label]) => el('option', { value }, label)));
    size.value = String(prefs.fontScale);
    return card(el('h2', {}, 'Comfort and accessibility'),
      toggle('highContrast', 'High contrast', 'Use a black, white and yellow palette with clear focus outlines.'),
      toggle('reduceMotion', 'Disable animations', 'Keep transitions, celebrations and movement effects still.'),
      toggle('haptics', 'Haptic feedback', 'Brief vibrations for study feedback on supported devices.'),
      toggle('quiet', 'Quiet mode', 'Pause speaking and listening in micro lessons. Reading and typing stay available.'),
      toggle('autoSpeak', 'Automatic word audio', 'Read new flashcard words after you flip or move cards. Starts after your interaction, outside mocks.'),
      toggle('kanaAssist', 'Kana typing help', 'Optional romaji-to-kana help in active recall. Native Japanese IME input stays supported.'),
      toggle('autoAdvance', 'Advance micro lessons automatically', 'Move to the next micro exercise after feedback. Exam practice keeps its own controls.'),
      toggle('untimedPractice', 'Prefer untimed exam practice', 'Start full-length question pools without an exam deadline. Timed mocks remain available.'),
      toggle('guidedPath', 'Show prerequisite guidance', 'Highlight skills to review before moving to an advanced lesson.'),
      el('label', { className: 'field', for: size.id }, el('span', {}, 'Text size'), size),
      el('details', { className: 'local-reminder-options' }, el('summary', {}, 'Optional study reminders'),
        p('Browser reminders can run while this app is open. Scheduled reminders with the browser closed require the future backend. No emails are sent.'),
        el('label', { className: 'field' }, 'Reminder time on this device', el('input', { type: 'time', id: 'study-reminder-time', value: prefs.reminders.time,
          onChange: event => { if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(event.target.value)) change(ctx, 'reminders', { ...prefs.reminders, time: event.target.value }); } })),
        button(prefs.reminders.enabled ? 'Pause reminders' : 'Allow browser reminders', async () => {
          if (prefs.reminders.enabled) { change(ctx, 'reminders', { ...prefs.reminders, enabled: false }); return; }
          if (!('Notification' in global) || !global.isSecureContext) { ctx.notice('This browser cannot show reminders here. You can use the saved reminder time with your calendar.'); return; }
          const permission = await Notification.requestPermission();
          if (permission === 'granted') { change(ctx, 'reminders', { ...get(ctx.progress()).reminders, enabled: true }); ctx.notice('Reminders enabled while this app is open. You can pause them here.'); }
          else ctx.notice('Reminders were not enabled. Study stays available.');
        }, 'button secondary', { id: 'study-reminder-enable' })));
  }
  function install(ctx) {
    let lastActivity = Date.now(), lastTick = Date.now(), seconds = 0;
    const activity = () => { lastActivity = Date.now(); };
    for (const event of ['pointerdown', 'keydown', 'scroll']) addEventListener(event, activity, { passive: true });
    const timer = setInterval(() => {
      const now = Date.now(), elapsed = Math.min(5, Math.max(0, (now - lastTick) / 1000)); lastTick = now;
      const progress = ctx.progress(), prefs = get(progress);
      const route = location.hash.slice(1);
      const studyPage = ['vocabulary', 'grammar', 'reading', 'listening', 'practice', 'review'].includes(route) || route === 'dashboard' && document.querySelector('.daily-lesson-disclosure[open]');
      if (!document.hidden && studyPage && now - lastActivity < 60_000 && progress.motivation) seconds += elapsed;
      if (seconds >= 30 && global.KotobaMotivationEngine?.recordStudyTime) {
        const measured = Math.floor(seconds); seconds -= measured;
        ctx.persistQuietly?.(current => global.KotobaMotivationEngine.recordStudyTime(current, measured, now));
      }
      if (!prefs.reminders.enabled || prefs.quiet || !('Notification' in global) || Notification.permission !== 'granted') return;
      const day = global.KotobaEngine.localDateKey(new Date(now)), local = new Date(now), time = String(local.getHours()).padStart(2, '0') + ':' + String(local.getMinutes()).padStart(2, '0');
      if (prefs.reminders.lastSentDay === day || time < prefs.reminders.time) return;
      const due = Object.values(progress.srs || {}).filter(item => Date.parse(item.nextReviewAt) <= now).length;
      const copies = ['A little Japanese fits here.', 'Momo saved a small review for you.', 'One small lesson, at your own pace.'];
      try {
        const note = new Notification('Kotoba study reminder', { body: copies[local.getDate() % copies.length] + (due ? ' ' + due + ' recall items are due.' : ''), tag: 'kotoba-daily-review' });
        note.onclick = () => { global.focus(); ctx.navigate(due ? 'review' : 'practice'); note.close(); };
        ctx.persistQuietly?.(current => ({ ...current, settings: { ...current.settings, studyPreferences: { ...get(current), reminders: { ...get(current).reminders, lastSentDay: day } } } }));
      } catch { /* A denied platform notification never interrupts learning. */ }
    }, 5000);
    addEventListener('pagehide', () => {
      clearInterval(timer);
      if (seconds >= 1 && global.KotobaMotivationEngine?.recordStudyTime) ctx.persistQuietly?.(current => global.KotobaMotivationEngine.recordStudyTime(current, Math.floor(seconds), Date.now()));
    }, { once: true });
  }
  global.KotobaPreferences = { get, apply, render, install, motionReduced };
})(window);
