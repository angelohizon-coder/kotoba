import type { Grammar, Kanji, Listening, Question, Reading, Skill, Vocabulary } from '../types';
import { expandedVocabulary, expandedKanji, expandedVocabularyQuestions } from './expanded-vocabulary';
import { expandedGrammar, expandedGrammarQuestions } from './expanded-grammar';
import { expandedReadings, expandedListening, expandedPassageQuestions } from './expanded-passages';
import { topics as courseTopics, questionTypes as courseQuestionTypes } from './course';
import { studyReferences as courseReferences, studyPlan as coursePlan } from './references';
import { foundationVocabulary, foundationGrammar, foundationReadings, foundationListening, foundationQuestions, withFoundationKanji, foundationLevels as reviewLevels, foundationScopeNote as reviewScopeNote } from './foundation-review';
import { advancedVocabulary, advancedGrammar, advancedReadings, advancedListening, advancedQuestions, withAdvancedKanji, advancedLevels as higherLevels, advancedScopeNote as higherScopeNote } from './advanced-review';
import { buildLearningPath } from './learning-path';
import { datasetFoundationVocabulary, datasetFoundationGrammar, datasetFoundationReadings, datasetFoundationListening, datasetFoundationQuestions } from './dataset-foundations';
import { datasetIntermediateVocabulary, datasetIntermediateGrammar, datasetIntermediateReadings, datasetIntermediateListening, datasetIntermediateQuestions } from './dataset-intermediate';
import { datasetAdvancedVocabulary, datasetAdvancedGrammar, datasetAdvancedReadings, datasetAdvancedListening, datasetAdvancedQuestions } from './dataset-advanced';
import { buildDatasetWordQuestions, withDatasetKanji } from './dataset-builders';
import { extendDatasetPaths } from './dataset-path';
import { buildDatasetSources, buildDatasetInventory, buildDatasetAssociations, datasetSourcePolicy as sourcePolicy, datasetSourceCheckedAt as sourceCheckedAt } from './dataset-sources';
import { referenceMap as skillReferenceMap, referenceMapCheckedAt as skillMapCheckedAt, referenceScopeNote as skillReferenceScopeNote } from './reference-map';
export type { ReferenceMapEntry } from './reference-map';

// Original, broad N3 study coverage. The JLPT does not publish an exhaustive item syllabus.
export const CONTENT_VERSION = '2026.10.5';

const baseVocabulary: Vocabulary[] = [
  { id: 'v-plan', word: '予定', reading: 'よてい', meaning: 'plan; schedule', wordClass: 'noun', example: '明日は友達と会う予定です。', exampleTranslation: 'I plan to meet a friend tomorrow.', level: 'review' },
  { id: 'v-change', word: '変更', reading: 'へんこう', meaning: 'change; alteration', wordClass: 'noun / する verb', example: '予約の時間を変更しました。', exampleTranslation: 'I changed the reservation time.', level: 'N3-style' },
  { id: 'v-availability', word: '都合', reading: 'つごう', meaning: 'availability; circumstances', wordClass: 'noun', example: '金曜日は都合が悪いです。', exampleTranslation: 'Friday does not work for me.', level: 'N3-style' },
  { id: 'v-participate', word: '参加', reading: 'さんか', meaning: 'participation', wordClass: 'noun / する verb', example: '来週のイベントに参加します。', exampleTranslation: 'I will take part in next week’s event.', level: 'N3-style' },
  { id: 'v-contact', word: '連絡', reading: 'れんらく', meaning: 'contact; notification', wordClass: 'noun / する verb', example: '遅れる場合は、先生に連絡してください。', exampleTranslation: 'If you will be late, contact the teacher.', level: 'review' },
  { id: 'v-cancel', word: '中止', reading: 'ちゅうし', meaning: 'cancellation; calling something off', wordClass: 'noun / する verb', example: '雨のため、試合は中止になりました。', exampleTranslation: 'The match was canceled because of rain.', level: 'N3-style' },
  { id: 'v-prepare', word: '準備', reading: 'じゅんび', meaning: 'preparation', wordClass: 'noun / する verb', example: '旅行の準備をしています。', exampleTranslation: 'I am preparing for a trip.', level: 'review' },
  { id: 'v-replacement', word: '代わり', reading: 'かわり', meaning: 'replacement; substitute', wordClass: 'noun', example: '田中さんの代わりに、私が会議に出ます。', exampleTranslation: 'I will attend the meeting in Tanaka’s place.', level: 'N3-style' },
  { id: 'v-guide', word: '案内', reading: 'あんない', meaning: 'guidance; information; showing someone around', wordClass: 'noun / する verb', example: '係の人が会場まで案内してくれました。', exampleTranslation: 'A staff member showed me the way to the venue.', level: 'N3-style' },
  { id: 'v-confirm', word: '確認', reading: 'かくにん', meaning: 'checking; confirmation', wordClass: 'noun / する verb', example: '送る前に、メールの内容を確認します。', exampleTranslation: 'I check the contents of the email before sending it.', level: 'N3-style' },
  { id: 'v-late', word: '遅れる', reading: 'おくれる', meaning: 'to be late; to be delayed', wordClass: 'ichidan verb (intransitive)', example: '電車が遅れて、授業に間に合いませんでした。', exampleTranslation: 'The train was delayed, and I did not make it to class on time.', level: 'review' },
  { id: 'v-on-time', word: '間に合う', reading: 'まにあう', meaning: 'to make it in time; to be enough for a purpose', wordClass: 'godan verb (intransitive)', example: '急いだので、午後２時のバスに間に合いました。', exampleTranslation: 'I hurried, so I made it in time for the 2 p.m. bus.', level: 'N3-style' },
  { id: 'v-arrive', word: '届く', reading: 'とどく', meaning: 'to arrive; to reach', wordClass: 'godan verb (intransitive)', example: '注文した本が昨日届きました。', exampleTranslation: 'The book I ordered arrived yesterday.', level: 'N3-style' },
  { id: 'v-continue', word: '続ける', reading: 'つづける', meaning: 'to continue something; to keep doing', wordClass: 'ichidan verb (transitive)', example: '忙しくても、日本語の勉強を続けたいです。', exampleTranslation: 'Even when I am busy, I want to keep studying Japanese.', level: 'N3-style' },
  { id: 'v-choose', word: '選ぶ', reading: 'えらぶ', meaning: 'to choose; to select', wordClass: 'godan verb (transitive)', example: '軽くて丈夫なかばんを選びました。', exampleTranslation: 'I chose a light, sturdy bag.', level: 'review' },
  { id: 'v-necessary', word: '必要', reading: 'ひつよう', meaning: 'necessary; necessity', wordClass: 'noun / な-adjective', example: 'この手続きには身分証明書が必要です。', exampleTranslation: 'An identity document is necessary for this procedure.', level: 'review' },
  { id: 'v-reason', word: '理由', reading: 'りゆう', meaning: 'reason', wordClass: 'noun', example: '遅れた理由を説明しました。', exampleTranslation: 'I explained the reason I was late.', level: 'review' },
  { id: 'v-reception', word: '受付', reading: 'うけつけ', meaning: 'reception desk; reception of applications', wordClass: 'noun', example: '受付で名前を書いてください。', exampleTranslation: 'Please write your name at the reception desk.', level: 'N3-style' },
  { id: 'v-apply', word: '申し込む', reading: 'もうしこむ', meaning: 'to apply; to sign up', wordClass: 'godan verb (transitive)', example: '料理教室にインターネットで申し込みました。', exampleTranslation: 'I signed up for the cooking class online.', level: 'N3-style' },
  { id: 'v-use', word: '利用', reading: 'りよう', meaning: 'use; making use of a service or facility', wordClass: 'noun / する verb', example: '週に２回、図書館を利用しています。', exampleTranslation: 'I use the library twice a week.', level: 'N3-style' },
  { id: 'v-repair', word: '修理', reading: 'しゅうり', meaning: 'repair', wordClass: 'noun / する verb', example: '壊れた自転車を修理してもらいました。', exampleTranslation: 'I had my broken bicycle repaired.', level: 'N3-style' },
  { id: 'v-cost', word: '費用', reading: 'ひよう', meaning: 'cost; expense', wordClass: 'noun', example: '修理にかかる費用を先に確認しました。', exampleTranslation: 'I checked the repair cost in advance.', level: 'N3-style' },
  { id: 'v-deadline', word: '締め切り', reading: 'しめきり', meaning: 'deadline', wordClass: 'noun', example: '申し込みの締め切りは金曜日です。', exampleTranslation: 'The application deadline is Friday.', level: 'N3-style' },
  { id: 'v-remain', word: '残る', reading: 'のこる', meaning: 'to remain; to be left', wordClass: 'godan verb (intransitive)', example: '冷蔵庫に卵が二つ残っています。', exampleTranslation: 'There are two eggs left in the refrigerator.', level: 'N3-style' },
  { id: 'v-increase', word: '増える', reading: 'ふえる', meaning: 'to increase in number or amount', wordClass: 'ichidan verb (intransitive)', example: '駅の近くに新しい店が増えました。', exampleTranslation: 'The number of new shops near the station has increased.', level: 'N3-style' },
  { id: 'v-decrease', word: '減る', reading: 'へる', meaning: 'to decrease in number or amount', wordClass: 'godan verb (intransitive)', example: '歩くようにしたら、車に乗る回数が減りました。', exampleTranslation: 'When I made a habit of walking, the number of times I used the car decreased.', level: 'N3-style' },
  { id: 'v-return', word: '戻る', reading: 'もどる', meaning: 'to return; to go back', wordClass: 'godan verb (intransitive)', example: '忘れ物を取りに家へ戻りました。', exampleTranslation: 'I went back home to get something I had forgotten.', level: 'review' },
  { id: 'v-compare', word: '比べる', reading: 'くらべる', meaning: 'to compare', wordClass: 'ichidan verb (transitive)', example: '二つの店の値段を比べました。', exampleTranslation: 'I compared the prices at the two shops.', level: 'N3-style' },
  { id: 'v-unreasonable', word: '無理', reading: 'むり', meaning: 'unreasonable; impossible under the circumstances', wordClass: 'noun / な-adjective', example: '一人で全部終わらせるのは無理です。', exampleTranslation: 'It is impossible for one person to finish everything.', level: 'N3-style' },
  { id: 'v-dry', word: '乾く', reading: 'かわく', meaning: 'to dry; to become dry', wordClass: 'godan verb (intransitive)', example: '風が強いので、洗濯物が早く乾きました。', exampleTranslation: 'The laundry dried quickly because the wind was strong.', level: 'N3-style' },
];

