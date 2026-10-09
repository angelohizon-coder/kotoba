// Offline checks against the browser glossary and the actual course dictionary.
// Uses only built-in Node APIs; no npm or external dictionary is required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const contentSource = readFileSync(new URL('../web/content.js', import.meta.url), 'utf8');
const glossarySource = readFileSync(new URL('../web/glossary.js', import.meta.url), 'utf8');

function load(withSegmenter = true) {
  const context = vm.createContext({ window: {}, Intl: withSegmenter ? Intl : {} });
  vm.runInContext(contentSource, context, { filename: 'web/content.js' });
  vm.runInContext(glossarySource, context, { filename: 'web/glossary.js' });
  return { content: context.window.KotobaContent, tokens: context.window.KotobaGlossary.tokens };
}

const { content, tokens } = load();
const questions = new Map(content.questions.map(question => [question.id, question]));
const words = new Map(content.vocabulary.map(entry => [entry.word, entry]));
const question = id => {
  assert.ok(questions.has(id), `Missing real course fixture: ${id}`);
  return questions.get(id);
};
const glossed = parts => Array.from(parts).filter(part => part.entry).map(part => part.entry.word);
const reconstruct = parts => Array.from(parts, part => part.text).join('');
function containsAll(parts, expected) {
  const shown = new Set(glossed(parts));
  for (const word of expected) assert.ok(shown.has(word), `Expected background definition for ${word}; got ${[...shown].join(', ')}`);
}
function excludesAll(parts, expected) {
  const shown = new Set(glossed(parts));
  for (const word of expected) assert.ok(!shown.has(word), `Protected word exposed: ${word}`);
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
let checks = 0;
function check(label, run) {
  run();
  checks++;
  console.log('PASS ' + label);
}

check('grammar prompts define useful background words from the course dictionary', () => {
  const item = question('q-g-01');
  containsAll(tokens(item.prompt, item), ['相談']);
  const health = question('q-g-04');
  containsAll(tokens(health.prompt, health), ['健康']);
});

check('a kanji reading target stays protected in both its word and kana forms', () => {
  const item = question('q-k-02');
  const source = item.prompt + '\n確認、かくにん。';
  const parts = tokens(source, item);
  containsAll(parts, ['予約']);
  excludesAll(parts, ['確認']);
  assert.ok(!Array.from(parts).some(part => part.entry && part.text === 'かくにん'));
  assert.equal(reconstruct(parts), source);
});

check('kana orthography targets cannot reveal their dictionary spelling', () => {
  const item = question('qx-spelling-daily-change-clothes');
  const source = item.prompt + '\nきがえる。着替える。';
  excludesAll(tokens(source, item), ['着替える']);
  assert.ok(!Array.from(tokens(source, item)).some(part => part.entry && part.text === 'きがえる'));
});

check('conjugated distractors also protect their dictionary forms', () => {
  const item = question('q-v-04');
  assert.ok(item.options.some(option => option.text === '戻って'));
  assert.ok(item.options.some(option => option.text === '乾いて'));
  assert.ok(item.options.some(option => option.text === '減って'));
  const source = '戻る。乾く。減る。申し込む。相談。';
  const parts = tokens(source, item);
  excludesAll(parts, ['戻る', '乾く', '減る', '申し込む']);
  containsAll(parts, ['相談']);
});

check('reading examples protect their target while allowing a background verb', () => {
  const item = question('qx-reading-people-couple');
  const parts = tokens(item.prompt, item);
  containsAll(parts, ['散歩']);
  excludesAll(parts, ['夫婦', '夫']);
});

check('compound boundaries avoid false definitions from smaller dictionary words', () => {
  const item = question('q-g-01');
  const compounds = tokens('部屋着。会議室。手伝える。', item);
  excludesAll(compounds, ['部屋', '会議', '伝える']);
  const source = '窓口。夫婦。窓。夫。部屋。伝える。';
  const parts = tokens(source, item);
  assert.deepEqual(glossed(parts), ['窓口', '夫婦', '窓', '夫', '部屋', '伝える']);
  assert.equal(reconstruct(parts), source);
});

check('kana words are defined as whole words rather than matching kana fragments', () => {
  const item = question('q-g-01');
  const parts = tokens('しょうゆ。けが。うわさ。しばらく。しょうゆう。けがれ。', item);
  assert.deepEqual(glossed(parts), ['しょうゆ', 'けが', 'うわさ', 'しばらく']);
});

check('dictionary readings are not lookup keys inside unrelated kana text', () => {
  const item = question('q-g-01');
  const parts = tokens('予約。よやく。連絡。れんらく。', item);
  assert.deepEqual(glossed(parts), ['予約', '連絡']);
  for (const part of parts) if (part.entry) assert.equal(part.text, part.entry.word);
});

check('a reading passage defines background words and hides its answer evidence', () => {
  const item = question('q-r-01');
  const passage = content.readings.find(entry => entry.id === item.passageId);
  const parts = tokens(passage.body, item);
  containsAll(parts, ['準備', '都合', '連絡']);
  excludesAll(parts, ['変更', '予定', '公園', '市民', '午後', '必要']);
  assert.equal(reconstruct(parts), passage.body);
});

check('pending questions sharing a passage protect their evidence and choices too', () => {
  const item = question('q-r-01');
  const next = question('q-r-02');
  assert.equal(item.passageId, next.passageId);
  const passage = content.readings.find(entry => entry.id === item.passageId);
  const parts = tokens(passage.body, item, { relatedQuestions: [next] });
  excludesAll(parts, ['都合', '連絡', '参加', '準備', '変更', '予定']);
  assert.equal(reconstruct(parts), passage.body);
});

check('long information passages still offer useful background definitions', () => {
  const item = question('qrx-buses-2');
  const passage = content.readings.find(entry => entry.id === item.passageId);
  const parts = tokens(passage.body, item);
  containsAll(parts, ['現金', '荷物', '停留所']);
  excludesAll(parts, ['出発']);
  assert.equal(reconstruct(parts), passage.body);
});

check('listening-script study helps background words without defining timing evidence', () => {
  const item = question('q-l-01');
  const script = content.listening.find(entry => entry.id === item.listeningId).script;
  const parts = tokens(script, item);
  containsAll(parts, ['写真', '印刷', '準備']);
  excludesAll(parts, ['変更', '午前', '午後']);
  assert.equal(reconstruct(parts), script);
});

check('checked questions unlock their target definitions for review', () => {
  const item = question('qx-reading-people-couple');
  excludesAll(tokens(item.prompt, item), ['夫婦']);
  containsAll(tokens(item.prompt, item, { allowTargets: true }), ['夫婦', '散歩']);
});

check('unlocking a checked item preserves protections for pending shared questions', () => {
  const item = question('q-r-01');
  const next = question('q-r-02');
  const parts = tokens('変更。都合。連絡。準備。', item, { allowTargets: true, relatedQuestions: [next] });
  containsAll(parts, ['変更']);
  excludesAll(parts, ['都合', '連絡', '準備']);
});

check('missing assessment metadata fails closed rather than guessing safe words', () => {
  const source = '相談。予約。変更。';
  const incomplete = [
    { ...question('q-k-02'), vocabularyId: undefined },
    { ...question('q-v-04'), vocabularyId: 'unknown-word' },
    { ...question('q-g-01'), grammarId: undefined },
    { ...question('q-r-01'), evidence: undefined },
    { ...question('q-l-01'), evidence: '' },
    { ...question('q-g-01'), skill: 'unknown-skill' },
    null,
  ];
  for (const item of incomplete) {
    const parts = tokens(source, item);
    assert.deepEqual(glossed(parts), []);
    assert.equal(reconstruct(parts), source);
  }
  const unknownPending = { ...question('q-r-02'), evidence: undefined };
  assert.deepEqual(glossed(tokens(source, question('q-r-01'), { relatedQuestions: [unknownPending] })), []);
});

check('browsers without Japanese segmentation retain conservative kana boundaries', () => {
  const fallback = load(false);
  const item = fallback.content.questions.find(entry => entry.id === 'q-g-01');
  const source = '相談。窓口。部屋着。けが。けがれ。しょうゆ。しょうゆう。';
  const parts = fallback.tokens(source, item);
  containsAll(parts, ['相談', '窓口', 'けが', 'しょうゆ']);
  excludesAll(parts, ['部屋']);
  assert.equal(glossed(parts).filter(word => word === 'けが').length, 1);
  assert.equal(glossed(parts).filter(word => word === 'しょうゆ').length, 1);
  assert.equal(reconstruct(parts), source);
});

check('every original course prompt and passage preserves its complete visible text', () => {
  for (const item of content.questions) {
    assert.equal(reconstruct(tokens(item.prompt, item)), item.prompt, item.id);
    if (item.passageId) {
      const source = content.readings.find(entry => entry.id === item.passageId).body;
      assert.equal(reconstruct(tokens(source, item)), source, item.id + ' passage');
    }
    if (item.listeningId) {
      const source = content.listening.find(entry => entry.id === item.listeningId).script;
      assert.equal(reconstruct(tokens(source, item)), source, item.id + ' script');
    }
  }
  for (const source of ['', '🍙 相談\r\n予約\t１２３', '<script>相談</script> & "予約"']) {
    assert.equal(reconstruct(tokens(source, question('q-g-01'))), source);
  }
});

check('glossary lookups do not mutate the dictionary, questions, or caller options', () => {
  const snapshot = JSON.stringify(content);
  freeze(content);
  const item = question('q-r-01');
  const options = freeze({ allowTargets: false, relatedQuestions: [question('q-r-02')] });
  const optionsBefore = JSON.stringify(options);
  tokens('相談。予約。都合。', item, options);
  assert.equal(JSON.stringify(content), snapshot);
  assert.equal(JSON.stringify(options), optionsBefore);
  for (const part of tokens('相談。', question('q-g-01'))) {
    if (part.entry) assert.equal(part.entry, words.get(part.text));
  }
});

console.log(`${checks} glossary checks passed. Assessment-mode gating and tooltip interaction are covered by the browser journeys.`);
