/* Explicit recall ratings; canonical assessment and completion controls remain separate. */
(function (global) {
  'use strict';
  const fallbackLabels = ['Blank', 'Forgot', 'Almost', 'Hard', 'Good', 'Easy'];
  const clock = ctx => typeof ctx.now === 'function' ? ctx.now() : Date.now();
  const service = ctx => ctx.srsService || global.KotobaSm2 || global.KotobaEngine;
  const controlToken = value => encodeURIComponent(value).replace(/%/g, '_');
  const activeMock = progress => progress.attempts?.some(attempt => attempt.id === progress.activeAttemptId && attempt.type === 'mock' && attempt.status === 'in-progress');
  const displayDate = value => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function renderRatings(ctx, options) {
    const { el, button } = global.KotobaUI;
    const engine = service(ctx), target = { type: options.type, id: options.id };
    const key = engine.srsKey(target), token = controlToken(key + ':' + options.eventId);
    const progress = ctx.progress(), record = progress.srs?.[key];
    const alreadyRated = !!record?.events.some(event => event.eventId === options.eventId);
    const statusId = 'srs-status-' + token;
    let live = true;
    ctx.cleanup?.(() => { live = false; });
    function allowed(learner, quality) {
      if (!live || !options.revealed || activeMock(learner)) return false;
      if (target.type !== 'question') return true;
      const attempt = learner.attempts.find(item => item.id === options.attemptId);
      const question = global.KotobaContent.questions.find(item => item.id === target.id);
      if (!question || !attempt || !['submitted', 'reviewed'].includes(attempt.status) || !attempt.questionOrder.includes(target.id) || attempt.excludedIds.includes(target.id) || question.skill === 'listening' && attempt.listeningAccess !== 'audio' || !attempt.answers[target.id]) return false;
      return attempt.answers[target.id] === question.correctOptionId ? quality >= 3 : quality < 3;
    }
    const labels = engine.SM2_QUALITY_LABELS || fallbackLabels.map((label, quality) => ({ quality, label, description: label }));
    const controls = el('fieldset', { className: 'srs-rating-controls', disabled: alreadyRated || !options.revealed || activeMock(progress), 'aria-describedby': statusId },
      el('legend', {}, 'Rate your recall · 0–5'), labels.map(item => button([
        el('span', { className: 'srs-rating-number', 'aria-hidden': 'true' }, item.quality), el('span', {}, item.label),
      ], () => {
        if (!allowed(ctx.progress(), item.quality)) return;
        let changed = false;
        const viewport = { top: global.scrollY, left: global.scrollX, behavior: 'instant' };
        ctx.update(learner => {
          if (!allowed(learner, item.quality)) return learner;
          const next = engine.rateSrsItem(learner, target, item.quality, options.eventId, clock(ctx), { maxIntervalDays: 365 });
          changed = next !== learner;
          return next;
        });
        if (changed) ctx.cue?.(item.quality >= 3 ? 'complete' : 'saved');
        const focus = global.document.getElementById(options.focusAfter || statusId) || global.document.getElementById('srs-review-title');
        focus?.focus({ preventScroll: true });
        global.scrollTo(viewport);
      }, 'button secondary srs-rating', {
        id: 'srs-rate-' + token + '-' + item.quality,
        'data-srs-quality': item.quality, 'aria-label': item.quality + ' · ' + item.label + '. ' + item.description,
        title: item.description, disabled: alreadyRated || !allowed(progress, item.quality),
      })));
    const message = alreadyRated ? 'Rating saved · next recall ' + displayDate(record.nextReviewAt) : !options.revealed ? 'Reveal the answer before rating your recall.' : activeMock(progress) ? 'Recall ratings are paused during an active mock.' : target.type === 'question' && !options.attemptId ? 'Question ratings need a submitted assessed answer.' : 'Rate what you recalled before seeing the answer. This does not change your quiz score or completion mark.';
    return el('section', { className: 'srs-ratings', 'data-srs-target': key, 'data-srs-event': options.eventId }, controls,
      el('p', { id: statusId, className: 'srs-rating-status', role: 'status', 'aria-live': 'polite', tabIndex: -1 }, message),
      el('p', { className: 'srs-policy-note' }, 'SM-2 recall schedule · annual review cap: 365 days · elapsed days use UTC.'));
  }

  function renderReview(ctx) {
    const { el, button, ja } = global.KotobaUI;
    const engine = service(ctx), content = global.KotobaContent, progress = ctx.progress();
    const words = new Map(content.vocabulary.map(item => [item.id, item]));
    const characters = new Map(content.kanji.map(item => [item.id, item]));
    const available = record => {
      const item = (record.type === 'kanji' ? characters : words).get(record.id);
      return item && (!ctx.levelMatches || ctx.levelMatches(item));
    };
    const due = engine.dueSrsItems(progress, clock(ctx), ['vocabulary', 'kanji']).filter(available);
    const saved = Object.values(progress.srs || {}).filter(record => ['vocabulary', 'kanji'].includes(record.type) && available(record));
    const state = ctx.view.srsReview || (ctx.view.srsReview = { key: null, revealed: false, eventId: null, announcement: '' });
    if (!due.some(record => engine.srsKey(record) === state.key)) {
      state.key = due.length ? engine.srsKey(due[0]) : null;
      state.revealed = false;
      state.eventId = due.length ? 'recall:' + state.key + ':' + due[0].events.length : null;
    }
    const header = el('div', { className: 'section-header' }, el('div', {}, el('h2', { className: 'section-title' }, 'Spaced recall'), el('p', { className: 'muted', id: 'srs-due-count' }, due.length + ' word and kanji cards due · ' + saved.length + ' scheduled')));
    const section = el('section', { className: 'card srs-review', 'aria-labelledby': 'srs-review-title' }, header);
    header.querySelector('h2').id = 'srs-review-title';
    header.querySelector('h2').tabIndex = -1;
    if (activeMock(progress)) {
      section.append(el('p', { className: 'notice' }, 'Finish your active mock before opening recall answers.'));
      return section;
    }
    if (!due.length) {
      const next = saved.slice().sort((a, b) => Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt))[0];
      section.append(el('p', { className: 'srs-empty' }, next ? 'You are caught up. Next recall: ' + displayDate(next.nextReviewAt) + '.' : 'Rate vocabulary or kanji flashcards from 0–5 to start a saved recall schedule.'),
        el('p', { className: 'muted' }, 'Spaced recall ratings are separate from assessed mistake mastery and your completion marks.'),
        el('p', { className: 'srs-queue-status', role: 'status', 'aria-live': 'polite' }, state.announcement));
      return section;
    }
    const record = due.find(item => engine.srsKey(item) === state.key);
    const item = (record.type === 'kanji' ? characters : words).get(record.id);
    const front = el('div', { className: 'srs-recall-front' }, el('span', { className: 'badge' }, record.type === 'kanji' ? 'Kanji recall' : 'Vocabulary recall'),
      el('h3', { className: 'srs-recall-word' }, ja(record.type === 'kanji' ? item.character : item.word)),
      el('p', { className: 'muted' }, 'Recall the reading and meaning before revealing the answer.'));
    const answer = el('div', { className: 'srs-recall-answer', hidden: !state.revealed, 'aria-hidden': !state.revealed });
    if (state.revealed) {
      answer.append(el('p', { className: 'srs-recall-meaning' }, item.meaning));
      if (record.type === 'vocabulary') answer.append(el('p', { lang: 'ja' }, item.reading), el('p', { lang: 'ja' }, item.example), el('p', {}, item.exampleTranslation));
      else {
        const linked = item.wordIds.map(id => words.get(id)).filter(word => word && (!ctx.levelMatches || ctx.levelMatches(word)));
        answer.append(el('p', { className: 'muted' }, 'Readings depend on the word.'), el('ul', { className: 'srs-linked-words' }, linked.map(word => el('li', {}, ja(word.word), ' · ', ja(word.reading), ' · ', word.meaning))));
      }
    }
    const answerId = 'srs-recall-answer'; answer.id = answerId;
    const flip = button(state.revealed ? 'Hide answer' : 'Reveal answer', () => {
      if (activeMock(ctx.progress())) return;
      state.revealed = !state.revealed;
      const viewport = { top: global.scrollY, left: global.scrollX, behavior: 'instant' };
      ctx.rerender();
      global.document.getElementById('srs-review-flip')?.focus({ preventScroll: true });
      global.scrollTo(viewport);
    }, 'button primary', { id: 'srs-review-flip', 'aria-expanded': state.revealed, 'aria-controls': answerId });
    const ratingCtx = { ...ctx, update: updater => ctx.update(learner => {
      const next = updater(learner);
      if (next !== learner) {
        state.key = null; state.revealed = false;
        state.announcement = 'Recall rating saved. ' + Math.max(0, due.length - 1) + ' cards remain due.';
      }
      return next;
    }) };
    section.append(el('article', { className: 'srs-recall-card', 'data-srs-card': state.key }, front, answer, el('div', { className: 'inline-actions' }, flip),
      renderRatings(ratingCtx, { type: record.type, id: record.id, revealed: state.revealed, eventId: state.eventId, focusAfter: 'srs-review-flip' })),
      el('p', { className: 'srs-queue-status', role: 'status', 'aria-live': 'polite' }, state.announcement),
      el('p', { className: 'muted' }, 'Earliest due cards come first. A rating saves the next recall time on this device.'));
    return section;
  }

  global.KotobaSrs = { renderRatings, renderReview };
})(window);
