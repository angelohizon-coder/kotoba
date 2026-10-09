/* User-selected dashboard widgets. Content and learning state are owned by their modules. */
(function (global) {
    'use strict';
    const catalog = [['path', 'Learning path'], ['goal', 'Daily goal'], ['review', 'Mistake review'], ['balance', 'Skill balance'], ['habit', 'Study habit'], ['activity', 'Recent activity'], ['library', 'Skill library'], ['topics', 'Topic explorer'], ['references', 'Book approaches'], ['foundations', 'Foundation review'], ['motivation', 'Goals and rewards']];
    const defaults = ['path', 'goal', 'review'];
    function render(ctx, data) {
        const C = global.KotobaContent, E = global.KotobaEngine;
        const { el, button, icon, card, paragraph: p, sectionTitle: title, externalLink: link } = global.KotobaUI;
        const progress = ctx.progress(), view = ctx.view;
        const chosen = progress.settings.dashboardWidgets || defaults;
        const updateWidgets = (ids, moved) => {
            view.dashboardMoved = moved?.id;
            ctx.update(p => ({ ...p, settings: { ...p.settings, dashboardWidgets: ids } }));
        };
        const custom = global.KotobaCustomize.render(ctx, { catalog, chosen, onChange: updateWidgets });
        const running = progress.attempts.find(a => a.id === progress.activeAttemptId);
        const header = el('header', { className: 'dashboard-header' }, el('div', { className: 'dashboard-welcome' }, el('img', { className: 'dashboard-mascot hero-art', src: './web/mascot.svg', alt: 'Momo, your cheerful tanuki study buddy', width: 76, height: 82 }), el('div', {}, el('span', { className: 'eyebrow' }, 'YOUR JAPANESE JOURNEY'), el('h1', {}, 'A little progress, every day.'), p(`${data.todayCount}/${progress.settings.dailyGoal} learning actions today · ${view.studyLevel === 'all' ? 'All levels' : (view.studyLevel || 'n3').toUpperCase()}`))), custom);
        const track = (percent, label) => el('div', { className: 'progress-track', role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.min(100, Math.round(percent)) }, el('div', { className: 'progress-fill', style: { width: Math.min(100, percent) + '%' } }));
        const builders = {
            motivation: () => global.KotobaMotivation.renderHome(ctx),
            path: () => running?.type === 'mock' && running.status === 'in-progress' ? ctx.testGuard() : global.KotobaPath.render(ctx),
            goal: () => card(title('Your daily goal'), el('div', { className: 'stat-number' }, data.todayCount, el('span', {}, ' / ' + progress.settings.dailyGoal)), track(data.todayCount / progress.settings.dailyGoal * 100, 'Daily goal'), p(data.todayCount >= progress.settings.dailyGoal ? 'Goal reached.' : `${progress.settings.dailyGoal - data.todayCount} more actions to go.`), button('Adjust goal', () => ctx.navigate('settings'), 'button ghost small')),
            review: () => card(title('Mistakes make progress'), p(`${ctx.due().length} assessed questions due for mistake review. ${global.KotobaSm2.dueSrsItems(progress).length} items due for rated recall.`), button('Visit mistake review', () => ctx.navigate('review'), 'button secondary')),
            balance: () => card(title('Your skill balance'), p('First assessed answers; retries are counted separately.'), el('div', { className: 'skill-list' }, ['vocabulary', 'kanji', 'grammar', 'reading', 'listening'].map(skill => { const score = data.initial.skills[skill], percent = score?.total ? Math.round(score.correct / score.total * 100) : 0; return el('div', { className: 'skill-row' }, el('div', { className: 'skill-row-label' }, el('span', {}, skill), el('strong', {}, score?.total ? percent + '%' : '—')), track(percent, skill), p(score?.total ? `${score.correct}/${score.total} correct` : 'No assessed answers yet')); }))),
            habit: () => card(title('Build your study habit'), el('div', { className: 'week-strip' }, Array.from({ length: 7 }, (_, i) => { const day = new Date(); day.setDate(day.getDate() - 6 + i); const done = !!data.daily[E.localDateKey(day)]; return el('div', { className: 'day-item' }, el('span', {}, day.toLocaleDateString(undefined, { weekday: 'narrow' })), el('span', { className: 'day-dot' + (done ? ' done' : ''), 'aria-label': day.toLocaleDateString() + ': ' + (done ? 'studied' : 'no activity') }, done ? icon('check') : '·')); })), p('One recorded study action makes a study day.')),
            activity: () => card(title('Your recent activity'), data.activity.length ? el('div', { className: 'activity-list' }, data.activity.slice(0, 4).map(a => el('div', { className: 'activity-item' }, icon('check'), el('div', {}, el('strong', {}, a.label), p(a.detail))))) : p('Study a word or answer a question to record your first action.')),
            library: () => card(title('Explore the skill library'), el('div', { className: 'skill-library' }, [['vocabulary', 'book', 'Words and kanji'], ['grammar', 'grammar', 'Grammar distinctions'], ['reading', 'reading', 'Reading comprehension'], ['listening', 'headphones', 'Listening strategies'], ['practice', 'target', 'Mixed practice'], ['mock', 'mock', 'Full mock']].map(([id, shape, label]) => button([icon(shape), el('span', {}, label)], () => ctx.navigate(id), 'button secondary path-node')))),
            topics: () => card(title('Explore your topic map'), p('Topics are browsing tags, not fixed learning-path units.'), el('div', { className: 'topic-grid' }, C.topics.map(t => button(el('span', {}, el('strong', {}, t.title), el('span', { className: 'muted' }, t.description)), () => ctx.openTopic(t.id), 'topic-card'))), el('h3', {}, 'Practice question categories'), el('div', { className: 'coverage-types' }, C.questionTypes.map(t => button(t.title, () => { view.practiceSkill = t.skill; view.practiceType = t.id; view.practiceTopic = 'all'; ctx.navigate('practice'); }, 'button secondary small')))),
            references: () => card(title('Choose a study approach'), el('div', { className: 'route-grid' }, C.studyReferences.map(ref => { const configs = { deep: ['Study grammar', 'grammar'], context: ['Study in context', 'reading'], daily: ['Open learning path', 'dashboard'], exam: ['Try a full mock', 'mock'] }; const [label, route] = configs[ref.id]; return el('article', { className: 'route-card', 'data-route': ref.id }, el('h3', {}, ref.title), p(ref.approach), button(label, () => { if(ref.id==='context'){ctx.openTopic('daily','reading');return;} ctx.navigate(route); if (route === 'dashboard')
                document.getElementById('integrated-path')?.scrollIntoView({ block: 'start', behavior: 'instant' }); }, 'button secondary small'), link('Publisher reference ↗', ref.sourceUrl)); }))),
            foundations: () => card(title('Review your foundations'), el('div', { className: 'route-grid' }, ['n5', 'n4', 'n3'].map(level => el('article', { className: 'foundation-card' }, el('h3', {}, level.toUpperCase()), button('Review ' + level.toUpperCase(), () => { ctx.changeLevel(level); ctx.navigate('grammar'); }, 'button secondary small'))))),
        };
        const widgets = el('div', { id: 'home-widgets', className: 'dashboard-widgets' + (view.dashboardReordering ? ' is-editing' : '') }, chosen.map(id => {
            const node = builders[id](), name = catalog.find(item => item[0] === id)[1];
            node.classList.add('dashboard-widget'); node.dataset.widget = id;
            if (view.dashboardMoved === id) node.classList.add('widget-just-moved');
            const heading = node.querySelector('h2');
            let headingRow = heading?.parentElement;
            if (headingRow === node) {
                headingRow = el('div', { className: 'widget-heading-row' });
                heading.replaceWith(headingRow); headingRow.append(heading);
            }
            if (heading) {
                headingRow.classList.add('widget-heading-row');
                heading.classList.add('widget-drag-title'); heading.title = 'Drag this heading to move the widget';
                if (view.dashboardReordering) { heading.textContent = name; heading.classList.add('widget-edit-heading'); }
            }
            (headingRow || node).append(button([icon('drag'), el('span', {}, 'Move')], () => {}, 'widget-drag-handle', {
                'aria-label': 'Move ' + name, title: 'Drag to move; use arrow keys to reorder', disabled: chosen.length < 2,
            }));
            return node;
        }));
        view.dashboardMoved = null;
        if (chosen.length && global.KotobaWidgets) ctx.cleanup(global.KotobaWidgets.enhance(widgets, {
            onReorder: updateWidgets, onMove: () => ctx.cue('move'), touchBackground: !!view.dashboardReordering,
        }));
        const reorderTools = view.dashboardReordering ? el('div', { className: 'home-reorder-tools', id: 'home-reorder-tools' },
            el('div', {}, el('strong', {}, 'Arrange your home'), p('Drag a heading or Move control. Your order saves after each drop.')),
            button('Done', () => { view.dashboardReordering = false; ctx.cue('settle'); ctx.rerender(); document.getElementById('dashboard-customize-trigger')?.focus({ preventScroll: true }); }, 'button primary small', { id: 'finish-home-reorder' })) : null;
        return el('div', { className: 'content-stack dashboard' }, header, reorderTools, running ? card(title(running.status === 'in-progress' ? 'Your saved session' : 'Your saved results'), button('Resume your session', () => ctx.navigate(running.type === 'review' ? 'review' : running.type === 'mock' ? 'mock' : running.type), 'button primary')) : null, chosen.length ? widgets : card(title('Your home, your choice'), p('Open Customize home and choose the sections you want to see.')));
    }
    global.KotobaDashboard = { render, catalog, defaults };
})(window);
