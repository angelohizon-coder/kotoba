// Exercises the actual typed mock state machine and backup validation. Node 24+, no dependencies.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/i.test(specifier)) {
    for (const suffix of ['.ts', '/index.ts']) {
      const candidate = new URL(specifier + suffix, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
    }
  }
  return next(specifier, context);
} });

const C = await import('../src/content/index.ts');
const E = await import('../src/lib/engine.ts');
const S = await import('../src/lib/storage.ts');
const questionMap = Object.fromEntries(C.questions.map(question => [question.id, question]));
const now = Date.now() + 60_000;
const attach = attempt => ({ ...E.initialProgress(), attempts: [attempt], activeAttemptId: attempt.id });
const active = progress => progress.attempts[0];
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }

const levels = [['n5', [20, 40, 30]], ['n4', [25, 55, 35]], ['n3', [30, 70, 40]], ['n2', [105, 50]], ['n1', [110, 55]]];
for (const [level, expectedMinutes] of process.argv.includes('--n3-only') ? levels.filter(([level]) => level === 'n3') : levels) {
  check(`${level.toUpperCase()} assembles every full original section with official current durations`, () => {
    const attempt = E.createFullMockAttempt(level, C.questions, { now, random: () => 0 });
    const config = E.FULL_MOCK_CONFIG[level];
    assert.deepEqual(attempt.mock.sections.map(section => section.durationMinutes), expectedMinutes);
    assert.deepEqual(attempt.mock.sections.map(section => section.questionIds.length), [...config.counts]);
    assert.equal(attempt.questionOrder.length, config.counts.reduce((total, count) => total + count, 0));
    assert.equal(new Set(attempt.questionOrder).size, attempt.questionOrder.length);
    assert.ok(attempt.questionOrder.every(id => (questionMap[id].jlptLevel ?? 'n3') === level));
    assert.deepEqual(attempt.mock.sections.map(section => section.status), expectedMinutes.map((_, index) => index === 0 ? 'in-progress' : 'pending'));
    assert.equal(attempt.deadline, now + expectedMinutes[0] * 60_000);
    assert.deepEqual(S.validateProgress(attach(attempt)), attach(attempt));
  });
  check(`${level.toUpperCase()} uses its correct text/listening boundaries and content balance`, () => {
    const attempt = E.createFullMockAttempt(level, C.questions, { now, random: () => 0.5 });
    const config = E.FULL_MOCK_CONFIG[level];
    const listening = attempt.mock.sections.at(-1);
    const grammarReading = attempt.mock.sections.find(section => ['grammar-reading', 'language-reading'].includes(section.id));
    if ('vocabularyCount' in config) {
      assert.equal(attempt.mock.sections.length, 2);
      assert.equal(grammarReading.id, 'language-reading');
      assert.equal(grammarReading.questionIds.filter(id => ['vocabulary', 'kanji'].includes(questionMap[id].skill)).length, config.vocabularyCount);
    } else {
      const vocabulary = attempt.mock.sections[0];
      assert.ok(vocabulary.questionIds.every(id => ['vocabulary', 'kanji'].includes(questionMap[id].skill)));
    }
    assert.ok(grammarReading.questionIds.some(id => questionMap[id].skill === 'grammar'));
    assert.equal(grammarReading.questionIds.filter(id => questionMap[id].skill === 'reading').length, config.readingCount);
    assert.ok(listening.questionIds.every(id => questionMap[id].skill === 'listening'));
    assert.deepEqual(attempt.questionOrder, attempt.mock.sections.flatMap(section => section.questionIds));
  });
}

