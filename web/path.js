/* Original integrated lessons; reference coverage, checkmarks and assessed mastery stay separate. */
(function (global) {
    'use strict';
    function referenceMap(ctx, level, pacing, gaps = []) {
        const { el } = global.KotobaUI, C = global.KotobaContent;
        const map = el('details', { className: 'path-reference-map' },
            el('summary', {}, 'Reference coverage and remaining gaps'),
            el('p', {}, pacing || C.referenceScopeNote),
            el('p', {}, 'Publisher topics and original app associations are recorded separately. Exact chapters/pages and complete textbook coverage have not been verified.'),
            gaps.length ? el('ul', {}, gaps.map(gap => el('li', {}, gap))) : null);
        const refs = (C.referenceMap || []).filter(ref => ref.level === level);
        map.append(el('div', { className: 'reference-map-grid' }, refs.map(ref =>
            el('article', { className: 'reference-map-entry' },
                el('h4', {}, ref.volume + ' · ' + ref.skill),
                el('p', {}, 'Edition: ' + ref.edition + ' · ISBN ' + ref.isbn),
                el('p', {}, 'Verified publisher topic: ' + ref.verifiedTopic),
                el('p', {}, 'Original app objective: ' + ref.appObjective),
                el('p', {}, `Representative app items: ${(ref.appContentIds || []).length}.`),
                el('ul', {}, (ref.gaps || []).map(gap => el('li', {}, gap))),
                el('a', { href: ref.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Publisher source ↗')))));
        return map;
    }
    function render(ctx) {
        const C = global.KotobaContent, E = global.KotobaEngine, U = global.KotobaUI;
        const { el, button, ja, icon } = U, progress = ctx.progress(), view = ctx.view;
        const level = ['n5', 'n4', 'n3', 'n2', 'n1'].includes(view.studyLevel) ? view.studyLevel : 'n3';
        const plan = C.learningPath?.find(p => p.level === level);
        if (!plan)
            return el('section', { className: 'card' }, el('h2', {}, 'Your integrated learning path'), el('p', {}, 'Choose N5, N4, N3, N2, or N1 to open an integrated path.'));
        const lessons = plan.units.flatMap(u => u.lessons);
        const saved = lessons.find(l => l.id === progress.settings.pathResume);
        const selected = lessons.find(l => l.id === view.pathLesson) || saved || lessons.find(l => !progress.completedTasks.includes('path:' + l.id)) || lessons[0];
        const unit = plan.units.find(u => u.lessons.includes(selected));
        const selectLesson = id => { view.pathLesson = id; view.pathOpen = true; ctx.update(p => ({ ...p, settings: { ...p.settings, pathResume: id } })); };
        const unitPicker = el('select', { id: 'path-unit', onChange: event => selectLesson(plan.units.find(u => u.id === event.target.value).lessons[0].id) }, plan.units.map(u => el('option', { value: u.id }, u.title)));
        unitPicker.value = unit.id;
        const completed = lessons.filter(l => progress.completedTasks.includes('path:' + l.id)).length;
        const availableQuestions = selected.questionIds.map(id => C.questions.find(q => q.id === id)).filter(Boolean);
        const assessed = E.aggregateAccuracy(progress, Object.fromEntries(C.questions.map(q => [q.id, q])));
        const mastery = selected.questionIds.filter(id => progress.reviews[id]?.mastered).length;
        const stage = el('section', { className: 'card integrated-path', id: 'integrated-path', 'aria-labelledby': 'path-title' }, el('div', { className: 'section-header' }, el('h2', { id: 'path-title' }, plan.title), el('span', { className: 'badge' }, `${completed}/${lessons.length} lessons marked complete`)), el('p', { className: 'muted' }, 'Study six short lessons, then review earlier material. Continue at your own pace.'), button([saved ? 'Continue lesson' : 'Start lesson', icon('arrow')], () => { selectLesson(selected.id); document.getElementById('daily-lesson')?.scrollIntoView({block:'start',behavior:'instant'}); }, 'button primary path-start'), el('label', { className: 'field path-unit-field', for: 'path-unit' }, el('span', { className: 'field-label' }, 'Learning unit'), unitPicker), el('p', { className: 'muted' }, unit.objective), unit.prerequisites.length ? el('p', { className: 'path-prerequisite' }, 'Suggested prerequisite: ', plan.units.find(u => u.id === unit.prerequisites[0])?.title) : null, el('div', { className: 'daily-lesson-menu', 'aria-label': 'Daily lessons and cumulative review' }, unit.lessons.map(l => button([
            el('span', {}, l.kind === 'daily' ? 'Learn' : l.kind === 'review' ? 'Review' : l.kind === 'mock' ? 'Mock' : 'Revise'),
            el('strong', {}, l.title), progress.completedTasks.includes('path:' + l.id) ? icon('check') : null,
        ], () => selectLesson(l.id), 'daily-lesson-node' + (l.id === selected.id ? ' selected' : ''), { 'aria-pressed': l.id === selected.id, 'data-lesson-id': l.id }))), el('article', { className: 'daily-lesson', id: 'daily-lesson' }, el('span', { className: 'tag' }, `${level.toUpperCase()} · ${selected.kind === 'daily' ? 'Integrated daily lesson' : selected.kind}`), el('h3', {}, selected.title), el('p', {}, selected.objective), el('p', { className: 'path-prerequisite' }, selected.prerequisite), ctx.taskControl('path:' + selected.id, 'Complete lesson'), el('div', { className: 'path-evidence' }, el('p', {}, 'Completion: your saved checkmark.'), el('p', {}, `Spaced review mastery: ${mastery}/${selected.questionIds.length} linked questions have three successful due retries.`), el('p', {}, `Overall first-answer accuracy: ${assessed.initial.total ? Math.round(assessed.initial.correct / assessed.initial.total * 100) + '%' : 'no assessed answers yet'}. Reference coverage is documented separately below.`))));
        const detail = stage.querySelector('.daily-lesson');
        const lessonTitle = detail.querySelector('h3');
        const completion = detail.querySelector('.task-completion');
        const lessonHeading = el('div', { className: 'study-detail-heading' }, lessonTitle, completion);
        detail.querySelector('.tag').after(lessonHeading);
        const disclosure = el('details', { className: 'daily-lesson-disclosure', open: !!view.pathOpen, onToggle: event => { view.pathOpen = event.target.open; } }, el('summary', {}, 'Open this integrated lesson'));
        detail.replaceWith(disclosure);
        disclosure.append(detail);
        if (global.KotobaPreferences?.get(progress).guidedPath) {
            const prerequisiteLessons = plan.units.filter(candidate => unit.prerequisites.includes(candidate.id)).flatMap(candidate => candidate.lessons);
            const unfinished = prerequisiteLessons.filter(lesson => !progress.completedTasks.includes('path:' + lesson.id));
            const suggestion = unfinished[0];
            detail.prepend(el('aside', { className: 'notice path-guidance', 'aria-label': 'Prerequisite guidance' },
                el('p', {}, suggestion ? `${unfinished.length} earlier lessons remain unchecked. Revisit ${suggestion.title} if this material feels difficult.` : 'Earlier lesson checkmarks are up to date. Use mixed practice to check what you can recall; checkmarks alone do not demonstrate mastery.'),
                suggestion ? button('Revisit prerequisite', () => selectLesson(suggestion.id), 'button secondary small') : null));
        }
        const practicePool = (includeAudio = true) => {
            const earlier = selected.retrievalIds.map(id => C.questions.find(q => q.id === id)).filter(q => q && (includeAudio || q.skill !== 'listening'));
            const current = availableQuestions.filter(q => includeAudio || q.skill !== 'listening');
            const retrieval = E.selectPracticeQuestions(progress, earlier, { count: Math.min(4, earlier.length) });
            const newItems = E.selectPracticeQuestions(progress, current.filter(q => !retrieval.some(r => r.id === q.id)), { count: selected.kind === 'daily' ? 8 : 16 });
            return [...retrieval, ...newItems];
        };
        if (selected.kind === 'mock') {
            detail.append(el('p', {}, 'This is an original timed practice test. Review the configuration and begin when ready.'), button([`Prepare ${level.toUpperCase()} full mock`, icon('arrow')], () => { view.mockLevel = level; ctx.navigate('mock'); }, 'button primary'));
        }
        else {
            const wordIds = selected.kind === 'daily' ? selected.vocabularyIds : selected.vocabularyIds.slice(0, 7);
            const grammarIds = selected.kind === 'daily' ? selected.grammarIds : selected.grammarIds.slice(0, 2);
            detail.append(el('h4', {}, '1. Vocabulary and kanji in context'), el('div', { className: 'path-word-grid' }, wordIds.map(id => {
                const word = C.vocabulary.find(v => v.id === id);
                return el('article', { className: 'path-word' }, ja(word.word), el('span', { className: 'muted' }, word.reading + ' · ' + word.meaning), el('p', { lang: 'ja' }, word.example), el('p', { className: 'muted' }, word.exampleTranslation), button('Study word', () => ctx.openStudyItem('vocabulary', id), 'button ghost small', { 'aria-label': `Study word ${word.word}`, 'data-study-word': id }));
            })), el('p', { className: 'path-kanji' }, 'Kanji connections: ', selected.kanjiIds.slice(0, 16).map(id => {
                const entry = C.kanji.find(k => k.id === id);
                return button(entry.character, () => ctx.openStudyItem('kanji', id), 'button secondary small', { 'aria-label': `Open kanji connections for ${entry.character}: ${entry.meaning}`, 'data-study-kanji': id });
            })), el('h4', {}, '2. Grammar and distinctions'), ...grammarIds.map(id => {
                const g = C.grammar.find(g => g.id === id);
                return el('section', { className: 'path-grammar' }, el('h5', { lang: 'ja' }, g.title), el('p', {}, g.meaning), el('ul', {}, g.attachment.map(rule => el('li', {}, rule))), g.examples.map(e => el('p', {}, ja(e.ja), el('br'), el('span', { className: 'muted' }, e.en))), el('p', {}, g.comparison), el('details', {}, el('summary', {}, 'Common mistake'), el('p', { lang: 'ja' }, g.mistake.wrong), el('p', { lang: 'ja' }, g.mistake.correct), el('p', {}, g.mistake.explanation)), button('Record grammar study', () => ctx.update(p => E.markStudied(p, 'grammar', id)), 'button secondary small'));
            }));
            if (selected.context.length) {
                const notes = el('section', { className: 'path-context' }, el('h4', {}, '3. Read the lesson’s context sentences'), el('p', { className: 'muted' }, 'Read these original examples first. They use today’s words and grammar; the longer text below develops a separate reading strategy.'), selected.context.map(line => el('p', { lang: 'ja' }, line.ja)), el('details', {}, el('summary', {}, 'Check the translations'), selected.context.map(line => el('p', {}, line.en))));
                detail.append(notes);
            }
            const reading = C.readings.find(r => r.id === selected.readingId);
            if (reading) {
                const define = global.KotobaGlossaryUI.createStudy(ctx);
                detail.append(el('section', { className: 'path-reading' }, el('h4', {}, 'Reading comprehension · ' + reading.title), el('p', { className: 'passage-body', lang: 'ja' }, define(reading.body)), el('p', { className: 'muted' }, 'Tap, click, or focus a dotted-underlined word for its reading and definition.'), button('Answer reading questions', () => ctx.start(reading.questionIds.map(id => C.questions.find(q => q.id === id)), 'reading', { count: reading.questionIds.length }), 'button secondary')));
            }
            const listening = C.listening.find(l => l.id === selected.listeningId);
            if (listening) {
                const audioSection = el('section', { className: 'path-listening' }, el('h4', {}, '4. Listen and identify the speaker’s purpose · ' + listening.title));
                let failed = false;
                const listenButton = button('Answer listening questions', () => ctx.start(listening.questionIds.map(id => C.questions.find(q => q.id === id)), 'listening', { count: listening.questionIds.length, listeningAccess: failed ? 'script' : 'audio' }), 'button secondary');
                audioSection.append(global.KotobaAudio.render(ctx, listening, () => { failed = true; listenButton.textContent = 'Unscored listening script practice'; }), el('details', { onToggle: event => { if (event.target.open)
                        ctx.rememberScript(listening.id); } }, el('summary', {}, 'Study the script (future questions become unscored)'), el('p', { className: 'transcript', lang: 'ja' }, listening.script), el('p', { className: 'muted' }, listening.translation)), listenButton);
                detail.append(audioSection);
            }
            const candidates = practicePool(true);
            detail.append(el('h4', {}, '5. Mixed practice and earlier retrieval'), el('p', {}, selected.kind === 'daily' ? 'Up to four earlier questions join today’s questions. Weak assessed answers receive priority.' : 'This checkpoint draws on the current unit and earlier material. Review explanations and return to any lesson that needs another attempt.'), button([`Start ${selected.kind === 'daily' ? 'lesson' : 'cumulative'} practice`, icon('play')], () => ctx.start(candidates, 'practice', { count: candidates.length, listeningAccess: 'audio' }), 'button primary', { disabled: !candidates.length }), button('Review saved mistakes', () => ctx.navigate('review'), 'button ghost small'));
        }
        const next = lessons[lessons.indexOf(selected) + 1];
        if (next)
            detail.append(button(['Save and continue', icon('arrow')], () => selectLesson(next.id), 'button secondary'));
        stage.append(referenceMap(ctx, level, plan.pacing, plan.gaps));
        global.KotobaPathRecall?.enhance(ctx, stage, plan, selected);
        return stage;
    }
    global.KotobaPath = { render };
})(window);
