import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Flag, XCircle } from 'lucide-react';
import type { Attempt, Progress, Question } from '../types';
import { questions, readings, listening } from '../content';
import { checkAnswer, gradeAttempt, remainingSeconds, selectAnswer, submitAttempt } from '../lib/engine';
import AudioPlayer from './AudioPlayer';
import JapaneseText from './JapaneseText';

export const questionMap: Record<string, Question> = Object.fromEntries(questions.map(q => [q.id, q]));
type Props = { attempt: Attempt; onChange: Dispatch<SetStateAction<Progress>>; onFinish: () => void };

function Explanation({ question, attempt, full = false }: { question: Question; attempt: Attempt; full?: boolean }) {
  const selected = attempt.answers[question.id];
  const excluded = attempt.excludedIds.includes(question.id) || (question.skill === 'listening' && attempt.listeningAccess !== 'audio');
  const correct = selected === question.correctOptionId;
  const passage = readings.find(p => p.id === question.passageId);
  const script = listening.find(l => l.id === question.listeningId);
  return <div className={`feedback ${correct ? 'correct' : 'incorrect'}`}>
    <div className="inline-actions">{correct ? <CheckCircle2 size={19} /> : <XCircle size={19} />}<strong>{excluded ? 'Unscored study item' : !selected ? 'Not answered' : correct ? 'Correct' : 'Let’s review this one'}</strong></div>
    <p>Your answer: <span lang={selected ? "ja" : undefined}>{question.options.find(o => o.id === selected)?.text ?? 'Not answered'}</span><br />Correct answer: <strong lang="ja">{question.options.find(o => o.id === question.correctOptionId)?.text}</strong></p>
    <ul className="explanation-list">{attempt.optionOrders[question.id].map(id => <li key={id}><strong lang="ja">{question.options.find(o => o.id === id)?.text}</strong> — <JapaneseText text={question.explanations[id]} /></li>)}</ul>
    {question.ordering && <p>Complete sentence: <span lang="ja">{question.ordering.completed}</span></p>}
    {question.evidence && <p>Passage evidence: <span lang="ja">{question.evidence}</span></p>}
    {full && passage && <details><summary>Passage and English translation</summary><p className="passage-body" lang="ja">{passage.body}</p><p className="translation">{passage.translation}</p></details>}
    {full && script && <details><summary>Transcript and English translation</summary><p className="transcript" lang="ja">{script.script}</p><p className="translation">{script.translation}</p></details>}
  </div>;
}

