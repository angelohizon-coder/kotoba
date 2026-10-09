export interface StudyPreferences {
  version: 1;
  highContrast: boolean;
  reduceMotion: boolean;
  haptics: boolean;
  quiet: boolean;
  autoSpeak: boolean;
  kanaAssist: boolean;
  autoAdvance: boolean;
  untimedPractice: boolean;
  guidedPath: boolean;
  fontScale: number;
  reminders: { enabled: boolean; time: string; lastSentDay: string };
}
export function initialStudyPreferences(): StudyPreferences {
  return { version: 1, highContrast: false, reduceMotion: false, haptics: false,
    quiet: false, autoSpeak: false, kanaAssist: true, autoAdvance: true,
    untimedPractice: false, guidedPath: false, fontScale: 1,
    reminders: { enabled: false, time: '18:00', lastSentDay: '' } };
}
export function validateStudyPreferences(input: unknown): StudyPreferences {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid study preferences.');
  const value = input as Record<string, unknown>;
  if (value.version !== 1) throw new Error('Unknown study preference version.');
  const bools = ['highContrast', 'reduceMotion', 'haptics', 'quiet', 'autoSpeak', 'kanaAssist', 'autoAdvance', 'untimedPractice', 'guidedPath'] as const;
  for (const key of bools) if (typeof value[key] !== 'boolean') throw new Error('Invalid study preference: ' + key);
  if (typeof value.fontScale !== 'number' || ![1, 1.15, 1.3].includes(value.fontScale)) throw new Error('Invalid text size.');
  const reminder = value.reminders as Record<string, unknown>;
  if (!reminder || typeof reminder !== 'object' || typeof reminder.enabled !== 'boolean' || typeof reminder.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(reminder.time)) throw new Error('Invalid reminder preferences.');
  if (typeof reminder.lastSentDay !== 'string' || reminder.lastSentDay !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(reminder.lastSentDay) || new Date(reminder.lastSentDay + 'T00:00:00Z').toISOString().slice(0, 10) !== reminder.lastSentDay)) throw new Error('Invalid reminder date.');
  return { version: 1, highContrast: value.highContrast as boolean, reduceMotion: value.reduceMotion as boolean,
    haptics: value.haptics as boolean, quiet: value.quiet as boolean, autoSpeak: value.autoSpeak as boolean,
    kanaAssist: value.kanaAssist as boolean, autoAdvance: value.autoAdvance as boolean,
    untimedPractice: value.untimedPractice as boolean, guidedPath: value.guidedPath as boolean,
    fontScale: value.fontScale, reminders: { enabled: reminder.enabled, time: reminder.time, lastSentDay: reminder.lastSentDay } };
}
