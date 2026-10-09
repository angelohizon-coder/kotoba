/* Optional private learning rewards. No accounts, requests, money or public rankings. */
(() => {
    'use strict';
    const { el, button, icon } = window.KotobaUI;
    const E = () => window.KotobaMotivationEngine;
    const goalOptions = [['travel', 'Travel'], ['career', 'Career'], ['school', 'School']];
    const cosmeticNames = { mint: 'Mint · free', sakura: 'Sakura', ocean: 'Ocean', sunset: 'Sunset', 'tanuki-star': 'Tanuki star' };
    const labelFor = id => E().MOTIVATION_BADGES.find(item => item.id === id)?.title || (id.startsWith('monthly:') ? id.slice(8) + ' · 300 XP' : id);
    const text = content => el('p', { className: 'motivation-copy' }, content);
    const actions = (...children) => el('div', { className: 'motivation-actions' }, children);
    const field = (label, control) => el('label', { className: 'field motivation-field' }, el('span', {}, label), control);
    function select(id, values, current, handler) {
        const node = el('select', { id, onChange: event => handler(event.target.value) }, values.map(([value, label]) => el('option', { value }, label)));
        node.value = String(current);
        return node;
    }
    function number(id, value, min, max, handler) {
        return el('input', { id, type: 'number', min, max, step: 1, value, inputMode: 'numeric', onInput: event => handler(event.target.value) });
    }
    function shell(state, className, ...children) {
        return el('section', { className: 'card motivation ' + className, 'data-cosmetic': state?.cosmetic || 'mint', 'data-motion': state?.preferences.disableAnimations ? 'off' : 'on' }, children);
    }
    function feedback(ctx, message, before) {
        const state = ctx.progress().motivation;
        const preferences = window.KotobaPreferences?.get(ctx.progress());
        ctx.notice?.(message);
        if (!preferences?.quiet) ctx.cue?.(before && state && state.xp > before.xp ? 'complete' : 'saved');
        if ((state?.preferences.haptics || preferences?.haptics) && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate(20); } catch (_) { /* Browser support is optional. */ }
        }
    }
    function perform(ctx, transform, message) {
        const before = ctx.progress().motivation;
        try { ctx.update(transform); feedback(ctx, typeof message === 'function' ? message(ctx.progress().motivation, before) : message, before); return true; }
        catch (error) { ctx.notice?.(error.message || 'This reward is not available yet.'); return false; }
    }
    function meter(label, value, goal, detail) {
        return el('div', { className: 'motivation-meter' },
            el('div', { className: 'motivation-meter-label' }, el('strong', {}, label), el('span', {}, detail || `${value} / ${goal}`)),
            el('progress', { max: goal, value: Math.min(value, goal), 'aria-label': label + ': ' + value + ' of ' + goal }));
    }
    function metric(name, value, iconName) {
        return el('div', { className: 'motivation-metric' }, icon(iconName), el('div', {}, el('strong', {}, value), el('span', {}, name)));
    }
    function renderHome(ctx) {
        const state = ctx.progress().motivation;
        if (!E()) return document.createDocumentFragment();
        if (!state) return shell(null, 'motivation-starter',
            el('div', { className: 'motivation-heading' }, icon('leaf'), el('div', {}, el('h2', {}, 'A little encouragement'), text('Optional goals and earned rewards, saved privately on this device.'))),
            button('Choose my goals', () => { ctx.view.motivationFocus = true; ctx.navigate('settings'); }, 'button secondary', { id: 'motivation-start' }));
        const summary = E().motivationSummary(ctx.progress());
        const preferences = state.preferences;
        return shell(state, 'motivation-home',
            el('div', { className: 'motivation-heading' }, icon('leaf'), el('div', {}, el('span', { className: 'eyebrow' }, 'YOUR PRIVATE LEARNING GOALS'), el('h2', {}, 'Small steps count')), button('Goals & rewards', () => { ctx.view.motivationFocus = true; ctx.navigate('settings'); }, 'button ghost')),
            el('div', { className: 'motivation-stats' }, metric('Learning XP', summary.xp, 'star'), metric('Day streak', summary.streak, 'flame'), metric('Earned coins', summary.coins, 'shield'), state.preferences.heartsEnabled ? metric('Practice hearts', `${summary.hearts} / 5`, 'leaf') : null),
            el('div', { className: 'motivation-meters' }, meter('Today’s XP', summary.todayXP, preferences.dailyXP), meter('Active study minutes', summary.todayMinutes, preferences.dailyMinutes), meter('Streak goal', summary.streak, preferences.streakGoal, `${summary.streak} / ${preferences.streakGoal} days`)),
            state.profileBadges.length ? el('div', { className: 'motivation-profile-badges', 'aria-label': 'Your selected earned badges' }, state.profileBadges.map(id => el('span', { className: 'motivation-badge' }, icon('star'), labelFor(id)))) : null,
            text(summary.boostUntil ? 'An earned XP boost is active until ' + new Date(summary.boostUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.' : `${summary.freezes} of 2 streak freezes held. Studied items and completed checklists remain separate from demonstrated mastery.`),
            state.preferences.heartsEnabled && summary.hearts === 0 ? text('Your hearts are resting. Practice, study and review stay available; a successful due review refills a heart.') : null,
            actions(button('Practice', () => ctx.navigate('practice'), 'button primary'), button('Review', () => ctx.navigate('review'), 'button secondary')));
    }
    function draftFor(ctx, state) {
        const key = (state?.enabledAt || 'off') + ':' + JSON.stringify(state?.preferences || {}) + ':' + (ctx.progress().settings.studyLevel || 'n3');
        if (!ctx.view.motivationDraft || ctx.view.motivationDraftKey !== key) {
            ctx.view.motivationDraftKey = key;
            ctx.view.motivationDraft = { goal: state?.preferences.goal || 'travel', level: ctx.progress().settings.studyLevel || 'n3', dailyMinutes: String(state?.preferences.dailyMinutes || 10), dailyXP: String(state?.preferences.dailyXP || 50), streakGoal: String(state?.preferences.streakGoal || 7), heartsEnabled: state?.preferences.heartsEnabled || false, disableAnimations: state?.preferences.disableAnimations || false, haptics: state?.preferences.haptics || false };
        }
        return ctx.view.motivationDraft;
    }
    function toggle(id, label, checked, handler, hint) {
        return el('label', { className: 'motivation-toggle' }, el('input', { id, type: 'checkbox', checked, onChange: event => handler(event.target.checked) }), el('span', {}, el('strong', {}, label), hint ? el('small', {}, hint) : null));
    }
    function onboarding(ctx, state) {
        const draft = draftFor(ctx, state);
        const form = el('form', { className: 'motivation-form', onSubmit: event => {
            event.preventDefault();
            const preferences = { goal: draft.goal, dailyMinutes: Number(draft.dailyMinutes), dailyXP: Number(draft.dailyXP), streakGoal: Number(draft.streakGoal), heartsEnabled: draft.heartsEnabled, disableAnimations: draft.disableAnimations, haptics: draft.haptics };
            const level = draft.level;
            const saved = perform(ctx, p => state ? E().setMotivationPreference(p, preferences) : E().enableMotivation(p, preferences), state ? 'Your learning goals were saved.' : 'Your private goals are ready. New learning earns rewards from now on.');
            if (saved && ctx.progress().motivation) {
                if (ctx.changeLevel) ctx.changeLevel(level);
                else ctx.update(p => ({ ...p, settings: { ...p.settings, studyLevel: level } }));
            }
        } },
        el('div', { className: 'motivation-form-grid' },
            field('I’m learning for', select('motivation-goal', goalOptions, draft.goal, value => { draft.goal = value; })),
            field('Learning level', select('motivation-level', [['n5', 'N5 · beginner'], ['n4', 'N4 · elementary'], ['n3', 'N3 · intermediate'], ['n2', 'N2 · advanced'], ['n1', 'N1 · proficient'], ['all', 'All levels']], draft.level, value => { draft.level = value; })),
            field('Daily active minutes', number('motivation-minutes', draft.dailyMinutes, 5, 120, value => { draft.dailyMinutes = value; })),
            field('Daily learning XP', number('motivation-xp-goal', draft.dailyXP, 10, 500, value => { draft.dailyXP = value; })),
            field('My streak goal · days', number('motivation-streak-goal', draft.streakGoal, 1, 365, value => { draft.streakGoal = value; }))),
        el('div', { className: 'motivation-toggles' },
            toggle('motivation-hearts', 'Show practice hearts', draft.heartsEnabled, checked => { draft.heartsEnabled = checked; }, 'Optional pacing. Five hearts; one returns every four hours. Core learning and review always stay available.'),
            toggle('motivation-animations', 'Reduce reward animations', draft.disableAnimations, checked => { draft.disableAnimations = checked; }, 'Your device’s reduced-motion setting is respected too.'),
            toggle('motivation-haptics', 'Use gentle haptic feedback', draft.haptics, checked => { draft.haptics = checked; }, 'Opt in to a short vibration on supported devices. Sound follows the app’s sound setting.')),
        el('button', { type: 'submit', className: 'button primary', id: 'motivation-enable' }, state ? 'Save goals' : 'Enable optional goals'));
        return shell(state, 'motivation-onboarding', el('div', { className: 'motivation-heading' }, icon('leaf'), el('div', {}, el('h2', { id: 'motivation-settings-title', tabIndex: -1 }, state ? 'Your learning goals' : 'Make this your learning space'), text(state ? 'Choose a pace that fits your day.' : 'Start immediately, with no account. Rewards are optional. Your existing learning progress is kept.'))), form,
            text('XP rewards assessed answers, completed Learning Lab lessons, recorded study and due reviews. Lab XP rewards learning engagement, with exact answers counted separately from typos. Completing a checklist alone earns no XP. Goals and coins are local encouragement, not a JLPT score.'));
    }
    function questCard(ctx, state, summary) {
        const claim = (id, label) => perform(ctx, p => E().claimMotivationReward(p, id), (after, before) => label + (after && before && after.coins > before.coins ? ` · ${after.coins - before.coins} coins earned.` : ' saved.'));
        return shell(state, 'motivation-quests', el('h3', {}, 'Today’s three small quests'), text(`${summary.todayXP} XP · ${summary.todayCorrect} exact/correct answers or due ratings · ${summary.todayPerfect} perfect sessions today. Exam practice needs five assessed answers; a perfect short Lab lesson needs three new rewarded concepts and all exact answers.`),
            el('div', { className: 'motivation-quest-grid' }, summary.quests.map(quest => el('div', { className: 'motivation-quest', 'data-complete': quest.claimed },
                el('div', { className: 'motivation-row-title' }, icon('star'), el('strong', {}, quest.title), el('span', { className: 'motivation-price' }, `${quest.coins} coins`)),
                meter('Learning XP', summary.todayXP, quest.xp), meter('Exact answers / due ratings', summary.todayCorrect, quest.correct), quest.perfect ? meter('Perfect session', summary.todayPerfect, quest.perfect) : null,
                button(quest.claimed ? 'Claimed' : 'Claim ' + quest.title, () => claim(quest.id, quest.title + ' quest'), 'button secondary', { id: 'motivation-quest-' + quest.id, disabled: !quest.available })))),
            el('div', { className: 'motivation-reward-row' }, el('div', {}, el('strong', {}, 'A daily study chest'), text('After Bronze progress, open once today for 10, 15 or 20 coins. The saved outcome never rerolls.')), button(summary.chestClaimed ? 'Opened today' : 'Open today’s chest', () => claim('chest', 'Daily chest'), 'button secondary', { id: 'motivation-chest', disabled: !summary.chestAvailable })),
            el('div', { className: 'motivation-reward-row' }, el('div', {}, el('strong', {}, 'This month’s learning quest'), text(`${summary.monthlyXP} / 300 XP · ${summary.monthlyDays} / 5 active days. Earn 100 coins and one 20-minute boost; a 300-XP monthly badge is earned automatically.`)), button(summary.monthlyClaimed ? 'Claimed this month' : 'Claim monthly reward', () => claim('monthly', 'Monthly quest'), 'button secondary', { id: 'motivation-monthly', disabled: !summary.monthlyAvailable })));
    }
    function shop(ctx, state, summary) {
        const buy = reward => perform(ctx, p => E().purchaseReward(p, reward.id), reward.title + ' added to your local rewards.');
        return shell(state, 'motivation-shop', el('div', { className: 'motivation-heading' }, icon('shield'), el('div', {}, el('h3', {}, 'Earned-coin shop'), text(`${summary.coins} coins available. Everything is optional; there are no payments.`))),
            el('div', { className: 'motivation-shop-list' }, E().MOTIVATION_SHOP.map(reward => {
                const owned = summary.cosmetics.includes(reward.id), maxed = reward.id === 'freeze' && summary.freezes >= 2;
                return el('div', { className: 'motivation-reward-row' }, el('div', {}, el('strong', {}, reward.title), text(reward.description)),
                    button(owned ? 'Owned' : maxed ? 'Two held' : `${reward.cost} coins`, () => buy(reward), 'button secondary', { id: 'motivation-buy-' + reward.id, disabled: owned || maxed || summary.coins < reward.cost, 'aria-label': owned ? reward.title + ' is owned' : 'Buy ' + reward.title + ' for ' + reward.cost + ' earned coins' }));
            })),
            el('div', { className: 'motivation-reward-row' }, el('div', {}, el('strong', {}, 'Choose when to use a boost'), text(summary.boostUntil ? 'Active until ' + new Date(summary.boostUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '. New eligible learning receives double XP.' : `${summary.boostCharges} unused earned boosts. Each lasts 20 minutes after you activate it.`)), button(summary.boostUntil ? 'Boost active' : 'Activate a boost', () => perform(ctx, p => E().activateBoost(p), 'Your earned boost is active for 20 minutes.'), 'button primary', { id: 'motivation-activate-boost', disabled: !!summary.boostUntil || !summary.boostCharges })),
            field('Your motivation card color', select('motivation-cosmetic', summary.cosmetics.map(id => [id, cosmeticNames[id] || id]), state.cosmetic, value => perform(ctx, p => E().setMotivationCosmetic(p, value), 'Your card color was saved.'))),
            text('The free Mint color is always available. A streak freeze protects a missed day only after that day ends; it never adds study or mastery.'));
    }
    function profile(ctx, state, summary) {
        const selected = new Set(state.profileBadges);
        return shell(state, 'motivation-profile', el('h3', {}, 'Your private badge shelf'), text('Display up to three earned badges. This profile stays on your device.'),
            state.earnedBadges.length ? el('div', { className: 'motivation-badge-options' }, state.earnedBadges.map(id => toggle('motivation-badge-' + id.replace(/[^a-z0-9-]/g, '-'), labelFor(id), selected.has(id), checked => {
                const next = new Set(ctx.progress().motivation.profileBadges);
                if (checked) next.add(id); else next.delete(id);
                perform(ctx, p => E().setProfileBadges(p, [...next]), 'Your private badge shelf was saved.');
            }))) : text('Your first milestone badge arrives at 50 learning XP. Studied and completed items are not a claim of mastery.'),
            el('div', { className: 'motivation-time-claims' },
                button(state.claimedBadges.includes('early-bird') ? 'Early bird earned' : 'Claim Early bird', () => perform(ctx, p => E().claimMotivationReward(p, 'early-bird'), 'Early bird badge saved.'), 'button secondary', { id: 'motivation-early-bird', disabled: !summary.earlyAvailable }),
                button(state.claimedBadges.includes('night-owl') ? 'Night owl earned' : 'Claim Night owl', () => perform(ctx, p => E().claimMotivationReward(p, 'night-owl'), 'Night owl badge saved.'), 'button secondary', { id: 'motivation-night-owl', disabled: !summary.nightAvailable })),
            text('Time badges are optional claims after a lesson with real learning evidence: 5–9 am for Early bird, or 10 pm–1 am for Night owl, on today’s local calendar. No need to change your usual study time.'));
    }
    function disclosure(ctx, state) {
        return shell(state, 'motivation-disclosure', el('details', {}, el('summary', {}, 'How rewards are recorded'),
            text('Rewards start when you enable them. Assessed questions reward once per question per local day; opening a page, revealing an answer, or repeatedly checking a box does not earn XP. Script-assisted listening earns no assessment XP.'),
            text('A perfect session of five or more correct assessed answers earns a 20% XP bonus. Completed Lab lessons reward each canonical word or bonus concept once per local day: exact answers earn 5 XP, typos 2 XP, and misses 1 XP. A short Lab lesson with at least three newly rewarded concepts and every response exact earns a 20% bonus. These learning rewards never change exam scores or mastery.'),
            text('Recorded path lesson completion requires linked study or submitted answers and rewards once. Due spaced reviews refill a heart when successful. Active minutes measure visible study interaction rather than time with an idle tab open.'),
            text('Coins, XP, purchases and quest claims have saved receipts. They travel in your normal progress backup. These are private, local goals; no live leagues, public friends, emails or accounts are simulated.'),
            state.ledger.length ? el('ol', { className: 'motivation-ledger', 'aria-label': 'Ten most recent saved reward receipts' }, state.ledger.slice(-10).reverse().map(entry => el('li', {}, el('span', {}, new Date(entry.at).toLocaleDateString(), ' · ', entry.kind === 'lab' ? 'Learning Lab' : entry.kind), el('strong', {}, `${entry.xp} XP · ${entry.coins} coins`)))) : text('No rewards recorded yet.')),
            ctx.view.motivationDisableRequested ? el('div', { className: 'motivation-disable-confirm', role: 'group', 'aria-label': 'Confirm turning off optional goals' }, text('Turning goals off clears their XP, coins and rewards. Your learning attempts, study events, saved items, checklist and review schedule stay saved.'), actions(button('Turn off goals', () => { ctx.view.motivationDisableRequested = false; ctx.view.motivationDraft = null; perform(ctx, p => E().disableMotivation(p), 'Optional goals are off. Your learning progress is kept.'); }, 'button secondary', { id: 'motivation-disable-confirm' }), button('Keep my goals', () => { ctx.view.motivationDisableRequested = false; ctx.rerender?.(); }, 'button ghost'))) : button('Turn off optional goals', () => { ctx.view.motivationDisableRequested = true; ctx.rerender?.(); }, 'button ghost', { id: 'motivation-disable' }));
    }
    function renderSettings(ctx) {
        if (!E()) return document.createDocumentFragment();
        const state = ctx.progress().motivation;
        const section = el('div', { className: 'motivation-settings', id: 'motivation-settings' }, onboarding(ctx, state));
        if (state) {
            const summary = E().motivationSummary(ctx.progress());
            section.append(renderHome(ctx), questCard(ctx, state, summary), shop(ctx, state, summary), profile(ctx, state, summary), disclosure(ctx, state));
        }
        if (ctx.view.motivationFocus) {
            ctx.view.motivationFocus = false;
            requestAnimationFrame(() => { if (section.isConnected) { const heading = section.querySelector('#motivation-settings-title'); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ behavior: 'instant', block: 'start' }); } });
        }
        return section;
    }
    window.KotobaMotivation = { renderHome, renderSettings };
})();
