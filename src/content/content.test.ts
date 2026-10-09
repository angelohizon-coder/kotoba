import { describe, expect, it } from 'vitest';
import { CONTENT_VERSION, grammar, kanji, listening, questions, readings, vocabulary } from './index';

// These expectations were solved from the Japanese independently of the seed's
// numeric key positions. They catch an accidental key change when content moves.
const independentlySolvedAnswers: Record<string, string> = {
  'q-v-01': '変更',
  'q-v-02': '連絡',
  'q-v-03': '費用',
  'q-v-04': '申し込んで',
  'q-v-05': '間に合う',
  'q-v-06': '乾く',
  'q-v-07': '中止',
  'q-v-08': '比べて',
  'q-k-01': 'まにあう',
  'q-k-02': 'かくにん',
  'q-k-03': 'じゅんび',
  'q-k-04': 'へる',
  'q-g-01': '働く',
  'q-g-02': '明日の会議を行わないという決定があった。',
  'q-g-03': '働く',
  'q-g-04': '食べる',
  'q-g-05': '飲まない',
  'q-g-06': '捨てて',
  'q-g-07': '宿題を全部終えました。',
  'q-g-08': 'このケーキはおいしそうです。',
  'q-g-09': '学生だ',
  'q-g-10': 'よさ',
  'q-g-11': '温かい',
  'q-g-12': '内容を',
  'q-r-01': '交流会を行う場所が変わったこと',
  'q-r-02': '参加できなくなった人',
  'q-r-03': '２階の読書室を利用すること',
  'q-r-04': '入口のボックスに本を返す。',
  'q-r-05': 'スマートフォンでニュースを読んでいるうちに、時間が過ぎたから。',
  'q-r-06': '歩いた後、１０分だけ読む。',
  'q-r-07': '傘を見て、修理できるか確認すること',
  'q-r-08': '営業時間内に、傘そのものを持って行く。',
  'q-l-01': '午前１１時',
  'q-l-02': '新しい商品の写真',
  'q-l-03': '土曜日の午後３時',
  'q-l-04': '靴を受け取るとき',
};

const solvedOrdering: Record<string, string[]> = {
  'q-g-03': ['新しい', '会社で', '働く', 'こと'],
  'q-g-12': ['うちに', '大切な', '内容を', 'メモして'],
};

