import type { Kanji, Question, Vocabulary } from '../types';

// Vocabulary retrieval is an original dictionary/context adaptation. These are
// not copied textbook exercises or a historical JLPT question-format blueprint.
export function buildDatasetWordQuestions(words: Vocabulary[]): Question[] {
  const result: Question[] = [];
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const terms = (value: string) => new Set(normalize(value).split(' ').filter(t => t.length > 2 && !['the','and','with','from','that','for','one','ones','something','someone'].includes(t)));
  for (const [index, word] of words.entries()) {
    const sameLevel = words.filter(other => other.id !== word.id && other.jlptLevel === word.jlptLevel);
    const ordered = sameLevel.slice(index % Math.max(1, sameLevel.length)).concat(sameLevel.slice(0, index % Math.max(1, sameLevel.length)));
    const targetTerms = terms(word.meaning), targetMeaning = normalize(word.meaning);
    const meanings: Vocabulary[] = [];
    for (const other of ordered) {
      const meaning = normalize(other.meaning);
      if (meaning === targetMeaning || meaning.includes(targetMeaning) || targetMeaning.includes(meaning)) continue;
      if ([...terms(other.meaning)].some(term => targetTerms.has(term))) continue;
      if (meanings.some(item => item.meaning === other.meaning)) continue;
      meanings.push(other); if (meanings.length === 3) break;
    }
    if (meanings.length !== 3) throw new Error('Insufficient distinct context distractors for ' + word.id);
    const contextId = word.id.replace('ds-v-', 'ds-q-v-');
    const options = [word, ...meanings].map((item, i) => ({ id: contextId + '-' + 'abcd'[i], text: item.meaning }));
    result.push({ id: contextId, skill: 'vocabulary', questionType: 'vocabulary-context', vocabularyId: word.id,
      jlptLevel: word.jlptLevel, topicId: word.topicId,
      prompt: `文の中の「${word.word}」の意味はどれですか。\n${word.example}`,
      options, correctOptionId: options[0].id,
      explanations: Object.fromEntries([word, ...meanings].map((item, i) => [options[i].id, i === 0
        ? `${word.word} can mean “${word.meaning}”. In this sentence: ${word.exampleTranslation}`
        : `This describes ${item.word} (${item.reading}), not ${word.word} in this sentence. Dictionary meanings of the target: “${word.meaning}”. In this sentence: ${word.exampleTranslation}`])) });
    if (!/\p{Script=Han}/u.test(word.word)) continue;
    const readings: Vocabulary[] = [];
    for (const other of ordered) {
      if (other.reading === word.reading || readings.some(item => item.reading === other.reading)) continue;
      readings.push(other); if (readings.length === 3) break;
    }
    if (readings.length !== 3) throw new Error('Insufficient distinct reading distractors for ' + word.id);
    const readingId = word.id.replace('ds-v-', 'ds-q-k-');
    const readingOptions = [word, ...readings].map((item, i) => ({ id: readingId + '-' + 'abcd'[i], text: item.reading }));
    result.push({ id: readingId, skill: 'kanji', questionType: 'kanji-reading', vocabularyId: word.id,
      jlptLevel: word.jlptLevel, topicId: word.topicId,
      prompt: `文の中の「${word.word}」は、どう読みますか。\n${word.example}`,
      options: readingOptions, correctOptionId: readingOptions[0].id,
      explanations: Object.fromEntries([word, ...readings].map((item, i) => [readingOptions[i].id, i === 0
        ? `${word.word} is read ${word.reading}. Read the complete word in context; a character can have different readings in other words.`
        : `${item.reading} is the reading of ${item.word}; the word asked about is ${word.word}, read ${word.reading}.`])) });
  }
  return result;
}

export function withDatasetKanji(existing: Kanji[], words: Vocabulary[]): Kanji[] {
  const result = existing.map(item => ({ ...item, wordIds: [...item.wordIds] }));
  const byCharacter = new Map(result.map(item => [item.character, item]));
  for (const word of words) for (const character of new Set([...word.word].filter(char => /\p{Script=Han}/u.test(char)))) {
    const present = byCharacter.get(character);
    if (present) {
      if (!present.wordIds.includes(word.id)) present.wordIds.push(word.id);
    } else {
      const item = { id: 'ds-k-' + character.codePointAt(0)!.toString(16), character,
        meaning: 'Read in linked words: ' + word.meaning, wordIds: [word.id], topicId: word.topicId, jlptLevel: word.jlptLevel };
      byCharacter.set(character, item); result.push(item);
    }
  }
  return result;
}