export default function QuizView({ attempt, onChange, onFinish }: Props) {
  const [index, setIndex] = useState(() => Math.max(0, attempt.questionOrder.findIndex(id => attempt.type === 'practice' || attempt.type === 'review' ? !attempt.checkedIds.includes(id) : !attempt.answers[id])));
  const [now, setNow] = useState(Date.now());
  const [audioFailures, setAudioFailures] = useState<string[]>([]);
  const inProgress = attempt.status === 'in-progress';
  const immediate = attempt.type === 'practice' || attempt.type === 'review';
  const remaining = remainingSeconds(attempt, now);
  useEffect(() => {
    if (!inProgress || attempt.deadline === null) return;
    const tick = () => { const time = Date.now(); setNow(time); if (time >= attempt.deadline!) onChange(p => submitAttempt(p, attempt.id, questionMap, time)); };
    tick(); const timer = setInterval(tick, 500); return () => clearInterval(timer);
  }, [attempt.id, attempt.deadline, inProgress, onChange]);

  if (!inProgress) {
    const grade = gradeAttempt(attempt, questionMap);
    const percent = grade.total ? Math.round(grade.correct / grade.total * 100) : 0;
    return <div className="content-stack">
      <div className="card result-summary"><span className="eyebrow">{attempt.isRetry ? 'RETRY RESULTS' : 'YOUR PRACTICE RESULTS'}</span><h2 className="section-title">{grade.total ? 'Every attempt moves you forward.' : 'Script study completed.'}</h2><div className="result-score">{grade.total ? `${grade.correct} / ${grade.total}` : 'Unscored'}{grade.total > 0 && <span>{percent}% accuracy</span>}</div><p className="muted">{grade.unanswered} unanswered · {grade.excluded} unscored or excluded. Raw practice results for this attempt.</p><div className="skill-breakdown">{Object.entries(grade.skills).map(([skill, score]) => <span className="badge" key={skill}>{skill}: {score.correct}/{score.total}</span>)}</div><p className="muted">Missed assessment questions are saved for spaced review. Script study doesn’t measure listening ability.</p><button className="button primary" onClick={onFinish}>Finish review <CheckCircle2 size={17} /></button></div>
      {attempt.questionOrder.map((id, i) => <article className="card" key={id}><div className="quiz-header"><span className="tag">Question {i + 1} · {questionMap[id].skill}</span>{attempt.excludedIds.includes(id) && <span className="badge">Excluded: audio issue</span>}</div><p className="question-prompt" lang="ja">{questionMap[id].prompt}</p><Explanation question={questionMap[id]} attempt={attempt} full /></article>)}
    </div>;
  }
  const question = questionMap[attempt.questionOrder[index]];
  const passage = readings.find(p => p.id === question.passageId);
  const audio = listening.find(l => l.id === question.listeningId);
  const checked = attempt.checkedIds.includes(question.id);
  const excluded = attempt.excludedIds.includes(question.id);
  const answered = Object.keys(attempt.answers).length;
  const choose = (optionId: string) => onChange(p => selectAnswer(p, attempt.id, question.id, optionId));
  const submit = () => onChange(p => submitAttempt(p, attempt.id, questionMap));
  const exclude = () => onChange(p => ({ ...p, attempts: p.attempts.map(a => a.id === attempt.id ? { ...a, excludedIds: [...new Set([...a.excludedIds, question.id])] } : a) }));
  const scriptStudy = () => onChange(p => ({ ...p, attempts: p.attempts.map(a => a.id === attempt.id ? { ...a, listeningAccess: 'script' } : a) }));
  return <div className="content-stack">
    <div className="card quiz-card">
      <div className="quiz-header"><span className="tag">{attempt.type === 'mock' ? 'Mini mock test' : attempt.isRetry ? 'Mistake retry' : 'Learning practice'} · {question.skill}</span>{remaining !== null && <span className="timer" role="timer" aria-label="Time remaining"><Clock3 size={17} />{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>}</div>
      <div className="quiz-progress"><span>Question {index + 1} of {attempt.questionOrder.length}</span><span>{answered} answered</span></div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${answered / attempt.questionOrder.length * 100}%` }} /></div>
      {passage && <div className="example-block"><h3>{passage.title}</h3><p className="passage-body" lang="ja">{passage.body}</p></div>}
      {audio && <><AudioPlayer key={audio.id} item={audio} onFailure={() => setAudioFailures(ids => ids.includes(question.id) ? ids : [...ids, question.id])} />{audioFailures.includes(question.id) && !excluded && <div className="notice warning"><p>Audio is unavailable. You can retry playback or exclude this question without a penalty.</p><button className="button secondary small" onClick={exclude}>Exclude this question</button></div>}{attempt.type !== 'mock' && <button className="button ghost small" onClick={scriptStudy}>Use listening-script study (unscored)</button>}{attempt.listeningAccess === 'script' && <div className="example-block"><span className="badge">Listening-script study · unscored</span><p className="transcript" lang="ja">{audio.script}</p></div>}</>}
      <h2 className="question-prompt" lang="ja">{question.prompt}</h2>
      {excluded && <p className="notice warning">This question is excluded because of an audio problem.</p>}
      <fieldset className="options" disabled={checked || excluded || remaining === 0}><legend className="visually-hidden">Choose one answer</legend>{attempt.optionOrders[question.id].map((id, i) => {
        const option = question.options.find(o => o.id === id)!;
        const selected = attempt.answers[question.id] === id;
        return <label className={`option${selected ? ' selected' : ''}${checked && id === question.correctOptionId ? ' correct' : ''}${checked && selected && id !== question.correctOptionId ? ' incorrect' : ''}`} key={id}><input type="radio" name={`answer-${question.id}`} value={id} checked={selected} onChange={() => choose(id)} /><span className="option-letter">{i + 1}</span><span className="option-text" lang="ja">{option.text}</span>{checked && id === question.correctOptionId && <CheckCircle2 aria-label="Correct answer" size={18} />}</label>;
      })}</fieldset>
      {checked && <Explanation question={question} attempt={attempt} />}
      <div className="quiz-header"><button className="button ghost" onClick={() => setIndex(i => i - 1)} disabled={index === 0}><ArrowLeft size={17} />Previous</button><div className="inline-actions">{immediate && !checked && !excluded && <button className="button primary" disabled={!attempt.answers[question.id]} onClick={() => onChange(p => checkAnswer(p, attempt.id, question.id))}>Check answer <CheckCircle2 size={17} /></button>}{index < attempt.questionOrder.length - 1 && <button className="button secondary" disabled={immediate && !checked && !excluded} onClick={() => setIndex(i => i + 1)}>Next <ArrowRight size={17} /></button>}{index === attempt.questionOrder.length - 1 && (!immediate || checked || excluded) && <button className="button primary" onClick={submit}>Submit {attempt.type === 'mock' ? 'test' : 'practice'} <Flag size={17} /></button>}</div></div>
      {!immediate && <p className="muted">Answers and explanations appear after submission. Unanswered questions count as incorrect.</p>}
    </div>
    {index < attempt.questionOrder.length - 1 && !immediate && <button className="button ghost" onClick={submit}>Submit now ({attempt.questionOrder.length - answered - attempt.excludedIds.filter(id => !attempt.answers[id]).length} unanswered)</button>}
  </div>;
}