const baseKanji: Kanji[] = [
  { id: 'k-yo', character: '予', meaning: 'beforehand; advance', wordIds: ['v-plan'] },
  { id: 'k-hen', character: '変', meaning: 'change; unusual', wordIds: ['v-change'] },
  { id: 'k-san', character: '参', meaning: 'participate; visit', wordIds: ['v-participate'] },
  { id: 'k-raku', character: '絡', meaning: 'connect; intertwine', wordIds: ['v-contact'] },
  { id: 'k-jun', character: '準', meaning: 'standard; preparation', wordIds: ['v-prepare'] },
  { id: 'k-kaku', character: '確', meaning: 'certain; firm', wordIds: ['v-confirm'] },
  { id: 'k-oku', character: '遅', meaning: 'late; slow', wordIds: ['v-late'] },
  { id: 'k-todo', character: '届', meaning: 'reach; deliver', wordIds: ['v-arrive'] },
  { id: 'k-tsuzu', character: '続', meaning: 'continue', wordIds: ['v-continue'] },
  { id: 'k-ma', character: '間', meaning: 'interval; space; between', wordIds: ['v-on-time'] },
  { id: 'k-he', character: '減', meaning: 'decrease', wordIds: ['v-decrease'] },
  { id: 'k-shu', character: '修', meaning: 'repair; cultivate', wordIds: ['v-repair'] },
];

