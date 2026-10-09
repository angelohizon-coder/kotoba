import type { SrsRecord } from './lib/sm2';
import type { StudyPreferences } from './lib/preferences';
import type { LearnLabState } from './lib/learnlab';
import type { MotivationState } from './lib/motivation';

export type Skill = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening';
export type JLPTLevel = 'n5' | 'n4' | 'n3' | 'n2' | 'n1';
export type DashboardWidgetId = 'path' | 'goal' | 'review' | 'balance' | 'habit' | 'activity' | 'library' | 'topics' | 'references' | 'foundations' | 'motivation';
export type Level = 'review' | 'N3-style' | 'extension';
export type TopicId = 'daily' | 'people' | 'home' | 'shopping' | 'food' | 'travel' | 'transport' | 'work' | 'education' | 'health' | 'nature' | 'technology' | 'community' | 'culture' | 'feelings' | 'communication' | 'time' | 'services';
export type QuestionType = 'kanji-reading' | 'orthography' | 'word-formation' | 'vocabulary-context' | 'paraphrase' | 'usage' | 'grammar-form' | 'grammar-order' | 'text-grammar' | 'reading-short' | 'reading-medium' | 'reading-long' | 'reading-integrated' | 'reading-thematic' | 'reading-information' | 'listening-task' | 'listening-points' | 'listening-outline' | 'listening-expression' | 'listening-response' | 'listening-integrated';
export interface Topic { id: TopicId; title: string; description: string }
export interface Vocabulary { id: string; word: string; reading: string; meaning: string; wordClass: string; example: string; exampleTranslation: string; level: Level; topicId?: TopicId; jlptLevel?: JLPTLevel }
export interface Kanji { id: string; character: string; meaning: string; wordIds: string[]; topicId?: TopicId; jlptLevel?: JLPTLevel }
export interface Example { ja: string; en: string }
export interface Grammar { id: string; title: string; meaning: string; attachment: string[]; examples: Example[]; mistake: { wrong: string; correct: string; explanation: string }; comparison: string; questionIds: string[]; topicId?: TopicId; category?: string; level?: Level; jlptLevel?: JLPTLevel }
export interface Reading { id: string; title: string; type: 'email' | 'notice' | 'article' | 'advertisement'; body: string; translation: string; questionIds: string[]; topicId?: TopicId; jlptLevel?: JLPTLevel }
export interface Listening { id: string; title: string; script: string; translation: string; questionIds: string[]; audioUrl?: string; topicId?: TopicId; jlptLevel?: JLPTLevel }
export interface Question { id: string; skill: Skill; prompt: string; options: { id: string; text: string }[]; correctOptionId: string; explanations: Record<string, string>; passageId?: string; listeningId?: string; grammarId?: string; vocabularyId?: string; evidence?: string; ordering?: { fragments: string[]; target: number; completed: string }; topicId?: TopicId; questionType?: QuestionType; jlptLevel?: JLPTLevel }
export interface MockSection { id: 'vocabulary' | 'grammar-reading' | 'language-reading' | 'listening'; title: string; durationMinutes: number; questionIds: string[]; status: 'pending' | 'in-progress' | 'submitted'; startedAt?: string; deadline?: number; submittedAt?: string }
export interface FullMock { level: JLPTLevel; currentSection: number; sections: MockSection[] }
export interface Attempt { id: string; type: 'practice' | 'mock' | 'reading' | 'listening' | 'review'; status: 'ready' | 'in-progress' | 'submitted' | 'reviewed'; questionOrder: string[]; optionOrders: Record<string, string[]>; answers: Record<string, string>; checkedIds: string[]; excludedIds: string[]; createdAt: string; deadline: number | null; submittedAt?: string; isRetry: boolean; listeningAccess: 'audio' | 'script' | null; mock?: FullMock }
export interface ReviewRecord { questionId: string; lastAnswerId: string | null; firstMissedAt: string; lastMissedAt: string; lastReviewedAt?: string; dueAt: string; streak: number; mastered: boolean }
export interface Settings { furigana: boolean; dailyGoal: number; examDate: string; theme?: 'light' | 'dark'; soundEffects?: boolean; studyLevel?: JLPTLevel | 'all'; pathResume?: string | null; dashboardWidgets?: DashboardWidgetId[]; speechStyle?: 'natural' | 'bright' | 'calm' | 'deep'; speechVoice?: string; studyPreferences?: StudyPreferences; offlineCaching?: boolean }
export interface StudyEvent { id: string; at: string; type: 'vocabulary' | 'grammar' | 'kanji'; contentId: string }
export interface Progress { schemaVersion: 1; contentVersion: string; settings: Settings; bookmarks: string[]; completedTasks: string[]; attempts: Attempt[]; reviews: Record<string, ReviewRecord>; studyEvents: StudyEvent[]; activeAttemptId: string | null; srs?: Record<string, SrsRecord>; learnlab?: LearnLabState; motivation?: MotivationState }
export interface Grade { correct: number; total: number; unanswered: number; excluded: number; skills: Partial<Record<Skill, { correct: number; total: number }>>; items: { questionId: string; selectedOptionId?: string; correct: boolean; unanswered: boolean; excluded: boolean }[] }
