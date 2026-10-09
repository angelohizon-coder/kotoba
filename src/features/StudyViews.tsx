import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowRight, Bookmark, Check, CheckCircle2, ChevronRight, Headphones, Search, Target } from 'lucide-react';
import { grammar, kanji, listening, questions, readings, vocabulary } from '../content';
import type { Attempt, Progress, Question, Vocabulary } from '../types';
import { markStudied } from '../lib/engine';
import AudioPlayer from '../components/AudioPlayer';
import JapaneseText from '../components/JapaneseText';

export interface StudyStartOptions {
  count?: number;
  durationMinutes?: number;
  isRetry?: boolean;
  listeningAccess?: 'audio' | 'script' | null;
}

export interface StudyViewProps {
  progress: Progress;
  onChange: Dispatch<SetStateAction<Progress>>;
  start: (pool: Question[], type: Attempt['type'], options?: StudyStartOptions) => void;
  onNotice: (message: string) => void;
}

export interface ListeningViewProps extends StudyViewProps {
  seenScriptIds: string[];
  onScriptSeen: (id: string) => void;
}

function JapaneseWord({ item, furigana }: { item: Vocabulary; furigana: boolean }) {
  return <span lang="ja">{furigana
    ? <ruby>{item.word}<rp>（</rp><rt>{item.reading}</rt><rp>）</rp></ruby>
    : item.word}</span>;
}

export function VocabularyView({ progress, onChange, start }: StudyViewProps) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'words' | 'kanji' | 'bookmarks'>('words');
  const [revealed, setRevealed] = useState<string[]>([]);
  const query = search.toLowerCase();
  const matching = vocabulary.filter(word =>
    `${word.word} ${word.reading} ${word.meaning} ${word.example}`.toLowerCase().includes(query)
    && (tab !== 'bookmarks' || progress.bookmarks.includes(word.id)),
  );
  const matchingKanji = kanji.filter(entry => {
    const exampleWords = entry.wordIds.map(id => {
      const word = vocabulary.find(word => word.id === id)!;
      return `${word.word} ${word.reading} ${word.meaning}`;
    }).join(' ');
    return `${entry.character} ${entry.meaning} ${exampleWords}`.toLowerCase().includes(query);
  });
  const bookmark = (id: string) => onChange(current => ({
    ...current,
    bookmarks: current.bookmarks.includes(id)
      ? current.bookmarks.filter(bookmarkId => bookmarkId !== id)
      : [...current.bookmarks, id],
  }));
  const reveal = (id: string) => {
    setRevealed(ids => [...new Set([...ids, id])]);
    onChange(current => markStudied(current, 'vocabulary', id));
  };

  return <div className="content-stack">
    <div className="toolbar">
      <div className="segmented" aria-label="Vocabulary view">
        {(['words', 'kanji', 'bookmarks'] as const).map(view => <button
          className={tab === view ? 'active' : ''}
          aria-pressed={tab === view}
          key={view}
          onClick={() => setTab(view)}
        >{view === 'words' ? 'Word cards' : view === 'kanji' ? 'Kanji connections' : 'Bookmarks'}</button>)}
      </div>
      <label className="search-input">
        <Search size={17} /><span className="visually-hidden">Search vocabulary</span>
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search word, reading, or meaning…" />
      </label>
    </div>
    <p className="muted">Reveal a card to record a study action. Furigana appears on revealed cards when enabled in Settings.</p>
    {tab === 'kanji' ? matchingKanji.length ? <div className="kanji-grid">
      {matchingKanji.map(entry => <article className="card kanji-card" key={entry.id}>
        <span className="kanji-character" lang="ja">{entry.character}</span>
        <h2>{entry.meaning}</h2>
        {entry.wordIds.map(id => {
          const word = vocabulary.find(word => word.id === id)!;
          return <p key={id}>
            <JapaneseWord item={word} furigana={progress.settings.furigana} />{' '}
            <span className="muted"><span lang="ja">{word.reading}</span> · {word.meaning}</span>
          </p>;
        })}
        <button className="button secondary small" onClick={() => {
          onChange(current => markStudied(current, 'kanji', entry.id));
          setTab('words');
          setSearch(entry.character);
        }}>Study these words <ArrowRight size={15} /></button>
      </article>)}
    </div> : <div className="card empty-state">
      <Search size={26} /><h2>No matching kanji.</h2>
      <p className="muted">Try a character, example word, reading, or English meaning.</p>
    </div> : matching.length ? <div className="vocab-grid">
      {matching.map(word => {
        const visible = revealed.includes(word.id);
        const bookmarked = progress.bookmarks.includes(word.id);
        return <article className="card vocab-card" key={word.id}>
          <div className="word-header">
            <span className="tag">{word.level === 'review' ? 'Easier review' : word.level === 'extension' ? 'Harder extension' : 'N3-style'}</span>
            <button className="bookmark-button icon-button" aria-label={`${bookmarked ? 'Remove bookmark' : 'Bookmark'} ${word.word}`} aria-pressed={bookmarked} onClick={() => bookmark(word.id)}>
              <Bookmark size={19} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>
          <h2 className="japanese-word"><JapaneseWord item={word} furigana={visible && progress.settings.furigana} /></h2>
          {visible ? <>
            <p className="word-reading" lang="ja">{word.reading}</p>
            <p className="word-meaning">{word.meaning} <span className="muted">· <JapaneseText text={word.wordClass} /></span></p>
            <div className="example"><p lang="ja">{word.example}</p><p className="translation">{word.exampleTranslation}</p></div>
            <div className="card-actions">
              <span className="muted"><CheckCircle2 size={14} /> Studied today</span>
              <button className="button ghost small" onClick={() => setRevealed(ids => ids.filter(id => id !== word.id))}>Hide</button>
            </div>
          </> : <>
            <p className="muted">Can you recall the reading and meaning?</p>
            <button className="button secondary" onClick={() => reveal(word.id)}>Reveal card <ChevronRight size={16} /></button>
          </>}
        </article>;
      })}
    </div> : <div className="card empty-state">
      <Bookmark size={26} />
      <h2>{tab === 'bookmarks' ? 'A place for words you want to keep.' : 'No matching words.'}</h2>
      <p className="muted">{tab === 'bookmarks' ? 'Use the bookmark button on a word card, or clear your search.' : 'Try a Japanese reading or an English meaning.'}</p>
    </div>}
    <div className="inline-actions">
      <button className="button primary" onClick={() => start(questions.filter(question => question.skill === (tab === 'kanji' ? 'kanji' : 'vocabulary')), 'practice', { count: 5 })}>
        Practice {tab === 'kanji' ? 'kanji readings' : 'vocabulary'} <Target size={17} />
      </button>
      <span className="muted">Untimed · explanations after each answer</span>
    </div>
  </div>;
}

