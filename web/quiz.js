(function (global) {
  'use strict';
  const content = global.KotobaContent;
  const engine = global.KotobaEngine;
  const questionMap = Object.fromEntries(content.questions.map(question => [question.id, question]));

  function wordHelp(ctx, attempt) {
    if (!['practice', 'review'].includes(attempt.type)) return (text) => global.KotobaUI.ja(text);
    const render = global.KotobaGlossaryUI.create(ctx);
    return (text, question, allowTargets = false) => {
      const relatedQuestions = attempt.status === 'in-progress' ? attempt.questionOrder.map(id => questionMap[id]).filter(other =>
        other.id !== question.id && !attempt.checkedIds.includes(other.id) && !attempt.excludedIds.includes(other.id) && (
          question.passageId && other.passageId === question.passageId ||
          question.listeningId && other.listeningId === question.listeningId
        )
      ) : [];
      return render(text, question, { allowTargets, relatedQuestions });
    };
  }

  function explanation(question, attempt, full, ctx) {
    const { el, ja, mixed } = global.KotobaUI;
    const selected = attempt.answers[question.id];
    const excluded = attempt.excludedIds.includes(question.id) || (question.skill === 'listening' && attempt.listeningAccess !== 'audio');
    const correct = selected === question.correctOptionId;
    const outcome = excluded ? 'Unscored study item' : !selected ? 'Not answered' : correct ? 'Correct' : 'Let’s review this one';
    const node = el('div', { className: `feedback ${correct ? 'correct' : 'incorrect'}` },
      el('strong', {}, outcome),
      el('p', {}, 'Your answer: ', selected ? ja(question.options.find(option => option.id === selected)?.text ?? selected) : 'Not answered', el('br'), 'Correct answer: ', el('strong', {}, ja(question.options.find(option => option.id === question.correctOptionId).text))),
      el('ul', { className: 'explanation-list' }, ...attempt.optionOrders[question.id].map(optionId => el('li', {},
        el('strong', {}, ja(question.options.find(option => option.id === optionId).text)), ' — ', mixed(question.explanations[optionId])))));
    if (question.ordering) node.append(el('p', {}, 'Complete sentence: ', ja(question.ordering.completed)));
    if (question.evidence) node.append(el('p', {}, 'Passage evidence: ', ja(question.evidence)));
    if (full) {
      const passage = content.readings.find(item => item.id === question.passageId);
      const audio = content.listening.find(item => item.id === question.listeningId);
      if (passage) node.append(el('details', {}, el('summary', {}, 'Passage and English translation'), el('p', { className: 'passage-body', lang: 'ja' }, passage.body), el('p', { className: 'translation' }, passage.translation)));
      if (audio) node.append(el('details', { onToggle: event => { if (event.currentTarget.open) ctx?.rememberScript?.(audio.id); } }, el('summary', {}, 'Transcript and English translation'), el('p', { className: 'transcript', lang: 'ja' }, audio.script), el('p', { className: 'translation' }, audio.translation)));
    }
    return node;
  }

  function renderResults(ctx, attempt, onFinish) {
    const { el, button, card, ja } = global.KotobaUI;
    const gloss = wordHelp(ctx, attempt);
    const grade = engine.gradeAttempt(attempt, questionMap);
    const percent = grade.total ? Math.round(grade.correct / grade.total * 100) : 0;
    const score = el('div', { className: 'result-score' }, el('strong', grade.total ? {} : { style: 'font-size:20px' }, grade.total ? `${grade.correct} / ${grade.total}` : 'Unscored'));
    if (grade.total) score.append(el('span', {}, `${percent}% accuracy`));
    const summary = card(
      el('span', { className: 'eyebrow' }, attempt.mock ? `ORIGINAL ${attempt.mock.level.toUpperCase()} MOCK RESULTS` : attempt.isRetry ? 'RETRY RESULTS' : 'YOUR PRACTICE RESULTS'),
      el('h2', { className: 'section-title' }, grade.total ? 'Every attempt moves you forward.' : 'Study session completed.'),
      score,
      el('p', { className: 'muted' }, `${grade.unanswered} unanswered · ${grade.excluded} unscored or excluded. Raw practice results for this attempt.`),
      el('div', { className: 'skill-breakdown' }, ...Object.entries(grade.skills).map(([skill, count]) => el('span', { className: 'badge' }, `${skill}: ${count.correct}/${count.total}`))),
      el('p', { className: 'muted' }, attempt.mock ? 'Every section is complete. These are raw results from original practice questions, not JLPT scaled scores or an official pass/fail judgment.' : 'Missed assessment questions are saved for spaced review. Script study doesn’t measure listening ability.'),
      button('Finish review', onFinish));
    if (attempt.mock) summary.append(el('div', { className: 'skill-breakdown' }, ...attempt.mock.sections.map(section => {
      const result = engine.gradeAttempt({ ...attempt, questionOrder: section.questionIds }, questionMap);
      return el('span', { className: 'badge' }, `${section.title}: ${result.correct}/${result.total} · ${result.excluded} unscored`);
    })));
    summary.classList.add('result-summary');
    return el('div', { className: 'content-stack' }, summary, ...attempt.questionOrder.map((questionId, index) => {
      const question = questionMap[questionId];
      const node = card(el('div', { className: 'quiz-header' }, el('span', { className: 'tag' }, `Question ${index + 1} · ${question.skill}`)),
        el('p', { className: 'question-prompt' }, gloss(question.prompt, question, true)), explanation(question, attempt, true, ctx));
      if (attempt.excludedIds.includes(questionId)) node.prepend(el('span', { className: 'badge' }, 'Excluded from assessment'));
      const genuineAnswer = ['submitted', 'reviewed'].includes(attempt.status) && !attempt.excludedIds.includes(questionId) && (question.skill !== 'listening' || attempt.listeningAccess === 'audio') && question.options.some(option => option.id === attempt.answers[questionId]);
      if (genuineAnswer && global.KotobaSrs) node.append(global.KotobaSrs.renderRatings(ctx, {
        type: 'question', id: questionId, attemptId: attempt.id,
        eventId: `attempt:${attempt.id}:${questionId}`, revealed: true,
      }));
      return node;
    }));
  }

  function renderQuiz(ctx, attempt, onFinish) {
    if (attempt.status !== 'in-progress') return renderResults(ctx, attempt, onFinish);
    const { el, button, card, ja } = global.KotobaUI;
    const section = engine.mockSection(attempt);
    if (section?.status === 'submitted') {
      const next = attempt.mock.sections[attempt.mock.currentSection + 1];
      const panel = card(el('span', { className: 'eyebrow' }, `${attempt.mock.level.toUpperCase()} · ORIGINAL FULL MOCK`),
        el('h2', { className: 'section-title' }, `${section.title} is complete.`),
        el('p', { className: 'muted' }, 'Your answers are saved and this section is locked. Take a break; the next timer starts when you continue. Answers and explanations stay hidden until every section is submitted.'),
        el('div', { className: 'skill-breakdown' }, ...attempt.mock.sections.map((item, index) => el('span', { className: 'badge' }, `${index + 1}. ${item.title} · ${item.status === 'submitted' ? 'Complete' : `${item.durationMinutes} min`}`))),
        el('h3', {}, `Next: ${next.title}`),
        el('p', { className: 'muted' }, `${next.questionIds.length} original questions · ${next.durationMinutes} minutes`),
        button(`Start ${next.title.toLowerCase()}`, () => ctx.update(progress => engine.startNextMockSection(progress, attempt.id))));
      panel.classList.add('mock-break-card');
      return el('div', { className: 'content-stack' }, panel);
    }
    const questionOrder = section?.questionIds ?? attempt.questionOrder;
    const cursorKey = section ? `${attempt.id}:section-${attempt.mock.currentSection}` : attempt.id;
    ctx.view.quizCursor ??= {};
    ctx.view.audioFailures ??= {};
    const immediate = attempt.type === 'practice' || attempt.type === 'review';
    if (!Number.isInteger(ctx.view.quizCursor[cursorKey])) {
      const unfinished = questionOrder.findIndex(id => immediate ? !attempt.checkedIds.includes(id) && !attempt.excludedIds.includes(id) : !attempt.answers[id] && !attempt.excludedIds.includes(id));
      ctx.view.quizCursor[cursorKey] = Math.max(0, unfinished);
    }
    const index = Math.min(questionOrder.length - 1, Math.max(0, ctx.view.quizCursor[cursorKey]));
    ctx.view.quizCursor[cursorKey] = index;
    const question = questionMap[questionOrder[index]];
    const checked = attempt.checkedIds.includes(question.id);
    const gloss = wordHelp(ctx, attempt);
    const excluded = attempt.excludedIds.includes(question.id);
    const answered = questionOrder.filter(id => attempt.answers[id]).length;
    const go = next => { ctx.view.quizCursor[cursorKey] = next; ctx.rerender({ transition: true }); };
    const submit = () => ctx.update(progress => {
      const next = engine.submitAttempt(progress, attempt.id, questionMap);
      if (next !== progress) ctx.cue?.('complete');
      return next;
    });
    const label = section ? `${attempt.mock.level.toUpperCase()} full mock · ${attempt.mock.currentSection + 1}/${attempt.mock.sections.length} ${section.title}` : attempt.type === 'mock' ? 'Saved short mock' : attempt.isRetry ? 'Mistake retry' : 'Learning practice';
    const header = el('div', { className: 'quiz-header' }, el('span', { className: 'tag' }, `${label} · ${question.skill}`));
    const category=content.questionTypes?.find(type=>type.id===question.questionType);
    if(category)header.append(el('span',{className:'badge'},category.title));
    if (attempt.deadline !== null) {
      const timer = el('span', { className: 'timer', role: 'timer', 'aria-label': 'Time remaining' });
      const updateTimer = () => {
        const seconds = engine.remainingSeconds(attempt);
        timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      };
      updateTimer(); header.append(timer);
      const interval = setInterval(updateTimer, 500); ctx.cleanup(() => clearInterval(interval));
    }
    const node = card(header,
      el('div', { className: 'quiz-progress' }, el('span', {}, `Question ${index + 1} of ${questionOrder.length}`), el('span', {}, `${answered} answered`)),
      el('div', { className: 'progress-track' }, el('div', { className: 'progress-fill', style: `width:${answered / questionOrder.length * 100}%` })));
    node.classList.add('quiz-card');
    if(category?.note)node.append(el('p',{className:'muted'},category.note));
    if (attempt.type === 'practice' || attempt.type === 'review') node.append(el('p', { className: 'word-help-note' }, 'Dotted-underlined words: hover, focus, or tap for a definition. Answer clues stay hidden until checked.'));
    const passage = content.readings.find(item => item.id === question.passageId);
    if (passage) node.append(el('div', { className: 'example-block' }, el('h3', {}, passage.title), el('p', { className: 'passage-body', lang: 'ja' }, gloss(passage.body, question, checked))));
    const audio = content.listening.find(item => item.id === question.listeningId);
    if (audio) {
      const failureArea = el('div');
      function showFailure() {
        const failures = ctx.view.audioFailures[attempt.id] ?? [];
        if (!failures.includes(question.id)) ctx.view.audioFailures[attempt.id] = [...failures, question.id];
        if (excluded) return;
        failureArea.replaceChildren(el('div', { className: 'notice warning' },
          el('p', {}, 'Audio is unavailable. You can retry playback or exclude this question without a penalty.'),
          button('Exclude this question', () => ctx.update(progress => engine.excludeQuestion(progress, attempt.id, question.id)), 'button secondary small')));
      }
      node.append(global.KotobaAudio.render(ctx, audio, showFailure), failureArea);
      if (ctx.view.audioFailures[attempt.id]?.includes(question.id)) showFailure();
      if (attempt.type !== 'mock') node.append(button('Use listening-script study (unscored)', () => {
        ctx.rememberScript?.(audio.id);
        ctx.view.seenScriptIds ??= new Set();
        if (typeof ctx.view.seenScriptIds.add === 'function') ctx.view.seenScriptIds.add(audio.id);
        else if (Array.isArray(ctx.view.seenScriptIds) && !ctx.view.seenScriptIds.includes(audio.id)) ctx.view.seenScriptIds.push(audio.id);
        ctx.update(progress => ({ ...progress, attempts: progress.attempts.map(item => item.id === attempt.id ? { ...item, listeningAccess: 'script' } : item) }));
      }, 'button ghost small'));
      if (attempt.listeningAccess === 'script' && attempt.type !== 'mock') node.append(el('div', { className: 'example-block' }, el('span', { className: 'badge' }, 'Listening-script study · unscored'), el('p', { className: 'transcript', lang: 'ja' }, gloss(audio.script, question, checked))));
    }
    node.append(el('h2', { className: 'question-prompt' }, gloss(question.prompt, question, checked)));
    if (excluded) node.append(el('p', { className: 'notice warning' }, 'This question is unscored because audio was unavailable or its transcript was already opened.'));
    const options = el('fieldset', { className: 'options', 'data-question-id': question.id, disabled: checked || excluded || engine.remainingSeconds(attempt) === 0 },
      el('legend', { className: 'visually-hidden' }, 'Choose one answer'));
    attempt.optionOrders[question.id].forEach((optionId, displayIndex) => {
      const option = question.options.find(item => item.id === optionId);
      const selected = attempt.answers[question.id] === optionId;
      options.append(el('label', { className: `option${selected ? ' selected' : ''}${checked && optionId === question.correctOptionId ? ' correct' : ''}${checked && selected && optionId !== question.correctOptionId ? ' incorrect' : ''}` },
        el('input', { id: `quiz-option-${question.id}-${displayIndex + 1}`, type: 'radio', name: `answer-${question.id}`, value: optionId, checked: selected, 'aria-keyshortcuts': String(displayIndex + 1), onChange: () => ctx.update(progress => engine.selectAnswer(progress, attempt.id, question.id, optionId)) }),
        el('span', { className: 'option-letter' }, String(displayIndex + 1)), el('span', { className: 'option-text' }, ja(option.text)),
        checked && optionId === question.correctOptionId ? el('span', { className: 'option-status' }, 'Correct answer') : null));
    });
    node.append(options);
    if (checked) node.append(explanation(question, attempt, false, ctx));
    const actions = el('div', { className: 'inline-actions' });
    if (immediate && !checked && !excluded) actions.append(button('Check answer', () => ctx.update(progress => {
      const next = engine.checkAnswer(progress, attempt.id, question.id);
      if (next !== progress) ctx.cue?.(attempt.answers[question.id] === question.correctOptionId ? 'correct' : 'incorrect');
      return next;
    }), 'button primary', { disabled: !attempt.answers[question.id] }));
    if (index < questionOrder.length - 1) actions.append(button('Next', () => go(index + 1), 'button secondary', { disabled: immediate && !checked && !excluded }));
    if (index === questionOrder.length - 1 && (!immediate || checked || excluded)) actions.append(button(section ? `Submit ${section.title.toLowerCase()}` : attempt.type === 'mock' ? 'Submit test' : 'Submit practice', submit));
    node.append(el('div', { className: 'quiz-header quiz-footer' }, button('Previous', () => go(index - 1), 'button ghost', { disabled: index === 0 }), actions));
    if (!immediate) node.append(el('p', { className: 'muted' }, section ? 'This section locks on submission or when time runs out. Answers and explanations appear after every section. Unanswered assessment questions count as incorrect.' : 'Answers and explanations appear after submission. Unanswered questions count as incorrect.'));
    const container = el('div', { className: 'content-stack' }, node);
    node.append(el('p', { className: 'muted quiz-keyboard-help' }, 'Keyboard: 1–4 selects the displayed answer when you are not typing in a field.'),
      el('p', { className: 'visually-hidden', role: 'status', 'aria-live': 'polite' }, attempt.answers[question.id] ? `Answer ${attempt.optionOrders[question.id].indexOf(attempt.answers[question.id]) + 1} selected.` : ''));
    if (index < questionOrder.length - 1 && !immediate) {
      const unanswered = questionOrder.filter(id => !attempt.answers[id] && !attempt.excludedIds.includes(id)).length;
      container.append(button(`${section ? 'Submit section' : 'Submit now'} (${unanswered} unanswered)`, submit, 'button ghost'));
    }
    let disposed = false;
    function keyboard(event) {
      if (disposed || !node.isConnected || event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !/^[1-4]$/.test(event.key)) return;
      const target = event.target;
      if (global.document.querySelector('[aria-modal="true"]') || target.closest?.('input, select, textarea, summary, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]')) return;
      if (!node.contains(target) && target !== global.document.body && target !== global.document.documentElement && target.id !== 'main') return;
      const current = ctx.progress().attempts.find(item => item.id === attempt.id);
      const optionId = current?.optionOrders[question.id]?.[Number(event.key) - 1];
      if (!current || current.status !== 'in-progress' || current.checkedIds.includes(question.id) || current.excludedIds.includes(question.id) || engine.remainingSeconds(current) === 0 || !optionId) return;
      event.preventDefault();
      const viewport = { top: global.scrollY, left: global.scrollX, behavior: 'instant' };
      ctx.update(progress => engine.selectAnswer(progress, attempt.id, question.id, optionId));
      global.scrollTo(viewport);
    }
    global.document.addEventListener('keydown', keyboard);
    ctx.cleanup?.(() => { disposed = true; global.document.removeEventListener('keydown', keyboard); });
    return container;
  }

  global.KotobaQuiz = { render: renderQuiz, questionMap };
})(window);
