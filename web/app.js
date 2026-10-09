/* Kotoba's dependency-free application. All rendering uses safe text/DOM nodes. */
(() => {
    'use strict';
    const C = window.KotobaContent;
    const E = window.KotobaEngine;
    const S = window.KotobaStorage;
    const repository = window.KotobaRepository.createLocalProgressRepository();
    
    let syncManager = null;
    if (window.KotobaSync) {
        syncManager = window.KotobaSync.setupSync(repository, (newProgress) => {
            update(newProgress);
        }, () => {
            render();
        });
        window.KotobaSyncManager = syncManager;
    }

    const U = window.KotobaUI;
    const { el, button, ja, mixed, icon, card, paragraph: p, tag, actions, sectionTitle: title, externalLink: link } = U;
    const questionMap = Object.fromEntries(C.questions.map(q => [q.id, q]));
    const pages = [
        ['dashboard', 'Learn', 'home', 'Your next small win starts here.'],
        ['vocabulary', 'Vocabulary & kanji', 'book', 'Meet useful words. Remember them in context.'],
        ['grammar', 'Grammar', 'grammar', 'Small patterns. A whole new way to say it.'],
        ['reading', 'Reading', 'reading', 'Explore everyday emails, notices, and stories.'],
        ['listening', 'Listening', 'headphones', 'Get comfortable with everyday conversations.'],
        ['practice', 'Practice', 'target', 'Put a little of everything into practice.'],
        ['mock', 'Full mock test', 'mock', 'Practise a complete N5–N1 test at your own pace.'],
        ['review', 'Mistake review', 'review', 'A second try makes it stick.'],
        ['settings', 'Settings', 'settings', 'Make this learning journey your own.'],
    ];
    const skills = ['vocabulary', 'kanji', 'grammar', 'reading', 'listening'];
    const root = document.getElementById('root');
    const loaded = repository.load();
    let progress = loaded.progress;
    let recovery = !!loaded.warning;
    let saveState = recovery ? { saved: false } : repository.save(progress);
    let page = currentPage();
    let message = '';
    let modal = null;
    let imported = null;
    let historyId = null;
    let modalReturn = null;
    let disposers = [];
    let rendering = false;
    let renderAgain = false;
    const seenKey = 'kotoba-n3-seen-scripts-' + C.CONTENT_VERSION;
    function loadSeenScripts() {
        try {
            const current = sessionStorage.getItem(seenKey);
            const previous = current === null ? sessionStorage.getItem('kotoba-n3-seen-scripts-2026.10.4') ?? sessionStorage.getItem('kotoba-n3-seen-scripts-2026.10.3') ?? sessionStorage.getItem('kotoba-n3-seen-scripts-2026.10.2') ?? sessionStorage.getItem('kotoba-n3-seen-scripts-2026.10.1') : null;
            const ids = JSON.parse(current ?? previous ?? '[]');
            if (!Array.isArray(ids) || ids.length > C.listening.length || !ids.every(id => C.listening.some(s => s.id === id)))
                return new Set();
            return new Set(ids);
        }
        catch {
            return new Set();
        }
    }
    const view = { seenScriptIds: loadSeenScripts(), studyLevel: progress.settings.studyLevel || 'n3', practiceSkill: 'mixed', practiceCount: 5, goalDraft: String(progress.settings.dailyGoal) };
    let animateNextPage = false;
    function persistSeenScripts() { try {
        sessionStorage.setItem(seenKey, JSON.stringify([...view.seenScriptIds]));
    }
    catch { } }
    function rememberScript(id) { if (C.listening.some(s => s.id === id)) {
        view.seenScriptIds.add(id);
        persistSeenScripts();
    } }
    const date = value => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const cap = text => text[0].toUpperCase() + text.slice(1);
    const routeFor = type => type === 'mock' ? 'mock' : type === 'review' ? 'review' : type;
    const active = () => progress.attempts.find(a => a.id === progress.activeAttemptId);
    const due = () => Object.values(progress.reviews).filter(r => !r.mastered && Date.parse(r.dueAt) <= Date.now());
    const reviewDueCount = () => new Set([...due().map(record => 'question:' + record.questionId), ...window.KotobaSm2.dueSrsItems(progress).map(record => record.type + ':' + record.id)]).size;
    function currentPage() { const hash = location.hash.slice(1); return pages.some(([id]) => id === hash) ? hash : 'dashboard'; }
    function captureFocus() {
        const node = document.activeElement;
        if (!node || !root.contains(node))
            return null;
        return { id: node.id, name: node.getAttribute('name'), value: node.value, label: node.getAttribute('aria-label'), tag: node.tagName, text: node.textContent, start: node.selectionStart, end: node.selectionEnd };
    }
    function restoreFocus(saved) {
        if (!saved)
            return;
        let node = saved.id ? document.getElementById(saved.id) : null;
        if (!node && saved.name)
            node = [...root.querySelectorAll('[name]')].find(n => n.getAttribute('name') === saved.name && n.value === saved.value);
        if (!node && saved.label)
            node = [...root.querySelectorAll('[aria-label]')].find(n => n.tagName === saved.tag && n.getAttribute('aria-label') === saved.label);
        if (!node && saved.tag === 'BUTTON')
            node = [...root.querySelectorAll('button')].find(n => n.textContent === saved.text && !n.disabled);
        if (!node && saved.text?.includes('Check answer'))
            node = [...root.querySelectorAll('button')].find(n => /^(Next|Submit)/.test(n.textContent) && !n.disabled);
        if (node && !node.disabled) {
            node.focus({ preventScroll: true });
            if (typeof saved.start === 'number' && ['text', 'search'].includes(node.type))
                node.setSelectionRange(saved.start, saved.end);
        }
    }
    function update(updater, options = {}) {
        const next = typeof updater === 'function' ? updater(progress) : updater;
        if (next === progress) {
            render();
            return;
        }
        progress = options.rewardReconciliation === false ? next : window.KotobaMotivationEngine.reconcileMotivation(next, progress);
        if (!recovery)
            saveCurrent();
        render();
    }
    function saveCurrent() {
        saveState = repository.save(progress);
        if (!recovery) window.KotobaOffline?.archive(progress);
        return saveState;
    }
    function persistQuietly(next) {
        if (typeof next === 'function') next = next(progress);
        if (next === progress || recovery) return;
        progress = window.KotobaMotivationEngine.reconcileMotivation(next, progress);
        saveCurrent();
        window.KotobaPreferences?.apply(progress);
    }
    function notice(text) { message = text; render(); }
    function applyTheme() {
        const theme = progress.settings.theme === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
        window.KotobaPreferences?.apply(progress);
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#10222a' : '#f7faf8');
    }
    function setTheme(theme) { update(p => ({ ...p, settings: { ...p.settings, theme } })); }
    function themeToggle() {
        const dark = progress.settings.theme === 'dark';
        return button([icon(dark ? 'sun' : 'moon'), el('span', {}, dark ? 'Light mode' : 'Dark mode')], () => setTheme(dark ? 'light' : 'dark'), 'theme-toggle', { id: 'theme-toggle', 'aria-label': dark ? 'Switch to light mode' : 'Switch to dark mode', title: dark ? 'Switch to light mode' : 'Switch to dark mode' });
    }
    function completeTask(id, completed) { update(p => E.setTaskCompleted(p, id, completed)); if (completed)
        cue('complete'); }
    function taskControl(id, label = 'Complete') {
        const completed = (progress.completedTasks || []).includes(id);
        return el('label', { className: 'task-completion' + (completed ? ' completed' : '') }, el('input', { id: 'completed-task-' + id, type: 'checkbox', checked: completed, 'data-task': id, 'aria-label': label, onChange: e => completeTask(id, e.target.checked) }), el('span', { className: 'task-completion-content', 'aria-hidden': 'true' }, el('span', { className: 'task-completion-check' }, icon('check')), el('span', { className: 'task-completion-label' }, el('span', {}, completed ? 'Completed' : 'Complete'))));
    }
    function navigate(next, resultsId = null) {
        view.dashboardCustomizing = false;
        view.dashboardReordering = false;
        animateNextPage = next !== page || resultsId !== historyId;
        view.menuOpen = false;
        historyId = resultsId;
        page = next;
        if (location.hash !== '#' + next)
            history.replaceState(null, '', '#' + next);
        window.KotobaAudio.stop();
        render();
        document.getElementById('main')?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
    function openStudyItem(kind, id) {
        const entry = (kind === 'kanji' ? C.kanji : C.vocabulary).find(item => item.id === id);
        if (!entry)
            return;
        view.vocabularyTab = kind === 'kanji' ? 'kanji' : 'words';
        view.vocabularyTopic = 'all';
        view.vocabularyCompletion = 'all';
        view.vocabularySearch = kind === 'kanji' ? entry.character : entry.word;
        view.vocabularyPage = 0;
        view.vocabularyJumpId = id;
        if (kind === 'vocabulary') {
            view.vocabularyRevealed = new Set(view.vocabularyRevealed || []);
            view.vocabularyRevealed.add(id);
        }
        update(p => E.markStudied(p, kind, id));
        navigate('vocabulary');
        const control = document.getElementById(kind === 'kanji' ? 'completed-task-kanji:' + id : 'hide-' + id);
        control?.closest('article')?.scrollIntoView({ block: 'start', behavior: 'instant' });
        control?.focus({ preventScroll: true });
    }
    function sample(pool, count) {
        const selected = [...pool];
        for (let i = selected.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selected[i], selected[j]] = [selected[j], selected[i]];
        }
        return selected.slice(0, count);
    }
    function start(pool, type, options = {}) {
        if (active()) {
            message = 'Finish your saved session before starting another one.';
            navigate(routeFor(active().type));
            return;
        }
        if (!pool.length) {
            notice('No questions are available in this selection. Choose another skill.');
            return;
        }
        if (type === 'practice' && view.practicePrioritizeWeak !== false)
            pool = E.selectPracticeQuestions(progress, pool, { count: options.count ?? pool.length });
        const attempt = E.createAttempt(pool, type, options);
        if (attempt.listeningAccess === 'audio' && attempt.questionOrder.some(id => view.seenScriptIds.has(questionMap[id].listeningId)))
            attempt.listeningAccess = 'script';
        message = '';
        progress = { ...progress, attempts: [...progress.attempts, attempt], activeAttemptId: attempt.id };
        if (!recovery)
            saveCurrent();
        navigate(routeFor(type));
    }
    function startFullMock(level, forceTimed = false) {
        if (active()) {
            notice('Finish your saved session before starting another one.');
            navigate(routeFor(active().type));
            return;
        }
        try {
            if (window.KotobaPreferences.get(progress).untimedPractice && !forceTimed) {
                const full = E.createFullMockAttempt(level);
                start(full.questionOrder.map(id => questionMap[id]), 'practice', { count: full.questionOrder.length, listeningAccess: 'audio' });
                notice('Full-length untimed practice. Section deadlines and exam readiness estimates are not applied.');
                return;
            }
            const attempt = E.createFullMockAttempt(level);
            attempt.excludedIds = attempt.questionOrder.filter(id => view.seenScriptIds.has(questionMap[id].listeningId));
            progress = { ...progress, attempts: [...progress.attempts, attempt], activeAttemptId: attempt.id };
            if (!recovery)
                saveCurrent();
            message = '';
            navigate('mock');
        }
        catch (error) {
            notice(error.message);
        }
    }
    function finish() {
        if (historyId) {
            navigate('settings');
            return;
        }
        if (active())
            update(p => E.markReviewed(p, active().id));
        navigate('dashboard');
    }
    function cue(kind) {
        const prefs = window.KotobaPreferences.get(progress);
        window.KotobaSounds?.play(kind, progress.settings.soundEffects !== false && !prefs.quiet);
        if (prefs.haptics && !prefs.quiet && ['correct', 'complete', 'saved'].includes(kind)) navigator.vibrate?.(15);
    }
    function levelMatches(item) {
        const level = view.studyLevel || 'n3';
        if (level === 'all')
            return true;
        if (item.character && item.wordIds)
            return item.wordIds.some(id => levelMatches(C.vocabulary.find(word => word.id === id) || {}));
        return (item.jlptLevel || 'n3') === level;
    }
    const levelOptions = [['n5', 'N5 · Foundations'], ['n4', 'N4 · Building confidence'], ['n3', 'N3 · Intermediate'], ['n2', 'N2 · Connections'], ['n1', 'N1 · Nuance'], ['all', 'N5–N1 · All levels']];
    function changeLevel(level) {
        view.studyLevel = level;
        view.mockLevel = level === 'all' ? 'n3' : level;
        view.pathLesson = null;
        view.vocabularyPage = 0;
        view.grammarSelected = null;
        view.readingSelected = null;
        view.listeningSelected = null;
        view.vocabularySearch = '';
        view.grammarSearch = '';
        view.grammarCategory = 'all';
        view.practiceType = 'all';
        view.vocabularyTopic = 'all';
        view.grammarTopic = 'all';
        view.readingTopic = 'all';
        view.listeningTopic = 'all';
        view.practiceTopic = 'all';
        animateNextPage = true;
        update(p => ({ ...p, settings: { ...p.settings, studyLevel: level } }));
    }
    function levelControl(id = 'study-level', label = 'Study level') {
        const control = el('select', { id, onChange: event => changeLevel(event.target.value) }, levelOptions.map(([value, text]) => el('option', { value }, text)));
        control.value = view.studyLevel || 'n3';
        return el('label', { className: 'field study-level-control', for: id }, el('span', { className: 'field-label' }, label), control);
    }
    function arrangeFilters(content) {
        const controls = [levelControl(), ...content.querySelectorAll(':scope > .topic-filter,:scope > .search-input,:scope > .field')];
        const flashcardFilters = content.querySelector('.flashcard-primary-filters');
        if (flashcardFilters)
            controls.push(...flashcardFilters.children);
        const toolbarSearch = content.querySelector(':scope > .toolbar > .search-input');
        if (toolbarSearch)
            controls.push(toolbarSearch);
        const row = el('div', { className: 'filter-bar' }, controls);
        flashcardFilters?.remove();
        if (page === 'practice')
            content.querySelector('.section-description').after(row);
        else
            content.prepend(row);
    }
    function stats() {
        const completed = progress.attempts.filter(a => ['submitted', 'reviewed'].includes(a.status));
        const accuracy = E.aggregateAccuracy(progress, questionMap);
        const daily = {};
        const activity = progress.studyEvents.map(e => ({ id: e.id, at: e.at, label: e.type === 'vocabulary' ? `Studied ${C.vocabulary.find(v => v.id === e.contentId)?.word || 'a word'}` : e.type === 'grammar' ? 'Explored a grammar lesson' : 'Studied a kanji', detail: e.type === 'grammar' ? C.grammar.find(g => g.id === e.contentId)?.title : 'A little progress, saved.' }));
        progress.studyEvents.forEach(e => { const day = E.localDateKey(new Date(e.at)); daily[day] = (daily[day] || 0) + 1; });
        completed.forEach(a => {
            const day = E.localDateKey(new Date(a.submittedAt));
            daily[day] = (daily[day] || 0) + Object.keys(a.answers).filter(id => !a.excludedIds.includes(id)).length;
            const score = E.gradeAttempt(a, questionMap);
            activity.push({ id: a.id, at: a.submittedAt, label: a.type === 'mock' ? a.mock ? `Completed an ${a.mock.level.toUpperCase()} full mock test` : 'Completed an earlier short mock' : a.isRetry ? 'Reviewed past mistakes' : 'Completed a practice session', detail: score.total ? `${score.correct}/${score.total} correct` : 'Listening-script study · unscored' });
        });
        const todayCount = daily[E.localDateKey()] || 0;
        const cursor = new Date();
        let streak = 0;
        if (!todayCount)
            cursor.setDate(cursor.getDate() - 1);
        while (daily[E.localDateKey(cursor)] > 0) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        }
        return { completed, initial: accuracy.initial, retry: accuracy.retry, daily, todayCount, streak, activity: activity.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) };
    }
    function openTopic(id, destination = 'vocabulary') {
        for (const key of ['vocabularyTopic', 'grammarTopic', 'readingTopic', 'listeningTopic', 'practiceTopic'])
            view[key] = id;
        view.vocabularySearch = '';
        view.vocabularyTab = 'words';
        view.vocabularyPage = 0;
        view.grammarSearch = '';
        view.grammarCategory = 'all';
        view.practiceType = 'all';
        navigate(destination);
    }
    function review() {
        const mistakes = Object.values(progress.reviews).sort((a, b) => Number(a.mastered) - Number(b.mastered) || Date.parse(a.dueAt) - Date.parse(b.dueAt));
        const retry = records => start(records.map(r => questionMap[r.questionId]), 'review', { count: 5, isRetry: true, listeningAccess: 'audio' });
        const scheduledQuestions = window.KotobaSm2.dueSrsItems(progress, Date.now(), ['question']);
        const recallPanels = [window.KotobaSrs.renderReview(ctx), scheduledQuestions.length ? card(title('Scheduled question recall'), p('These questions use your explicit recall ratings. Mistake mastery still requires assessed due retries.'), button('Review scheduled questions', () => start(scheduledQuestions.map(record => questionMap[record.id]), 'review', { count: Math.min(10, scheduledQuestions.length), isRetry: true, listeningAccess: 'audio' }), 'button secondary', { id: 'srs-review-questions' })) : null];
        return el('div', { className: 'content-stack' }, ...recallPanels, card(title('A second look makes it stick'), p(`${due().length} due now · ${mistakes.filter(m => !m.mastered).length} learning · ${mistakes.filter(m => m.mastered).length} mastered`, 'section-description'), p(E.REVIEW_SCHEDULE), actions(button(['Review due questions', icon('arrow')], () => retry(due()), 'button primary', { disabled: !due().length }), mistakes.some(r => !r.mastered) ? button('Practice early', () => retry(mistakes.filter(r => !r.mastered)), 'button secondary') : null)), mistakes.length ? el('div', { className: 'review-list' }, mistakes.map(r => {
            const q = questionMap[r.questionId];
            const isDue = !r.mastered && Date.parse(r.dueAt) <= Date.now();
            return el('article', { className: 'card review-card' }, el('div', { className: 'section-header' }, tag(q.skill), el('span', { className: 'badge' }, r.mastered ? 'Mastered' : isDue ? 'Due now' : `Due ${date(r.dueAt)}`)), el('h3', { className: 'question-prompt', lang: 'ja' }, q.prompt), p(['Last missed answer: ', r.lastAnswerId ? ja(q.options.find(o => o.id === r.lastAnswerId).text) : 'Not answered'], 'review-answer'), p(`First missed ${date(r.firstMissedAt)} · Last missed ${date(r.lastMissedAt)} · ${r.streak}/3 due correct retries`), el('details', {}, el('summary', {}, 'See answer and explanation'), p(['Correct: ', ja(q.options.find(o => o.id === q.correctOptionId).text)]), el('ul', { className: 'explanation-list' }, q.options.map(o => el('li', {}, ja(o.text), ' — ', mixed(q.explanations[o.id])))), q.evidence ? p(['Evidence: ', ja(q.evidence)]) : null), button(['Retry question', icon('review')], () => retry([r]), 'button secondary small'));
        })) : el('div', { className: 'card empty-state' }, icon('check'), title('A fresh start'), p('Missed questions appear here after a submitted practice session. Try a quiz to find your next focus.'), button('Try practice', () => navigate('practice'), 'button secondary')));
    }
    function exportData(raw) {
        const blob = new Blob([raw ?? JSON.stringify(progress, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = el('a', { href: url, download: `kotoba-progress-${E.localDateKey()}${raw ? '-original' : ''}.json` });
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notice('Your progress backup was downloaded.');
    }
    async function importFile(file) {
        if (!file)
            return;
        try {
            if (file.size > 2000000)
                throw new Error('The backup is too large. The limit is 2 MB.');
            imported = S.validateProgress(JSON.parse(await file.text()));
            message = '';
            openModal('import');
        }
        catch (error) {
            notice(error.message || 'Could not read the backup. Your existing progress has been kept.');
        }
    }
    function settings(data) {
        const fileInput = el('input', { id: 'progress-import', className: 'visually-hidden', type: 'file', accept: '.json,application/json', 'aria-label': 'Import progress JSON', onChange: e => importFile(e.target.files?.[0]) });
        const appearance = el('div', { className: 'appearance-setting' }, el('div', {}, el('h3', {}, 'Make it feel like you'), p('Choose the look you prefer. Your choice is saved with your progress.')), el('div', { className: 'segmented theme-options', role: 'group', 'aria-label': 'Color theme' }, ['light', 'dark'].map(theme => button([icon(theme === 'light' ? 'sun' : 'moon'), theme === 'light' ? 'Light' : 'Dark'], () => setTheme(theme), (progress.settings.theme ?? 'light') === theme ? 'active' : '', { id: 'theme-' + theme, 'aria-pressed': (progress.settings.theme ?? 'light') === theme }))));
        const preferences = el('section', { className: 'card settings-card' }, title('Your study preferences'), appearance, el('div', { className: 'toggle-row' }, el('div', {}, el('strong', {}, 'Furigana on study cards'), p('Show kana above words while studying. Tests keep readings hidden.')), button(el('span'), () => update(p => ({ ...p, settings: { ...p.settings, furigana: !p.settings.furigana } })), 'switch' + (progress.settings.furigana ? ' on' : ''), { id: 'furigana-toggle', role: 'switch', 'aria-checked': progress.settings.furigana, 'aria-label': 'Furigana on study cards' })), el('label', { className: 'field', for: 'daily-goal' }, el('span', { className: 'field-label' }, 'Daily goal (learning actions)'), el('input', { id: 'daily-goal', type: 'number', min: 1, max: 1000, value: view.goalDraft, onInput: e => { view.goalDraft = e.target.value; } })), button(['Save goal', icon('check')], () => {
            const goal = Number(view.goalDraft);
            if (!Number.isInteger(goal) || goal < 1 || goal > 1000) {
                notice('Choose a daily goal from 1 to 1,000 learning actions.');
                return;
            }
            message = 'Daily goal updated.';
            update(p => ({ ...p, settings: { ...p.settings, dailyGoal: goal } }));
        }, 'button secondary small'), el('label', { className: 'field', for: 'exam-date' }, el('span', { className: 'field-label' }, 'Exam date (optional)'), el('input', { id: 'exam-date', type: 'date', min: '1970-01-01', max: '2199-12-31', value: progress.settings.examDate, onChange: e => {
                if (e.target.validity.valid)
                    update(p => ({ ...p, settings: { ...p.settings, examDate: e.target.value } }));
                else
                    notice('Choose a valid exam date between 1970 and 2199.');
            } })), p('A learning action is a studied word, kanji, or grammar lesson (once per item per local day), or an answered question in a submitted session. Unanswered and excluded questions do not add actions. At least one action makes a study day.'));
        preferences.append(el('div', { className: 'toggle-row' }, el('div', {}, el('strong', {}, 'Sound effects'), p('Soft cues for checked answers, saved cards, and completed tasks.')), button(el('span'), () => {
            const enabled = progress.settings.soundEffects === false;
            update(current => ({ ...current, settings: { ...current.settings, soundEffects: enabled } }));
            if (enabled)
                cue('saved');
            else
                window.KotobaSounds?.stop();
        }, 'switch' + (progress.settings.soundEffects !== false ? ' on' : ''), { id: 'sound-effects-toggle', role: 'switch', 'aria-checked': progress.settings.soundEffects !== false, 'aria-label': 'Sound effects' })), actions(button('Preview sounds', async () => {
            const played = await window.KotobaSounds?.play('complete', progress.settings.soundEffects !== false);
            if (!played)
                notice(progress.settings.soundEffects === false ? 'Turn on sound effects to preview them.' : 'Sound could not play in this browser. Written feedback is still available.');
        }, 'button secondary small', { id: 'preview-sounds', disabled: progress.settings.soundEffects === false })), !window.KotobaSounds?.available() ? p('This browser does not support sound effects. Study feedback remains available in text.') : '');
        const cloudSync = el('section', { className: 'card settings-card' }, title('Cloud Sync'), p('Sign in to sync your progress automatically between devices.'), window.KotobaSyncManager?.getCurrentUser() ? actions(p('Signed in as ' + (window.KotobaSyncManager.getCurrentUser().displayName || 'User')), button('Sign out', () => window.KotobaSyncManager.logout(), 'button secondary')) : actions(button('Sign in with Google', () => window.KotobaSyncManager?.login(), 'button primary')));
        const backup = el('section', { className: 'card settings-card' }, title('Keep your progress safe'), p('Progress stays in this browser. Export a JSON backup before switching browsers, opening the app at a different address, or clearing browser data.', 'section-description'), actions(button([icon('download'), 'Export progress'], () => exportData(), 'button secondary'), button([icon('upload'), 'Import backup'], () => fileInput.click(), 'button secondary', { id: 'import-backup' }), fileInput), p(`Imports are validated before replacing progress. Schema 1 · content ${C.CONTENT_VERSION}.`), recovery ? el('div', { className: 'notice warning' }, p(loaded.warning), button('Download original saved data', () => {
            try {
                const raw = repository.readOriginalRaw();
                raw ? exportData(raw) : notice('No original backup is available in device storage.');
            }
            catch {
                notice('Device storage is blocked; the original backup cannot be read.');
            }
        }, 'button secondary small'), button('Use current progress and retry saving', () => { recovery = false; saveState = saveCurrent(); notice(saveState.saved ? 'Current progress was saved.' : saveState.error); }, 'button secondary small')) : !saveState.saved ? button('Retry saving', () => { saveState = saveCurrent(); notice(saveState.saved ? 'Current progress was saved.' : saveState.error); }, 'button secondary') : null, el('div', { className: 'reset-area' }, el('h3', {}, 'Start over'), p('Reset all attempts, bookmarks, settings, and review history on this device.'), button('Reset progress', () => openModal('reset'), 'button danger', { id: 'reset-progress' })));
        const historyCard = mockInProgress() ? card(title('Practice history'), p('Past answer reviews reopen after your mock test is complete.'), button('Resume mock test', () => navigate('mock'), 'button secondary')) : card(el('div', { className: 'section-header' }, title('Practice history'), el('span', { className: 'badge' }, `${data.completed.length} submitted sessions`)), p(`Initial answers: ${data.initial.correct}/${data.initial.total} correct · Retry answers: ${data.retry.correct}/${data.retry.total} correct.`), data.completed.length ? el('div', { className: 'history-list' }, [...data.completed].reverse().map(a => {
            const score = E.gradeAttempt(a, questionMap);
            return el('div', { className: 'activity-item' }, icon('check'), el('div', {}, el('strong', {}, a.type === 'mock' ? a.mock ? `${a.mock.level.toUpperCase()} full mock test` : 'Earlier mini mock test' : a.isRetry ? 'Mistake retry' : 'Learning practice'), p(`${date(a.submittedAt)} · ${score.total ? `${score.correct}/${score.total} correct` : 'Unscored script study'} · ${score.unanswered} unanswered`)), button('View results', () => navigate('practice', a.id), 'button ghost small'));
        })) : p('Your completed sessions will appear here.', 'empty-state'));
        return el('div', { className: 'content-stack' }, el('div', { className: 'settings-grid' }, preferences, cloudSync, backup), window.KotobaPreferences.render(ctx), window.KotobaOffline.renderSettings(ctx), window.KotobaMotivation.renderSettings(ctx), window.KotobaLearnLab.renderTools(ctx), historyCard, card(title('Original lessons. Your own pace.'), p('Original integrated N5–N1 learning paths combine words, kanji, grammar, reading and listening. Word and grammar selections are study guides; JLPT does not publish an exhaustive syllabus. Full mocks use the official section timings with original practice questions. Results are raw practice accuracy, with no passing prediction. Browser speech is a practice fallback. Your progress stays on this device unless you export a backup.'), p([link('Official JLPT level descriptions ↗', 'https://www.jlpt.jp/e/about/levelsummary.html'), ' · ', link('Official JLPT FAQ ↗', 'https://www.jlpt.jp/e/faq/')])));
    }
    function openModal(kind) { modalReturn = kind === 'import' ? { id: 'import-backup' } : captureFocus(); modal = kind; render(); document.querySelector('[role="dialog"] button')?.focus(); }
    function closeModal() { modal = null; imported = null; render(); restoreFocus(modalReturn); }
    function modalElement() {
        return el('div', { className: 'modal-backdrop' }, el('section', { className: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' }, button(icon('close'), closeModal, 'icon-button modal-close', { 'aria-label': 'Close dialog' }), el('h2', { id: 'modal-title' }, modal === 'reset' ? 'Start a new learning journey?' : 'Replace progress with this backup?'), p(modal === 'reset' ? 'This removes saved attempts, mistakes, bookmarks, and settings from this browser. Export a backup first if you want to keep them.' : `Validated backup: ${imported.attempts.length} sessions, ${imported.bookmarks.length} bookmarks, and ${Object.keys(imported.reviews).length} review records. This replaces your current progress.`), actions(button('Cancel', closeModal, 'button secondary'), button(modal === 'reset' ? 'Reset all progress' : 'Replace progress', () => {
            progress = modal === 'reset' ? E.initialProgress() : imported;
            if (modal === 'reset') {
                Object.keys(view).forEach(key => delete view[key]);
                Object.assign(view, { seenScriptIds: new Set(), practiceSkill: 'mixed' });
            }
            view.goalDraft = String(progress.settings.dailyGoal);
            historyId = null;
            recovery = false;
            view.studyLevel = progress.settings.studyLevel || 'n3';
            view.mockLevel = view.studyLevel === 'all' ? 'n3' : view.studyLevel;
            view.pathLesson = null;
            saveState = saveCurrent();
            message = modal === 'reset' ? 'Progress reset. Your fresh start is ready.' : 'Validated backup imported.';
            closeModal();
        }, modal === 'reset' ? 'button danger' : 'button primary'))));
    }
    const ctx = { progress: () => progress, update, persistQuietly, start, startFullMock, notice, navigate, openStudyItem, view, rememberScript, completeTask, taskControl, cue, levelMatches, sample, changeLevel, openTopic, due, reviewDueCount, testGuard, rerender: options => { if (options?.transition)
            animateNextPage = true; render(); }, cleanup: fn => disposers.push(fn) };
    function mockInProgress() { const a = active(); return a?.type === 'mock' && a.status === 'in-progress'; }
    function testGuard() { return card(title('Your mock test is in progress'), p('Study material and past answer reviews reopen after you complete the test. The current section’s timer keeps running while you are on another page.'), button('Resume mock test', () => navigate('mock'))); }
    function render() {
        if (rendering) {
            renderAgain = true;
            return;
        }
        rendering = true;
        applyTheme();
        const focused = captureFocus();
        const sidebarScroll = root.querySelector('.sidebar')?.scrollTop || 0;
        persistSeenScripts();
        disposers.splice(0).forEach(fn => { try {
            fn();
        }
        catch { } });
        const data = stats();
        const current = pages.find(([id]) => id === page);
        const running = active();
        const historical = progress.attempts.find(a => a.id === historyId);
        const quiz = historical && page === 'practice' ? historical : running && page === routeFor(running.type) ? running : null;
        const nav = el('nav', { className: 'nav-list', id: 'main-navigation', 'aria-label': 'Main navigation' }, pages.map(([id, label, shape]) => el('a', { className: 'nav-link' + (page === id ? ' active' : ''), href: '#' + id, 'aria-current': page === id ? 'page' : null, onClick: event => { event.preventDefault(); navigate(id); } }, icon(shape), el('span', {}, label), id === 'review' && reviewDueCount() ? el('span', { className: 'nav-count' }, reviewDueCount()) : null)));
        const sidebar = el('aside', { className: 'sidebar' }, el('a', { className: 'brand', href: '#dashboard', 'aria-label': 'Kotoba dashboard', onClick: e => { e.preventDefault(); persistQuietly(current => window.KotobaMotivationEngine.tapMascot(current)); navigate('dashboard'); cue('wave'); const stopWave = window.KotobaCelebrations?.wave(document.querySelector('.brand')); if (stopWave) disposers.push(stopWave); } }, el('span', { className: 'brand-mark' }, el('img', { src: './web/mascot.svg', alt: '', width: 40, height: 40 })), el('span', {}, el('span', { className: 'brand-name' }, 'kotoba', el('span', {}, '.')), el('span', { className: 'brand-tagline' }, 'little lessons, big progress'))), nav, el('div', { className: 'sidebar-bottom', id: 'sidebar-level-panel' }, el('div', { className: 'level-card' }, tag('YOUR NEXT CHAPTER'), el('strong', {}, view.studyLevel === 'all' ? 'All JLPT levels' : (view.studyLevel || 'n3').toUpperCase()), p('Choose your learning level.'), levelControl('sidebar-level', 'Learning level')), el('span', { className: 'sidebar-footnote' }, icon('shield'), 'Private, on your device')));
        const main = el('main', { className: 'main-content', id: 'main', tabIndex: -1 }, el('header', { className: 'topbar' }, el('div', { className: 'breadcrumb' }, el('span', { className: 'level-badge', lang: 'ja' }, '日本語'), el('strong', {}, view.studyLevel === 'all' ? 'JLPT N5–N1' : 'JLPT ' + (view.studyLevel || 'n3').toUpperCase())), el('div', { className: 'topbar-actions' }, el('span', { className: 'streak-chip', 'aria-label': `${data.streak} day study streak` }, icon('flame'), el('strong', {}, data.streak)), el('span', { className: 'status-chip' + (!saveState.saved || recovery ? ' unsaved' : ''), role: 'status' }, el('span', { className: 'status-dot' }), recovery ? 'Storage needs attention' : saveState.saved ? 'Saved on this device' : 'Unsaved · this tab only'), themeToggle())));
        main.classList.toggle('flashcard-page', page === 'vocabulary' && view.vocabularyTab === 'flashcards' && !mockInProgress());
        if (recovery || !saveState.saved)
            main.append(el('div', { className: 'notice warning', role: 'alert' }, p(recovery ? loaded.warning : saveState.error), button('Open storage settings', () => navigate('settings'), 'button secondary small')));
        if (message)
            main.append(el('div', { className: 'notice', role: 'status' }, p(message), button(icon('close'), () => { message = ''; render(); }, 'icon-button', { 'aria-label': 'Dismiss message' })));
        if (page !== 'dashboard')
            main.append(el('div', { className: 'page-heading' }, el('span', { className: 'eyebrow' }, 'YOUR JAPANESE JOURNEY'), el('h1', { className: 'page-title' }, current[1]), p(current[3], 'page-subtitle')));
        let content;
        try {
        if (mockInProgress() && (['vocabulary', 'grammar', 'reading', 'listening', 'review'].includes(page) || historical))
            content = testGuard();
        else if (quiz)
            content = window.KotobaQuiz.render(ctx, quiz, finish);
        else if (page === 'dashboard')
            content = window.KotobaDashboard.render(ctx, data);
        else if (window.KotobaStudy[page])
            content = window.KotobaStudy[page](ctx);
        else
            content = page === 'practice' ? window.KotobaSessions.practice(ctx) : page === 'mock' ? window.KotobaSessions.mock(ctx) : page === 'review' ? review() : settings(data);
        if (page === 'settings' && !quiz) content.append(window.KotobaLocalData.render(ctx));
        if (page === 'settings' && !quiz) content.append(window.KotobaReferences.renderLibrary(ctx));
        if (page === 'practice' && !quiz && !mockInProgress()) {
            arrangeFilters(content);
            content = el('div', { className: 'content-stack' }, content, window.KotobaLearnLab.render(ctx));
        }
        } catch (error) {
            console.error('Study view failed', error);
            content = card(title('This view could not open'), p('Your saved progress is kept. Retry this view or return to Learn.'), actions(button('Retry view', () => render(), 'button secondary'), button('Open Learn', () => navigate('dashboard'), 'button secondary')));
        }
        if (!quiz && !mockInProgress() && ['vocabulary', 'grammar', 'reading', 'listening'].includes(page))
            arrangeFilters(content);
        if (animateNextPage) {
            content.classList.add('page-enter');
            animateNextPage = false;
        }
        if (view.lessonTransition) {
            content.querySelector('.lesson-detail')?.classList.add('lesson-enter');
            view.lessonTransition = false;
        }
        main.append(content, el('footer', { className: 'footer-note app-footer' }, ja('少しずつ、前へ。'), ' Little by little, forward.', el('span', {}, 'Original N5–N1 practice · Your own pace')));
        const skip = el('a', { className: 'skip-link', href: '#main', onClick: e => { e.preventDefault(); main.focus(); main.scrollIntoView(); } }, 'Skip to main content');
        sidebar.classList.toggle('menu-open', !!view.menuOpen);
        const toggleMenu = () => { view.menuOpen = !view.menuOpen; render(); if (view.menuOpen)
            window.scrollTo({ top: 0, behavior: 'instant' }); };
        sidebar.append(button(view.menuOpen ? 'Close menu' : 'Menu', toggleMenu, 'button secondary small mobile-menu-toggle', { id: 'sidebar-menu-toggle', 'aria-expanded': !!view.menuOpen, 'aria-controls': 'main-navigation sidebar-level-panel' }));
        const bottom = el('nav', { className: 'mobile-bottom-nav', 'aria-label': 'Quick navigation' }, [['dashboard', 'Learn', 'home'], ['vocabulary', 'Cards', 'book'], ['practice', 'Practice', 'target'], ['listening', 'Listen', 'headphones']].map(([id, label, shape]) => button([icon(shape), el('span', {}, label)], () => { if (id === 'vocabulary')
            view.vocabularyTab = 'flashcards'; navigate(id); }, 'bottom-tab' + (page === id ? ' active' : ''), { 'aria-current': page === id ? 'page' : null })), button([icon('settings'), el('span', {}, 'Menu')], toggleMenu, 'bottom-tab', { id: 'bottom-menu-toggle', 'aria-expanded': !!view.menuOpen, 'aria-controls': 'main-navigation sidebar-level-panel' }));
        const shell = el('div', { className: 'app-shell' }, skip, sidebar, main, bottom, modal ? modalElement() : null);
        if (modal) {
            sidebar.inert = true;
            main.inert = true;
            bottom.inert = true;
        }
        root.replaceChildren(shell);
        sidebar.scrollTop = sidebarScroll;
        if (window.KotobaDropdowns)
            disposers.push(window.KotobaDropdowns.enhance(root));
        restoreFocus(focused);
        rendering = false;
        if (renderAgain) {
            renderAgain = false;
            render();
        }
    }
    document.addEventListener('keydown', event => {
        if (!modal) {
            if (event.key === 'Escape' && page === 'dashboard' && view.dashboardCustomizing) {
                event.preventDefault();
                view.dashboardCustomizing = false;
                render();
                document.getElementById('dashboard-customize-trigger')?.focus({ preventScroll: true });
                return;
            }
            if (event.key === 'Escape' && page === 'dashboard' && view.dashboardReordering) {
                event.preventDefault(); view.dashboardReordering = false; render();
                document.getElementById('dashboard-customize-trigger')?.focus({ preventScroll: true });
                return;
            }
            if (event.key === 'Escape' && view.menuOpen) {
                event.preventDefault();
                view.menuOpen = false;
                render();
                document.getElementById('sidebar-menu-toggle')?.focus();
            }
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal();
        }
        if (event.key === 'Tab') {
            const items = [...document.querySelectorAll('[role="dialog"] button, [role="dialog"] input')].filter(n => !n.disabled);
            if (event.shiftKey && document.activeElement === items[0]) {
                event.preventDefault();
                items.at(-1).focus();
            }
            else if (!event.shiftKey && document.activeElement === items.at(-1)) {
                event.preventDefault();
                items[0].focus();
            }
        }
    });
    window.addEventListener('hashchange', () => { animateNextPage = true; page = currentPage(); view.menuOpen = false; view.dashboardCustomizing = false; view.dashboardReordering = false; historyId = null; window.KotobaAudio.stop(); render(); });
    window.addEventListener('pagehide', () => window.KotobaAudio.stop());
    // One absolute deadline survives route changes and reloads. Submission is idempotent in the engine.
    let dayKey = E.localDateKey();
    let dueCount = reviewDueCount();
    function tick() {
        const attempt = active();
        if (attempt?.status === 'in-progress' && attempt.deadline !== null && Date.now() >= attempt.deadline) {
            update(p => E.expireAttempt(p, attempt.id, questionMap));
            return;
        }
        const nextDay = E.localDateKey();
        const nextDue = reviewDueCount();
        if (nextDay !== dayKey || nextDue !== dueCount) {
            dayKey = nextDay;
            dueCount = nextDue;
            render();
        }
    }
    render();
    window.KotobaPreferences.install(ctx);
    window.KotobaOffline.subscribe(state => {
        const node = document.getElementById('offline-library-status');
        if (node) node.textContent = 'Library: ' + state.cache.replaceAll('-', ' ') + ' · device archive: ' + state.archive.replaceAll('-', ' ');
        const apply = document.getElementById('apply-library-update');
        if (apply) apply.hidden = state.cache !== 'update-ready';
    });
    window.KotobaOffline.ensure(progress.settings);
    if (!recovery) window.KotobaOffline.archive(progress);
    tick();
    setInterval(tick, 500);
})();