export function GrammarView({ onChange, start, onNotice }: StudyViewProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(grammar[0].id);
  const selected = grammar.find(lesson => lesson.id === selectedId)!;
  const matching = grammar.filter(lesson => `${lesson.title} ${lesson.meaning}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="content-stack">
    <label className="search-input">
      <Search size={17} /><span className="visually-hidden">Search grammar lessons</span>
      <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search a pattern or meaning…" />
    </label>
    <div className="page-grid">
      <div className="lesson-list">
        {matching.map((lesson, index) => <button className={`lesson-card${lesson.id === selectedId ? ' active' : ''}`} key={lesson.id} onClick={() => setSelectedId(lesson.id)}>
          <span className="lesson-number">0{index + 1}</span>
          <div><h2 lang="ja">{lesson.title}</h2><p><JapaneseText text={lesson.meaning} /></p></div>
          <ChevronRight size={18} />
        </button>)}
        {!matching.length && <p className="empty-state">No lessons match. Try another search.</p>}
      </div>
      <article className="card lesson-detail">
        <span className="tag">Original N3-style lesson</span>
        <h2 className="japanese-word" lang="ja">{selected.title}</h2>
        <p><JapaneseText text={selected.meaning} /></p>
        <h3>How to attach it</h3>
        <ul>{selected.attachment.map(rule => <li key={rule}><JapaneseText text={rule} /></li>)}</ul>
        <h3>In everyday Japanese</h3>
        {selected.examples.map((example, index) => <div className="example-block" key={index}>
          <p lang="ja">{example.ja}</p><p className="translation">{example.en}</p>
        </div>)}
        <h3>A common mistake</h3>
        <div className="mistake">
          <p><span className="badge">Incorrect</span> <span lang="ja">{selected.mistake.wrong}</span></p>
          <p><span className="badge">Correct</span> <span lang="ja">{selected.mistake.correct}</span></p>
          <p><JapaneseText text={selected.mistake.explanation} /></p>
        </div>
        <h3>A useful comparison</h3><p><JapaneseText text={selected.comparison} /></p>
        <div className="inline-actions">
          <button className="button primary" onClick={() => {
            onChange(current => markStudied(current, 'grammar', selected.id));
            start(questions.filter(question => selected.questionIds.includes(question.id)), 'practice');
          }}>Practice this pattern <ArrowRight size={17} /></button>
          <button className="button secondary" onClick={() => {
            onChange(current => markStudied(current, 'grammar', selected.id));
            onNotice('Lesson recorded in today’s activity.');
          }}>Mark studied <Check size={16} /></button>
        </div>
      </article>
    </div>
  </div>;
}

export function ReadingView({ start }: StudyViewProps) {
  const [selectedId, setSelectedId] = useState(readings[0].id);
  const selected = readings.find(passage => passage.id === selectedId)!;

  return <div className="page-grid">
    <div className="passage-list">
      {readings.map(passage => <button className={`passage-card${passage.id === selectedId ? ' active' : ''}`} key={passage.id} onClick={() => setSelectedId(passage.id)}>
        <span className="tag">{passage.type} · {passage.questionIds.length} questions</span>
        <h2>{passage.title}</h2><span className="muted">Original everyday Japanese</span><ChevronRight size={17} />
      </button>)}
    </div>
    <article className="card lesson-detail">
      <span className="tag">Original N3-style reading</span><h2>{selected.title}</h2>
      <p className="passage-body" lang="ja">{selected.body}</p>
      <p className="muted">Read for the main message, then look for the details. Translation and supporting evidence unlock after you submit.</p>
      <button className="button primary" onClick={() => start(questions.filter(question => selected.questionIds.includes(question.id)), 'reading')}>
        Answer {selected.questionIds.length} questions <ArrowRight size={17} />
      </button>
    </article>
  </div>;
}

export function ListeningView({ start, seenScriptIds, onScriptSeen }: ListeningViewProps) {
  const [selectedId, setSelectedId] = useState(listening[0].id);
  const [scriptVisible, setScriptVisible] = useState(false);
  const selected = listening.find(script => script.id === selectedId)!;
  const scriptStudied = scriptVisible || seenScriptIds.includes(selected.id);

  return <div className="page-grid">
    <div className="passage-list">
      {listening.map(script => <button className={`passage-card${script.id === selectedId ? ' active' : ''}`} key={script.id} onClick={() => {
        setSelectedId(script.id);
        setScriptVisible(false);
      }}>
        <Headphones size={22} /><h2>{script.title}</h2>
        <span className="muted">Everyday conversation · {script.questionIds.length} questions</span>
      </button>)}
    </div>
    <article className="card lesson-detail">
      <span className="tag">Original N3-style listening practice</span><h2>{selected.title}</h2>
      <p className="section-description">Listen to the conversation, then answer the questions. Browser speech is synthesized practice audio and depends on a Japanese voice available in your browser.</p>
      <AudioPlayer key={selected.id} item={selected} />
      <div className="inline-actions">
        <button className="button primary" onClick={() => start(questions.filter(question => selected.questionIds.includes(question.id)), 'listening', { listeningAccess: scriptStudied ? 'script' : 'audio' })}>
          {scriptStudied ? 'Start script-study questions' : 'Start listening questions'}<ArrowRight size={17} />
        </button>
        <button className="button secondary" onClick={() => {
          if (!scriptVisible) onScriptSeen(selected.id);
          setScriptVisible(visible => !visible);
        }}>{scriptVisible ? 'Hide script' : 'Study the script instead'}</button>
      </div>
      {scriptVisible && <div className="example-block">
        <span className="badge">Listening-script study · unscored</span>
        <p className="transcript" lang="ja">{selected.script}</p><p className="translation">{selected.translation}</p>
        <p className="muted">Reading this script is a study activity; it does not measure listening ability.</p>
      </div>}
    </article>
  </div>;
}
