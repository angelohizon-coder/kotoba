/* Optional local exports and note cleanup. This module never calls a remote service. */
(function (global) {
  'use strict';
  const copy = value => typeof global.structuredClone === 'function' ? global.structuredClone(value) : JSON.parse(JSON.stringify(value));
  const completed = attempt => attempt.status === 'submitted' || attempt.status === 'reviewed';
  const activeMock = progress => progress.attempts.some(attempt => attempt.id === progress.activeAttemptId && attempt.type === 'mock' && attempt.status === 'in-progress');
  function canonical(progress) {
    global.KotobaStorage.validateProgress(copy(progress));
    return progress;
  }
  function accessible(progress) {
    canonical(progress);
    if (activeMock(progress)) throw new Error('Local data tools reopen after your mock test.');
    return progress;
  }
  function inventory(progress) {
    canonical(progress);
    return {
      attempts: progress.attempts.length,
      submittedSessions: progress.attempts.filter(completed).length,
      savedItems: progress.bookmarks.length,
      completionMarks: (progress.completedTasks || []).length,
      studyActions: progress.studyEvents.length,
      mistakeReviews: Object.keys(progress.reviews).length,
      recallSchedules: Object.keys(progress.srs || {}).length,
      labSessions: progress.learnlab?.sessions.length || 0,
      personalDrafts: progress.learnlab?.drafts.length || 0,
      issueNotes: progress.learnlab?.reports.length || 0,
      rewardReceipts: progress.motivation?.ledger.length || 0,
    };
  }
  function createSummary(progress, options = {}) {
    accessible(progress);
    const includeRewards = options.includeRewards ?? false;
    if (typeof includeRewards !== 'boolean') throw new Error('Choose whether to include reward totals.');
    const now = options.now ?? Date.now();
    if (!Number.isSafeInteger(now) || now < 0 || now >= Date.UTC(2200, 0, 1)) throw new Error('Invalid summary time.');
    const questionMap = Object.fromEntries(global.KotobaContent.questions.map(question => [question.id, question]));
    const accuracy = global.KotobaEngine.aggregateAccuracy(progress, questionMap);
    const counts = inventory(progress);
    const studied = type => new Set(progress.studyEvents.filter(event => event.type === type).map(event => event.contentId)).size;
    const result = {
      kind: 'kotoba-study-summary', version: 1, contentVersion: progress.contentVersion,
      studied: { vocabulary: studied('vocabulary'), grammar: studied('grammar'), kanji: studied('kanji') },
      checklistMarks: counts.completionMarks,
      recall: { scheduled: counts.recallSchedules, due: Object.values(progress.srs || {}).filter(record => Date.parse(record.nextReviewAt) <= now).length },
      assessment: {
        submittedSessions: counts.submittedSessions,
        firstAnswers: { correct: accuracy.initial.correct, total: accuracy.initial.total },
        retryAnswers: { correct: accuracy.retry.correct, total: accuracy.retry.total },
      },
      note: 'Aggregate self-study information only. Checklist marks and recall ratings are separate from assessed mastery; accuracy is not an official JLPT score. This summary is not a restorable progress backup.',
    };
    if (includeRewards && progress.motivation) result.optionalRewards = {
      xp: progress.motivation.xp, coins: progress.motivation.coins, earnedBadgeCount: progress.motivation.earnedBadges.length,
    };
    return result;
  }
  function createNotesExport(progress, kind) {
    accessible(progress);
    if (!['drafts', 'reports'].includes(kind)) throw new Error('Choose personal drafts or local issue notes.');
    return { kind: kind === 'drafts' ? 'kotoba-local-drafts' : 'kotoba-local-issues', version: 1,
      contentVersion: progress.contentVersion, [kind]: copy(progress.learnlab?.[kind] || []) };
  }
  function selection(value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['drafts', 'reports'].includes(key))) throw new Error('Invalid local cleanup selection.');
    const drafts = value.drafts ?? false, reports = value.reports ?? false;
    if (typeof drafts !== 'boolean' || typeof reports !== 'boolean') throw new Error('Invalid local cleanup selection.');
    return { drafts, reports };
  }
  function removeNotes(progress, selected = {}) {
    accessible(progress);
    const flags = selection(selected), lab = progress.learnlab;
    if (!lab || !(flags.drafts && lab.drafts.length || flags.reports && lab.reports.length)) return progress;
    const next = { ...progress, learnlab: { ...lab, ...(flags.drafts ? { drafts: [] } : {}), ...(flags.reports ? { reports: [] } : {}) } };
    canonical(next);
    return next;
  }
  function fingerprint(progress, selected) {
    return JSON.stringify({ drafts: selected.drafts ? progress.learnlab?.drafts || [] : null, reports: selected.reports ? progress.learnlab?.reports || [] : null });
  }
  function download(value, name) {
    const blob = new global.Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = global.URL.createObjectURL(blob);
    const anchor = global.document.createElement('a');
    anchor.href = url; anchor.download = name;
    try { global.document.body.append(anchor); anchor.click(); }
    finally { anchor.remove(); global.setTimeout(() => global.URL.revokeObjectURL(url), 1000); }
  }
  function render(ctx) {
    const { el, button, card, paragraph: p } = global.KotobaUI;
    const progress = ctx.progress();
    if (activeMock(progress)) return card(el('h2', {}, 'Your local data'), p('Exports and personal-note cleanup reopen after your mock test.'));
    const view = ctx.view.localData ||= { includeRewards: false, drafts: false, reports: false, confirmation: null };
    const counts = inventory(progress), redraw = () => ctx.rerender();
    const fail = error => ctx.notice(error?.message || 'The local data action could not finish.');
    const exportData = (kind, filename) => {
      try {
        const current = ctx.progress();
        const data = kind === 'summary' ? createSummary(current, { includeRewards: view.includeRewards }) : createNotesExport(current, kind);
        download(data, filename);
        ctx.notice(kind === 'summary' ? 'Aggregate study summary downloaded. Use Export progress for a restorable backup.' : 'Selected personal text downloaded. Check the file before sharing it.');
      } catch (error) { fail(error); }
    };
    const toggle = (id, key, label, disabled = false) => el('label', { className: 'local-data-toggle', for: id },
      el('input', { id, type: 'checkbox', checked: view[key], disabled, onChange: event => { view[key] = event.target.checked; view.confirmation = null; redraw(); } }), el('span', {}, label));
    const root = card(el('h2', { id: 'local-data-title', tabIndex: -1 }, 'Your local data'),
      p('Keep a full progress backup for recovery, or download a smaller summary when you choose to share your progress. These tools make no cloud requests.'),
      el('details', { className: 'local-data-inventory' }, el('summary', {}, 'What is in current progress?'),
        el('dl', {}, [
          ['Saved sessions', counts.attempts], ['Submitted sessions', counts.submittedSessions], ['Saved study items', counts.savedItems],
          ['Completion marks', counts.completionMarks], ['Recorded study actions', counts.studyActions], ['Mistake review records', counts.mistakeReviews],
          ['Recall schedules', counts.recallSchedules], ['Lab sessions', counts.labSessions], ['Personal drafts', counts.personalDrafts],
          ['Local issue notes', counts.issueNotes], ['Optional reward receipts', counts.rewardReceipts],
        ].map(([label, count]) => el('div', {}, el('dt', {}, label), el('dd', {}, String(count))))),
        p('Browser speech transcripts can become a typed Lab answer when you check them. Microphone recordings are not stored. Clearing browser data or moving to another address can remove access to local saves.')),
      el('section', { className: 'local-data-section', 'aria-labelledby': 'local-data-summary-title' }, el('h3', { id: 'local-data-summary-title' }, 'A summary you can review before sharing'),
        p('Only aggregate study counts and first/retry accuracy are included. Individual answers, content IDs, dates, voice preferences, and personal notes are excluded.'),
        toggle('local-data-include-rewards', 'includeRewards', 'Include optional XP, coin, and badge totals', !progress.motivation),
        button('Download study summary', () => exportData('summary', 'kotoba-study-summary.json'), 'button secondary', { id: 'local-data-summary' })),
      el('section', { className: 'local-data-section', 'aria-labelledby': 'local-data-notes-title' }, el('h3', { id: 'local-data-notes-title' }, 'Personal text exports'),
        p('Draft files contain your examples, translations, and source notes. Issue files contain your written comments and content references. Review these files before sharing.'),
        el('div', { className: 'inline-actions' },
          button('Download personal drafts', () => exportData('drafts', 'kotoba-local-drafts.json'), 'button secondary', { id: 'local-data-export-drafts', disabled: !counts.personalDrafts }),
          button('Download local issue notes', () => exportData('reports', 'kotoba-local-issues.json'), 'button secondary', { id: 'local-data-export-reports', disabled: !counts.issueNotes }))),
      el('section', { className: 'local-data-section', 'aria-labelledby': 'local-data-cleanup-title' }, el('h3', { id: 'local-data-cleanup-title' }, 'Remove personal drafts or notes'),
        p('Choose only the personal text to remove. A full progress backup is recommended first. This updates current progress; previously downloaded backups and copies are not erased.'),
        toggle('local-data-select-drafts', 'drafts', `Personal drafts (${counts.personalDrafts})`, !counts.personalDrafts),
        toggle('local-data-select-reports', 'reports', `Local issue notes (${counts.issueNotes})`, !counts.issueNotes),
        button('Review removal', () => {
          try {
            const current = accessible(ctx.progress());
            const selected = selection({ drafts: view.drafts, reports: view.reports });
            view.confirmation = { selected, fingerprint: fingerprint(current, selected) };
            redraw(); global.document.getElementById('local-data-cancel-delete')?.focus({ preventScroll: true });
          } catch (error) { fail(error); }
        }, 'button secondary', { id: 'local-data-review-delete', disabled: !(view.drafts && counts.personalDrafts || view.reports && counts.issueNotes) })));
    root.classList.add('local-data-tools');
    if (view.confirmation) {
      const confirmation = view.confirmation, chosen = confirmation.selected;
      const panel = el('div', { className: 'local-data-confirm', role: 'group', 'aria-labelledby': 'local-data-confirm-title' },
        el('h3', { id: 'local-data-confirm-title' }, 'Remove the selected personal text?'),
        p(`${chosen.drafts ? counts.personalDrafts + ' personal drafts' : ''}${chosen.drafts && chosen.reports ? ' and ' : ''}${chosen.reports ? counts.issueNotes + ' local issue notes' : ''} will be removed from current progress. Learning sessions, answers, review schedules, checklist marks, settings, and reward receipts are kept.`),
        el('div', { className: 'inline-actions' },
          button('Keep my notes', () => { view.confirmation = null; redraw(); global.document.getElementById('local-data-review-delete')?.focus({ preventScroll: true }); }, 'button primary', { id: 'local-data-cancel-delete' }),
          button('Remove selected text', () => {
            try {
              const current = accessible(ctx.progress());
              if (fingerprint(current, chosen) !== confirmation.fingerprint) {
                view.confirmation = null; ctx.notice('Your notes changed. Review the updated selection before removing anything.'); return;
              }
              const next = removeNotes(current, chosen);
              view.confirmation = null; view.drafts = false; view.reports = false;
              if (ctx.view.labTools) {
                if (chosen.drafts) { ctx.view.labTools.json = ''; ctx.view.labTools.preview = null; ctx.view.labTools.draftOpen = false; }
                if (chosen.reports) { ctx.view.labTools.message = ''; ctx.view.labTools.reportOpen = false; }
              }
              // Personal-text removal is not a learning/reward reconciliation event.
              ctx.update(next, { rewardReconciliation: false });
              global.document.getElementById('local-data-title')?.focus({ preventScroll: true });
            } catch (error) { fail(error); }
          }, 'button secondary', { id: 'local-data-confirm-delete' })));
      root.append(panel);
    }
    return root;
  }
  global.KotobaLocalData = { inventory, createSummary, createNotesExport, removeNotes, render };
})(window);
