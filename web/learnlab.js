/* Local microlearning. Results and drafts stay separate from canonical assessments. */
(function (global) {
  'use strict';
  const C = global.KotobaContent;
  const words = new Map(C.vocabulary.map(word => [word.id, word]));
  const { el, button, card, ja } = global.KotobaUI;
  const modes = [['recall', 'Type from memory'], ['sentence', 'Build a sentence'], ['pairs', 'Match pairs'], ['dictation', 'Listen and type'], ['bonus', 'Culture and usage']];
  const model = () => global.KotobaLearnLabModel;
  const state = ctx => ctx.progress().learnlab || model().initialLearnLab();
  const preferences = ctx => global.KotobaPreferences?.get?.(ctx.progress()) || { quiet: false, autoSpeak: false, kanaAssist: false, autoAdvance: false, ...ctx.progress().settings.studyPreferences };
  const blocked = ctx => { const p = ctx.progress(); return p.attempts.some(attempt => attempt.id === p.activeAttemptId && attempt.type === 'mock' && attempt.status === 'in-progress'); };
  function change(ctx, fn) { ctx.update(p => ({ ...p, learnlab: fn(p.learnlab || model().initialLearnLab()) })); }
  function fail(ctx, error) { ctx.notice?.(error.message || String(error)); }
  function download(value, name) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const link = el('a', { href: url, download: name }); document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function heading() { return el('div', { className: 'section-header' }, el('div', {}, el('span', { className: 'eyebrow' }, 'SMALL STEPS, ACTIVE RECALL'), el('h2', { className: 'section-title' }, 'Learning lab'))); }
  function wordCard(word) {
    const notes = model().wordNotes(word.id);
    return el('article', { className: 'lab-word' }, el('strong', { lang: 'ja' }, word.word), el('span', { lang: 'ja' }, word.reading), el('p', {}, word.meaning), el('span', { className: 'badge' }, notes.register), el('p', { className: 'muted' }, notes.wordClass), el('p', { lang: 'ja' }, word.example), el('p', { className: 'translation' }, word.exampleTranslation), notes.homophones.length ? el('details', {}, el('summary', {}, 'Same reading, different words'), el('p', {}, notes.homophones.join(' / ')), el('p', { className: 'muted' }, 'Use context to choose the meaning. Pitch accent is not supplied.')) : null);
  }
  function setup(ctx) {
    const L = model(), view = ctx.view.learnlab ||= { mode: 'recall', count: 4 };
    const quiet = preferences(ctx).quiet;
    if (quiet && view.mode === 'dictation') view.mode = 'recall';
    const level = ctx.progress().settings.studyLevel === 'all' ? 'n3' : ctx.progress().settings.studyLevel || 'n3';
    const root = card(heading(), el('p', { className: 'muted' }, 'Study 3–5 words or concepts, then retrieve them from memory. Aim for 3–5 minutes; earlier material returns throughout the session.'), el('div', { className: 'lab-settings' }, el('label', { className: 'field', for: 'lab-mode' }, el('span', { className: 'field-label' }, 'Activity'), el('select', { id: 'lab-mode', value: view.mode, onChange: event => { view.mode = event.target.value; } }, modes.filter(([id]) => !quiet || id !== 'dictation').map(([id, label]) => el('option', { value: id, selected: view.mode === id }, label)))), el('label', { className: 'field', for: 'lab-count' }, el('span', { className: 'field-label' }, 'New concepts'), el('select', { id: 'lab-count', value: view.count, onChange: event => { view.count = Number(event.target.value); } }, [3, 4, 5].map(count => el('option', { value: count, selected: view.count === count }, String(count)))))), el('p', { className: 'muted' }, 'Level: ', level.toUpperCase(), '. Lab results and its review schedule are self-study records.', quiet ? ' Quiet practice keeps audio activities hidden.' : ''), button('Start a short lesson', () => {
      try { if (view.mode === 'sentence' && typeof Intl.Segmenter !== 'function') throw new Error('Sentence segmentation is unavailable here. Choose Type from memory or another activity.'); view.feedback = null; view.working = {}; view.summaryId = null; change(ctx, lab => L.createSession(lab, { mode: view.mode, level, count: view.count, studiedWordIds: ctx.progress().studyEvents.filter(event => event.type === 'vocabulary').map(event => event.contentId) })); } catch (error) { fail(ctx, error); }
    }, 'button primary', { id: 'lab-start' }));
    root.classList.add('learnlab-panel');
    const recent = state(ctx).sessions.filter(session => session.status === 'complete').slice(-3).reverse();
    if (recent.length) root.append(el('details', { className: 'lab-history' }, el('summary', {}, 'Recent lab lessons'), recent.map(session => button(`${session.mode} · ${session.level.toUpperCase()} · ${session.results.filter(result => result.outcome === 'exact').length}/${session.results.length} exact`, () => { view.summaryId = session.id; ctx.rerender(); }, 'button secondary small'))));
    return root;
  }
  function summary(ctx, session) {
    const L = model(), exact = session.results.filter(result => result.outcome === 'exact').length, missed = session.results.filter(result => result.outcome !== 'exact');
    const mean = session.results.length ? Math.round(session.results.reduce((sum, result) => sum + result.latencyMs, 0) / session.results.length / 1000) : 0;
    const node = card(heading(), el('h3', {}, 'Lesson completed'), el('p', {}, `${exact} exact responses · ${session.results.filter(result => result.outcome === 'typo').length} accepted with a typo`), el('p', { className: 'muted' }, `Average response time: ${mean}s. Your final challenge was completed. This is a learning summary, not an exam score.`));
    if (missed.length) node.append(el('h4', {}, 'Words and concepts to revisit'), el('div', { className: 'lab-mistakes' }, missed.map(result => {
      const exercise = L.currentExercise({ ...session, cursor: session.queue.findIndex(item => item.id === result.exerciseId) });
      const grade = L.gradeResponse(exercise, result.answer);
      return el('p', {}, el('strong', {}, exercise.bonus?.title || exercise.target?.word || 'Word pairs'), ' · ', grade.expected, el('span', { className: 'muted' }, ' — ', grade.feedback));
    })));
    else node.append(el('p', {}, 'All responses were exact. Return later for retrieval practice.'));
    node.append(button('Choose another short lesson', () => { ctx.view.learnlab.summaryId = null; ctx.rerender(); }, 'button primary', { id: 'lab-new-lesson' }));
    node.classList.add('learnlab-panel'); return node;
  }
  function render(ctx) {
    if (!model()) return card(el('p', { className: 'muted' }, 'Learning lab is preparing.'));
    if (blocked(ctx)) return card(el('p', { className: 'muted' }, 'Learning activities reopen after the mock test.'));
    const L = model(), lab = state(ctx), view = ctx.view.learnlab ||= { mode: 'recall', count: 4 };
    const prefs = preferences(ctx);
    view.kanaAssist ??= prefs.kanaAssist;
    const session = lab.sessions.find(item => item.id === lab.activeSessionId);
    if (!session) { const completed = lab.sessions.find(item => item.id === view.summaryId && item.status === 'complete'); return completed ? summary(ctx, completed) : setup(ctx); }
    const node = card(heading()); node.classList.add('learnlab-panel');
    if (session.phase === 'learn') {
      node.append(el('h3', {}, 'Meet today’s words and concepts'), el('p', { className: 'muted' }, 'Read each example, then practise without these cards. At least 20% of the queue retrieves earlier material.'));
      if (session.mode === 'bonus') node.append(el('div', { className: 'lab-introductions' }, session.queue.filter(item => !item.retrieval).map(item => { const bonus = L.bonusLessons.find(lesson => lesson.id === item.bonusId); return el('article', { className: 'lab-word' }, el('span', { className: 'badge' }, bonus.category), el('h4', {}, bonus.title), el('p', {}, bonus.body), el('span', { className: 'tag' }, bonus.label)); })));
      else node.append(el('div', { className: 'lab-introductions' }, session.newWordIds.map(id => wordCard(words.get(id)))));
      if (session.mode === 'bonus') node.append(el('details', {}, el('summary', {}, 'Forms before grammar patterns'), L.currentExercise(session).grammarForms.map(point => el('div', {}, el('strong', { lang: 'ja' }, point.title), el('ul', {}, point.attachment.map(rule => el('li', {}, rule)))))));
      node.append(button('Try from memory', () => { view.feedback = null; change(ctx, state => L.beginSession(state, session.id)); }, 'button primary', { id: 'lab-begin' }));
    } else if (view.feedback?.sessionId === session.id) {
      const feedback = view.feedback;
      node.append(el('div', { className: 'lab-feedback ' + feedback.grade.outcome, role: 'status' }, el('h3', {}, feedback.grade.outcome === 'exact' ? 'Correct' : feedback.grade.outcome === 'typo' ? 'Correct with a typo' : 'Let’s practise this again'), el('p', { lang: 'ja' }, feedback.grade.expected), el('p', {}, feedback.grade.feedback), el('p', { className: 'muted' }, `Response time: ${Math.round(feedback.latencyMs / 1000)}s · Local exact-recall combo: ${feedback.combo}`)));
      const advance = () => { view.feedback = null; view.working = {}; if (session.cursor === session.queue.length) { view.summaryId = session.id; change(ctx, state => L.finishSession(state, session.id)); } else change(ctx, state => L.resumeExercise(state, session.id)); };
      node.append(button(session.cursor === session.queue.length ? 'Finish lesson' : 'Continue', advance, 'button primary', { id: 'lab-next' }));
      if (prefs.autoAdvance && session.cursor < session.queue.length) { const delay = feedback.grade.outcome === 'exact' ? 2500 : 5000; node.append(el('p', { className: 'muted' }, `Automatic progression in ${delay / 1000}s. You can turn it off in Preferences.`)); const timer = setTimeout(advance, delay); ctx.cleanup(() => clearTimeout(timer)); }
    } else {
      const exercise = L.currentExercise(session);
      if (!exercise) { node.append(button('Finish lesson', () => { view.summaryId = session.id; change(ctx, state => L.finishSession(state, session.id)); }, 'button primary')); return node; }
      const working = view.working?.exerciseId === exercise.id ? view.working : (view.working = { exerciseId: exercise.id, text: '', tokens: [], pairs: {}, selectedWord: null });
      node.append(el('div', { className: 'quiz-header' }, el('span', { className: 'tag' }, exercise.final ? 'FINAL · EASIER RETRIEVAL' : exercise.retrieval ? 'EARLIER MATERIAL' : 'ACTIVE RECALL'), el('span', { className: 'muted' }, `Step ${session.cursor + 1} of ${session.queue.length}${exercise.final ? '' : ' + final challenge'}`)), el('h3', { className: 'lab-prompt', lang: exercise.kind === 'bonus' ? null : 'en' }, exercise.kind === 'dictation' && prefs.quiet ? exercise.target.meaning : exercise.prompt));
      if (exercise.final && session.results.some(result => result.outcome !== 'exact')) node.append(el('details', {}, el('summary', {}, 'Revisit the tricky responses before this final challenge'), session.results.filter(result => result.outcome !== 'exact').map(result => { const old = L.currentExercise({ ...session, cursor: session.queue.findIndex(item => item.id === result.exerciseId) }); return el('p', {}, L.gradeResponse(old, result.answer).expected); })));
      let committed = false;
      const submit = answer => {
        if (committed || working.composing) return;
        committed = true;
        const at = Date.now(), grade = L.gradeResponse(exercise, answer);
        let combo = grade.outcome === 'exact' ? 1 : 0;
        if (combo) for (let i = session.results.length - 1; i >= 0 && session.results[i].outcome === 'exact'; i--) combo++;
        view.feedback = { sessionId: session.id, grade, combo, latencyMs: Math.max(0, at - session.itemStartedAt) };
        change(ctx, state => L.answerSession(state, session.id, exercise.id, answer, at));
      };
      if (['recall', 'dictation'].includes(exercise.kind)) {
        if (exercise.kind === 'dictation' && !prefs.quiet) {
          node.append(global.KotobaAudio.render(ctx, { id: 'lab-' + exercise.id, script: exercise.target.word }), typeof global.KotobaAudio.speakText === 'function' ? button('Play slowly', () => global.KotobaAudio.speakText(ctx, exercise.target.word, { slow: true }), 'button secondary small') : null, el('p', { className: 'muted' }, 'Browser speech is self-study dictation. It is not a listening or pronunciation exam score.'));
          if (prefs.autoSpeak && typeof global.KotobaAudio.speakText === 'function' && view.lastSpokenExercise !== exercise.id) { view.lastSpokenExercise = exercise.id; global.KotobaAudio.speakText(ctx, exercise.target.word, { auto: true }); }
        }
        const input = el('input', { id: 'lab-answer', type: 'text', value: working.text, autocomplete: 'off', spellcheck: false, lang: 'ja', 'aria-label': 'Japanese answer or kana reading', onInput: event => { working.text = event.target.value; }, onCompositionstart: () => { working.composing = true; }, onCompositionend: event => { working.composing = false; working.text = event.target.value; }, onKeydown: event => { if (event.key === 'Enter' && !event.isComposing && !working.composing) { event.preventDefault(); submit(view.kanaAssist ? L.romajiToKana(input.value) : input.value); } } });
        node.append(el('label', { className: 'field', for: 'lab-answer' }, el('span', { className: 'field-label' }, 'Word or kana reading'), input), global.KotobaSpeechInput ? global.KotobaSpeechInput.render(ctx, input) : null, el('label', { className: 'lab-check' }, el('input', { type: 'checkbox', checked: !!view.kanaAssist, onChange: event => { view.kanaAssist = event.target.checked; } }), 'Convert romaji to kana when checking'), button('Check recall', () => submit(view.kanaAssist ? L.romajiToKana(input.value) : input.value), 'button primary', { id: 'lab-check-answer' }));
      } else if (exercise.kind === 'sentence') {
        const bank = el('div', { className: 'lab-bank', 'aria-label': 'Available sentence parts' });
        const assembled = el('div', { className: 'lab-assembled', 'aria-live': 'polite', lang: 'ja' });
        const paint = () => { assembled.replaceChildren(...working.tokens.map(id => button(exercise.bank.find(token => token.id === id).text, () => { working.tokens = working.tokens.filter(token => token !== id); paint(); }, 'lab-token', { lang: 'ja', 'aria-label': 'Remove ' + exercise.bank.find(token => token.id === id).text }))); bank.replaceChildren(...exercise.bank.map(token => button(token.text, () => { if (!working.tokens.includes(token.id)) working.tokens.push(token.id); paint(); }, 'lab-token', { lang: 'ja', disabled: working.tokens.includes(token.id) }))); };
        paint(); node.append(el('p', { className: 'muted' }, 'Build the original sentence. Tap a selected part to return it to the bank.'), assembled, bank, button('Check sentence', () => submit(working.tokens.slice()), 'button primary', { id: 'lab-check-sentence' }));
      } else if (exercise.kind === 'pairs') {
        const pairs = el('div', { className: 'lab-pairs' });
        const status = el('p', { className: 'muted', role: 'status' });
        const paint = () => { status.textContent = `${Object.keys(working.pairs).length} of ${exercise.words.length} pairs selected`; pairs.replaceChildren(el('div', {}, exercise.words.map(word => button(word.word, () => { working.selectedWord = word.id; paint(); }, 'lab-pair' + (working.selectedWord === word.id ? ' selected' : ''), { lang: 'ja', 'aria-pressed': working.selectedWord === word.id }))), el('div', {}, exercise.words.slice().reverse().map(word => button(word.meaning, () => { if (working.selectedWord) { working.pairs[working.selectedWord] = word.id; working.selectedWord = null; paint(); } }, 'lab-pair', { disabled: !working.selectedWord })))); };
        paint(); node.append(el('p', { className: 'muted' }, 'Select a Japanese word, then its meaning. You can replace a pair before checking.'), pairs, status, button('Check pairs', () => submit({ ...working.pairs }), 'button primary', { id: 'lab-check-pairs' }));
      } else {
        const choices = exercise.options.map((option, index) => button(`${index + 1}. ${option.label}`, () => submit(option.id), 'button secondary lab-choice', { 'data-lab-choice': index + 1 }));
        node.append(el('div', { className: 'lab-choices' }, choices), el('p', { className: 'muted' }, 'Choose an answer or use keys 1–4.'));
        const keys = event => { if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.defaultPrevented || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) || event.target?.isContentEditable) return; const index = Number(event.key) - 1; if (/^[1-4]$/.test(event.key) && choices[index]) { event.preventDefault(); choices[index].click(); } };
        document.addEventListener('keydown', keys); ctx.cleanup(() => document.removeEventListener('keydown', keys));
      }
    }
    node.append(button('End this session', () => { view.feedback = null; change(ctx, state => L.abandonSession(state, session.id)); }, 'button ghost small', { id: 'lab-end-session' }));
    return node;
  }
  function renderTools(ctx) {
    if (!model() || blocked(ctx)) return card(el('p', { className: 'muted' }, 'Local content tools reopen after the mock test.'));
    const L = model(), view = ctx.view.labTools ||= { search: '', reason: 'typo', message: '', json: '', preview: null };
    const lab = state(ctx), all = [...C.vocabulary, ...C.grammar, ...C.readings, ...C.listening, ...L.bonusLessons];
    const sample = { version: 1, id: 'draft-my-example', kind: 'vocabulary', level: 'n3', topicId: 'daily', title: 'My original example', word: '予定', reading: 'よてい', meaning: 'plan; schedule', body: '明日は予定があります。', translation: 'I have plans tomorrow.', sourceNote: 'Original personal draft.' };
    const root = card(el('h2', { className: 'section-title' }, 'Local content notes and drafts'), el('p', { className: 'muted' }, 'Save an issue note or preview your own content on this device. Drafts do not enter lessons or tests; JSON export lets you review or share them yourself.'));
    root.classList.add('learnlab-tools');
    const filtered = all.filter(item => `${item.id} ${item.word || item.title || ''}`.toLowerCase().includes(view.search.toLowerCase())).slice(0, 40);
    const picker = el('select', { id: 'lab-report-content', value: view.contentId || filtered[0]?.id, onChange: event => { view.contentId = event.target.value; } }, filtered.map(item => el('option', { value: item.id, selected: item.id === view.contentId }, `${item.word || item.title} · ${item.id}`)));
    const search = el('input', { id: 'lab-report-search', type: 'search', placeholder: 'Find a word or content ID', value: view.search, onInput: event => { view.search = event.target.value; view.contentId = null; ctx.rerender(); document.getElementById('lab-report-search')?.focus({ preventScroll: true }); } });
    root.append(el('details', { className: 'lab-tool-section', open: !!view.reportOpen, onToggle: event => { view.reportOpen = event.currentTarget.open; } }, el('summary', {}, 'Flag a content issue'), el('label', { className: 'field', for: 'lab-report-search' }, el('span', { className: 'field-label' }, 'Find content'), search), el('label', { className: 'field', for: 'lab-report-content' }, el('span', { className: 'field-label' }, 'Content'), picker), el('label', { className: 'field', for: 'lab-report-reason' }, el('span', { className: 'field-label' }, 'Issue'), el('select', { id: 'lab-report-reason', value: view.reason, onChange: event => { view.reason = event.target.value; } }, ['reading', 'translation', 'ambiguous', 'typo', 'other'].map(reason => el('option', { value: reason, selected: reason === view.reason }, reason)))), el('label', { className: 'field', for: 'lab-report-message' }, el('span', { className: 'field-label' }, 'What needs review?'), el('textarea', { id: 'lab-report-message', value: view.message, maxlength: 1200, rows: 3, onInput: event => { view.message = event.target.value; } })), button('Save local issue note', () => { try { const id = picker.value, message = view.message; view.message = ''; change(ctx, state => L.addReport(state, id, view.reason, message)); } catch (error) { fail(ctx, error); } }, 'button secondary')));
    const editor = el('textarea', { id: 'lab-draft-json', rows: 12, value: view.json, spellcheck: false, 'aria-label': 'Local draft JSON', onInput: event => { view.json = event.target.value; } });
    const preview = () => { if (view.json.length > 40000) throw new Error('Keep a local draft below 40,000 characters.'); return L.validateDraft(JSON.parse(view.json)); };
    const draftArea = el('details', { className: 'lab-tool-section', open: !!view.draftOpen, onToggle: event => { view.draftOpen = event.currentTarget.open; } }, el('summary', {}, 'Preview and edit an original draft'), el('p', { className: 'muted' }, 'Use version 1 JSON with a known level and topic. Japanese text, English translation, and a source note are required.'), button('Load an example template', () => { view.json = JSON.stringify(sample, null, 2); editor.value = view.json; }, 'button secondary small'), el('label', { className: 'field', for: 'lab-draft-json' }, el('span', { className: 'field-label' }, 'Draft JSON'), editor), el('div', { className: 'inline-actions' }, button('Preview draft', () => { try { view.preview = preview(); ctx.rerender(); } catch (error) { fail(ctx, error); } }, 'button secondary'), button('Save draft on this device', () => { try { const draft = preview(); view.preview = draft; change(ctx, state => L.saveDraft(state, draft)); } catch (error) { fail(ctx, error); } }, 'button primary'), button('Export draft JSON', () => { try { const draft = preview(); download(draft, draft.id + '.json'); } catch (error) { fail(ctx, error); } }, 'button secondary')));
    if (view.preview) { const draft = view.preview; draftArea.append(el('article', { className: 'lab-draft-preview' }, el('span', { className: 'badge' }, `LOCAL DRAFT · ${draft.kind} · ${draft.level.toUpperCase()}`), el('h3', {}, draft.title), draft.word ? el('p', { lang: 'ja' }, draft.word, '（', draft.reading, '）') : null, draft.meaning ? el('p', {}, draft.meaning) : null, el('p', { className: 'passage-body', lang: 'ja' }, draft.body), el('p', { className: 'translation' }, draft.translation), el('p', { className: 'muted' }, draft.sourceNote))); }
    if (lab.drafts.length) draftArea.append(el('h3', {}, 'Saved drafts'), lab.drafts.map(draft => button(draft.title, () => { view.json = JSON.stringify(draft, null, 2); view.preview = draft; view.draftOpen = true; ctx.rerender(); }, 'button secondary small')));
    root.append(draftArea);
    const groups = Object.entries(L.groupReports(lab));
    if (groups.length) root.append(el('details', { className: 'lab-tool-section' }, el('summary', {}, `${lab.reports.length} local issue notes, grouped by content`), groups.map(([id, reports]) => el('section', {}, el('h3', {}, id), reports.map(report => el('div', { className: 'lab-report' }, el('span', { className: 'badge' }, report.reason + ' · ' + report.status), el('p', {}, report.message), report.status === 'open' ? button('Mark reviewed locally', () => change(ctx, state => L.resolveReport(state, report.id)), 'button ghost small') : null)))), button('Export local issue notes', () => download(lab.reports, 'kotoba-local-issues.json'), 'button secondary')));
    return root;
  }
  global.KotobaLearnLab = { render, renderTools };
})(window);