const baseGrammar: Grammar[] = [
  {
    id: 'g-koto', title: '～ことになる',
    meaning: 'It has been decided or arranged that… Present the resulting arrangement, rather than emphasizing a person’s deliberate choice. The speaker can have participated in the decision.',
    attachment: ['For the arrangement meaning taught here: verb dictionary form + ことになる', 'For a negative arrangement: verb ない-form + ことになる', 'ことになりました reports a decision already made; the planned action can still be in the future.', 'Use ことになります / ことになりました in polite conversation; ことになる / ことになった are the corresponding plain forms. Other meanings of ことになる can have different attachment patterns.'],
    examples: [{ ja: '会場を変更することになりました。', en: 'It has been decided that we will change the venue.' }, { ja: '明日は外で練習しないことになりました。', en: 'It has been decided that we will not practice outdoors tomorrow.' }],
    mistake: { wrong: '会場を変更しますことになりました。', correct: '会場を変更することになりました。', explanation: 'Use the plain dictionary form before こと. The politeness ending goes on なりました.' },
    comparison: '～ことにする emphasizes someone’s deliberate choice: 日本語を勉強することにしました (I decided to study Japanese). ～ことになる emphasizes the resulting arrangement. Neither expression alone proves who participated in the decision.',
    questionIds: ['q-g-01', 'q-g-02', 'q-g-03'],
  },
  {
    id: 'g-you', title: '～ようにする',
    meaning: 'Make an effort to do, or avoid doing, something. ～ようにしています commonly describes a conscious, ongoing habit.',
    attachment: ['Verb dictionary form + ようにする', 'Verb ない-form + ようにする', '～ようにしてください is a polite request to make sure someone does something. ～ようにして is a casual request.'],
    examples: [{ ja: '毎日少しでも歩くようにしています。', en: 'I make a point of walking every day, even if only a little.' }, { ja: '寝る前にスマートフォンを見ないようにしています。', en: 'I make a point of not looking at my smartphone before bed.' }],
    mistake: { wrong: '毎日歩きますようにしています。', correct: '毎日歩くようにしています。', explanation: 'An intended habit takes a plain verb before ように, not the polite ます-form.' },
    comparison: '～ようにする is a conscious effort; ～ようになる describes a change in ability or behavior: 日本語の新聞が読めるようになりました (I became able to read Japanese newspapers). Making an effort does not guarantee the outcome.',
    questionIds: ['q-g-04', 'q-g-05'],
  },
  {
    id: 'g-shimau', title: '～てしまう',
    meaning: 'Finish doing something completely; or express that an action happened with an unwanted or regretful result. Context determines the nuance.',
    attachment: ['Verb て-form + しまう', 'Verb で-form + しまう (e.g. 読んでしまう)', 'しまいました is polite; しまった is plain. Casual contractions include ～ちゃう and ～じゃう; recognize them, but use the full form in these exercises.'],
    examples: [{ ja: '宿題はもう全部やってしまいました。', en: 'I have already finished all my homework.' }, { ja: '大切なメールを消してしまいました。', en: 'I accidentally deleted an important email.' }],
    mistake: { wrong: '大切なメールを消すしまいました。', correct: '大切なメールを消してしまいました。', explanation: 'しまう attaches to the て-form. 消す becomes 消して.' },
    comparison: '～終わる explicitly marks finishing an action. ～てしまう can express completion or an unwanted outcome, depending on the sentence. It does not always mean “by mistake.”',
    questionIds: ['q-g-06', 'q-g-07'],
  },
  {
    id: 'g-sou', title: '～そうだ',
    meaning: 'Appearance: “looks / seems likely…” based on signs. Hearsay: “I hear / reportedly…” repeats information from a source. Their attachment rules differ.',
    attachment: ['Appearance: verb ます-stem + そう (降りそう); い-adjective without final い + そう (おいしそう); な-adjective stem + そう (元気そう).', 'Appearance exceptions: いい → よさそう; ない → なさそう. Do not add だ before appearance そう.', 'Hearsay: plain verb or い-adjective + そうだ (降るそうだ / おいしいそうだ); noun or な-adjective + だそうだ (学生だそうだ / 元気だそうだ).', 'Hearsay retains the reported tense: 昨日は雨が降ったそうです (I heard it rained yesterday).', 'そうです is polite and そうだ is plain in both uses; the form before そう identifies the meaning.'],
    examples: [{ ja: '空が暗くなってきました。雨が降りそうです。', en: 'The sky has grown dark. It looks as though it will rain.' }, { ja: '天気予報によると、明日は雨が降るそうです。', en: 'According to the weather forecast, I hear it will rain tomorrow.' }, { ja: 'このかばんは使いやすそうです。', en: 'This bag looks easy to use.' }],
    mistake: { wrong: 'このケーキはおいしいそうです。（見た目について）', correct: 'このケーキはおいしそうです。（見た目について）', explanation: 'For appearance, remove the final い. おいしいそうです is a different, valid hearsay expression: someone says it is delicious.' },
    comparison: '降りそう describes the speaker’s judgment from signs; 降るそう reports information. Do not infer that an appearance judgment has been confirmed. A source such as 天気予報 or 田中さんの話 helps identify hearsay.',
    questionIds: ['q-g-08', 'q-g-09', 'q-g-10'],
  },
  {
    id: 'g-uchini', title: '～うちに',
    meaning: 'Do something while a condition still holds, before it changes. This lesson focuses on that window of opportunity. The expression also has other uses, such as changes that occur while an activity continues.',
    attachment: ['Verb dictionary form / ている / ない-form + うちに', 'い-adjective + うちに (温かいうちに)', 'な-adjective + な + うちに (元気なうちに)', 'Noun + の + うちに (学生のうちに)', 'The attachment before うちに stays the same in plain and polite sentences; put the polite ending on the final predicate.'],
    examples: [{ ja: 'スープが温かいうちに飲んでください。', en: 'Please drink the soup while it is still warm.' }, { ja: '忘れないうちに、予定をメモしておきます。', en: 'I will write down the plan before I forget it.' }],
    mistake: { wrong: '元気うちに旅行したいです。', correct: '元気なうちに旅行したいです。', explanation: 'A な-adjective requires な before うちに. A noun instead requires の.' },
    comparison: '～間に often means that something happens within a period. ～うちに can emphasize acting before a favorable condition changes: 明るいうちに帰る (go home before it gets dark). The two overlap in some contexts.',
    questionIds: ['q-g-11', 'q-g-12'],
  },
];

