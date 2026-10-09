(function () {
    'use strict';
    function hasSeen(view, key, id) {
        const entries = view[key];
        return entries instanceof Set ? entries.has(id) : Array.isArray(entries) && entries.includes(id);
    }
    function remember(view, key, id) {
        if (view[key] instanceof Set)
            view[key].add(id);
        else if (Array.isArray(view[key]))
            view[key] = [...new Set([...view[key], id])];
        else
            view[key] = new Set([id]);
    }
    function forget(view, key, id) {
        if (view[key] instanceof Set)
            view[key].delete(id);
        else if (Array.isArray(view[key]))
            view[key] = view[key].filter(value => value !== id);
    }
    function focusControl(id, cursor) {
        const control = id && document.getElementById(id);
        if (!control)
            return;
        control.focus({ preventScroll: true });
        if (control.closest('.lesson-list,.passage-list'))
            control.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        if (typeof cursor === 'number' && typeof control.setSelectionRange === 'function') {
            control.setSelectionRange(cursor, cursor);
        }
    }
    function redraw(ctx, id, cursor) {
        ctx.rerender();
        focusControl(id, cursor);
    }
    function japaneseWord(item, furigana) {
        const { el } = window.KotobaUI;
        return el('span', { lang: 'ja' }, furigana
            ? el('ruby', {}, item.word, el('rp', {}, '（'), el('rt', {}, item.reading), el('rp', {}, '）'))
            : item.word);
    }
    function topicFilter(ctx, key) {
        const { el } = window.KotobaUI;
        const control = el('select', { id: key, onChange: event => { ctx.view[key] = event.target.value; ctx.view.vocabularyPage = 0; ctx.rerender(); } }, el('option', { value: 'all' }, 'All everyday topics'), window.KotobaContent.topics.map(t => el('option', { value: t.id }, t.title)));
        control.value = ctx.view[key] || 'all';
        return el('label', { className: 'topic-filter', for: key }, el('span', { className: 'field-label' }, 'Topic'), control);
    }
    function completionFilter(ctx, key) {
        const { el } = window.KotobaUI;
        const id = key.replace('Completion', '-completion');
        const control = el('select', {
            id,
            onChange: event => {
                ctx.view[key] = event.target.value;
                if (key === 'vocabularyCompletion')
                    ctx.view.vocabularyPage = 0;
                ctx.rerender();
                focusControl(document.getElementById(id + '-trigger') ? id + '-trigger' : id);
            },
        }, el('option', { value: 'all' }, 'All items'), el('option', { value: 'unfinished' }, 'Unfinished'), el('option', { value: 'completed' }, 'Completed'));
        control.value = ctx.view[key] || 'all';
        return el('label', { className: 'field completion-filter', for: id }, el('span', { className: 'field-label' }, 'Completion'), control);
    }
    function completionMatcher(ctx, key, kind) {
        const status = ctx.view[key] || 'all';
        const completed = new Set(ctx.progress().completedTasks || []);
        return entry => status === 'completed' ? completed.has(kind + ':' + entry.id)
            : status === 'unfinished' ? !completed.has(kind + ':' + entry.id)
            : true;
    }
    function studyHeading(ctx, entry, skill, kind, completionLabel) {
        const { el } = window.KotobaUI;
        return el('header', { className: 'study-detail-heading' },
            el('div', { className: 'study-detail-title' },
                el('span', { className: 'tag' }, 'Original ' + (entry.jlptLevel || 'n3').toUpperCase() + ' ' + kind),
                el('h2', skill === 'grammar' ? { className: 'japanese-word', lang: 'ja' } : {}, entry.title)),
            el('div', { className: 'study-card-actions' }, ctx.taskControl(skill + ':' + entry.id, completionLabel)));
    }
    function vocabularyTabs(ctx) {
        const { el, button } = window.KotobaUI;
        const tab = ctx.view.vocabularyTab || 'words';
        return el('div', { className: 'segmented', 'aria-label': 'Vocabulary view' }, ['words', 'flashcards', 'kanji', 'bookmarks'].map(next => button(({ words: 'Word cards', flashcards: 'Flashcards', kanji: 'Kanji connections', bookmarks: 'Bookmarks' })[next], () => { ctx.view.vocabularyTab = next; ctx.view.vocabularyPage = 0; redraw(ctx, 'vocabulary-tab-' + next); }, tab === next ? 'active' : '', { id: 'vocabulary-tab-' + next, 'aria-pressed': tab === next })));
    }
    function vocabulary(ctx) {
        const { el, button, ja, icon } = window.KotobaUI;
        const content = window.KotobaContent;
        const engine = window.KotobaEngine;
        const progress = ctx.progress();
        const view = ctx.view;
        const relevantWordIds = entry => entry.wordIds.filter(id => {
            const word = content.vocabulary.find(v => v.id === id);
            return word && (!ctx.levelMatches || ctx.levelMatches(word));
        });
        const tab = view.vocabularyTab || 'words';
        if (tab === 'flashcards')
            return el('div', { className: 'content-stack' }, vocabularyTabs(ctx), window.KotobaFlashcards.render(ctx));
        const search = view.vocabularySearch || '';
        const query = search.toLowerCase();
        const topic = view.vocabularyTopic || 'all';
        const today = engine.localDateKey();
        const completedTasks = new Set(progress.completedTasks || []);
        // Filtered arrays follow the source order; a stable sort keeps that order
        // within the unfinished and completed groups, including across pages.
        const incompleteFirst = kind => (a, b) => Number(completedTasks.has(kind + ':' + a.id)) - Number(completedTasks.has(kind + ':' + b.id));
        const cardCompletion = (kind, id, label, index) => {
            const control = ctx.taskControl(kind + ':' + id, label);
            const input = control.querySelector('input');
            input.addEventListener('change', () => {
                // A completed card may move to a later page. Keep keyboard focus
                // near its old position instead of dropping it onto the document.
                const same = document.getElementById(input.id);
                const visible = [...document.querySelectorAll(`.${kind === 'kanji' ? 'kanji' : 'vocab'}-grid input[data-task]`)];
                const target = same || visible[Math.min(index, visible.length - 1)] || document.getElementById('vocabulary-search');
                target?.focus({ preventScroll: true });
            });
            return control;
        };
        const matching = content.vocabulary.filter(word => (!ctx.levelMatches || ctx.levelMatches(word)) &&
            `${word.word} ${word.reading} ${word.meaning} ${word.example}`.toLowerCase().includes(query)
            && (tab !== 'bookmarks' || progress.bookmarks.includes(word.id))).filter(word => topic === 'all' || word.topicId === topic).filter(completionMatcher(ctx, 'vocabularyCompletion', 'vocabulary')).sort(incompleteFirst('vocabulary'));
        const matchingKanji = content.kanji.filter(entry => (!ctx.levelMatches || ctx.levelMatches(entry))).filter(entry => {
            const exampleWords = relevantWordIds(entry).map(id => {
                const word = content.vocabulary.find(word => word.id === id);
                return word ? `${word.word} ${word.reading} ${word.meaning}` : '';
            }).join(' ');
            return `${entry.character} ${entry.meaning} ${exampleWords}`.toLowerCase().includes(query);
        }).filter(entry => topic === 'all' || relevantWordIds(entry).some(id => content.vocabulary.find(v => v.id === id)?.topicId === topic)).filter(completionMatcher(ctx, 'vocabularyCompletion', 'kanji')).sort(incompleteFirst('kanji'));
        const results = tab === 'kanji' ? matchingKanji : matching;
        const pageSize = 24;
        const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
        if (view.vocabularyJumpId) {
            const position = results.findIndex(item => item.id === view.vocabularyJumpId);
            if (position >= 0)
                view.vocabularyPage = Math.floor(position / pageSize);
            delete view.vocabularyJumpId;
        }
        const pageIndex = Math.max(0, Math.min(view.vocabularyPage || 0, pageCount - 1));
        view.vocabularyPage = pageIndex;
        const toolbar = el('div', { className: 'toolbar' }, vocabularyTabs(ctx), el('label', { className: 'search-input', for: 'vocabulary-search' }, icon('search'), el('span', { className: 'visually-hidden' }, 'Search vocabulary'), el('input', {
            id: 'vocabulary-search', type: 'search', value: search,
            placeholder: 'Search word, reading, or meaning…',
            onCompositionStart: () => { view.vocabularyComposing = true; },
            onCompositionEnd: event => {
                view.vocabularyComposing = false;
                view.vocabularySearch = event.currentTarget.value;
                view.vocabularyPage = 0;
                redraw(ctx, 'vocabulary-search', event.currentTarget.selectionStart);
            },
            onInput: event => {
                view.vocabularySearch = event.currentTarget.value;
                view.vocabularyPage = 0;
                if (!view.vocabularyComposing && !event.isComposing) {
                    redraw(ctx, 'vocabulary-search', event.currentTarget.selectionStart);
                }
            },
        })));
        let cards;
        if (tab === 'kanji') {
            cards = matchingKanji.length ? el('div', { className: 'kanji-grid' }, ...matchingKanji.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize).map((entry, index) => el('article', { className: 'card kanji-card' }, el('header', { className: 'study-detail-heading kanji-heading' }, el('div', { className: 'study-detail-title' }, el('span', { className: 'kanji-character', lang: 'ja' }, entry.character), el('h2', {}, entry.meaning)), el('div', { className: 'study-card-actions' }, cardCompletion('kanji', entry.id, 'Complete kanji', index))), ...relevantWordIds(entry).map(id => {
                const word = content.vocabulary.find(word => word.id === id);
                return word ? el('p', {}, japaneseWord(word, progress.settings.furigana), ' ', el('span', { className: 'muted' }, ja(word.reading), ' · ', word.meaning)) : el('p', { className: 'muted' }, 'This example word is unavailable.');
            }), button('Study these words', () => {
                view.vocabularyTab = 'words';
                view.vocabularySearch = entry.character;
                view.vocabularyPage = 0;
                ctx.update(current => engine.markStudied(current, 'kanji', entry.id));
                focusControl('vocabulary-search');
            }, 'button secondary small')))) : el('div', { className: 'card empty-state' }, icon('search'), el('h2', {}, 'No matching kanji.'), el('p', { className: 'muted' }, 'Try another completion status, topic, or search.'));
        }
        else if (matching.length) {
            cards = el('div', { className: 'vocab-grid' }, ...matching.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize).map((word, index) => {
                const revealed = hasSeen(view, 'vocabularyRevealed', word.id);
                const bookmarked = progress.bookmarks.includes(word.id);
                const studiedToday = progress.studyEvents.some(event => event.type === 'vocabulary' && event.contentId === word.id
                    && engine.localDateKey(new Date(event.at)) === today);
                const bookmarkButton = button([icon('bookmark'), el('span', { className: 'bookmark-label' }, el('span', {}, bookmarked ? 'Saved' : 'Save'))], () => {
                    ctx.update(current => ({
                        ...current,
                        bookmarks: current.bookmarks.includes(word.id)
                            ? current.bookmarks.filter(id => id !== word.id)
                            : [...current.bookmarks, word.id],
                    }));
                    focusControl(`bookmark-${word.id}`);
                    if (!bookmarked)
                        ctx.cue?.('saved');
                }, 'bookmark-button icon-button', {
                    id: `bookmark-${word.id}`,
                    'aria-label': `${bookmarked ? 'Remove bookmark' : 'Bookmark'} ${word.word}`,
                    'aria-pressed': bookmarked,
                    title: bookmarked ? 'Saved to your bookmarks' : 'Save to bookmarks',
                });
                const article = el('article', { className: 'card vocab-card' },
                    el('div', { className: 'word-header' },
                        el('div', { className: 'study-card-actions' }, bookmarkButton, cardCompletion('vocabulary', word.id, 'Complete word', index)),
                        el('span', { className: 'tag' }, (word.jlptLevel || 'n3').toUpperCase() + ' · Original study')));
                // Both faces reserve their natural height. The inactive face stays out of
                // keyboard navigation and the accessibility tree without collapsing it.
                const front = el('div', {
                    className: 'word-face word-face-front', 'aria-hidden': revealed, inert: revealed,
                }, el('h2', { className: 'japanese-word' }, japaneseWord(word, false)), el('p', { className: 'muted' }, 'Can you recall the reading and meaning?'));
                const back = el('div', {
                    className: 'word-face word-face-back', 'aria-hidden': !revealed, inert: !revealed,
                }, el('h2', { className: 'japanese-word' }, japaneseWord(word, progress.settings.furigana)), el('p', { className: 'word-reading', lang: 'ja' }, word.reading), el('p', { className: 'word-meaning' }, word.meaning, ' ', el('span', { className: 'muted' }, `· ${word.wordClass}`)), el('div', { className: 'example' }, el('p', { lang: 'ja' }, word.example), el('p', { className: 'translation' }, word.exampleTranslation)), el('span', { className: 'word-study-status muted' }, el('span', { className: `word-study-check${studiedToday ? ' is-studied' : ''}` }, icon('check')), studiedToday ? 'Studied today' : 'Card revealed'));
                article.append(el('div', { className: 'word-faces' }, front, back), button(revealed ? 'Hide' : 'Reveal card', () => {
                    if (revealed) {
                        forget(view, 'vocabularyRevealed', word.id);
                        redraw(ctx, `reveal-${word.id}`);
                    }
                    else {
                        remember(view, 'vocabularyRevealed', word.id);
                        ctx.update(current => engine.markStudied(current, 'vocabulary', word.id));
                        focusControl(`hide-${word.id}`);
                    }
                }, 'button secondary word-reveal-toggle', { id: `${revealed ? 'hide' : 'reveal'}-${word.id}` }));
                return article;
            }));
        }
        else {
            cards = el('div', { className: 'card empty-state' }, icon('bookmark'), el('h2', {}, tab === 'bookmarks' ? 'No matching bookmarked words.' : 'No matching words.'), el('p', { className: 'muted' }, tab === 'bookmarks' ? 'Save words you want to revisit, or try another completion status, topic, or search.' : 'Try another completion status, topic, or search.'));
        }
        return el('div', { className: 'content-stack' }, topicFilter(ctx, 'vocabularyTopic'), completionFilter(ctx, 'vocabularyCompletion'), topic !== 'all' ? ctx.taskControl('topic:' + topic, 'Complete topic') : null, toolbar, el('p', { className: 'muted' }, 'Reveal a card to record a study action. Furigana appears on revealed cards when enabled in Settings.'), cards, el('div', { className: 'pagination' }, button('Previous cards', () => { view.vocabularyPage = pageIndex - 1; ctx.rerender(); }, 'button secondary small', { disabled: pageIndex === 0 }), el('span', { className: 'muted', role: 'status' }, `${results.length} ${tab === 'kanji' ? 'kanji' : 'words'} · Page ${pageIndex + 1} of ${pageCount}`), button('Next cards', () => { view.vocabularyPage = pageIndex + 1; ctx.rerender(); }, 'button secondary small', { disabled: pageIndex === pageCount - 1 })), el('div', { className: 'inline-actions' }, button(tab === 'kanji' ? 'Practice kanji readings' : 'Practice vocabulary', () => ctx.start(content.questions.filter(question => question.skill === (tab === 'kanji' ? 'kanji' : 'vocabulary') && (topic === 'all' || question.topicId === topic) && (tab !== 'bookmarks' || progress.bookmarks.includes(question.vocabularyId))), 'practice', { count: 5 })), el('span', { className: 'muted' }, 'Untimed · explanations after each answer')));
    }
    function grammar(ctx) {
        const { el, button, mixed } = window.KotobaUI;
        const content = window.KotobaContent;
        const engine = window.KotobaEngine;
        const view = ctx.view;
        const search = view.grammarSearch || '';
        const matching = content.grammar.filter(lesson => (!ctx.levelMatches || ctx.levelMatches(lesson)) && `${lesson.title} ${lesson.meaning} ${lesson.category || ''}`.toLowerCase().includes(search.toLowerCase()) && (!view.grammarCategory || view.grammarCategory === 'all' || lesson.category === view.grammarCategory) && (!view.grammarTopic || view.grammarTopic === 'all' || lesson.topicId === view.grammarTopic)).filter(completionMatcher(ctx, 'grammarCompletion', 'grammar'));
        const selected = matching.find(lesson => lesson.id === view.grammarSelected) || matching[0];
        const categories = [...new Set(content.grammar.map(g => g.category).filter(Boolean))].sort();
        const categorySelect = el('select', { id: 'grammar-category', onChange: event => { view.grammarCategory = event.target.value; ctx.rerender(); } }, el('option', { value: 'all' }, 'All grammar families'), categories.map(c => el('option', { value: c }, c.replaceAll('-', ' '))));
        categorySelect.value = view.grammarCategory || 'all';
        const lessonList = el('div', { className: 'lesson-list', role: 'region', 'aria-label': 'Grammar lessons', tabindex: 0 }, ...matching.map((lesson, index) => button(el('span', { className: 'lesson-card-content' }, el('span', { className: 'lesson-number' }, String(index + 1).padStart(2, '0')), el('span', {}, el('span', { className: 'lesson-card-title', lang: 'ja' }, lesson.title), el('span', { className: 'lesson-card-description' }, lesson.meaning), (ctx.progress().completedTasks || []).includes('grammar:' + lesson.id) ? el('span', { className: 'completion-badge' }, '✓ Completed') : null)), () => { view.grammarSelected = lesson.id; view.lessonTransition = true; redraw(ctx, `grammar-lesson-${lesson.id}`); }, `lesson-card${lesson.id === selected.id ? ' active' : ''}`, { id: `grammar-lesson-${lesson.id}` })));
        if (!matching.length)
            lessonList.append(el('p', { className: 'empty-state' }, 'No lessons match these filters. Try another completion status, topic, or search.'));
        if (!selected)
            return el('div', { className: 'content-stack' }, topicFilter(ctx, 'grammarTopic'), completionFilter(ctx, 'grammarCompletion'), el('label', { className: 'topic-filter', for: 'grammar-category' }, 'Grammar family', categorySelect), el('input', { id: 'grammar-search', type: 'search', value: search, placeholder: 'Search a pattern or meaning…', onInput: e => { view.grammarSearch = e.target.value; redraw(ctx, 'grammar-search', e.target.selectionStart); } }), lessonList);
        return el('div', { className: 'content-stack' }, topicFilter(ctx, 'grammarTopic'), completionFilter(ctx, 'grammarCompletion'), el('label', { className: 'topic-filter', for: 'grammar-category' }, el('span', { className: 'field-label' }, 'Grammar family'), categorySelect), el('label', { className: 'search-input', for: 'grammar-search' }, el('span', { className: 'visually-hidden' }, 'Search grammar lessons'), el('input', {
            id: 'grammar-search', type: 'search', value: search,
            placeholder: 'Search a pattern or meaning…',
            onCompositionStart: () => { view.grammarComposing = true; },
            onCompositionEnd: event => {
                view.grammarComposing = false;
                view.grammarSearch = event.currentTarget.value;
                redraw(ctx, 'grammar-search', event.currentTarget.selectionStart);
            },
            onInput: event => {
                view.grammarSearch = event.currentTarget.value;
                if (!view.grammarComposing && !event.isComposing) {
                    redraw(ctx, 'grammar-search', event.currentTarget.selectionStart);
                }
            },
        })), el('div', { className: 'page-grid study-layout' }, lessonList, el('article', { className: 'card lesson-detail' }, studyHeading(ctx, selected, 'grammar', 'lesson', 'Complete lesson'), el('p', {}, selected.meaning), window.KotobaReferences.render(ctx, selected, 'grammar'), el('h3', {}, 'How to attach it'), el('ul', {}, ...selected.attachment.map(rule => el('li', {}, mixed(rule)))), el('h3', {}, 'In everyday Japanese'), ...selected.examples.map(example => el('div', { className: 'example-block' }, el('p', { lang: 'ja' }, example.ja), el('p', { className: 'translation' }, example.en))), el('h3', {}, 'A common mistake'), el('div', { className: 'mistake' }, el('p', {}, el('span', { className: 'badge' }, 'Incorrect'), ' ', el('span', { lang: 'ja' }, selected.mistake.wrong)), el('p', {}, el('span', { className: 'badge' }, 'Correct'), ' ', el('span', { lang: 'ja' }, selected.mistake.correct)), el('p', {}, mixed(selected.mistake.explanation))), el('h3', {}, 'A useful comparison'), el('p', {}, mixed(selected.comparison)), el('div', { className: 'inline-actions' }, button('Practice this pattern', () => {
            ctx.update(current => engine.markStudied(current, 'grammar', selected.id));
            ctx.start(content.questions.filter(question => selected.questionIds.includes(question.id)), 'practice');
        }), button('Mark studied', () => {
            ctx.update(current => engine.markStudied(current, 'grammar', selected.id));
            ctx.notice('Lesson recorded in today’s activity.');
        }, 'button secondary', { id: 'mark-grammar-studied' })))));
    }
    function reading(ctx) {
        const { el, button } = window.KotobaUI;
        const content = window.KotobaContent;
        const view = ctx.view;
        const pool = content.readings.filter(r => (!ctx.levelMatches || ctx.levelMatches(r)) && (!view.readingTopic || view.readingTopic === 'all' || r.topicId === view.readingTopic)).filter(completionMatcher(ctx, 'readingCompletion', 'reading'));
        const selected = pool.find(passage => passage.id === view.readingSelected) || pool[0];
        if (!selected)
            return el('div', { className: 'content-stack' }, topicFilter(ctx, 'readingTopic'), completionFilter(ctx, 'readingCompletion'), el('p', { className: 'empty-state' }, 'No reading passages match these filters. Try another completion status, level, or topic.'));
        const define = window.KotobaGlossaryUI.createStudy(ctx);
        const grid = el('div', { className: 'page-grid study-layout' }, el('div', { className: 'passage-list', role: 'region', 'aria-label': 'Reading passages', tabindex: 0 }, ...pool.map(passage => button(el('span', { className: 'passage-card-content' }, el('span', { className: 'tag' }, `${passage.type} · ${passage.questionIds.length} questions`), el('span', { className: 'passage-card-title' }, passage.title), (ctx.progress().completedTasks || []).includes('reading:' + passage.id) ? el('span', { className: 'completion-badge' }, '✓ Completed') : null, el('span', { className: 'muted' }, content.questionTypes.find(t => t.id === content.questions.find(q => q.passageId === passage.id)?.questionType)?.title || 'Original everyday Japanese')), () => { view.readingSelected = passage.id; view.lessonTransition = true; redraw(ctx, `reading-passage-${passage.id}`); }, `passage-card${passage.id === selected.id ? ' active' : ''}`, { id: `reading-passage-${passage.id}` }))), el('article', { className: 'card lesson-detail' }, studyHeading(ctx, selected, 'reading', 'reading', 'Complete reading'), el('p', { className: 'passage-body', lang: 'ja' }, selected.body), el('p', { className: 'muted' }, 'Read for the main message, then look for the details. Translation and supporting evidence unlock after you submit.'), button(`Answer ${selected.questionIds.length} questions`, () => ctx.start(content.questions.filter(question => selected.questionIds.includes(question.id)), 'reading')), el('h3', {}, 'Grammar for this topic'), el('div', { className: 'inline-actions' }, content.grammar.filter(g => g.topicId === selected.topicId).slice(0, 4).map(g => button(g.title, () => { view.grammarTopic = selected.topicId; view.grammarCategory = 'all'; view.grammarSearch = ''; view.grammarSelected = g.id; ctx.navigate('grammar'); }, 'button secondary small', { lang: 'ja' })))));
        const passage = grid.querySelector('.passage-body');
        passage.replaceChildren(define(selected.body));
        passage.after(el('p', { className: 'reading-vocabulary-hint muted' }, 'Tap, click, or focus a dotted-underlined word to see its reading and definition.'));
        return el('div', { className: 'content-stack' }, topicFilter(ctx, 'readingTopic'), completionFilter(ctx, 'readingCompletion'), grid);
    }
    function listening(ctx) {
        const { el, button, icon } = window.KotobaUI;
        const content = window.KotobaContent;
        const view = ctx.view;
        const pool = content.listening.filter(s => (!ctx.levelMatches || ctx.levelMatches(s)) && (!view.listeningTopic || view.listeningTopic === 'all' || s.topicId === view.listeningTopic)).filter(completionMatcher(ctx, 'listeningCompletion', 'listening'));
        const selected = pool.find(script => script.id === view.listeningSelected) || pool[0];
        if (!selected)
            return el('div', { className: 'content-stack' }, topicFilter(ctx, 'listeningTopic'), completionFilter(ctx, 'listeningCompletion'), el('p', { className: 'empty-state' }, 'No listening scripts match these filters. Try another completion status, level, or topic.'));
        const scriptVisible = !!view.scriptVisible && view.visibleScriptId === selected.id;
        const scriptStudied = scriptVisible || hasSeen(view, 'seenScriptIds', selected.id);
        const audio = window.KotobaAudio
            ? window.KotobaAudio.render(ctx, selected)
            : el('p', { className: 'notice warning', role: 'status' }, 'Audio playback is unavailable. Use listening-script study instead.');
        const detail = el('article', { className: 'card lesson-detail' }, studyHeading(ctx, selected, 'listening', 'listening practice', 'Complete listening'), el('p', { className: 'section-description' }, 'Listen to the conversation, then answer the questions. Browser speech is synthesized practice audio and depends on a Japanese voice installed on your device.'), audio, el('div', { className: 'inline-actions' }, button(scriptStudied ? 'Start script-study questions' : 'Start listening questions', () => ctx.start(content.questions.filter(question => selected.questionIds.includes(question.id)), 'listening', { listeningAccess: scriptStudied ? 'script' : 'audio' })), button(scriptVisible ? 'Hide script' : 'Study the script instead', () => {
            if (!scriptVisible)
                remember(view, 'seenScriptIds', selected.id);
            view.scriptVisible = !scriptVisible;
            view.visibleScriptId = selected.id;
            redraw(ctx, 'listening-script-toggle');
        }, 'button secondary', { id: 'listening-script-toggle' })));
        if (scriptVisible)
            detail.append(el('div', { className: 'example-block' }, el('span', { className: 'badge' }, 'Listening-script study · unscored'), el('p', { className: 'transcript', lang: 'ja' }, selected.script), el('p', { className: 'translation' }, selected.translation), el('p', { className: 'muted' }, 'Reading this script is a study activity; it does not measure listening ability.')));
        const grid = el('div', { className: 'page-grid study-layout' }, el('div', { className: 'passage-list', role: 'region', 'aria-label': 'Listening scripts', tabindex: 0 }, ...pool.map(script => button(el('span', { className: 'passage-card-content' }, icon('headphones'), el('span', { className: 'passage-card-title' }, script.title), (ctx.progress().completedTasks || []).includes('listening:' + script.id) ? el('span', { className: 'completion-badge' }, '✓ Completed') : null, el('span', { className: 'muted' }, `${content.questionTypes.find(t => t.id === content.questions.find(q => q.listeningId === script.id)?.questionType)?.title || 'Everyday conversation'} · ${script.questionIds.length} questions`)), () => {
            view.listeningSelected = script.id;
            view.lessonTransition = true;
            view.scriptVisible = false;
            redraw(ctx, `listening-script-${script.id}`);
        }, `passage-card${script.id === selected.id ? ' active' : ''}`, { id: `listening-script-${script.id}` }))), detail);
        return el('div', { className: 'content-stack' }, topicFilter(ctx, 'listeningTopic'), completionFilter(ctx, 'listeningCompletion'), grid);
    }
    window.KotobaStudy = Object.freeze({ vocabulary, grammar, reading, listening });
}());