if (!process.argv.includes('--n3-only')) for (const level of ['n2', 'n1']) {
  check(`${level.toUpperCase()} freezes its combined section, survives a break reload, and finishes after listening`, () => {
    const config = E.FULL_MOCK_CONFIG[level];
    let progress = attach(E.createFullMockAttempt(level, C.questions, { now, random: () => 0 }));
    const id = active(progress).id;
    const textId = E.mockSection(active(progress)).questionIds[0];
    progress = E.selectAnswer(progress, id, textId, questionMap[textId].correctOptionId);
    const order = structuredClone(active(progress).questionOrder);
    const options = structuredClone(active(progress).optionOrders);
    progress = E.finishMockSection(progress, id, questionMap, now + 1000);
    assert.equal(active(progress).status, 'in-progress');
    assert.equal(active(progress).deadline, null); assert.deepEqual(progress.reviews, {});
    progress = S.validateProgress(JSON.parse(JSON.stringify(progress)));
    assert.equal(E.mockSection(active(progress)).status, 'submitted');
    assert.equal(E.selectAnswer(progress, id, textId, questionMap[textId].options[0].id), progress);
    progress = E.startNextMockSection(progress, id, now + 5000);
    assert.equal(active(progress).mock.currentSection, 1);
    assert.equal(E.mockSection(active(progress)).id, 'listening');
    assert.equal(active(progress).deadline, now + 5000 + config.minutes[1] * 60_000);
    assert.deepEqual(active(progress).questionOrder, order); assert.deepEqual(active(progress).optionOrders, options);
    const listenId = E.mockSection(active(progress)).questionIds[0];
    progress = E.excludeQuestion(progress, id, listenId);
    progress = E.finishMockSection(progress, id, questionMap, now + 6000);
    assert.equal(active(progress).status, 'submitted');
    const grade = E.gradeAttempt(active(progress), questionMap);
    assert.equal(grade.correct, 1); assert.equal(grade.total, config.counts[0] + config.counts[1] - 1);
    assert.equal(grade.excluded, 1); assert.equal(progress.reviews[listenId], undefined);
    assert.equal(E.startNextMockSection(progress, id, now + 7000), progress);
    assert.deepEqual(S.validateProgress(progress), progress);
  });
  check(`${level.toUpperCase()} expiry submits only its current section and final submission remains idempotent`, () => {
    let progress = attach(E.createFullMockAttempt(level, C.questions, { now, random: () => 0 }));
    const id = active(progress).id;
    progress = E.expireAttempt(progress, id, questionMap, active(progress).deadline + 5000);
    assert.equal(active(progress).status, 'in-progress'); assert.deepEqual(progress.reviews, {});
    assert.equal(active(progress).mock.sections[1].status, 'pending');
    const started = Date.parse(E.mockSection(active(progress)).submittedAt) + 6000;
    progress = E.startNextMockSection(progress, id, started);
    const deadline = active(progress).deadline;
    progress = E.expireAttempt(progress, id, questionMap, deadline + 8000);
    assert.equal(active(progress).status, 'submitted');
    assert.equal(active(progress).submittedAt, new Date(deadline).toISOString());
    assert.equal(E.expireAttempt(progress, id, questionMap, deadline + 9000), progress);
    assert.deepEqual(S.validateProgress(progress), progress);
  });
  check(`${level.toUpperCase()} rejects forged extra sections, mixed level questions, and incorrect combined balance`, () => {
    const fixture = () => attach(E.createFullMockAttempt(level, C.questions, { now, random: () => 0 }));
    const extra = fixture(); active(extra).mock.sections.push(structuredClone(active(extra).mock.sections[1]));
    assert.throws(() => S.validateProgress(extra), /must contain all 2 sections/);
    const sectionIndex = fixture(); active(sectionIndex).mock.currentSection = 2;
    assert.throws(() => S.validateProgress(sectionIndex), /current mock section/);
    const balance = fixture(); const section = active(balance).mock.sections[0];
    const textId = section.questionIds.find(id => questionMap[id].skill === 'vocabulary' || questionMap[id].skill === 'kanji');
    const grammar = C.questions.find(q => q.jlptLevel === level && q.skill === 'grammar' && !active(balance).questionOrder.includes(q.id));
    const index = active(balance).questionOrder.indexOf(textId);
    active(balance).questionOrder[index] = grammar.id;
    section.questionIds[section.questionIds.indexOf(textId)] = grammar.id;
    delete active(balance).optionOrders[textId]; active(balance).optionOrders[grammar.id] = grammar.options.map(option => option.id);
    assert.throws(() => S.validateProgress(balance), /vocabulary balance/);
    const mixed = fixture(); active(mixed).mock.level = level === 'n2' ? 'n1' : 'n2';
    assert.throws(() => S.validateProgress(mixed), /section identity or duration/);
  });
}

