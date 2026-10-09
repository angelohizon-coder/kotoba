/* Visual recall reminders use existing assessed evidence; they never reset learning records. */
(function (global) {
    'use strict';
    const DAY_MS = 86_400_000, ATTENTION_DAYS = 30, RAPID_WORD_LIMIT = 10;
    const content = () => global.KotobaContent;
    const lessons = () => content().learningPath.flatMap(plan => plan.units.flatMap(unit => unit.lessons));
    const canonicalLesson = lesson => lessons().find(item => item.id === (typeof lesson === 'string' ? lesson : lesson?.id));
    const clock = ctx => typeof ctx.now === 'function' ? ctx.now() : Date.now();
    const mockRunning = progress => progress.attempts.some(attempt => attempt.id === progress.activeAttemptId && attempt.type === 'mock' && attempt.status === 'in-progress');
    const timeOf = value => {
        const time = typeof value === 'string' ? Date.parse(value) : NaN;
        return Number.isFinite(time) && time >= 0 ? time : null;
    };
    const controlId = value => encodeURIComponent(value).replace(/%/g, '_');

    function status(progress, candidate, now = Date.now()) {
        const lesson = canonicalLesson(candidate), byId = new Map(content().questions.map(q => [q.id, q]));
        const ids = lesson ? [...new Set(lesson.questionIds)] : [];
        const masteredCount = ids.filter(id => byId.has(id) && progress.reviews[id]?.mastered === true).length;
        const mastered = ids.length > 0 && masteredCount === ids.length;
        let latest = null;
        for (const id of ids) {
            const review = progress.reviews[id];
            // Existing mastered review records are valid evidence even if old attempts were archived.
            if (byId.has(id) && review?.mastered === true) {
                const at = timeOf(review.lastReviewedAt), lastMiss = timeOf(review.lastMissedAt);
                if (at !== null && (lastMiss === null || at >= lastMiss)) latest = Math.max(latest ?? 0, at);
            }
        }
        for (const attempt of progress.attempts) {
            const at = timeOf(attempt.submittedAt);
            if (!['submitted', 'reviewed'].includes(attempt.status) || at === null || at > now) continue;
            const successful = attempt.questionOrder.some(id => {
                const q = byId.get(id);
                return q && ids.includes(id) && !attempt.excludedIds.includes(id) && (q.skill !== 'listening' || attempt.listeningAccess === 'audio') && attempt.answers[id] === q.correctOptionId;
            });
            if (successful) latest = Math.max(latest ?? 0, at);
        }
        const ageDays = latest === null || !Number.isFinite(now) ? null : Math.floor(Math.max(0, now - latest) / DAY_MS);
        return { lessonId: lesson?.id || null, mastered, masteredCount, questionCount: ids.length, lastSuccessfulAt: latest === null ? null : new Date(latest).toISOString(), ageDays, needsReview: mastered && ageDays !== null && ageDays >= ATTENTION_DAYS, evidenceGap: mastered && latest === null, clockBackwards: latest !== null && now < latest };
    }

    function selectRapidReview(progress, candidate, now = Date.now()) {
        const lesson = canonicalLesson(candidate), knownWords = new Set(content().vocabulary.map(word => word.id));
        const words = new Set((lesson?.vocabularyIds || []).filter(id => knownWords.has(id)));
        const pool = content().questions.filter(q => q.skill === 'vocabulary' && words.has(q.vocabularyId));
        // Rank the actual pool first, then take at most one question for each canonical word.
        const ranked = global.KotobaEngine.selectPracticeQuestions(progress, pool, { count: pool.length, now: Math.max(0, Number.isFinite(now) ? now : 0), random: () => .5 });
        const seen = new Set(), selected = [];
        for (const question of ranked) {
            if (seen.has(question.vocabularyId)) continue;
            seen.add(question.vocabularyId);
            if (selected.length < RAPID_WORD_LIMIT) selected.push(question);
        }
        return { questions: selected, wordIds: selected.map(q => q.vocabularyId), availableWords: seen.size, availableQuestions: pool.length, limit: RAPID_WORD_LIMIT, partial: seen.size < RAPID_WORD_LIMIT };
    }

    function enhance(ctx, stage, plan, selected) {
        if (!stage || !plan || !selected) return stage;
        const { el, button, icon } = global.KotobaUI, progress = ctx.progress(), now = clock(ctx);
        const planIds = new Set(plan.units.flatMap(unit => unit.lessons.map(lesson => lesson.id)));
        stage.querySelectorAll('.path-recall-node-status, .path-recall-description, .path-recall-panel').forEach(node => node.remove());
        for (const node of stage.querySelectorAll('[data-lesson-id]')) {
            node.classList.remove('path-recall-gold', 'path-recall-attention');
            const descriptions = (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && !id.startsWith('path-recall-note-'));
            if (descriptions.length) node.setAttribute('aria-describedby', descriptions.join(' ')); else node.removeAttribute('aria-describedby');
            if (!planIds.has(node.dataset.lessonId)) continue;
            const evidence = status(progress, node.dataset.lessonId, now);
            node.dataset.recallState = evidence.needsReview ? 'review-attention' : evidence.mastered ? 'mastered' : 'learning';
            if (!evidence.mastered) continue;
            node.classList.add('path-recall-gold');
            if (evidence.needsReview) node.classList.add('path-recall-attention');
            const noteId = 'path-recall-note-' + controlId(node.dataset.lessonId);
            const label = evidence.needsReview ? 'Review attention' : 'Mastered';
            const description = evidence.needsReview ? `Your mastery is saved. It has been ${evidence.ageDays} days since your last successful review of this lesson.` : evidence.evidenceGap ? "You've mastered all practice questions in this lesson. The last successful review date isn't available." : "You've mastered all practice questions in this lesson. Your latest successful review is recent.";
            node.append(el('span', { className: 'path-recall-node-status' }, icon(evidence.needsReview ? 'review' : 'star'), label), el('span', { className: 'visually-hidden path-recall-description', id: noteId }, description));
            node.setAttribute('aria-describedby', [...descriptions, noteId].join(' '));
        }
        const evidence = status(progress, selected, now);
        if (!planIds.has(evidence.lessonId) || !evidence.needsReview) return stage;
        const selection = selectRapidReview(progress, selected, now), count = selection.questions.length;
        const copy = count === 0 ? 'Word review is not available for this lesson yet. Try mixed practice or mistake review instead.' : `Refresh the ${count} words available for this lesson, starting with the ones you've found hardest.`;
        let live = true, starting = false;
        ctx.cleanup?.(() => { live = false; });
        const action = button(count ? `Start ${count}-word rapid review` : 'No word questions available', () => {
            if (!live || starting) return;
            const learner = ctx.progress();
            if (mockRunning(learner)) { ctx.notice?.('Finish your active mock before starting a rapid word review.'); return; }
            if (!status(learner, selected, clock(ctx)).needsReview) return;
            const current = selectRapidReview(learner, selected, clock(ctx));
            if (!current.questions.length) return;
            starting = true;
            try { ctx.start(current.questions, 'practice', { count: current.questions.length }); }
            catch (error) { starting = false; ctx.notice?.(error.message || 'This review could not start.'); }
        }, 'button secondary', { id: 'path-rapid-review', disabled: !count || mockRunning(progress), 'data-review-lesson': evidence.lessonId });
        const panel = el('section', { className: 'path-recall-panel', 'aria-labelledby': 'path-recall-title', 'data-review-lesson': evidence.lessonId },
            el('h4', { id: 'path-recall-title' }, icon('review'), 'Time for a quick review'),
            el('p', {}, `It's been ${evidence.ageDays} days since your last successful review of this lesson. Your mastery is still saved.`),
            el('p', {}, copy), action,
            mockRunning(progress) ? el('p', { className: 'muted' }, 'Finish the active mock before starting review.') : null,
            el('p', { className: 'muted' }, 'Answer a review question correctly to refresh this reminder.'));
        const anchor = stage.querySelector('.path-evidence');
        if (anchor) anchor.after(panel); else (stage.querySelector('.daily-lesson') || stage).append(panel);
        return stage;
    }
    global.KotobaPathRecall = { ATTENTION_DAYS, RAPID_WORD_LIMIT, status, selectRapidReview, enhance };
})(window);
