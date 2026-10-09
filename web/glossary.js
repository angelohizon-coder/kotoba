/* Background-word help uses the local course dictionary and protects assessment clues. */
(function (global) {
  'use strict';
  const content = global.KotobaContent;
  const vocabulary = content.vocabulary;
  const wordMap = new Map(vocabulary.map(entry => [entry.id, entry]));
  const grammarMap = new Map(content.grammar.map(entry => [entry.id, entry]));
  const han = /[\p{Script=Han}々]/u;
  const katakana = /[\p{Script=Katakana}ー]/u;
  const hiragana = /\p{Script=Hiragana}/u;
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ja', { granularity: 'word' }) : null;
  const normalize = text => String(text ?? '').normalize('NFKC');
  // Readings are exclusion aliases, never substring lookup keys in Japanese sentences.
  const aliases = new Map(vocabulary.map(entry => {
    const forms = [entry.word, entry.reading];
    if (/godan|ichidan|い-adjective/.test(entry.wordClass)) {
      const stem = entry.word.slice(0, -1);
      if (han.test(stem) || stem.length >= 3) forms.push(stem);
    }
    return [entry.id, [...new Set(forms.map(normalize).filter(Boolean))]];
  }));
  const starts = new Map();
  for (const entry of vocabulary) {
    if (!entry.word) continue;
    const first = entry.word[0];
    if (!starts.has(first)) starts.set(first, []);
    starts.get(first).push(entry);
  }
  for (const entries of starts.values()) entries.sort((a, b) => b.word.length - a.word.length);

  function protection(question) {
    const target = wordMap.get(question.vocabularyId);
    const pattern = grammarMap.get(question.grammarId);
    const prompt = String(question.prompt ?? '');
    const markedTerms = Array.from(prompt.matchAll(/【([^【】]+)】/gu), match => match[1]);
    const quotedTerms = [
      ...Array.from(prompt.matchAll(/「([^「」]+)」/gu), match => match[1]),
      ...Array.from(prompt.matchAll(/『([^『』]+)』/gu), match => match[1]),
    ].filter(term => term.length <= 12 && !/[。！？【】]/u.test(term));
    const sources = [
      ...(question.options ?? []).map(option => option.text),
      question.evidence,
      ...(question.ordering?.fragments ?? []),
      pattern?.title,
      ...(pattern?.attachment ?? []),
      ...markedTerms, ...quotedTerms,
    ].filter(Boolean).map(normalize);
    const ids = new Set(target ? [target.id] : []);
    for (const entry of vocabulary) {
      if (sources.some(source => aliases.get(entry.id).some(alias => source.includes(alias)))) ids.add(entry.id);
    }
    return ids;
  }

  function tokens(text, question, options = {}) {
    const source = String(text ?? '');
    const plain = () => [{ text: source }];
    if (!question || !['vocabulary', 'kanji', 'grammar', 'reading', 'listening'].includes(question.skill)) return plain();
    const pending = [];
    if (!options.allowTargets) pending.push(question);
    for (const other of options.relatedQuestions ?? []) {
      if (other.id !== question.id && !pending.some(item => item.id === other.id)) pending.push(other);
    }
    // Fail closed when the metadata cannot identify what is being assessed.
    if (pending.some(item =>
      ['vocabulary', 'kanji'].includes(item.skill) && !wordMap.has(item.vocabularyId) ||
      item.skill === 'grammar' && !grammarMap.has(item.grammarId) ||
      ['reading', 'listening'].includes(item.skill) && !item.evidence
    )) return plain();
    const protectedIds = new Set(pending.flatMap(item => [...protection(item)]));
    return matchWords(source, protectedIds);
  }

  // Study passages have no active answer to protect. Keep this entry point
  // separate so assessed questions continue through their metadata safeguards.
  function studyTokens(text) {
    return matchWords(String(text ?? ''), new Set());
  }

  function matchWords(source, protectedIds) {
    let boundaries;
    if (segmenter) {
      boundaries = new Set([0, source.length]);
      for (const part of segmenter.segment(source)) {
        boundaries.add(part.index);
        boundaries.add(part.index + part.segment.length);
      }
    }
    const result = [];
    const addPlain = part => {
      if (!part) return;
      const last = result[result.length - 1];
      if (last && !last.entry) last.text += part;
      else result.push({ text: part });
    };
    let index = 0;
    while (index < source.length) {
      const entry = (starts.get(source[index]) ?? []).find(candidate => {
        if (!source.startsWith(candidate.word, index)) return false;
        const end = index + candidate.word.length;
        const previous = source[index - 1] ?? '';
        const next = source[end] ?? '';
        // Avoid dictionary fragments inside a different compound, e.g. 部屋 in 部屋着.
        if (han.test(candidate.word[0]) && han.test(previous) || han.test(candidate.word.at(-1)) && han.test(next)) return false;
        if (katakana.test(candidate.word[0]) && katakana.test(previous) || katakana.test(candidate.word.at(-1)) && katakana.test(next)) return false;
        if (boundaries && (!boundaries.has(index) || !boundaries.has(end))) return false;
        if (!boundaries && !han.test(candidate.word) && !katakana.test(candidate.word) && (hiragana.test(previous) || hiragana.test(next))) return false;
        return true;
      });
      if (!entry) { addPlain(source[index]); index++; continue; }
      if (protectedIds.has(entry.id)) addPlain(entry.word);
      else result.push({ text: entry.word, entry });
      index += entry.word.length;
    }
    return result.length ? result : [{ text: source }];
  }
  global.KotobaGlossary = { tokens, studyTokens };
})(window);