const fresh = () => attach(E.createFullMockAttempt('n3', C.questions, { now, random: () => 0 }));
check('insufficient banks are rejected instead of silently presenting a tiny full test', () => {
  assert.throws(() => E.createFullMockAttempt('n3', C.questions.filter(question => question.skill !== 'listening'), { now }), /original listening questions/);
  assert.throws(() => E.createFullMockAttempt('n5', []), /original vocabulary\/kanji questions/);
  for (const level of ['n0', 'constructor', '__proto__']) assert.throws(() => E.createFullMockAttempt(level), /Choose a level from N5 to N1/);
});
check('selection and shuffling never mutate the original course bank', () => {
  const before = JSON.stringify(C.questions);
  E.createFullMockAttempt('n3', C.questions, { now, random: () => 0.2 });
  assert.equal(JSON.stringify(C.questions), before);
});
check('answers are accepted only in the currently running section', () => {
  const progress = fresh(); const attempt = active(progress);
  const currentId = E.mockSection(attempt).questionIds[0];
  const futureId = attempt.mock.sections[1].questionIds[0];
  const answered = E.selectAnswer(progress, attempt.id, currentId, questionMap[currentId].correctOptionId);
  assert.equal(active(answered).answers[currentId], questionMap[currentId].correctOptionId);
  assert.equal(E.selectAnswer(answered, attempt.id, futureId, questionMap[futureId].correctOptionId), answered);
  assert.equal(E.checkAnswer(answered, attempt.id, currentId), answered);
  assert.deepEqual(active(answered).checkedIds, []);
});
check('section submission freezes answers without revealing a grade or recording review mistakes', () => {
  let progress = fresh(); const id = active(progress).id;
  const questionId = E.mockSection(active(progress)).questionIds[0];
  progress = E.selectAnswer(progress, id, questionId, questionMap[questionId].correctOptionId);
  const finished = E.finishMockSection(progress, id, questionMap, now + 1000);
  assert.equal(active(finished).status, 'in-progress');
  assert.equal(active(finished).deadline, null);
  assert.equal(E.mockSection(active(finished)).status, 'submitted');
  assert.equal(active(finished).submittedAt, undefined);
  assert.deepEqual(finished.reviews, {});
  assert.equal(E.aggregateAccuracy(finished, questionMap).initial.total, 0);
  assert.equal(E.selectAnswer(finished, id, questionId, questionMap[questionId].options[0].id), finished);
  assert.equal(E.finishMockSection(finished, id, questionMap, now + 2000), finished);
  assert.deepEqual(S.validateProgress(finished), finished);
});
check('breaks survive reload without starting another timer or leaking results', () => {
  const progress = fresh(); const id = active(progress).id;
  const finished = E.finishMockSection(progress, id, questionMap, now + 1000);
  const restored = S.validateProgress(JSON.parse(JSON.stringify(finished)));
  assert.deepEqual(restored, finished);
  assert.equal(E.remainingSeconds(active(restored), now + 86400000), null);
  assert.equal(E.expireAttempt(restored, id, questionMap, now + 86400000), restored);
  assert.equal(E.submitAttempt(restored, id, questionMap, now + 86400000), restored);
});
check('explicit Continue starts the next section once and never changes question/option orders', () => {
  const progress = fresh(); const id = active(progress).id;
  assert.equal(E.startNextMockSection(progress, id, now), progress);
  const finished = E.finishMockSection(progress, id, questionMap, now + 1000);
  const continued = E.startNextMockSection(finished, id, now + 5000);
  assert.equal(active(continued).mock.currentSection, 1);
  assert.equal(active(continued).deadline, now + 5000 + 70 * 60_000);
  assert.equal(E.startNextMockSection(continued, id, now + 8000), continued);
  assert.deepEqual(active(continued).questionOrder, active(progress).questionOrder);
  assert.deepEqual(active(continued).optionOrders, active(progress).optionOrders);
  const previousId = active(continued).mock.sections[0].questionIds[0];
  assert.equal(E.selectAnswer(continued, id, previousId, questionMap[previousId].correctOptionId), continued);
  assert.deepEqual(S.validateProgress(continued), continued);
});
check('active section clocks and canonical answers survive JSON backup import', () => {
  let progress = fresh(); const id = active(progress).id;
  progress = E.finishMockSection(progress, id, questionMap, now + 1000);
  progress = E.startNextMockSection(progress, id, now + 5000);
  const questionId = E.mockSection(active(progress)).questionIds[0];
  progress = E.selectAnswer(progress, id, questionId, questionMap[questionId].correctOptionId);
  const restored = S.validateProgress(JSON.parse(JSON.stringify(progress)));
  assert.deepEqual(restored, progress);
  assert.equal(E.remainingSeconds(active(restored), now + 65000), 4140);
});
check('expiry locks just the current section and is idempotent on repeated ticks or reload', () => {
  const progress = fresh(); const id = active(progress).id; const deadline = active(progress).deadline;
  assert.equal(E.expireAttempt(progress, id, questionMap, deadline - 1), progress);
  const expired = E.expireAttempt(progress, id, questionMap, deadline + 600000);
  assert.equal(active(expired).status, 'in-progress');
  assert.equal(E.mockSection(active(expired)).submittedAt, new Date(deadline).toISOString());
  assert.equal(active(expired).deadline, null);
  assert.deepEqual(expired.reviews, {});
  assert.equal(E.expireAttempt(expired, id, questionMap, deadline + 900000), expired);
  assert.deepEqual(S.validateProgress(expired), expired);
});
check('an actually expired full mock blocks selection and technical exclusion before its next tick', () => {
  const expiredStart = Date.now() - 31 * 60_000;
  const progress = attach(E.createFullMockAttempt('n3', C.questions, { now: expiredStart, random: () => 0 }));
  const id = active(progress).id; const questionId = E.mockSection(active(progress)).questionIds[0];
  assert.equal(E.selectAnswer(progress, id, questionId, questionMap[questionId].correctOptionId), progress);
  assert.equal(E.excludeQuestion(progress, id, questionId), progress);
});
check('the final listening deadline submits all sections and records unanswered questions only once', () => {
  let progress = fresh(); const id = active(progress).id;
  for (let section = 0; section < 2; section++) {
    const deadline = active(progress).deadline;
    progress = E.expireAttempt(progress, id, questionMap, deadline);
    progress = E.startNextMockSection(progress, id, deadline + 1000);
  }
  const deadline = active(progress).deadline;
  const completed = E.expireAttempt(progress, id, questionMap, deadline + 1000);
  assert.equal(active(completed).status, 'submitted');
  assert.ok(active(completed).mock.sections.every(section => section.status === 'submitted'));
  assert.equal(active(completed).submittedAt, new Date(deadline).toISOString());
  assert.equal(E.gradeAttempt(active(completed), questionMap).unanswered, 102);
  assert.equal(Object.keys(completed.reviews).length, 102);
  assert.equal(E.submitAttempt(completed, id, questionMap, deadline + 2000), completed);
  assert.equal(E.expireAttempt(completed, id, questionMap, deadline + 2000), completed);
  assert.deepEqual(S.validateProgress(completed), completed);
});
check('prior transcript exposure excludes only those listening questions and keeps text/other audio scored', () => {
  let progress = fresh(); const id = active(progress).id;
  const listeningIds = active(progress).mock.sections[2].questionIds;
  active(progress).excludedIds = listeningIds.slice(0, 2);
  assert.deepEqual(S.validateProgress(progress), progress);
  for (let section = 0; section < 3; section++) {
    progress = E.finishMockSection(progress, id, questionMap, now + section * 1000);
    if (section < 2) progress = E.startNextMockSection(progress, id, now + section * 1000);
  }
  const grade = E.gradeAttempt(active(progress), questionMap);
  assert.equal(grade.excluded, 2); assert.equal(grade.total, 100);
  assert.equal(grade.skills.listening.total, 26);
  assert.ok(listeningIds.slice(0, 2).every(questionId => !progress.reviews[questionId]));
});
check('script-only listening never becomes an assessed listening result', () => {
  const attempt = E.createFullMockAttempt('n3', C.questions, { now, listeningAccess: 'script' });
  const grade = E.gradeAttempt(attempt, questionMap);
  assert.equal(grade.excluded, 28); assert.equal(grade.total, 74);
  assert.equal(grade.skills.listening, undefined);
});
check('technical exclusions cannot discard full-mock text questions or frozen listening sections', () => {
  let progress = fresh(); const id = active(progress).id;
  const textId = E.mockSection(active(progress)).questionIds[0];
  assert.equal(E.excludeQuestion(progress, id, textId), progress);
  for (let section = 0; section < 2; section++) {
    progress = E.finishMockSection(progress, id, questionMap, now + section * 1000);
    progress = E.startNextMockSection(progress, id, now + section * 1000);
  }
  const listeningId = E.mockSection(active(progress)).questionIds[0];
  const excluded = E.excludeQuestion(progress, id, listeningId);
  assert.deepEqual(active(excluded).excludedIds, [listeningId]);
  assert.equal(E.excludeQuestion(excluded, id, listeningId), excluded);
  const finished = E.finishMockSection(excluded, id, questionMap, now + 5000);
  assert.equal(E.excludeQuestion(finished, id, E.mockSection(active(finished)).questionIds[1]), finished);
  assert.deepEqual(S.validateProgress(finished), finished);
});
check('all-correct manual submissions grade canonical choices only after all three parts', () => {
  let progress = fresh(); const id = active(progress).id;
  for (let section = 0; section < 3; section++) {
    for (const questionId of E.mockSection(active(progress)).questionIds) progress = E.selectAnswer(progress, id, questionId, questionMap[questionId].correctOptionId);
    progress = E.submitAttempt(progress, id, questionMap, now + section * 1000);
    if (section < 2) {
      assert.deepEqual(progress.reviews, {});
      assert.equal(active(progress).status, 'in-progress');
      progress = E.startNextMockSection(progress, id, now + section * 1000);
    }
  }
  assert.equal(E.gradeAttempt(active(progress), questionMap).correct, 102);
  assert.deepEqual(progress.reviews, {});
  const reviewed = E.markReviewed(progress, id);
  assert.equal(reviewed.activeAttemptId, null);
  assert.deepEqual(S.validateProgress(reviewed), reviewed);
});

