// Generated from src/lib/preferences.ts and its local imports. Edit src/ then run tools/build-browser.mjs.
(function(global){
'use strict';
const compiled={};
compiled["src/lib/preferences.ts"] = (() => {
function initialStudyPreferences()                   {
  return { version: 1, highContrast: false, reduceMotion: false, haptics: false,
    quiet: false, autoSpeak: false, kanaAssist: true, autoAdvance: true,
    untimedPractice: false, guidedPath: false, fontScale: 1,
    reminders: { enabled: false, time: '18:00', lastSentDay: '' } };
}
function validateStudyPreferences(input         )                   {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid study preferences.');
  const value = input                           ;
  if (value.version !== 1) throw new Error('Unknown study preference version.');
  const bools = ['highContrast', 'reduceMotion', 'haptics', 'quiet', 'autoSpeak', 'kanaAssist', 'autoAdvance', 'untimedPractice', 'guidedPath']         ;
  for (const key of bools) if (typeof value[key] !== 'boolean') throw new Error('Invalid study preference: ' + key);
  if (typeof value.fontScale !== 'number' || ![1, 1.15, 1.3].includes(value.fontScale)) throw new Error('Invalid text size.');
  const reminder = value.reminders                           ;
  if (!reminder || typeof reminder !== 'object' || typeof reminder.enabled !== 'boolean' || typeof reminder.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(reminder.time)) throw new Error('Invalid reminder preferences.');
  if (typeof reminder.lastSentDay !== 'string' || reminder.lastSentDay !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(reminder.lastSentDay) || new Date(reminder.lastSentDay + 'T00:00:00Z').toISOString().slice(0, 10) !== reminder.lastSentDay)) throw new Error('Invalid reminder date.');
  return { version: 1, highContrast: value.highContrast           , reduceMotion: value.reduceMotion           ,
    haptics: value.haptics           , quiet: value.quiet           , autoSpeak: value.autoSpeak           ,
    kanaAssist: value.kanaAssist           , autoAdvance: value.autoAdvance           ,
    untimedPractice: value.untimedPractice           , guidedPath: value.guidedPath           ,
    fontScale: value.fontScale, reminders: { enabled: reminder.enabled, time: reminder.time, lastSentDay: reminder.lastSentDay } };
}
return {initialStudyPreferences,validateStudyPreferences};
})();
global.KotobaPreferenceModel=compiled["src/lib/preferences.ts"];
})(window);