const baseReadings: Reading[] = [
  {
    id: 'r-email', title: 'A change of venue', type: 'email',
    body: '土曜日の交流会について\n\n参加する皆さんへ\n\n土曜日は雨が降る予報なので、交流会の会場を公園から市民センターの２階に変更することになりました。開始時間は予定どおり午後２時です。\n\n準備を手伝える方は、午後１時３０分に来てください。飲み物はこちらで用意するので、持ってくる必要はありません。\n\n都合が悪くなって参加できない方だけ、金曜日の午後６時までにメールで連絡してください。',
    translation: 'About Saturday’s get-together\n\nTo everyone attending:\n\nBecause rain is forecast for Saturday, we have decided to move the get-together from the park to the second floor of the civic center. The start time remains 2 p.m. as planned.\n\nIf you can help with preparations, please come at 1:30 p.m. We will provide drinks, so you do not need to bring any.\n\nOnly those whose circumstances have changed and who can no longer attend should contact us by email by 6 p.m. on Friday.',
    questionIds: ['q-r-01', 'q-r-02'],
  },
  {
    id: 'r-notice', title: 'Library renovation notice', type: 'notice',
    body: '図書館をご利用の皆さんへ\n\n１１月４日から９日まで、２階の読書室の工事を行います。この間、読書室は利用できません。１階の本の貸し出しは通常どおり行います。\n\n予約した本は、１階の受付で午前１０時から午後５時まで受け取れます。午後５時以降は受け取れませんので、ご注意ください。\n\n本を返すだけの方は、入口の返却ボックスを一日中利用できます。',
    translation: 'To library users:\n\nRenovation work will take place in the second-floor reading room from November 4 through 9. The reading room cannot be used during this period. Book lending on the first floor will operate as usual.\n\nYou can collect reserved books at the first-floor reception desk from 10 a.m. to 5 p.m. Please note that you cannot collect them after 5 p.m.\n\nIf you only need to return books, you can use the return box at the entrance at any time of day.',
    questionIds: ['q-r-03', 'q-r-04'],
  },
  {
    id: 'r-article', title: 'A small evening habit', type: 'article',
    body: '私は以前、仕事から帰ると、すぐにスマートフォンでニュースを読んでいた。しかし、画面を見ているうちに時間が過ぎて、寝るのが遅くなってしまうことが多かった。\n\nそこで、夕食の後はスマートフォンを家に置いて、近所を２０分ほど歩くようにした。初めは面倒だったが、外の空気を吸うと、仕事のことばかり考えずにすむようになった。\n\n今でもニュースは読む。ただ、歩いた後に１０分だけ読むことにしている。この小さな変化のおかげで、以前より早く寝られるようになった。',
    translation: 'I used to read news on my smartphone as soon as I got home from work. However, time would pass while I looked at the screen, and I often ended up going to bed late.\n\nSo I began making a point of leaving my smartphone at home after dinner and walking around the neighborhood for about twenty minutes. At first it felt like a bother, but breathing the outside air helped me stop thinking only about work.\n\nI still read the news. I have simply decided to read it for only ten minutes after my walk. Thanks to this small change, I can now go to bed earlier than before.',
    questionIds: ['q-r-05', 'q-r-06'],
  },
  {
    id: 'r-ad', title: 'Keep using your favorite umbrella', type: 'advertisement',
    body: 'お気に入りの傘を、もう一度\n\n傘の修理なら、駅前の「かさ工房」へ。折れた骨１本の交換は１２００円から。穴が開いた布の修理もできます。状態によって費用が変わるので、修理の前に金額をお伝えします。\n\n傘を見て、修理できるか確認するだけなら無料です。予約は必要ありません。修理を頼むかどうかは、金額を聞いてから決めてください。\n\n営業時間：午前１０時〜午後６時\n定休日：水曜日\n※傘をお持ちください。写真だけでは確認できません。',
    translation: 'Use your favorite umbrella again\n\nFor umbrella repairs, visit Kasa Kobo in front of the station. Replacing one broken rib starts at 1,200 yen. We can also repair holes in the fabric. The cost depends on the condition, so we will tell you the price before repairing it.\n\nSimply examining your umbrella to check whether it can be repaired is free. No appointment is necessary. You can decide whether to request repairs after hearing the price.\n\nOpening hours: 10 a.m.–6 p.m.\nClosed: Wednesdays\nPlease bring the umbrella. We cannot assess it from a photo alone.',
    questionIds: ['q-r-07', 'q-r-08'],
  },
];

const baseListening: Listening[] = [
  {
    id: 'l-meeting', title: 'Tomorrow’s meeting',
    script: '佐藤：明日の打ち合わせは、午前１０時からですよね。\n鈴木：山本さんがその時間に間に合わないので、１１時からに変更になりました。\n佐藤：場所も変わりますか。\n鈴木：いいえ、いつもの会議室です。資料は私が印刷しますから、佐藤さんは新しい商品の写真を持ってきてください。\n佐藤：分かりました。写真は今日中に準備しておきます。',
    translation: 'Sato: Tomorrow’s meeting starts at 10 a.m., right?\nSuzuki: Yamamoto cannot make it by that time, so it has been changed to 11 a.m.\nSato: Is the place changing too?\nSuzuki: No, it is in the usual meeting room. I will print the handouts, so please bring photos of the new product, Sato.\nSato: Understood. I will prepare the photos today.',
    questionIds: ['q-l-01', 'q-l-02'],
  },
  {
    id: 'l-repair', title: 'Collecting repaired shoes',
    script: '客：この靴の底を修理していただけますか。金曜日の夕方までに必要なんですが。\n店員：できますが、この靴に合う材料を取り寄せるので、金曜日には間に合いません。土曜日の午後３時にはお渡しできます。\n客：そうですか。では、土曜日に取りに来ます。費用はいくらですか。\n店員：２５００円です。お支払いは靴を受け取るときにお願いします。\n客：分かりました。よろしくお願いします。',
    translation: 'Customer: Could you repair the soles of these shoes? I need them by Friday evening.\nStaff: We can, but we need to order materials that fit these shoes, so they will not be ready by Friday. We can give them to you at 3 p.m. on Saturday.\nCustomer: I see. Then I will come to collect them on Saturday. How much will it cost?\nStaff: 2,500 yen. Please pay when you collect the shoes.\nCustomer: Understood. Thank you.',
    questionIds: ['q-l-03', 'q-l-04'],
  },
];

type Four = [string, string, string, string];
type QuestionLinks = Pick<Question, 'passageId' | 'listeningId' | 'grammarId' | 'vocabularyId' | 'evidence' | 'ordering'>;
function item(id: string, skill: Skill, prompt: string, choices: Four, correct: 0 | 1 | 2 | 3, reasons: Four, links: QuestionLinks = {}): Question {
  const options = choices.map((text, index) => ({ id: `${id}-${'abcd'[index]}`, text }));
  return { id, skill, prompt, options, correctOptionId: options[correct].id, explanations: Object.fromEntries(options.map((option, index) => [option.id, reasons[index]])), ...links };
}