check('malformed mock identities, counts, levels, section order, and clocks are rejected', () => {
  const corruptions = [
    p => { active(p).mock.level = 'n2'; },
    p => { active(p).mock.sections.pop(); },
    p => { active(p).mock.sections[0].title = 'Fake past exam'; },
    p => { active(p).mock.sections[0].durationMinutes = 1; },
    p => { active(p).mock.sections[0].questionIds.pop(); },
    p => { active(p).mock.currentSection = 1; },
    p => { active(p).mock.sections[1].status = 'in-progress'; },
    p => { active(p).mock.sections[0].deadline += 1000; },
    p => { active(p).deadline += 1000; },
    p => { active(p).mock.sections[0].questionIds[0] = active(p).mock.sections[1].questionIds[0]; },
    p => { active(p).questionOrder.reverse(); },
    p => { active(p).excludedIds.push(active(p).mock.sections[0].questionIds[0]); },
    p => { const questionId = active(p).mock.sections[1].questionIds[0]; active(p).answers[questionId] = questionMap[questionId].correctOptionId; },
  ];
  for (const corrupt of corruptions) { const progress = fresh(); corrupt(progress); assert.throws(() => S.validateProgress(progress), /Invalid progress/); }
});
check('a forged partial submission cannot release a full mock or bypass its section clocks', () => {
  const progress = fresh(); const id = active(progress).id;
  const forged = structuredClone(progress); active(forged).status = 'submitted'; active(forged).submittedAt = new Date(now).toISOString();
  assert.throws(() => S.validateProgress(forged), /full mock attempt status/);
  const finished = E.finishMockSection(progress, id, questionMap, now + 1000);
  const bad = structuredClone(finished); active(bad).mock.sections[0].submittedAt = new Date(now + 31 * 60_000).toISOString();
  assert.throws(() => S.validateProgress(bad), /section submission date/);
  assert.throws(() => E.startNextMockSection(finished, id, now), /start time/);
});
check('old mini mocks remain resumable and use their original one-clock rules', () => {
  const questions = C.questions.filter(question => question.skill !== 'listening').slice(0, 12);
  const attempt = E.createAttempt(questions, 'mock', { now, durationMinutes: 15 });
  const old = attach(attempt); old.contentVersion = '2026.10.2'; delete old.settings.soundEffects;
  const migrated = S.validateProgress(old);
  assert.equal(active(migrated).mock, undefined);
  assert.equal(active(migrated).deadline, now + 15 * 60_000);
  const submitted = E.expireAttempt(migrated, attempt.id, questionMap, attempt.deadline);
  assert.equal(active(submitted).status, 'submitted');
  assert.equal(E.gradeAttempt(active(submitted), questionMap).total, 12);
});
check('sound effects default safely on old saves and accept only explicit booleans', () => {
  const progress = E.initialProgress();
  assert.equal(progress.settings.soundEffects, true);
  const old = structuredClone(progress); delete old.settings.soundEffects;
  assert.equal(S.validateProgress(old).settings.soundEffects, true);
  for (const value of [true, false]) {
    const chosen = { ...progress, settings: { ...progress.settings, soundEffects: value } };
    assert.deepEqual(S.validateProgress(chosen), chosen);
  }
  for (const value of ['false', null, 0, {}, []]) {
    const bad = { ...progress, settings: { ...progress.settings, soundEffects: value } };
    assert.throws(() => S.validateProgress(bad), /sound effects setting/);
  }
});

