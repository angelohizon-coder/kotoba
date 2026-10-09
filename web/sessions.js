/* Practice and mock setup views. Controllers own progress, grading and persistence. */
(function (global) {
    'use strict';
    const C = global.KotobaContent, E = global.KotobaEngine;
    const { el, button, icon, paragraph: p, tag, sectionTitle: title, actions, externalLink: link } = global.KotobaUI;
    const cap = text => text[0].toUpperCase() + text.slice(1);
    const skills = ['vocabulary', 'kanji', 'grammar', 'reading', 'listening'];
    function practice(ctx) {
        const { view, start, sample, levelMatches, rerender: render } = ctx;
        const skill = view.practiceSkill;
        const topic = view.practiceTopic || 'all';
        const format = view.practiceType || 'all';
        const pool = C.questions.filter(q => levelMatches(q) && (skill === 'mixed' ? q.skill !== 'listening' : q.skill === skill) && (topic === 'all' || q.topicId === topic) && (format === 'all' || q.questionType === format));
        const select = el('select', { id: 'practice-skill', onChange: e => { view.practiceSkill = e.target.value; view.practiceType = 'all'; render(); } }, el('option', { value: 'mixed' }, 'Mixed — vocabulary, kanji, grammar & reading'), skills.map(s => el('option', { value: s }, cap(s))));
        select.value = skill;
        const topicSelect = el('select', { id: 'practice-topic', onChange: e => { view.practiceTopic = e.target.value; render(); } }, el('option', { value: 'all' }, 'All everyday topics'), C.topics.map(t => el('option', { value: t.id }, t.title)));
        topicSelect.value = topic;
        const formats = C.questionTypes.filter(t => skill === 'mixed' ? t.skill !== 'listening' : t.skill === skill);
        const formatSelect = el('select', { id: 'practice-format', onChange: e => { view.practiceType = e.target.value; render(); } }, el('option', { value: 'all' }, 'All question categories'), formats.map(t => el('option', { value: t.id }, t.title)));
        formatSelect.value = format;
        const limit = Math.min(100, pool.length);
        const count = Math.min(limit, Math.max(1, Number(view.practiceCount) || 5));
        const summary = p(`${count} questions from ${pool.length} available, with explanations after each answer.`, 'section-description');
        const countError = p('', 'field-error');
        countError.id = 'practice-count-error';
        countError.setAttribute('aria-live', 'polite');
        let startButton;
        const countInput = el('input', { id: 'practice-count', type: 'number', min: 1, max: limit || 1, step: 1, value: count || 1, 'aria-describedby': 'practice-count-help practice-count-error', onInput: event => {
                view.practiceCount = event.target.value;
                const chosen = Number(event.target.value);
                const valid = event.target.value !== '' && Number.isInteger(chosen) && chosen >= 1 && chosen <= limit;
                event.target.setCustomValidity(valid ? '' : `Choose a whole number from 1 to ${limit || 1}.`);
                event.target.setAttribute('aria-invalid', String(!valid));
                countError.textContent = valid ? '' : `Choose a whole number from 1 to ${limit || 1}.`;
                if (startButton)
                    startButton.disabled = !valid;
                summary.textContent = valid ? `${chosen} questions from ${pool.length} available, with explanations after each answer.` : `${pool.length} questions available. Set your session length below.`;
            } });
        startButton = button(['Start practice', icon('play')], () => {
            if (!countInput.reportValidity())
                return;
            const chosen = Number(countInput.value);
            view.practiceCount = chosen;
            let candidates = pool;
            if (skill === 'mixed' && view.practicePrioritizeWeak === false) {
                const seeds = sample(['vocabulary', 'kanji', 'grammar', 'reading'], 4).flatMap(s => sample(pool.filter(q => q.skill === s), 1)).slice(0, chosen);
                candidates = [...seeds, ...sample(pool.filter(q => !seeds.some(seed => seed.id === q.id)), Math.max(0, chosen - seeds.length))];
            }
            start(candidates, 'practice', { count: chosen, listeningAccess: skill === 'listening' ? 'audio' : null });
        }, 'button primary', { disabled: !pool.length });
        return el('section', { className: 'card setup-card' }, tag('UNTIMED LEARNING MODE'), title('Pick your next challenge'), summary, el('label', { className: 'field', for: 'practice-skill' }, el('span', { className: 'field-label' }, 'Practice skill'), select), el('label', { className: 'field', for: 'practice-topic' }, el('span', { className: 'field-label' }, 'Everyday topic'), topicSelect), el('label', { className: 'field', for: 'practice-format' }, el('span', { className: 'field-label' }, 'Question category'), formatSelect), el('label', { className: 'field', for: 'practice-count' }, el('span', { className: 'field-label' }, 'Number of questions'), countInput, el('small', { id: 'practice-count-help' }, `Choose 1–${limit || 1} questions for this selection.`), countError), el('label', { className: 'practice-focus' }, el('input', { id: 'prioritize-weak', type: 'checkbox', checked: view.practicePrioritizeWeak !== false, onChange: e => { view.practicePrioritizeWeak = e.target.checked; render(); } }), el('span', {}, el('strong', {}, 'Prioritize weak points'), el('small', {}, 'Missed and due questions first, with new material in the mix.'))), C.questionTypes.find(t => t.id === format)?.note ? p(C.questionTypes.find(t => t.id === format).note) : null, !pool.length ? p('No questions match these filters. Choose another topic or category.', 'notice warning') : null, skill === 'listening' ? p('Japanese browser speech is required for audio practice. Script study is always available and unscored.', 'notice warning') : null, startButton, p('Answers are saved as you go. You can come back to your session later.'));
    }
    function mock(ctx) {
        const { view, changeLevel } = ctx;
        const level = view.mockLevel || (view.studyLevel === 'all' ? 'n3' : view.studyLevel) || 'n3';
        const config = E.FULL_MOCK_CONFIG[level];
        const levelSelect = el('select', { id: 'mock-level', onChange: event => changeLevel(event.target.value) }, ['n5', 'n4', 'n3', 'n2', 'n1'].map(value => el('option', { value }, value.toUpperCase())));
        levelSelect.value = level;
        return el('section', { className: 'card setup-card' }, tag('ORIGINAL FULL MOCK PRACTICE'), title('Take the next big step.'), p(`A complete ${level.toUpperCase()} practice session: ${config.counts.reduce((sum, count) => sum + count, 0)} questions across ${config.minutes.length} separately timed sections.`, 'section-description'), el('label', { className: 'field', for: 'mock-level' }, el('span', { className: 'field-label' }, 'Mock level'), levelSelect), el('div', { className: 'mock-facts full-mock-facts', style: { gridTemplateColumns: `repeat(${config.minutes.length}, minmax(0, 1fr))` } }, config.minutes.map((minutes, index) => el('span', {}, icon(config.sectionIds[index] === 'listening' ? 'headphones' : 'clock'), el('strong', {}, config.sectionTitles[index]), el('span', {}, `${config.counts[index]} questions · ${minutes} minutes`)))), el('ul', { className: 'setup-list' }, [
            'Each section locks when you submit it or its timer expires. Start the next section when you are ready.',
            'The active section’s clock continues through navigation and reload. Section breaks have no countdown.',
            'Answers, translations, and explanations unlock after all sections.',
            'Listening uses browser Japanese speech. Audio failures can be excluded; previously read scripts are unscored.',
            'Results show raw accuracy, without an official scaled score or a pass/fail prediction.',
        ].map(text => el('li', {}, text))), button(['Start full mock test', icon('arrow')], () => {
            ctx.startFullMock(level);
        }, 'button primary', { id: 'start-full-mock' }), p('These are original randomized practice sets. Their question counts are authored practice targets; they do not reproduce a historical exam.'), el('details', { className: 'mock-references' }, el('summary', {}, 'Official past questions and test structure'), p('JLPT does not publish every past exam. The 2012 and 2018 official workbooks contain selected previously used questions; the official site provides samples and listening audio.'), actions(link('2012 & 2018 official workbooks ↗', 'https://www.jlpt.jp/e/samples/sampleindex.html'), link('Official section times ↗', 'https://www.jlpt.jp/e/guideline/testsections.html'), link('Past-paper FAQ ↗', 'https://www.jlpt.jp/e/faq/'))), el('details', { className: 'mock-references' }, el('summary', {}, 'Online format references'), p('Nihonez’s timed tests and section drills, and Migii’s level, full-test, mini-test, and skill selectors informed the practice layout. Our questions, explanations, scripts, and scoring remain original.'), actions(link('Nihonez JLPT practice ↗', 'https://nihonez.com/jlpt-test/'), link('Migii N3 mock layout ↗', 'https://jlpt.migii.net/en/mock-test/jlpt-n3'))));
    }
    function mockSetup(ctx) {
        const panel = mock(ctx);
        if (global.KotobaPreferences?.get(ctx.progress()).untimedPractice) {
            panel.querySelector('.section-description').textContent = 'Full-length untimed practice is selected. The section times below are reference timings; no countdown is applied to untimed practice.';
            const start = panel.querySelector('#start-full-mock');
            start.replaceChildren(document.createTextNode('Start full-length untimed practice'), icon('arrow'));
            panel.querySelector('.setup-list').replaceChildren(...[
                'The full original question pool is saved as untimed practice, with explanations available while learning.',
                'Answers and position survive navigation and reload.',
                'Browser audio remains optional practice; unavailable or previously read listening scripts are unscored.',
                'Choose Start timed full mock instead to use the separate official section clocks.',
            ].map(text => el('li', {}, text)));
            start.after(button('Start timed full mock instead', () => ctx.startFullMock(panel.querySelector('#mock-level').value, true), 'button secondary', { id: 'start-timed-full-mock' }));
        }
        return panel;
    }
    global.KotobaSessions = { practice, mock: mockSetup };
})(window);
