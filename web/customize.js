/* A floating, keyboard-accessible editor for the learner's home widgets. */
(function (global) {
    'use strict';
    function render(ctx, { catalog, chosen, onChange }) {
        const { el, button, icon } = global.KotobaUI;
        const view = ctx.view;
        const isOpen = !!view.dashboardCustomizing;
        const label = id => catalog.find(item => item[0] === id)[1];
        function setOpen(value, restoreFocus = true) {
            view.dashboardCustomizing = value;
            view.widgetPanelAnimate = value;
            if (value) view.widgetPanelScroll = 0;
            if (value) ctx.cue('customize');
            ctx.rerender();
            const target = document.getElementById(value ? 'dashboard-widget-' + catalog[0][0] : 'dashboard-customize-trigger');
            if (value || restoreFocus) target?.focus({ preventScroll: true });
        }
        function move(id, direction) {
            const ids = [...chosen], from = ids.indexOf(id), to = from + direction;
            if (to < 0 || to >= ids.length) return;
            [ids[from], ids[to]] = [ids[to], ids[from]];
            onChange(ids, {id}); ctx.cue('move');
            const preferred = document.getElementById(`widget-order-${id}-${direction < 0 ? 'up' : 'down'}`);
            const opposite = document.getElementById(`widget-order-${id}-${direction < 0 ? 'down' : 'up'}`);
            const target = preferred && !preferred.disabled ? preferred : opposite && !opposite.disabled ? opposite : document.getElementById('dashboard-widget-' + id);
            target?.focus({ preventScroll: true });
        }
        function rearrangeHome() {
            view.dashboardCustomizing = false;
            view.dashboardReordering = true;
            ctx.cue('arrange');
            ctx.rerender();
            document.getElementById('home-widgets')?.querySelector('.widget-drag-handle')?.focus({ preventScroll: true });
            document.getElementById('home-reorder-tools')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        }
        const choices = el('fieldset', {}, el('legend', {}, 'Choose your widgets'), catalog.map(([id, name]) =>
            el('label', { className: 'widget-choice', for: 'dashboard-widget-' + id },
                el('input', { id: 'dashboard-widget-' + id, type: 'checkbox', checked: chosen.includes(id), onChange: event =>
                    onChange(event.target.checked ? [...chosen, id] : chosen.filter(value => value !== id)) }),
                el('span', {}, name))));
        const order = el('div', { id: 'home-widget-order', className: 'widget-order' }, el('p', {}, 'Drag to reorder, or use the arrows.'), chosen.map((id, index) =>
            el('div', { className: 'widget-order-item', 'data-widget': id },
                button(icon('drag'), () => {}, 'widget-drag-handle widget-order-handle', { 'aria-label': 'Move ' + label(id), title: 'Drag to move; use arrow keys to reorder', disabled: chosen.length < 2 }),
                el('span', { className: 'widget-order-label' }, label(id)),
                button('↑', () => move(id, -1), 'button ghost small', { id: 'widget-order-' + id + '-up', 'aria-label': 'Move ' + label(id) + ' up', disabled: index === 0 }),
                button('↓', () => move(id, 1), 'button ghost small', { id: 'widget-order-' + id + '-down', 'aria-label': 'Move ' + label(id) + ' down', disabled: index === chosen.length - 1 }))));
        const panel = el('div', {
            id: 'home-customize-panel', className: 'dashboard-customize-panel' + (view.widgetPanelAnimate ? ' widget-panel-enter' : ''),
            role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'home-customize-title',
            onScroll: event => { view.widgetPanelScroll = event.target.scrollTop; },
        }, el('header', { className: 'widget-panel-heading' }, el('h2', { id: 'home-customize-title' }, 'Make home yours'),
            button(icon('close'), () => setOpen(false), 'icon-button', { id: 'close-home-customize', 'aria-label': 'Close home customization' })),
            chosen.length ? el('div', { className: 'widget-rearrange-option' },
                button([icon('drag'), 'Rearrange cards'], rearrangeHome, 'button secondary', { id: 'rearrange-home-widgets', disabled: chosen.length < 2 }),
                el('p', {}, 'See compact cards and drag them into your preferred order.')) : null,
            choices, chosen.length ? order : el('p', {}, 'Choose a widget to add it to your home page.'),
            button('Restore default widgets', () => onChange([...global.KotobaEngine.DEFAULT_DASHBOARD_WIDGETS]), 'button secondary small'));
        view.widgetPanelAnimate = false;
        const summary = el('summary', { id: 'dashboard-customize-trigger', 'aria-expanded': isOpen, 'aria-controls': panel.id, 'aria-haspopup': 'dialog',
            onClick: event => { event.preventDefault(); setOpen(!view.dashboardCustomizing); } }, icon('settings'), 'Customize home', icon('chevron'));
        const custom = el('details', { className: 'dashboard-customize', open: isOpen }, summary, panel);
        if (isOpen) {
            if (chosen.length && global.KotobaWidgets) ctx.cleanup(global.KotobaWidgets.enhance(order, {
                itemSelector: '.widget-order-item[data-widget]', dragSurfaceSelector: '.widget-order-label', allowBackground: false, onReorder: onChange, onMove: () => ctx.cue('move'),
            }));
            const place = () => {
                const anchor = summary.getBoundingClientRect();
                const width = Math.min(420, global.innerWidth - 32);
                const bottomMargin = global.innerWidth <= 760 ? 96 : 16;
                let top = anchor.bottom + 10;
                if (global.innerHeight - top - bottomMargin < 220) top = Math.max(16, global.innerHeight - bottomMargin - 360);
                Object.assign(panel.style, { width: width + 'px', left: Math.max(16, Math.min(anchor.right - width, global.innerWidth - width - 16)) + 'px',
                    top: Math.max(16, top) + 'px', maxHeight: Math.max(140, global.innerHeight - top - bottomMargin) + 'px' });
            };
            const frame = global.requestAnimationFrame(() => { place(); panel.scrollTop = view.widgetPanelScroll || 0; });
            const outside = event => {
                if (!view.dashboardCustomizing || custom.contains(event.target)) return;
                view.dashboardCustomizing = false;
                custom.open = false;
                summary.setAttribute('aria-expanded', 'false');
                if (panel.contains(document.activeElement)) summary.focus({ preventScroll: true });
            };
            global.addEventListener('resize', place);
            global.addEventListener('scroll', place, true);
            document.addEventListener('pointerdown', outside, true);
            document.addEventListener('click', outside, true);
            ctx.cleanup(() => { global.cancelAnimationFrame(frame); global.removeEventListener('resize', place); global.removeEventListener('scroll', place, true); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('click', outside, true); });
        }
        return custom;
    }
    global.KotobaCustomize = { render };
})(window);