check('global study level defaults to N3, supports all five levels, and rejects malformed choices', () => {
  const fresh = E.initialProgress();
  assert.equal(fresh.settings.studyLevel, 'n3');
  const old = structuredClone(fresh); delete old.settings.studyLevel;
  assert.equal(S.validateProgress(old).settings.studyLevel, 'n3');
  for (const studyLevel of ['n5', 'n4', 'n3', 'n2', 'n1', 'all']) {
    const chosen = { ...fresh, settings: { ...fresh.settings, studyLevel } };
    assert.deepEqual(S.validateProgress(chosen), chosen);
  }
  for (const studyLevel of ['N3', 'n0', 'n6', false, null, {}, []]) {
    const bad = { ...fresh, settings: { ...fresh.settings, studyLevel } };
    assert.throws(() => S.validateProgress(bad), /study level setting/);
  }
});
check('path resume accepts only canonical lesson IDs and is independent of assessed progress', () => {
  const lessonIds = C.learningPath.flatMap(path => path.units.flatMap(unit => unit.lessons.map(lesson => lesson.id)));
  assert.ok(lessonIds.length > 0);
  const fresh = E.initialProgress(); assert.equal(fresh.settings.pathResume, null);
  const old = structuredClone(fresh); delete old.settings.pathResume;
  assert.equal(S.validateProgress(old).settings.pathResume, null);
  for (const pathResume of lessonIds) {
    const chosen = { ...fresh, settings: { ...fresh.settings, pathResume } };
    assert.deepEqual(S.validateProgress(chosen), chosen);
    assert.deepEqual(chosen.attempts, []); assert.deepEqual(chosen.reviews, {});
  }
  for (const pathResume of ['', 'unknown-path-lesson', false, 1, {}, []]) {
    const bad = { ...fresh, settings: { ...fresh.settings, pathResume } };
    assert.throws(() => S.validateProgress(bad), /path resume lesson/);
  }
});
check('canonical learning-path completion checks survive import without inventing review mastery', () => {
  const lesson = C.learningPath[0].units[0].lessons[0];
  const progress = E.initialProgress();
  const completed = E.setTaskCompleted(progress, `path:${lesson.id}`, true);
  assert.deepEqual(completed.completedTasks, [`path:${lesson.id}`]);
  assert.equal(E.setTaskCompleted(completed, `path:${lesson.id}`, true), completed);
  assert.deepEqual(completed.reviews, {}); assert.deepEqual(completed.attempts, []);
  assert.deepEqual(S.validateProgress(completed), completed);
  assert.throws(() => E.setTaskCompleted(completed, 'path:unknown-lesson', true), /Unknown completion task/);
  assert.throws(() => S.validateProgress({ ...completed, completedTasks: [`path:${lesson.id}`, `path:${lesson.id}`] }), /duplicate/);
  assert.deepEqual(E.setTaskCompleted(completed, `path:${lesson.id}`, false).completedTasks, []);
});

