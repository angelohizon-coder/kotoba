import type { TopicId } from '../types';

// These notes describe structure verified on public publisher/organizer pages.
// They do not claim access to the complete commercial books or reproduce their lessons.
export const studyReferences: {
  id: 'deep' | 'context' | 'daily' | 'exam';
  title: string;
  approach: string;
  sourceUrl: string;
}[] = [
  {
    id: 'deep',
    title: 'Shin Kanzen Master Grammar: Japanese-Language Proficiency Test N3 (新完全マスター文法 日本語能力試験Ｎ３)',
    approach: 'Our original grammar lessons use meaning and form groupings, comparisons of easily confused patterns, and sentence and text exercises, inspired by the publisher’s public contents. New examples and explanations support careful study before mixed practice.',
    sourceUrl: 'https://www.3anet.co.jp/np/books/3604/',
  },
  {
    id: 'context',
    title: 'TRY! 日本語能力試験 N3 文法から伸ばす日本語 (Revised English Edition)',
    approach: 'The publisher describes learning grammar through varied texts and situational conversations, then explanations, examples, and exercises. Our original everyday scenes follow that teaching sequence and connect grammar study with reading and listening practice.',
    sourceUrl: 'https://ask-books.com/jlpt-try/',
  },
  {
    id: 'daily',
    title: 'Nihongo So-matome N3 Series (日本語総まとめ N3)',
    approach: 'The publisher’s public overview emphasizes small daily portions and weekly review. Our course draws on that manageable rhythm through short study sessions and scheduled mistake review, with original material and a flexible pace.',
    sourceUrl: 'https://ask-books.com/somatome/',
  },
  {
    id: 'exam',
    title: 'Japanese-Language Proficiency Test Official Practice Workbook (N3; 2012 and Vol. 2, 2018)',
    approach: 'The official workbook page documents test sections and listening task categories. Our original full mocks follow those testing blocks and report raw practice accuracy rather than an official scaled JLPT score.',
    sourceUrl: 'https://www.jlpt.jp/e/samples/sampleindex.html',
  },
];

// An original suggested route through this course, not a textbook chapter mapping.
export const studyPlan: { week: number; title: string; topicIds: TopicId[] }[] = [
  { week: 1, title: 'Daily routines and people', topicIds: ['daily', 'people', 'home'] },
  { week: 2, title: 'Everyday needs and services', topicIds: ['shopping', 'food', 'services'] },
  { week: 3, title: 'Getting around and planning time', topicIds: ['travel', 'transport', 'time'] },
  { week: 4, title: 'Working, learning, and communicating', topicIds: ['work', 'education', 'communication'] },
  { week: 5, title: 'Wellbeing and a changing world', topicIds: ['health', 'nature', 'technology'] },
  { week: 6, title: 'Community, culture, and feelings', topicIds: ['community', 'culture', 'feelings'] },
];