describe('original starter content', () => {
  it('meets starter targets and includes every supported passage type and skill', () => {
    expect(CONTENT_VERSION).toMatch(/^\d{4}\.\d{2}\.\d+$/);
    expect(vocabulary.length).toBeGreaterThanOrEqual(24);
    expect(kanji.length).toBeGreaterThanOrEqual(12);
    expect(grammar.length).toBeGreaterThanOrEqual(5);
    expect(readings.length).toBeGreaterThanOrEqual(3);
    expect(listening.length).toBeGreaterThanOrEqual(2);
    expect(questions.length).toBeGreaterThanOrEqual(30);
    expect(new Set(readings.map(passage => passage.type))).toEqual(new Set(['email', 'notice', 'article', 'advertisement']));
    const counts = questions.reduce<Record<string, number>>((all, question) => {
      all[question.skill] = (all[question.skill] ?? 0) + 1;
      return all;
    }, {});
    expect(counts).toEqual({ vocabulary: 8, kanji: 4, grammar: 12, reading: 8, listening: 4 });
  });

  it('uses stable, globally unique content and option IDs', () => {
    const content = [...vocabulary, ...kanji, ...grammar, ...readings, ...listening, ...questions];
    const ids = content.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach(id => expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)+$/));
    const optionIds = questions.flatMap(question => question.options.map(option => option.id));
    expect(new Set(optionIds).size).toBe(optionIds.length);
    questions.forEach(question => {
      expect(question.options.map(option => option.id)).toEqual(['a', 'b', 'c', 'd'].map(letter => `${question.id}-${letter}`));
    });
  });

  it('supplies complete Japanese vocabulary and teaches each kanji through a real word', () => {
    vocabulary.forEach(word => {
      expect(word.word.trim()).not.toBe('');
      expect(word.reading).toMatch(/^[\u3041-\u3096ー]+$/);
      expect(word.meaning.trim()).not.toBe('');
      expect(word.wordClass.trim()).not.toBe('');
      expect(word.example).toMatch(/[\u3041-\u30ff\u3400-\u9fff]/);
      expect(word.exampleTranslation.trim()).not.toBe('');
      expect(['review', 'N3-style', 'extension']).toContain(word.level);
    });
    expect(vocabulary.some(word => word.level === 'review')).toBe(true);
    kanji.forEach(entry => {
      expect([...entry.character]).toHaveLength(1);
      expect(entry.meaning.trim()).not.toBe('');
      expect(entry.wordIds.length).toBeGreaterThan(0);
      expect(new Set(entry.wordIds).size).toBe(entry.wordIds.length);
      entry.wordIds.forEach(id => {
        const word = vocabulary.find(word => word.id === id);
        expect(word, `${entry.id} references ${id}`).toBeDefined();
        expect(word?.word).toContain(entry.character);
      });
    });
  });

  it('provides complete lessons, translations and accessible scripts', () => {
    grammar.forEach(lesson => {
      expect(lesson.title.trim()).not.toBe('');
      expect(lesson.meaning.trim()).not.toBe('');
      expect(lesson.attachment.length).toBeGreaterThan(0);
      expect(lesson.examples.length).toBeGreaterThanOrEqual(2);
      lesson.examples.forEach(example => {
        expect(example.ja.trim()).not.toBe('');
        expect(example.en.trim()).not.toBe('');
      });
      Object.values(lesson.mistake).forEach(value => expect(value.trim()).not.toBe(''));
      expect(lesson.mistake.wrong).not.toBe(lesson.mistake.correct);
      expect(lesson.comparison.trim()).not.toBe('');
    });
    readings.forEach(passage => {
      expect(passage.title.trim()).not.toBe('');
      expect(passage.body.trim()).not.toBe('');
      expect(passage.translation.trim()).not.toBe('');
    });
    listening.forEach(conversation => {
      expect(conversation.title.trim()).not.toBe('');
      expect(conversation.script).toMatch(/.+：.+\n.+：.+/);
      expect(conversation.translation.trim()).not.toBe('');
    });
  });

  it('has four nonempty, distinct choices, exactly one mapped key and an explanation for every option', () => {
    questions.forEach(question => {
      expect(question.prompt.trim(), question.id).not.toBe('');
      expect(question.options, question.id).toHaveLength(4);
      const texts = question.options.map(option => option.text.normalize('NFKC').trim());
      expect(texts.every(Boolean), question.id).toBe(true);
      expect(new Set(texts).size, question.id).toBe(4);
      expect(question.options.filter(option => option.id === question.correctOptionId), question.id).toHaveLength(1);
      expect(new Set(Object.keys(question.explanations)), question.id).toEqual(new Set(question.options.map(option => option.id)));
      question.options.forEach(option => expect(question.explanations[option.id].trim().length, `${question.id}: ${option.id}`).toBeGreaterThan(20));
    });
  });

  it('matches all 36 independently solved answers and explicitly disambiguates both そう meanings', () => {
    expect(Object.keys(independentlySolvedAnswers).sort()).toEqual(questions.map(question => question.id).sort());
    questions.forEach(question => {
      const correct = question.options.find(option => option.id === question.correctOptionId);
      expect(correct?.text, question.id).toBe(independentlySolvedAnswers[question.id]);
    });
    expect(questions.find(question => question.id === 'q-g-08')?.prompt).toContain('見た目');
    expect(questions.find(question => question.id === 'q-g-09')?.prompt).toContain('田中さんの話では');
    expect(questions.find(question => question.id === 'q-g-10')?.prompt).toContain('見た印象');
  });

  it('resolves links in both directions and links every passage to its own questions', () => {
    questions.forEach(question => {
      if (question.skill === 'vocabulary' || question.skill === 'kanji') {
        expect(vocabulary.some(word => word.id === question.vocabularyId), question.id).toBe(true);
      }
      if (question.skill === 'grammar') {
        expect(grammar.some(lesson => lesson.id === question.grammarId && lesson.questionIds.includes(question.id)), question.id).toBe(true);
      }
      if (question.skill === 'reading') {
        expect(readings.some(passage => passage.id === question.passageId && passage.questionIds.includes(question.id)), question.id).toBe(true);
      }
      if (question.skill === 'listening') {
        expect(listening.some(script => script.id === question.listeningId && script.questionIds.includes(question.id)), question.id).toBe(true);
      }
    });
    for (const lesson of [...grammar, ...readings, ...listening]) {
      expect(lesson.questionIds.length).toBeGreaterThan(0);
      expect(new Set(lesson.questionIds).size).toBe(lesson.questionIds.length);
      lesson.questionIds.forEach(id => {
        const question = questions.find(question => question.id === id);
        expect(question, `${lesson.id}: ${id}`).toBeDefined();
        expect(question?.grammarId ?? question?.passageId ?? question?.listeningId).toBe(lesson.id);
      });
    }
  });

  it('quotes evidence that actually appears in the referenced reading or listening text', () => {
    questions.filter(question => question.skill === 'reading' || question.skill === 'listening').forEach(question => {
      expect(question.evidence?.trim(), question.id).toBeTruthy();
      const source = question.passageId
        ? readings.find(passage => passage.id === question.passageId)?.body
        : listening.find(script => script.id === question.listeningId)?.script;
      const evidence = question.evidence ?? '';
      if (!source?.includes(evidence)) {
        const quotes = [...evidence.matchAll(/「([^」]+)」/g)].map(match => match[1]);
        expect(quotes.length, question.id).toBeGreaterThan(0);
        quotes.forEach(quote => expect(source, question.id).toContain(quote));
      }
    });
  });

  it.each(Object.entries(solvedOrdering))('reconstructs %s and maps the exact marked fragment by ID', (id, solution) => {
    const question = questions.find(question => question.id === id)!;
    const ordering = question.ordering!;
    expect(ordering.fragments).toHaveLength(4);
    expect(new Set(ordering.fragments)).toEqual(new Set(solution));
    expect(new Set(question.options.map(option => option.text))).toEqual(new Set(solution));
    const template = question.prompt.split('\n').at(-1)!;
    const slots = [...template.matchAll(/＿＿|★/g)];
    expect(slots).toHaveLength(4);
    expect(slots.filter(slot => slot[0] === '★')).toHaveLength(1);
    expect(ordering.target).toBe(slots.findIndex(slot => slot[0] === '★'));
    let slotIndex = 0;
    const complete = template.replace(/＿＿|★/g, () => solution[slotIndex++]).replace(/　/g, '');
    expect(complete).toBe(ordering.completed);
    const correct = question.options.find(option => option.id === question.correctOptionId);
    expect(correct?.text).toBe(solution[ordering.target]);
    // The keyed fragment still matches after display options change positions.
    const reorderedOptions = [...question.options].reverse();
    expect(reorderedOptions.find(option => option.id === question.correctOptionId)?.text).toBe(solution[ordering.target]);
  });
});