check('a missing dashboard selection defaults to path, goal, and review without changing older data', () => {
  const first = E.initialProgress(); const second = E.initialProgress();
  assert.deepEqual(first.settings.dashboardWidgets, ['path', 'goal', 'review']);
  assert.notEqual(first.settings.dashboardWidgets, second.settings.dashboardWidgets);
  const old = structuredClone(first); delete old.settings.dashboardWidgets;
  const before = structuredClone(old);
  assert.deepEqual(S.validateProgress(old), first); assert.deepEqual(old, before);
});
check('every supported dashboard widget retains its chosen order through JSON validation', () => {
  const widgets = [...E.DASHBOARD_WIDGET_IDS].reverse();
  const progress = { ...E.initialProgress(), settings: { ...E.initialProgress().settings, dashboardWidgets: widgets } };
  const restored = S.validateProgress(JSON.parse(JSON.stringify(progress)));
  assert.deepEqual(restored.settings.dashboardWidgets, widgets);
  assert.notEqual(restored.settings.dashboardWidgets, widgets);
  assert.deepEqual(S.validateProgress(progress), progress);
});
check('empty or small dashboard selections leave the active attempt and assessment history intact', () => {
  for (const dashboardWidgets of [[], ['references', 'activity', 'path']]) {
    const progress = fresh(); progress.settings.dashboardWidgets = dashboardWidgets;
    const before = structuredClone(progress);
    const restored = S.validateProgress(JSON.parse(JSON.stringify(progress)));
    assert.deepEqual(restored, before);
    assert.deepEqual(restored.attempts[0].questionOrder, before.attempts[0].questionOrder);
    assert.equal(restored.attempts[0].deadline, before.attempts[0].deadline);
    assert.deepEqual(restored.reviews, before.reviews);
  }
});
check('unknown, duplicate, non-string, and non-array dashboard selections are rejected', () => {
  for (const dashboardWidgets of [['path', 'path'], ['unknown'], ['goal', null], 'path', null, false, {}, 3]) {
    const progress = E.initialProgress(); progress.settings.dashboardWidgets = dashboardWidgets;
    assert.throws(() => S.validateProgress(progress), /dashboard widget/);
  }
});

console.log(`\n${checks} full-mock and sound-preference checks passed.`);
