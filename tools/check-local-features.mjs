import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({ console, Date, Math, structuredClone, Intl, crypto: globalThis.crypto });
context.window = context;
for (const name of ['content', 'engine', 'storage', 'preference-model']) vm.runInContext(fs.readFileSync('web/' + name + '.js', 'utf8'), context);
const { KotobaEngine: E, KotobaStorage: S, KotobaPreferenceModel: P } = context;
const validate = value => vm.runInContext('KotobaStorage.validateProgress(JSON.parse(' + JSON.stringify(JSON.stringify(value)) + '))', context);
let count = 0;
const check = (name, fn) => { fn(); count++; console.log('PASS ' + name); };
check('old progress retains absent optional preferences, lab, rewards and SRS', () => {
  const progress = validate(E.initialProgress());
  for (const key of ['srs', 'learnlab', 'motivation']) assert.ok(!(key in progress));
  assert.ok(!('studyPreferences' in progress.settings));
});
check('accessibility and local reminder choices survive the same validated portable backup', () => {
  const progress = E.initialProgress();
  progress.settings.studyPreferences = { ...P.initialStudyPreferences(), highContrast: true, reduceMotion: true, quiet: true, fontScale: 1.3, reminders: { enabled: true, time: '19:30', lastSentDay: '2026-10-09' } };
  progress.settings.offlineCaching = true;
  const result = validate(progress);
  assert.equal(result.settings.studyPreferences.fontScale, 1.3);
  assert.equal(result.settings.studyPreferences.reminders.time, '19:30');
  assert.equal(result.settings.offlineCaching, true);
  assert.equal(result.attempts.length, 0);
});
check('unsafe preference imports fail as a whole instead of changing study history', () => {
  for (const change of [p => p.version = 9, p => p.quiet = 'true', p => p.fontScale = 0, p => p.reminders.time = '25:30', p => p.reminders.lastSentDay = '2026-02-30']) {
    const progress = E.initialProgress(), prefs = P.initialStudyPreferences(); change(prefs); progress.settings.studyPreferences = prefs;
    assert.throws(() => validate(progress));
  }
  const progress = E.initialProgress(); progress.settings.offlineCaching = 'yes'; assert.throws(() => validate(progress));
});
check('the rewards widget is optional, ordered and does not change the default home', () => {
  const progress = E.initialProgress(); assert.deepEqual(Array.from(progress.settings.dashboardWidgets), ['path', 'goal', 'review']);
  progress.settings.dashboardWidgets = ['motivation', 'path'];
  assert.deepEqual(Array.from(validate(progress).settings.dashboardWidgets), ['motivation', 'path']);
});
console.log(count + ' local preference and compatibility checks passed.');
