/* Original course flashcards. Session marks and explicit saved recall ratings stay separate. */
(() => {
    'use strict';
    // A gesture may request audio for the replacement card. These requests live
    // only in this tab and are consumed once; restoring a deck never speaks it.
    const automaticAudio = new WeakMap();
    function focusControl(id) {
        const control = document.getElementById(id);
        if (control && !control.disabled)
            control.focus({ preventScroll: true });
    }
    function shuffled(ids) {
        const result = ids.slice();
        for (let index = result.length - 1; index > 0; index -= 1) {
            const other = Math.floor(Math.random() * (index + 1));
            [result[index], result[other]] = [result[other], result[index]];
        }
        return result;
    }
    function wordWithReading(word, furigana) {
        const { el, ja } = window.KotobaUI;
        return furigana
            ? el('ruby', { lang: 'ja' }, word.word, el('rp', {}, '（'), el('rt', {}, word.reading), el('rp', {}, '）'))
            : ja(word.word);
    }
    function render(ctx) {
        const { el, button, ja, icon } = window.KotobaUI;
        const content = window.KotobaContent;
        const engine = window.KotobaEngine;
        const progress = ctx.progress();
        const words = new Map(content.vocabulary.map(word => [word.id, word]));
        const state = ctx.view.flashcards || (ctx.view.flashcards = {
            type: 'vocabulary', topic: 'all', completion: 'all', bookmarkedOnly: false,
            furigana: !!progress.settings.furigana, ids: [], index: 0,
            flipped: false, animateFlip: false, ratings: {}, signature: '', announcement: '', optionsOpen: false,
        });
        if (!['vocabulary', 'kanji'].includes(state.type))
            state.type = 'vocabulary';
        if (state.topic !== 'all' && !content.topics.some(topic => topic.id === state.topic))
            state.topic = 'all';
        if (!['all', 'unfinished', 'completed'].includes(state.completion))
            state.completion = 'all';
        const bookmarked = new Set(progress.bookmarks);
        const completedTasks = new Set(progress.completedTasks || []);
        const pool = (state.type === 'kanji' ? content.kanji : content.vocabulary).filter(item => {
            if (ctx.levelMatches && !ctx.levelMatches(item))
                return false;
            const isComplete = completedTasks.has(`${state.type}:${item.id}`);
            if (state.completion === 'completed' && !isComplete || state.completion === 'unfinished' && isComplete)
                return false;
            const linked = state.type === 'kanji' ? item.wordIds.map(id => words.get(id)).filter(word=>word&&(!ctx.levelMatches||ctx.levelMatches(word))) : [];
            const topicMatches = state.topic === 'all' || item.topicId === state.topic || linked.some(word => word.topicId === state.topic);
            const bookmarkMatches = !state.bookmarkedOnly || (state.type === 'kanji'
                ? item.wordIds.some(id => bookmarked.has(id)) : bookmarked.has(item.id));
            return topicMatches && bookmarkMatches;
        });
        const signature = JSON.stringify([state.type, state.topic, state.completion, !!state.bookmarkedOnly, pool.map(item => item.id)]);
        if (signature !== state.signature) {
            state.signature = signature;
            state.ids = pool.map(item => item.id);
            state.index = 0;
            state.flipped = false;
            state.animateFlip = false;
            state.ratings = {};
            state.announcement = pool.length ? `New deck. ${pool.length} cards. The first card is hidden.` : 'No cards match these filters.';
        }
        state.index = Math.max(0, Math.min(state.index, Math.max(0, state.ids.length - 1)));
        const byId = new Map(pool.map(item => [item.id, item]));
        const current = byId.get(state.ids[state.index]);
        const deckType = state.type;
        const audioRequest = automaticAudio.get(state);
        let disposed = false;
        const total = state.ids.length;
        const again = state.ids.filter(id => state.ratings[id] === 'again').length;
        const gotIt = state.ids.filter(id => state.ratings[id] === 'got-it').length;
        const completed = current && (progress.completedTasks || []).includes(`${state.type}:${current.id}`);
        function audioAllowed(automatic = false) {
            const latest = ctx.progress();
            const prefs = window.KotobaPreferences?.get?.(latest) || latest.settings?.studyPreferences || {};
            const active = latest.attempts?.find(attempt => attempt.id === latest.activeAttemptId);
            return typeof window.KotobaAudio?.speakText === 'function' && !prefs.quiet &&
                !(active?.status === 'in-progress' && (active.type === 'mock' || Number.isFinite(active.deadline))) &&
                (!automatic || prefs.autoSpeak === true);
        }
        function requestAutomaticAudio() {
            if (!disposed && audioAllowed(true))
                automaticAudio.set(state, {});
            else
                automaticAudio.delete(state);
        }
        // A single kanji has several possible readings. Use an authored linked
        // vocabulary reading rather than asking synthesis to guess one.
        const audioWord = current && (deckType === 'vocabulary' ? current :
            current.wordIds.map(id => words.get(id)).find(word => word && (!ctx.levelMatches || ctx.levelMatches(word))));
        function readWord(options = {}) {
            if (disposed || !section.isConnected || !audioWord || state.type !== deckType || state.ids[state.index] !== current.id || !audioAllowed(options.auto === true))
                return;
            const handle = window.KotobaAudio.speakText(ctx, audioWord.reading || audioWord.word, options);
            if (handle.reason === 'unavailable' || handle.reason === 'no-japanese-voice')
                status.textContent = 'Japanese word audio is unavailable here. The written reading remains on the answer.';
        }
        function redraw(id, updater) {
            const viewport = { left: window.scrollX, top: window.scrollY, behavior: 'instant' };
            if (updater)
                ctx.update(updater);
            else
                ctx.rerender();
            focusControl(id);
            // Replacing the focused control can move the browser's scroll anchor.
            window.scrollTo(viewport);
        }
        function changeFilter(key, value, id) {
            state[key] = value;
            // The next render rebuilds the deck and clears its transient ratings.
            state.signature = '';
            requestAutomaticAudio();
            redraw(id);
        }
        function flip(focusId = 'flashcard-flip') {
            if (!current)
                return;
            state.flipped = !state.flipped;
            state.animateFlip = true;
            state.announcement = `Card ${state.index + 1} of ${total}. ${state.flipped ? 'Answer shown.' : 'Front shown.'}`;
            requestAutomaticAudio();
            redraw(focusId, state.flipped ? learner => engine.markStudied(learner, state.type, current.id) : null);
        }
        function move(offset, focusId) {
            const next = state.index + offset;
            if (!current || next < 0 || next >= total)
                return;
            state.index = next;
            state.flipped = false;
            state.announcement = `Card ${state.index + 1} of ${total}. Front shown.`;
            const disabledDestination = focusId === 'flashcard-previous' && next === 0 || focusId === 'flashcard-next' && next === total - 1;
            requestAutomaticAudio();
            redraw(disabledDestination ? 'flashcard-flip' : focusId || 'flashcard-flip');
        }
        function rate(rating) {
            if (!current || !state.flipped)
                return;
            ctx.cue?.(rating === 'got-it' ? 'complete' : 'saved');
            const taskId = `${state.type}:${current.id}`;
            state.ratings[current.id] = rating;
            const advance = state.index < total - 1;
            if (advance) {
                state.index += 1;
                state.flipped = false;
            }
            const allRated = state.ids.every(id => state.ratings[id]);
            state.announcement = `${rating === 'got-it' ? 'Got it.' : 'Marked Again.'} ${advance ? `Card ${state.index + 1} of ${total}. Front shown.` : allRated ? 'Every card in this session has a rating.' : 'This is the last card. Use Previous to revisit earlier cards.'}`;
            redraw(advance ? 'flashcard-flip' : `flashcard-${rating === 'got-it' ? 'got-it' : 'again'}`, learner => {
                const studied = engine.markStudied(learner, state.type, current.id);
                if (typeof ctx.completeTask !== 'function' && !Array.isArray(studied.completedTasks))
                    return studied;
                const tasks = studied.completedTasks || [];
                const completedTasks = rating === 'got-it'
                    ? tasks.includes(taskId) ? tasks : [...tasks, taskId]
                    : tasks.filter(id => id !== taskId);
                return { ...studied, completedTasks };
            });
        }
        const deckSelect = el('select', {
            id: 'flashcard-deck', onChange: event => changeFilter('type', event.currentTarget.value, 'flashcard-deck'),
        }, el('option', { value: 'vocabulary' }, 'Vocabulary'), el('option', { value: 'kanji' }, 'Kanji'));
        deckSelect.value = state.type;
        const topicSelect = el('select', {
            id: 'flashcard-topic', onChange: event => changeFilter('topic', event.currentTarget.value, 'flashcard-topic'),
        }, el('option', { value: 'all' }, 'All everyday topics'), content.topics.map(topic => el('option', { value: topic.id }, topic.title)));
        topicSelect.value = state.topic;
        const completionSelect = el('select', {
            id: 'flashcard-completion', onChange: event => changeFilter('completion', event.currentTarget.value, 'flashcard-completion'),
        }, el('option', { value: 'all' }, 'All items'), el('option', { value: 'unfinished' }, 'Unfinished'), el('option', { value: 'completed' }, 'Completed'));
        completionSelect.value = state.completion;
        const primaryFilters = el('div', { className: 'flashcard-primary-filters' }, el('label', { className: 'field flashcard-field', for: 'flashcard-deck' }, el('span', { className: 'field-label' }, 'Deck'), deckSelect), el('label', { className: 'field flashcard-field', for: 'flashcard-topic' }, el('span', { className: 'field-label' }, 'Everyday topic'), topicSelect), el('label', { className: 'field flashcard-field', for: 'flashcard-completion' }, el('span', { className: 'field-label' }, 'Completion'), completionSelect));
        const filters = el('div', { className: 'flashcard-filters' }, el('label', { className: 'flashcard-checkbox', for: 'flashcard-bookmarks' }, el('input', {
            id: 'flashcard-bookmarks', type: 'checkbox', checked: !!state.bookmarkedOnly,
            onChange: event => changeFilter('bookmarkedOnly', event.currentTarget.checked, 'flashcard-bookmarks'),
        }), el('span', {}, state.type === 'kanji' ? 'Kanji from bookmarked words only' : 'Bookmarked words only')), el('label', { className: 'flashcard-checkbox', for: 'flashcard-furigana' }, el('input', {
            id: 'flashcard-furigana', type: 'checkbox', checked: !!state.furigana,
            onChange: event => { state.furigana = event.currentTarget.checked; redraw('flashcard-furigana'); },
        }), el('span', {}, 'Show furigana on answers')));
        const options = el('details', {
            id: 'flashcard-options', className: 'flashcard-options', open: !!state.optionsOpen,
            onToggle: event => { if (event.currentTarget.isConnected)
                state.optionsOpen = event.currentTarget.open; },
        }, el('summary', { id: 'flashcard-options-toggle' }, el('strong', {}, 'More options'), ' · bookmarks and furigana'), filters);
        const session = el('div', { className: 'flashcard-session', 'aria-label': 'Flashcard session progress' }, el('div', { className: 'flashcard-position' }, el('strong', { id: 'flashcard-position' }, total ? `Card ${state.index + 1} of ${total}` : 'No cards'), el('span', { className: 'flashcard-count' }, `${again + gotIt} marked in this session`)), el('progress', { id: 'flashcard-progress', max: total || 1, value: total ? state.index + 1 : 0, 'aria-label': 'Position in this deck' }), el('div', { className: 'flashcard-tallies' }, el('span', { id: 'flashcard-again-count' }, `Again: ${again}`), el('span', { id: 'flashcard-got-it-count' }, icon('check'), `Got it: ${gotIt}`)));
        let display;
        if (!current) {
            display = el('div', { className: 'flashcard-empty' }, icon('book'), el('h3', {}, 'No cards match these filters.'), el('p', {}, state.completion === 'completed' ? 'Completed cards will appear here. Rate a card Got it or tick Complete on its study card.' : state.bookmarkedOnly ? 'Bookmark words in Word cards, or turn off the bookmark filter.' : 'Choose another topic, completion status, or deck.'));
        }
        else {
            let pointerStart = null;
            let pointerMoved = false;
            // Both faces share a grid cell, reserving the taller face's natural height.
            // Hidden answers stay inaccessible while the page scrolls normally.
            const front = el('div', { className: 'flashcard-face' }, el('h3', { id: !state.flipped ? 'flashcard-word' : null, className: state.type === 'kanji' ? 'flashcard-character' : 'flashcard-word' }, ja(state.type === 'kanji' ? current.character : current.word)));
            const back = el('div', { className: 'flashcard-face' });
            if (state.type === 'vocabulary') {
                back.append(el('h3', { id: state.flipped ? 'flashcard-word' : null, className: 'flashcard-answer-word' }, wordWithReading(current, state.furigana)), el('p', { className: 'flashcard-reading', lang: 'ja' }, current.reading), el('p', { className: 'flashcard-meaning' }, current.meaning), el('p', { className: 'flashcard-class' }, current.wordClass), el('div', { className: 'flashcard-example' }, el('p', { lang: 'ja' }, current.example), el('p', { className: 'flashcard-translation' }, current.exampleTranslation)));
            }
            else {
                const linked = current.wordIds.map(id => words.get(id)).filter(word=>word&&(!ctx.levelMatches||ctx.levelMatches(word)));
                back.append(el('h3', { id: state.flipped ? 'flashcard-word' : null, className: 'flashcard-character flashcard-answer-character' }, ja(current.character)), el('p', { className: 'flashcard-meaning' }, current.meaning), el('p', { className: 'flashcard-reading-note' }, 'Readings vary by word. Learn this character through the words below.'), el('ul', { className: 'flashcard-linked-words' }, linked.map(word => el('li', {}, el('strong', {}, wordWithReading(word, state.furigana)), el('span', { lang: 'ja', className: 'flashcard-linked-reading' }, word.reading), el('span', {}, word.meaning)))));
                if (!linked.length)
                    back.append(el('p', {}, 'No linked example words are available.'));
            }
            const side = (face, revealed) => el('div', {
                className: 'flashcard-side', 'aria-hidden': state.flipped !== revealed,
                inert: state.flipped !== revealed,
            }, el('div', { className: 'flashcard-face-heading' }, el('span', {}, revealed ? 'ANSWER' : state.type === 'kanji' ? 'RECALL THE MEANING AND EXAMPLE WORDS' : 'RECALL THE READING AND MEANING'), completed ? el('span', { className: 'flashcard-complete' }, icon('check'), 'Completed') : null), face);
            display = el('article', {
                id: 'flashcard-display', className: `flashcard-display${state.flipped ? ' flashcard-revealed' : ''}${state.animateFlip ? ' flashcard-flipping' : ''}`,
                tabIndex: 0, role: 'group', 'aria-roledescription': 'flashcard',
                'aria-label': `${state.type === 'kanji' ? 'Kanji' : 'Vocabulary'} card ${state.index + 1}, ${state.flipped ? 'answer' : 'front'}`,
                'aria-describedby': 'flashcard-keyboard', 'aria-keyshortcuts': 'Space Enter', 'data-card-id': current.id,
                'data-deck-type': state.type, 'data-side': state.flipped ? 'back' : 'front',
                onPointerDown: event => {
                    if (!event.isPrimary || event.button !== 0)
                        return;
                    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
                    pointerMoved = false;
                },
                onPointerMove: event => {
                    if (pointerStart?.id === event.pointerId && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8)
                        pointerMoved = true;
                },
                onPointerLeave: event => { if (pointerStart && event.buttons & 1) pointerMoved = true; },
                onPointerCancel: () => { pointerMoved = true; pointerStart = null; },
                onScroll: () => { if (pointerStart) pointerMoved = true; },
                onClick: event => {
                    const selection = window.getSelection();
                    const selecting = selection && !selection.isCollapsed &&
                        (display.contains(selection.anchorNode) || display.contains(selection.focusNode));
                    if ((event.detail > 0 && pointerMoved) || selecting || event.target.closest?.('a, button, input, select, textarea, summary, [role="combobox"], [contenteditable]:not([contenteditable="false"])'))
                        return;
                    pointerStart = null;
                    flip('flashcard-display');
                },
            }, side(front, false), side(back, true));
            state.animateFlip = false;
        }
        const controls = el('div', { className: 'flashcard-controls' }, button('Previous', () => move(-1, 'flashcard-previous'), 'button secondary flashcard-nav', { id: 'flashcard-previous', disabled: !current || state.index === 0 }), button(state.flipped ? 'Flip to front' : 'Flip card', () => flip(), 'button primary flashcard-flip', { id: 'flashcard-flip', disabled: !current, 'aria-controls': 'flashcard-display', 'aria-expanded': !!state.flipped, 'aria-keyshortcuts': 'Space' }), button('Next', () => move(1, 'flashcard-next'), 'button secondary flashcard-nav', { id: 'flashcard-next', disabled: !current || state.index >= total - 1 }));
        const ratings = el('div', { className: 'flashcard-ratings' }, button('Again', () => rate('again'), 'button secondary flashcard-again', { id: 'flashcard-again', disabled: !current || !state.flipped, 'aria-pressed': !!current && state.ratings[current.id] === 'again' }), button([icon('check'), 'Got it'], () => rate('got-it'), 'button primary flashcard-got-it', { id: 'flashcard-got-it', disabled: !current || !state.flipped, 'aria-pressed': !!current && state.ratings[current.id] === 'got-it' }));
        const recallRatings = current && window.KotobaSrs?.renderRatings(ctx, {
            type: state.type, id: current.id, revealed: !!state.flipped,
            eventId: `flashcard:${state.type}:${current.id}:${engine.localDateKey(new Date(typeof ctx.now === 'function' ? ctx.now() : Date.now()))}`,
        });
        if (recallRatings) {
            // Status text changes after reveal/rating; reserve every state's natural height.
            const message = recallRatings.querySelector('.srs-rating-status');
            const slot = el('div', { className: 'flashcard-srs-status-slot' });
            const reserve = content => el('p', { className: 'srs-rating-status flashcard-srs-status-reserve', 'aria-hidden': true, inert: true }, content);
            message.before(slot);
            slot.append(message,
                reserve('Rate what you recalled before seeing the answer. This does not change your quiz score or completion mark.'),
                reserve('Rating saved · next recall ' + new Date(Date.UTC(2199, 8, 30, 23, 59)).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })));
        }
        const status = el('p', { id: 'flashcard-status', className: 'flashcard-announcement', role: 'status', 'aria-live': 'polite', 'aria-atomic': true });
        const audioControls = current && audioWord && audioAllowed() ? el('div', { className: 'inline-actions flashcard-word-audio', 'aria-label': 'Word audio' },
            button('Listen', () => readWord(), 'button secondary small', { id: 'flashcard-listen', 'aria-label': deckType === 'kanji' ? 'Listen to a linked example word' : 'Listen to this vocabulary word', title: 'Uses your selected Japanese browser voice.' }),
            button('Slow · 0.5x', () => readWord({ slow: true }), 'button secondary small', { id: 'flashcard-slow', 'aria-label': deckType === 'kanji' ? 'Listen to a linked example word at half speed' : 'Listen to this vocabulary word at half speed' })) : null;
        const section = el('section', { className: 'flashcard-shell', 'aria-labelledby': 'flashcard-title' }, el('div', { className: 'flashcard-header' }, el('div', {}, el('h2', { id: 'flashcard-title' }, 'Flashcards'), el('p', {}, 'Recall, flip, then choose your next step.')), button('Shuffle deck', () => {
            state.ids = shuffled(state.ids);
            state.index = 0;
            state.flipped = false;
            state.announcement = 'Deck shuffled. Card 1 is hidden. Your session ratings are kept.';
            requestAutomaticAudio();
            redraw('flashcard-shuffle');
        }, 'button secondary small flashcard-shuffle', { id: 'flashcard-shuffle', disabled: total < 2 })), primaryFilters, options, session, display, audioControls, el('div', { className: 'flashcard-actionbar' }, controls, ratings), el('p', { className: 'flashcard-help' }, 'Got it marks this card complete; Again clears that mark. Neither chooses a recall quality. Use the separate 0–5 recall buttons to save an SM-2 schedule.'), recallRatings, el('p', { id: 'flashcard-keyboard', className: 'flashcard-keyboard' }, 'Keyboard: Space or Enter on the card to flip · ← / → to move. Filters keep their usual keyboard controls.'), status);
        queueMicrotask(() => {
            if (disposed || !section.isConnected)
                return;
            status.textContent = state.announcement;
            if (audioRequest && automaticAudio.get(state) === audioRequest) {
                automaticAudio.delete(state);
                readWord({ auto: true });
            }
        });
        function keyboard(event) {
            if (disposed || !section.isConnected || !current || event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
                return;
            const target = event.target;
            if (document.querySelector('[aria-modal="true"]') || target.closest?.('.flashcard-options, input, select, textarea, summary, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]'))
                return;
            const inSession = section.contains(target) || target === document.body || target === document.documentElement || target.id === 'main';
            if (!inSession)
                return;
            if (event.key === 'Enter' && target.closest?.('#flashcard-display')) {
                event.preventDefault();
                flip('flashcard-display');
            }
            else if (event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space') {
                // Preserve normal Space activation on other buttons and links.
                if (target.closest?.('a, button') && target.id !== 'flashcard-flip')
                    return;
                event.preventDefault();
                flip(target.closest?.('#flashcard-display') ? 'flashcard-display' : 'flashcard-flip');
            }
            else if (event.key === 'ArrowLeft' && state.index > 0) {
                event.preventDefault();
                move(-1);
            }
            else if (event.key === 'ArrowRight' && state.index < total - 1) {
                event.preventDefault();
                move(1);
            }
        }
        document.addEventListener('keydown', keyboard);
        ctx.cleanup(() => {
            disposed = true;
            document.removeEventListener('keydown', keyboard);
            if (audioRequest && automaticAudio.get(state) === audioRequest)
                automaticAudio.delete(state);
        });
        return section;
    }
    window.KotobaFlashcards = { render };
})();