const baseQuestions: Question[] = [
  item('q-v-01', 'vocabulary', '会議の開始時間を、午後２時から午後３時に（　）しました。', ['変更', '連絡', '参加', '準備'], 0,
    ['変更する means change something. 時間を変更する describes moving the start time from two to three.', '連絡する means contact someone or pass on information. It does not mean change a time; a person is normally marked with に.', '参加する means participate, usually イベントに参加する. It cannot describe altering a meeting time.', '準備する means prepare. It does not express replacing the old time with a new one.'], { vocabularyId: 'v-change' }),
  item('q-v-02', 'vocabulary', '電車が遅れているので、会社に電話で（　）しました。', ['利用', '修理', '連絡', '中止'], 2,
    ['利用する means use a service or facility. 会社に電話で利用しました does not describe informing the company.', '修理する means repair an object. You cannot repair the company by telephone in this sentence.', '連絡する means contact. 会社に電話で連絡する means contact the company by phone.', '中止する means cancel an activity, which normally takes を. The sentence gives the recipient 会社に, not an activity to cancel.'], { vocabularyId: 'v-contact' }),
  item('q-v-03', 'vocabulary', '修理にかかる（　）は、全部で３０００円です。', ['理由', '費用', '都合', '代わり'], 1,
    ['理由 means reason. A reason cannot have a price of 3,000 yen.', '費用 means cost or expense. 修理にかかる費用 is the cost of repairing something.', '都合 means circumstances or availability. It is not a sum of money.', '代わり means replacement or substitute. It does not name the amount the repair costs.'], { vocabularyId: 'v-cost' }),
  item('q-v-04', 'vocabulary', 'この講座への参加を希望する人は、金曜日までに（　）ください。', ['戻って', '乾いて', '減って', '申し込んで'], 3,
    ['戻る means return. It does not express signing up for a course.', '乾く means become dry. It cannot describe applying to attend a course.', '減る means decrease. It does not describe a person registering.', '申し込む means apply or sign up. 金曜日までに申し込んでください asks people to sign up by Friday.'], { vocabularyId: 'v-apply' }),
  item('q-v-05', 'vocabulary', '急げば、９時の電車に（　）かもしれない。', ['参加する', '届く', '間に合う', '残る'], 2,
    ['参加する means join an event. Japanese uses 電車に乗る for boarding a train, not 電車に参加する.', '届く means reach or arrive, often for mail or an object. 電車に届く does not express catching a scheduled train.', '間に合う means make it in time. 電車に間に合う means reach it before it departs.', '残る means remain. 電車に残る would concern remaining there, not arriving before departure.'], { vocabularyId: 'v-on-time' }),
  item('q-v-06', 'vocabulary', '洗濯物はまだぬれています。完全に（　）まで、しまわないでください。', ['増える', '乾く', '戻る', '続ける'], 1,
    ['増える means increase in number or amount. Wet laundry needs to dry, not increase.', '乾く means become dry. The laundry is still wet, so wait until it is completely dry before putting it away.', '戻る means return. It does not describe water leaving the laundry.', '続ける means continue something. It is transitive and does not describe laundry becoming dry.'], { vocabularyId: 'v-dry' }),
  item('q-v-07', 'vocabulary', '雨が強くなったため、屋外で行う試合は（　）になりました。', ['中止', '受付', '費用', '理由'], 0,
    ['中止 means cancellation. Stronger rain is the stated reason the outdoor match was called off.', '受付 means reception or an application desk. A match does not become a reception desk.', '費用 means cost. It cannot describe the outcome for the match.', '理由 means reason. The match is not becoming a reason; the rain is the reason for cancellation.'], { vocabularyId: 'v-cancel' }),
  item('q-v-08', 'vocabulary', '二つの店の値段を（　）、安いほうの店で買いました。', ['参加して', '乾いて', '戻って', '比べて'], 3,
    ['参加する takes an event with に. 値段を参加する cannot mean comparing prices.', '乾く is intransitive and means become dry. It cannot take prices as its object.', '戻る is intransitive and means return. 値段を戻る cannot mean comparing prices.', '比べる takes the things compared with を. Comparing both shops’ prices lets the person choose the cheaper shop.'], { vocabularyId: 'v-compare' }),

  item('q-k-01', 'kanji', '「電車に【間に合う】ように、早く家を出ました。」【間に合う】の読み方はどれですか。', ['あいだにあう', 'まにあおう', 'まにあう', 'かんにあう'], 2,
    ['間 can be read あいだ elsewhere, but the fixed expression 間に合う is まにあう.', 'まにあおう is the volitional form 間に合おう. The printed word is the dictionary form 間に合う.', '間に合う is read まにあう and means make it in time.', '間 has the reading かん in some compounds, but not in 間に合う.'], { vocabularyId: 'v-on-time' }),
  item('q-k-02', 'kanji', '「予約の時間を【確認】してください。」【確認】の読み方はどれですか。', ['かくにん', 'かくねん', 'こうにん', 'かっにん'], 0,
    ['確認 is かくにん: 確 contributes かく and 認 contributes にん in this compound.', '認 is にん here, not ねん. 確認 is かくにん.', '確 is かく here, not こう. 確認 is かくにん.', 'The く does not become a small っ in this compound. The reading is かくにん.'], { vocabularyId: 'v-confirm' }),
  item('q-k-03', 'kanji', '「旅行の【準備】をしています。」【準備】の読み方はどれですか。', ['じゅんぴ', 'じゅんび', 'じゅび', 'じゅうび'], 1,
    ['備 is voiced び in 準備, not ぴ.', '準備 is じゅんび: 準 is じゅん and 備 is び.', 'The ん in じゅん must remain. じゅび omits it.', '準 is じゅん, not the long vowel じゅう, in this word.'], { vocabularyId: 'v-prepare' }),
  item('q-k-04', 'kanji', '「車に乗る回数が【減る】。」【減る】の読み方はどれですか。', ['ふえる', 'のこる', 'かわる', 'へる'], 3,
    ['ふえる is 増える, meaning increase. It is not the reading of 減る.', 'のこる is 残る, meaning remain. It is not the reading of 減る.', 'かわる is 変わる, meaning change. It is not the reading of 減る.', '減る is へる and means decrease. It is a godan verb despite its える ending.'], { vocabularyId: 'v-decrease' }),

  item('q-g-01', 'grammar', '店長と相談して、来週からこの店で（　）ことになりました。', ['働いて', '働きます', '働いた', '働く'], 3,
    ['働いて is the て-form. The arrangement pattern uses the dictionary form, not the て-form.', '働きます is polite. Use the plain dictionary form before こと.', '働いた is past tense. This sentence announces an arrangement to work starting next week; use 働く.', '働く is the dictionary form. 働くことになりました reports the arrangement to work here from next week.'], { grammarId: 'g-koto' }),
  item('q-g-02', 'grammar', '相談の結果、明日の会議は行わないことになりました。この文の意味に最も近いものはどれですか。', ['明日の会議を行わないという決定があった。', '明日の会議はもう終わった。', '会議を行うかどうかは、まだ決まっていない。', '明日の会議を行う準備をしている。'], 0,
    ['行わないことになりました reports a decision not to hold the meeting. 相談の結果 reinforces that a decision was reached.', 'A decision not to hold tomorrow’s meeting does not mean it has already finished.', 'ことになりました states that the arrangement has been decided, so the decision is not still pending.', 'The negative 行わない says the meeting will not be held. It does not say preparations to hold it are underway.'], { grammarId: 'g-koto' }),
  item('q-g-03', 'grammar', '文を完成させてください。★に入るものはどれですか。\n来月から、＿＿　＿＿　★　＿＿　になりました。', ['こと', '働く', '新しい', '会社で'], 1,
    ['こと goes fourth, directly before になりました, to form ことになりました.', '働く goes third, at ★. The order is 新しい → 会社で → 働く → こと.', '新しい goes first and modifies 会社.', '会社で goes second, after 新しい and before the verb 働く.'], { grammarId: 'g-koto', ordering: { fragments: ['こと', '働く', '新しい', '会社で'], target: 2, completed: '来月から、新しい会社で働くことになりました。' } }),
  item('q-g-04', 'grammar', '健康のため、毎朝野菜を（　）ようにしています。', ['食べて', '食べます', '食べる', '食べた'], 2,
    ['食べて is the て-form. The effort or habit pattern uses the dictionary form or ない-form before ように.', '食べます is polite. The verb before ように must be in plain form here.', '食べるようにしています means making a habit or conscious effort to eat vegetables every morning.', '食べた is past tense. It does not form the intended ongoing-habit expression here; 食べる states the action the person aims to do.'], { grammarId: 'g-you' }),
  item('q-g-05', 'grammar', 'よく眠れるように、夜はコーヒーを（　）ようにしています。', ['飲まない', '飲まなく', '飲まないで', '飲みません'], 0,
    ['飲まない is the plain negative form. 飲まないようにしています means making a point of not drinking it.', '飲まなく is the adverbial negative form. The pattern requires 飲まない before ように.', '飲まないで connects to another action or request, but it is not the form used before ように in this pattern.', '飲みません is polite. Use the plain negative 飲まない before ように.'], { grammarId: 'g-you' }),
  item('q-g-06', 'grammar', '大切な書類を（　）しまって、とても困っています。', ['捨てる', '捨てた', '捨てて', '捨てます'], 2,
    ['捨てる is the dictionary form; しまう needs the て-form.', '捨てた is past tense; it cannot attach directly to しまう.', '捨てて is the て-form. 捨ててしまって expresses the unwanted result of throwing away important papers.', '捨てます is polite and cannot attach directly to しまう. Use 捨てて.'], { grammarId: 'g-shimau' }),
  item('q-g-07', 'grammar', '「宿題はもう全部やってしまいました。」ここでの「やってしまいました」は、どんな意味ですか。', ['宿題を始める予定です。', '宿題を全部終えました。', '宿題をしないようにしています。', '宿題の答えを忘れました。'], 1,
    ['もう and 全部, together with the past しまいました, indicate completion, not a plan to start.', 'In this context, やってしまいました emphasizes having finished all the homework. No unwanted outcome is stated.', 'The sentence is affirmative and completed. It does not express avoiding homework.', 'There is no 忘れる or statement about the answers. てしまう does not automatically mean something was forgotten.'], { grammarId: 'g-shimau' }),
  item('q-g-08', 'grammar', 'まだ食べていないケーキを見て、見た目から「おいしい」と感じました。その気持ちを表す文はどれですか。', ['このケーキはおいしいそうです。', 'このケーキはおいしかったそうです。', 'このケーキはおいしそうです。', 'このケーキはおいしくないそうです。'], 2,
    ['おいしいそうです is hearsay: someone says it is delicious. The prompt asks for the speaker’s judgment from its appearance.', 'おいしかったそうです reports that someone said it was delicious in the past. It does not express the present visual impression.', 'Appearance そう attaches after removing the final い: おいしい → おいしそう. It means the cake looks delicious.', 'おいしくないそうです reports that someone says it is not delicious. Both the source and the negative meaning conflict with the prompt.'], { grammarId: 'g-sou' }),
  item('q-g-09', 'grammar', '田中さんの話では、あの人は大学の（　）そうです。', ['学生', '学生な', '学生に', '学生だ'], 3,
    ['A noun requires だ before hearsay そうです. 学生そうです does not form the intended hearsay expression.', 'な is used with a な-adjective before a noun; it is not the hearsay attachment for the noun 学生.', 'に does not connect a noun to hearsay そうです. Use 学生だそうです.', 'Noun + だそうです reports information. 学生だそうです means “I hear that person is a university student.”'], { grammarId: 'g-sou' }),
  item('q-g-10', 'grammar', '見た印象を伝える表現として、正しいものを選んでください。\nこの方法は（　）そうですね。試してみましょう。', ['よい', 'よく', 'よさ', 'よかった'], 2,
    ['よいそう would be hearsay about a method being good, but that is not the requested appearance form. In this item, choose the form that means “looks good”; the appearance form of いい is よさそう.', 'よく is the adverbial form, not the stem used before appearance そう.', 'The appearance form of いい / よい is the exception よさそう. Here it means “this method looks good.”', 'よかったそう is a valid past hearsay form (“I hear it was good”), but it does not express the present appearance judgment requested in this item.'], { grammarId: 'g-sou' }),
  item('q-g-11', 'grammar', 'スープが（　）うちに飲んでください。', ['温かく', '温かくて', '温かい', '温かさ'], 2,
    ['温かく is the adverbial form. An い-adjective keeps its final い before うちに.', '温かくて is the linking て-form. It cannot directly form 温かくてうちに.', 'An い-adjective attaches directly to うちに. 温かいうちに means while it is still warm.', '温かさ is a noun meaning warmth. A noun would require の, and the intended condition is expressed naturally by 温かい.'], { grammarId: 'g-uchini' }),
  item('q-g-12', 'grammar', '文を完成させてください。★に入るものはどれですか。\n忘れない＿＿　＿＿　★　＿＿　おきます。', ['大切な', 'メモして', '内容を', 'うちに'], 2,
    ['大切な goes second and modifies 内容. The first fragment must complete 忘れないうちに.', 'メモして goes fourth, before おきます, to form メモしておきます (write it down in advance).', '内容を goes third, at ★. The order is うちに → 大切な → 内容を → メモして.', 'うちに goes first, completing 忘れないうちに (before I forget).'], { grammarId: 'g-uchini', ordering: { fragments: ['大切な', 'メモして', '内容を', 'うちに'], target: 2, completed: '忘れないうちに大切な内容をメモしておきます。' } }),

  item('q-r-01', 'reading', 'このメールは、主に何を伝えるために書かれましたか。', ['交流会を中止すること', '交流会を始める時間が変わったこと', '交流会を行う場所が変わったこと', '飲み物を持ってくる必要があること'], 2,
    ['The event is moved indoors, not canceled. There is no statement that the get-together will not take place.', '開始時間は予定どおり午後２時 explicitly says the start time remains unchanged.', 'The central announcement is that the venue changes from the park to the civic center’s second floor because rain is forecast.', 'The email says drinks will be provided and participants do not need to bring them.'], { passageId: 'r-email', evidence: '「交流会の会場を公園から市民センターの２階に変更することになりました。開始時間は予定どおり午後２時です。」' }),
  item('q-r-02', 'reading', '金曜日の午後６時までにメールを送る必要があるのは、どの人ですか。', ['準備を手伝える人', '参加できなくなった人', '予定どおり参加する人', '飲み物を持ってくる人'], 1,
    ['Helpers are asked to come at 1:30 p.m. Saturday. They are not the group required to send an email.', '参加できない方だけ limits the required email to people who can no longer attend.', 'People attending as planned are not required to email. だけ restricts the instruction to those unable to attend.', 'Drinks are provided, and people do not need to bring them. This is not the group told to email.'], { passageId: 'r-email', evidence: '「都合が悪くなって参加できない方だけ、金曜日の午後６時までにメールで連絡してください。」' }),
  item('q-r-03', 'reading', '１１月６日に、この図書館でできないことはどれですか。', ['１階で本を借りること', '返却ボックスに本を返すこと', '午後２時に予約した本を受け取ること', '２階の読書室を利用すること'], 3,
    ['First-floor book lending continues as usual during the work, so borrowing is allowed.', 'The return box can be used throughout the day, so returning books is allowed.', '2 p.m. is within the stated 10 a.m.–5 p.m. collection window, so collecting a reserved book is allowed.', 'November 6 falls within November 4–9. The second-floor reading room is unavailable during that period.'], { passageId: 'r-notice', evidence: '「１１月４日から９日まで、２階の読書室の工事を行います。この間、読書室は利用できません。」' }),
  item('q-r-04', 'reading', '午後６時に図書館へ来た人が、案内に書かれた方法でできることはどれですか。', ['入口のボックスに本を返す。', '受付で予約した本を受け取る。', '２階で工事を手伝う。', '受付で予約した本の代金を払う。'], 0,
    ['The entrance return box is available 一日中, so books can be returned at 6 p.m.', 'Reserved books cannot be collected after 5 p.m. At 6 p.m., the collection window has ended.', 'There is no invitation or method for helping with the construction. The notice only describes service restrictions.', 'The notice does not mention buying books or paying for reservations. It gives no such procedure.'], { passageId: 'r-notice', evidence: '「午後５時以降は受け取れません」「本を返すだけの方は、入口の返却ボックスを一日中利用できます。」' }),
  item('q-r-05', 'reading', '筆者が以前、寝るのが遅くなったのはなぜですか。', ['毎晩、仕事が終わるのが遅かったから。', 'スマートフォンでニュースを読んでいるうちに、時間が過ぎたから。', '夕食を作るのに２０分以上かかったから。', '近所を長い時間歩いていたから。'], 1,
    ['The passage does not say work finished late. It identifies time spent looking at the smartphone screen.', 'The first paragraph says time passed while the writer looked at the screen, often leading to a late bedtime.', 'No time spent cooking dinner is stated. The twenty minutes refers to walking.', 'Walking was introduced later as a change. It is not given as the reason for the earlier late bedtime.'], { passageId: 'r-article', evidence: '「画面を見ているうちに時間が過ぎて、寝るのが遅くなってしまうことが多かった。」' }),
  item('q-r-06', 'reading', '筆者は今、ニュースをどのように読んでいますか。', ['歩きながらスマートフォンで読む。', '以前と同じように、帰宅後すぐに長く読む。', 'ニュースは全く読まない。', '歩いた後、１０分だけ読む。'], 3,
    ['The writer leaves the smartphone at home while walking. News is read after the walk.', 'The habit has changed: the writer now limits news to ten minutes after walking.', '今でもニュースは読む explicitly says the writer still reads the news.', 'The final paragraph states 歩いた後に１０分だけ読むことにしている.'], { passageId: 'r-article', evidence: '「今でもニュースは読む。ただ、歩いた後に１０分だけ読むことにしている。」' }),
  item('q-r-07', 'reading', 'この店で無料なのは、どれですか。', ['折れた骨１本を交換すること', '穴が開いた布を修理すること', '傘を見て、修理できるか確認すること', '傘を家まで届けてもらうこと'], 2,
    ['Replacing one broken rib starts at 1,200 yen, so it is not advertised as free.', 'Fabric repair is available, but the notice does not say it is free. The price depends on the condition.', 'The advertisement explicitly says that simply examining an umbrella to check whether it can be repaired is free.', 'No delivery service is mentioned, free or otherwise.'], { passageId: 'r-ad', evidence: '「傘を見て、修理できるか確認するだけなら無料です。」' }),
  item('q-r-08', 'reading', '傘を修理できるか店で確認してもらいたい人は、どうすればいいですか。', ['水曜日の午後に、傘を持って行く。', '営業時間内に、傘そのものを持って行く。', '傘の写真だけを持って行く。', '必ず予約してから、写真を送る。'], 1,
    ['The shop is closed on Wednesdays. Bringing the umbrella then does not meet the listed opening conditions.', 'Visit during opening hours with the actual umbrella. No reservation is needed, and a photo alone cannot be assessed.', 'The advertisement explicitly says a photo alone is not enough. The umbrella must be brought.', 'Reservations are unnecessary, and sending a photo is not a listed assessment method.'], { passageId: 'r-ad', evidence: '「予約は必要ありません。」「営業時間：午前１０時〜午後６時」「定休日：水曜日」「傘をお持ちください。写真だけでは確認できません。」' }),

  item('q-l-01', 'listening', '明日の打ち合わせは、何時からですか。', ['午前１０時', '午前１１時', '午後２時', '午後３時'], 1,
    ['10 a.m. was the earlier time. Suzuki corrects it because Yamamoto cannot arrive by then.', 'Suzuki says １１時からに変更になりました, so the new start is 11 a.m.', '2 p.m. is not mentioned as a start time in this conversation.', '3 p.m. is not mentioned as a start time in this conversation.'], { listeningId: 'l-meeting', evidence: '鈴木：「１１時からに変更になりました。」' }),
  item('q-l-02', 'listening', '佐藤さんは、打ち合わせに何を持っていきますか。', ['印刷した資料', '山本さんの予定表', '会議室のかぎ', '新しい商品の写真'], 3,
    ['Suzuki, not Sato, will print the handouts. Sato is asked to bring something else.', 'Yamamoto’s availability is discussed, but no one is asked to bring Yamamoto’s schedule.', 'The meeting room remains the same, but keys are not mentioned.', 'Suzuki asks Sato to bring photos of the new product, and Sato agrees to prepare them today.'], { listeningId: 'l-meeting', evidence: '鈴木：「佐藤さんは新しい商品の写真を持ってきてください。」' }),
  item('q-l-03', 'listening', '修理した靴は、いつ受け取れると言われましたか。', ['金曜日の午前１０時', '金曜日の夕方', '土曜日の午後３時', '土曜日の午前３時'], 2,
    ['Friday at 10 a.m. is not offered. The materials need to be ordered, so Friday is too early.', 'Friday evening is the customer’s requested deadline, but the staff explicitly says it cannot be met.', 'The staff says 土曜日の午後３時にはお渡しできます: the shoes can be handed over at 3 p.m. Saturday.', 'The stated time is 午後３時 (3 p.m.), not 午前３時 (3 a.m.).'], { listeningId: 'l-repair', evidence: '店員：「土曜日の午後３時にはお渡しできます。」' }),
  item('q-l-04', 'listening', '客は、修理の費用をいつ払いますか。', ['靴を受け取るとき', '修理を頼んだとき', '材料が店に届いたとき', '金曜日の夕方'], 0,
    ['The staff asks for payment when the customer collects the shoes: 靴を受け取るとき.', 'The staff does not ask for immediate payment when the repair is requested.', 'The material order explains the delay. Its arrival is not the stated payment event.', 'Friday evening was the requested deadline, not the payment time. Collection and payment are on Saturday.'], { listeningId: 'l-repair', evidence: '店員：「お支払いは靴を受け取るときにお願いします。」' }),
];

