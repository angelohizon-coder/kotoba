/* Publisher topic references for original study content; no textbook chapter equivalence is implied. */
(function () {
    'use strict';
    const skills = ['vocabulary', 'kanji', 'grammar', 'reading', 'listening'];

    function render(ctx, selected, skill = 'grammar') {
        const el = ctx?.el || window.KotobaUI.el;
        const content = window.KotobaContent;
        const level = String(selected?.jlptLevel || 'n3').toLowerCase();
        const selectedSkill = skills.includes(skill) ? skill : 'grammar';
        const refs = (content.referenceMap || []).filter(ref => ref.level === level && ref.skill === selectedSkill);
        const section = el('section', {
            className: 'study-reference',
            'aria-label': 'Study references',
            'data-reference-level': level,
            'data-reference-skill': selectedSkill,
        });
        const heading = el('h3', { className: 'study-reference-heading' }, 'Study references');

        if (!refs.length) {
            section.append(heading,
                el('p', { className: 'study-reference-note' },
                    level === 'n5' || level === 'n4'
                        ? 'Original foundation content. No verified textbook volume mapping is available for this lesson yet.'
                        : 'Original app content. No verified textbook volume mapping is available for this lesson yet.'));
            return section;
        }

        const links = el('div', { className: 'study-reference-links' }, refs.map(ref =>
            el('a', {
                className: 'study-reference-link',
                href: ref.sourceUrl,
                target: '_blank',
                rel: 'noopener noreferrer',
                'data-reference-id': ref.id,
            }, ref.volume,
            el('span', { 'aria-hidden': 'true' }, ' ↗'),
            el('span', { className: 'visually-hidden' }, ' (publisher page, opens in a new tab)'))));
        section.append(el('div', { className: 'study-reference-row' }, heading, links));

        const details = el('details', { className: 'study-reference-details' },
            el('summary', {}, 'Edition, topic links and gaps'),
            el('p', { className: 'study-reference-note' },
                'These references describe publisher topics and original app associations. Exact textbook chapters/pages and complete coverage have not been verified.'));
        if (content.referenceMapCheckedAt)
            details.append(el('p', { className: 'study-reference-checked' },
                'Publisher reference metadata checked: ',
                el('time', { datetime: content.referenceMapCheckedAt }, content.referenceMapCheckedAt), '.'));

        details.append(el('div', { className: 'study-reference-grid' }, refs.map(ref => {
            const linked = (ref.appContentIds || []).includes(selected?.id);
            const linkage = linked ? 'Representative topic link' : 'General reference for this level';
            const entry = el('article', {
                className: 'study-reference-entry',
                'data-reference-id': ref.id,
                'data-reference-linkage': linked ? 'representative' : 'general',
            }, el('h4', {}, ref.volume),
            el('p', { className: 'study-reference-linkage' }, linkage),
            el('p', { className: 'study-reference-note' }, linked
                ? 'This original app lesson is linked to a compatible skill/topic. This does not verify a match with an individual textbook lesson or exercise.'
                : 'This volume is a general study reference for the lesson’s level. This lesson is not individually linked in our reference map.'),
            el('dl', { className: 'study-reference-metadata' },
                ref.edition ? [el('dt', {}, 'Edition'), el('dd', {}, ref.edition)] : null,
                ref.isbn ? [el('dt', {}, 'ISBN'), el('dd', {}, ref.isbn)] : null,
                ref.verifiedTopic ? [el('dt', {}, 'Verified publisher topic'), el('dd', {}, ref.verifiedTopic)] : null,
                ref.appObjective ? [el('dt', {}, 'Original app objective'), el('dd', {}, ref.appObjective)] : null));
            if (ref.gaps?.length)
                entry.append(el('h5', {}, 'Remaining gaps'),
                    el('ul', { className: 'study-reference-gaps' }, ref.gaps.map(gap => el('li', {}, gap))));
            return entry;
        })));
        section.append(details);
        return section;
    }

    function renderLibrary(ctx) {
        const { el } = window.KotobaUI, C = window.KotobaContent;
        const sources = C.datasetSources || [], inventory = C.datasetInventory || [];
        const sourceLink = (label, url) => el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, label + ' ↗', el('span', { className: 'visually-hidden' }, ' (opens in a new tab)'));
        const sourceRecord = source => el('article', { className: 'library-source-record', 'data-source-id': source.id },
            el('h4', {}, sourceLink(source.title, source.sourceUrl)),
            el('p', { className: 'muted' }, source.organization + ' · ' + source.edition),
            el('p', {}, source.verifiedTopic),
            el('p', { className: 'muted' }, source.application),
            source.detailUrls?.length ? el('p', { className: 'library-source-links' }, source.detailUrls.map(link => sourceLink(link.label, link.url))) : null,
            el('details', {}, el('summary', {}, 'What this source verifies'), el('p', {}, 'Inspected: ' + source.inspected.replaceAll('-', ' ') + ' · ' + source.checkedAt), el('ul', {}, source.limits.map(limit => el('li', {}, limit)))));
        return el('section', { className: 'card library-source-guide', id: 'content-source-guide', 'aria-labelledby': 'library-source-title' },
            el('h2', { id: 'library-source-title' }, 'Library and sources'),
            el('p', {}, 'Explore the expanded N5–N1 collection. New material is available in study, flashcards, learning paths and mixed practice.'),
            el('div', { className: 'library-inventory' }, inventory.map(row => el('article', { className: 'library-inventory-level', 'data-library-level': row.level },
                el('h3', {}, row.level.toUpperCase()),
                el('dl', {}, [['Words', row.vocabulary], ['Linked kanji', row.kanji], ['Grammar lessons', row.grammar], ['Readings', row.readings], ['Listening activities', row.listening], ['Practice questions', row.questions]].map(([label, value]) => [el('dt', {}, label), el('dd', {}, String(value))])),
                el('p', { className: 'muted' }, '+' + row.added.vocabulary + ' words, +' + row.added.grammar + ' grammar lessons in this expansion.')))),
            el('p', { className: 'muted' }, 'Kanji counts show distinct characters in each level’s linked words; shared characters can appear at more than one level.'),
            el('details', { className: 'library-source-policy' }, el('summary', {}, 'How the collection uses references'), el('p', {}, C.datasetSourcePolicy || C.referenceScopeNote), el('p', {}, 'English definition questions support vocabulary retrieval. They adapt the test’s language-knowledge skills for study. Listening uses original scripts and available Japanese device voices.'), el('p', {}, 'Source metadata checked: ', el('time', { datetime: C.datasetSourceCheckedAt }, C.datasetSourceCheckedAt))),
            el('details', { className: 'library-source-group' }, el('summary', {}, 'Official JLPT guidance'), sources.filter(source => source.id.startsWith('official-')).map(sourceRecord)),
            inventory.map(row => el('details', { className: 'library-source-group', 'data-source-level': row.level },
                el('summary', {}, row.level.toUpperCase() + ' books and supplementary sources'),
                sources.filter(source => source.levels.includes(row.level) && !source.id.startsWith('official-')).map(sourceRecord))));
    }

    window.KotobaReferences = Object.freeze({ render, renderLibrary });
})();
