/* Shared safe DOM helpers. Classic scripts also work when index.html is opened as a local file. */
(() => {
    'use strict';
    function el(tag, attrs = {}, ...children) {
        const node = document.createElement(tag);
        for (const [key, value] of Object.entries(attrs || {})) {
            if (value === undefined || value === null || value === false && !key.startsWith('aria-'))
                continue;
            if (/^on[A-Z]/.test(key) && typeof value === 'function')
                node.addEventListener(key.slice(2).toLowerCase(), value);
            else if (key === 'className' || key === 'class')
                node.className = value;
            else if (key === 'style' && typeof value === 'object')
                Object.assign(node.style, value);
            else if (['checked', 'disabled', 'selected', 'multiple', 'readOnly'].includes(key))
                node[key] = !!value;
            else if (key === 'value')
                node.value = value;
            else if (key === 'tabIndex')
                node.tabIndex = value;
            else
                node.setAttribute(key, value === true && !key.startsWith('aria-') ? '' : String(value));
        }
        const append = child => {
            if (Array.isArray(child))
                child.forEach(append);
            else if (child instanceof Node)
                node.append(child);
            else if (child !== null && child !== undefined && child !== false)
                node.append(document.createTextNode(String(child)));
        };
        children.forEach(append);
        return node;
    }
    const button = (label, handler, className = 'button primary', attrs = {}) => el('button', { type: 'button', className, ...attrs, onClick: handler }, label);
    const ja = text => el('span', { lang: 'ja' }, text);
    function mixed(text) {
        const result = el('span');
        String(text).split(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆〇～〜「」『』（）。、・★]+)/u).filter(Boolean).forEach(part => {
            result.append(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(part) ? ja(part) : document.createTextNode(part));
        });
        return result;
    }
    const paths = {
        drag: ['M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01'],
        home: ['M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z'],
        book: ['M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2z'],
        grammar: ['m12 3 9 5-9 5-9-5z', 'm3 12 9 5 9-5', 'm3 16 9 5 9-5'],
        reading: ['M5 3h10l4 4v14H5z', 'M15 3v5h4', 'M8 12h8M8 16h6'],
        headphones: ['M4 14v-3a8 8 0 0 1 16 0v3', 'M4 12H2v8h4v-8zM20 12h2v8h-4v-8z'],
        target: ['M12 3a9 9 0 1 0 9 9', 'M12 7a5 5 0 1 0 5 5', 'm12 12 9-9', 'M16 3h5v5'],
        mock: ['M7 5H4v16h16V5h-3', 'M8 3h8v4H8z', 'm8 14 3 3 5-6'],
        review: ['M4 10a8 8 0 1 1 1 8', 'M4 3v7h7'],
        settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'm9 3 1 3h4l1-3 3 2-1 3 2 3 3-1v4l-3 1-2 3 1 3-3 2-1-3h-4l-1 3-3-2 1-3-2-3-3-1v-4l3 1 2-3-1-3z'],
        search: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14', 'm16 16 5 5'],
        bookmark: ['M6 3h12v18l-6-4-6 4z'],
        check: ['m5 12 4 4L19 6'],
        arrow: ['M4 12h16', 'm14 6 6 6-6 6'],
        chevron: ['m9 5 7 7-7 7'],
        flame: ['M12 2c0 7-7 7-7 13a7 7 0 0 0 14 0c0-4-3-5-3-8-1 3-3 4-4 4 2-3 2-6 0-9z'],
        star: ['m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'],
        clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 7v5l4 2'],
        upload: ['M12 16V3', 'm7 8 5-5 5 5', 'M4 15v6h16v-6'],
        download: ['M12 3v13', 'm7 11 5 5 5-5', 'M4 15v6h16v-6'],
        shield: ['m12 3 8 3v6c0 5-4 8-8 10-4-2-8-5-8-10V6z', 'm8 12 3 3 5-6'],
        close: ['m6 6 12 12M18 6 6 18'],
        play: ['m7 3 14 9-14 9z'],
        stop: ['M5 5h14v14H5z'],
        leaf: ['M20 3c-12-2-19 12-9 16 9 4 12-10 9-16z', 'M5 21 17 7'],
        moon: ['M20 13a8 8 0 1 1-9-9 7 7 0 0 0 9 9z'],
        sun: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5'],
    };
    function icon(name) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'icon' }))
            svg.setAttribute(key, value);
        for (const d of paths[name] || paths.star) {
            const path = document.createElementNS(svg.namespaceURI, 'path');
            path.setAttribute('d', d);
            svg.append(path);
        }
        return svg;
    }
    const card = (...children) => el('section', { className: 'card' }, children);
    const paragraph = (text, className = 'muted') => el('p', { className }, typeof text === 'string' ? mixed(text) : text);
    const tag = text => el('span', { className: 'tag' }, text);
    const sectionTitle = text => el('h2', { className: 'section-title' }, text);
    const actions = (...children) => el('div', { className: 'inline-actions' }, children);
    const externalLink = (text, href) => el('a', { href, target: '_blank', rel: 'noreferrer' }, text);
    window.KotobaUI = { el, button, ja, mixed, icon, card, paragraph, tag, sectionTitle, actions, externalLink };
})();