// Preserve every original ID/key so earlier backups and unfinished attempts remain valid.
export const topics = courseTopics;
export const questionTypes = [...courseQuestionTypes,
  {id:'word-formation' as const,title:'Word formation',skill:'vocabulary',note:'Original prefix and suffix practice; the format mix differs by level.'},
  {id:'reading-integrated' as const,title:'Integrated reading',skill:'reading',note:'Compare two original viewpoints presented in one source.'},
  {id:'reading-thematic' as const,title:'Thematic reading',skill:'reading',note:'Follow the main argument and its supporting conditions.'},
  {id:'listening-integrated' as const,title:'Integrated listening',skill:'listening',note:'Combine information and constraints in original multi-part conversations.'},
];
export const studyReferences = courseReferences;
export const studyPlan = coursePlan;
export const foundationLevels = reviewLevels;
export const foundationScopeNote = reviewScopeNote;
export const advancedLevels = higherLevels;
export const advancedScopeNote = higherScopeNote;
export const referenceMapCheckedAt = skillMapCheckedAt;
export const referenceScopeNote = skillReferenceScopeNote;
const originalWordTopics: Record<string, Vocabulary['topicId']> = {
  'v-plan':'time','v-change':'time','v-availability':'time','v-participate':'community','v-contact':'communication',
  'v-cancel':'community','v-prepare':'travel','v-replacement':'work','v-guide':'services','v-confirm':'communication',
  'v-late':'transport','v-on-time':'transport','v-arrive':'shopping','v-continue':'education','v-choose':'shopping',
  'v-necessary':'services','v-reason':'communication','v-reception':'services','v-apply':'services','v-use':'community',
  'v-repair':'home','v-cost':'shopping','v-deadline':'time','v-remain':'food','v-increase':'nature','v-decrease':'nature',
  'v-return':'transport','v-compare':'shopping','v-unreasonable':'feelings','v-dry':'daily',
};
const establishedVocabulary: Vocabulary[] = [...baseVocabulary.map(v => ({...v,topicId:originalWordTopics[v.id]})),...expandedVocabulary,...foundationVocabulary,...advancedVocabulary];
const establishedKanji: Kanji[] = withAdvancedKanji(withFoundationKanji([...baseKanji.map(k => ({...k,topicId:originalWordTopics[k.wordIds[0]]})),...expandedKanji]));
const establishedGrammar: Grammar[] = [...baseGrammar.map((g,i) => ({...g,topicId:('education' as const),category:['change','change','time-aspect','certainty','time-aspect'][i],level:('N3-style' as const)})),...expandedGrammar,...foundationGrammar,...advancedGrammar];
const establishedReadings: Reading[] = [...baseReadings.map((r,i) => ({...r,topicId:(['community','community','daily','services'] as const)[i]})),...expandedReadings,...foundationReadings,...advancedReadings];
const establishedListening: Listening[] = [...baseListening.map((l,i) => ({...l,topicId:(['work','services'] as const)[i]})),...expandedListening,...foundationListening,...advancedListening];
const establishedQuestions: Question[] = [...baseQuestions.map(q => ({...q,
  topicId:q.vocabularyId ? originalWordTopics[q.vocabularyId] : q.grammarId ? 'education' as const : q.passageId ? establishedReadings.find(r => r.id === q.passageId)?.topicId : q.listeningId ? establishedListening.find(l => l.id === q.listeningId)?.topicId : 'daily' as const,
  questionType:(q.ordering ? 'grammar-order' : q.skill === 'grammar' ? 'grammar-form' : q.skill === 'kanji' ? 'kanji-reading' : q.skill === 'vocabulary' ? 'vocabulary-context' : q.skill === 'reading' ? q.passageId === 'r-ad' ? 'reading-information' : 'reading-short' : 'listening-task') as Question['questionType'],
})),...expandedVocabularyQuestions,...expandedGrammarQuestions,...expandedPassageQuestions,...foundationQuestions,...advancedQuestions];
const additionalVocabulary = [...datasetFoundationVocabulary,...datasetIntermediateVocabulary,...datasetAdvancedVocabulary];
const additionalGrammar = [...datasetFoundationGrammar,...datasetIntermediateGrammar,...datasetAdvancedGrammar];
const additionalReadings = [...datasetFoundationReadings,...datasetIntermediateReadings,...datasetAdvancedReadings];
const additionalListening = [...datasetFoundationListening,...datasetIntermediateListening,...datasetAdvancedListening];
const additionalQuestions = [...buildDatasetWordQuestions(additionalVocabulary),...datasetFoundationQuestions,...datasetIntermediateQuestions,...datasetAdvancedQuestions];
export const vocabulary:Vocabulary[]=[...establishedVocabulary,...additionalVocabulary];
export const kanji:Kanji[]=withDatasetKanji(establishedKanji,additionalVocabulary);
export const grammar:Grammar[]=[...establishedGrammar,...additionalGrammar];
export const readings:Reading[]=[...establishedReadings,...additionalReadings];
export const listening:Listening[]=[...establishedListening,...additionalListening];
export const questions:Question[]=[...establishedQuestions,...additionalQuestions];
const establishedBank={vocabulary:establishedVocabulary,kanji:establishedKanji,grammar:establishedGrammar,readings:establishedReadings,listening:establishedListening,questions:establishedQuestions};
const completeBank={vocabulary,kanji,grammar,readings,listening,questions};
const additionalBank={vocabulary:additionalVocabulary,kanji,grammar:additionalGrammar,readings:additionalReadings,listening:additionalListening,questions:additionalQuestions};
export const learningPath=extendDatasetPaths(buildLearningPath(establishedBank),additionalBank,completeBank);
const additionsBySkill={vocabulary:additionalVocabulary,kanji:kanji.filter(item=>item.id.startsWith('ds-k-')),grammar:additionalGrammar,reading:additionalReadings,listening:additionalListening};
export const referenceMap=skillReferenceMap.map(ref=>({...ref,appContentIds:[...new Set([...ref.appContentIds,...additionsBySkill[ref.skill].filter(item=>item.jlptLevel===ref.level).map(item=>item.id)])]}));
export const datasetSourcePolicy=sourcePolicy;
export const datasetSourceCheckedAt=sourceCheckedAt;
export const datasetSources=buildDatasetSources(referenceMap);
export const datasetInventory=buildDatasetInventory(completeBank);
export const datasetAssociations=buildDatasetAssociations(additionalBank,datasetSources);
