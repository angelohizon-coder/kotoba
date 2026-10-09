import type { Grammar, Listening, Question, QuestionType, Reading, TopicId, Vocabulary } from '../types';

// Original intermediate practice. Publisher catalogs inform skill scope only;
// these selections do not claim a textbook chapter match or an official JLPT list.
type WordRow = [slug: string, word: string, reading: string, meaning: string, wordClass: string, example: string, translation: string, topic: TopicId];
const n = 'noun', s = 'noun / する verb', gt = 'godan verb (transitive)', gi = 'godan verb (intransitive)', it = 'ichidan verb (transitive)', ii = 'ichidan verb (intransitive)';
const wordRows: WordRow[] = [
  ['cancel-request', '取り消す', 'とりけす', 'to cancel; to withdraw a request or decision', gt, '予約を取り消す場合は、前日までにご連絡ください。', 'If you cancel your reservation, please contact us by the previous day.', 'services'],
  ['postponement', '延期', 'えんき', 'postponement; putting something off to a later time', s, '雨のため、野外の演奏会は来週に延期します。', 'Because of the rain, we will postpone the outdoor concert until next week.', 'culture'],
  ['reconsider', '見直す', 'みなおす', 'to review; to reconsider and check again', gt, '人数が増えたので、旅行の予算を見直す必要があります。', 'Since more people have joined, we need to reconsider the travel budget.', 'work'],
  ['planning-meeting', '打ち合わせ', 'うちあわせ', 'planning meeting; discussion to coordinate arrangements', n, '店が開く前に、今日の仕事について打ち合わせをします。', 'Before the shop opens, we will discuss how to coordinate today’s work.', 'work'],
  ['schedule-chart', '予定表', 'よていひょう', 'schedule; chart of planned activities', n, '予定表を見ると、午後なら二人とも時間が空いています。', 'The schedule shows that both of us are free in the afternoon.', 'time'],
  ['landmark', '目印', 'めじるし', 'landmark; identifying mark', n, '入口の黄色い旗を目印に来てください。', 'Please use the yellow flag at the entrance as a landmark.', 'travel'],
  ['sample', '見本', 'みほん', 'sample; model showing how something should look', n, '申込書を書く前に、受付にある見本を確認しました。', 'Before filling in the application, I checked the sample at reception.', 'services'],
  ['actual-item', '実物', 'じつぶつ', 'the actual object; the real item', n, '写真では大きさが分からないので、店で実物を見たいです。', 'I cannot tell the size from the photograph, so I want to see the actual item in the shop.', 'shopping'],
  ['things-to-bring', '持ち物', 'もちもの', 'belongings; things to bring', n, '遠足の持ち物は、弁当と水と雨具です。', 'The things to bring on the outing are a boxed lunch, water, and rain gear.', 'education'],
  ['forgotten-belongings', '忘れ物', 'わすれもの', 'something left behind or forgotten', n, '電車に忘れ物をしたので、駅の係の人に相談しました。', 'I left something on the train, so I asked a station employee for help.', 'transport'],
  ['lost-item', '落とし物', 'おとしもの', 'a dropped or lost item', n, '落とし物のかぎは、受付で預かっています。', 'The keys someone dropped are being kept at reception.', 'services'],
  ['inquiry', '問い合わせ', 'といあわせ', 'inquiry; request for information', n, '講座の内容についての問い合わせは、メールでお願いします。', 'Please send inquiries about the course content by email.', 'communication'],
  ['crowding', '混雑', 'こんざつ', 'crowding; congestion', s, '混雑を避けるため、開店してすぐに買い物を済ませました。', 'To avoid the crowds, I finished shopping just after the shop opened.', 'shopping'],
  ['queue', '行列', 'ぎょうれつ', 'queue; line of people', n, '入場券を買う人の行列が、建物の外まで続いています。', 'The queue of people buying admission tickets stretches outside the building.', 'culture'],
  ['vacant-seat', '空席', 'くうせき', 'vacant seat; available seat', n, '窓側には空席がないので、通路側の席を予約しました。', 'There are no available window seats, so I reserved an aisle seat.', 'transport'],
  ['all-seats-taken', '満席', 'まんせき', 'all seats occupied; fully booked seating', n, '昼の公演は満席ですが、夜の公演にはまだ席があります。', 'The afternoon performance is fully booked, but seats remain for the evening performance.', 'culture'],
  ['consecutive-holidays', '連休', 'れんきゅう', 'consecutive holidays; a holiday break', n, '今度の連休は、遠くへ行かずに近所で過ごす予定です。', 'During the next holiday break, I plan to stay around my neighborhood instead of traveling far.', 'time'],
  ['leave-early', '早退', 'そうたい', 'leaving work or school before the usual finishing time', s, '家の修理に立ち会うため、今日は午後三時に早退します。', 'To be present for repairs at home, I will leave work early at three today.', 'work'],
  ['temporary-closure', '休業', 'きゅうぎょう', 'temporary closure or suspension of business', s, '設備の点検のため、この店は明日だけ休業します。', 'This shop will close for tomorrow only for an equipment inspection.', 'shopping'],
  ['resumption', '再開', 'さいかい', 'resumption; starting again after a pause', s, '雨がやんだので、試合を再開することになりました。', 'The rain has stopped, so it has been decided that the match will resume.', 'community'],
  ['shop-closing', '閉店', 'へいてん', 'closing a shop for the day or permanently', s, '閉店の十分前には、買い物を終えてください。', 'Please finish your shopping ten minutes before closing time.', 'shopping'],
  ['shop-opening', '開店', 'かいてん', 'opening a shop for business', s, '開店までまだ時間があるので、近くの公園で待ちます。', 'There is still time before the shop opens, so I will wait in the nearby park.', 'shopping'],
  ['sales-total', '売り上げ', 'うりあげ', 'sales; money taken in from sales', n, '祭りの日は客が多く、店の売り上げも増えました。', 'There were many customers on the festival day, and the shop’s sales increased too.', 'work'],
  ['receipt', '領収書', 'りょうしゅうしょ', 'receipt certifying payment', n, '会社に費用を報告するので、領収書をもらいました。', 'I obtained a receipt because I need to report the expense to my company.', 'services'],
  ['refund', '返金', 'へんきん', 'refund; returning paid money', s, '公演が中止になった場合は、入場料を返金します。', 'If the performance is canceled, we will refund the admission fee.', 'shopping'],
  ['payment-for-goods', '代金', 'だいきん', 'price payable; payment for goods or services', n, '注文した品物の代金は、受け取るときに払います。', 'I will pay for the item I ordered when I receive it.', 'shopping'],
  ['service-fee', '手数料', 'てすうりょう', 'service charge; processing fee', n, 'この時間にお金を引き出すと、手数料がかかります。', 'Withdrawing money at this time incurs a service charge.', 'services'],
  ['yield', '譲る', 'ゆずる', 'to yield; to give up something to another person', gt, '重い荷物を持った人に席を譲ることにしました。', 'I decided to give my seat to someone carrying heavy luggage.', 'transport'],
  ['see-off', '見送る', 'みおくる', 'to see someone off; to defer or pass up an action', gt, '出発する友人を駅で見送るため、少し早く家を出ました。', 'I left home a little early to see a departing friend off at the station.', 'people'],
  ['catch-sight', '見かける', 'みかける', 'to catch sight of; to happen to see', it, '図書館で先生を見かけることがあります。', 'I sometimes happen to see my teacher at the library.', 'people'],
  ['take-out', '取り出す', 'とりだす', 'to take something out from inside', gt, '改札の前でかばんから切符を取り出す。', 'I take the ticket out of my bag in front of the ticket gate.', 'transport'],
  ['wrap', '包む', 'つつむ', 'to wrap; to enclose', gt, '贈り物をこの紙で包むと、花の模様がきれいに見えます。', 'If you wrap the gift in this paper, the floral pattern will show nicely.', 'shopping'],
  ['spill', 'こぼす', 'こぼす', 'to spill a liquid or small loose things', gt, 'スープをこぼすと困るので、皿を両手で運びます。', 'I carry the bowl with both hands because spilling the soup would be a problem.', 'food'],
  ['all-present', '揃う', 'そろう', 'to be all present; to form a complete set', gi, '材料が全部揃うまで、料理を始めないでください。', 'Please do not start cooking until all the ingredients are available.', 'food'],
  ['put-together', '揃える', 'そろえる', 'to assemble a complete set; to arrange evenly', it, '必要な書類を揃えるのに、二日かかりました。', 'It took two days to assemble all the required documents.', 'services'],
  ['be-settled', '済む', 'すむ', 'to be finished or settled; to be sufficient', gi, '手続きが今日中に済むと聞いて、安心しました。', 'I was relieved to hear that the procedure would be completed today.', 'services'],
  ['be-helped', '助かる', 'たすかる', 'to be helped; to find something a great help', gi, '重い箱を運ぶのを手伝ってもらえると、助かる。', 'It would be a great help if someone could help me carry the heavy box.', 'people'],
  ['replace-item', '取り替える', 'とりかえる', 'to replace one thing with another', it, '古い電池を新しいものに取り替えると、時計が動きました。', 'When I replaced the old battery with a new one, the clock started working.', 'technology'],
  ['overtake', '追い越す', 'おいこす', 'to overtake; to pass someone moving ahead', gt, '道が狭いので、前の自転車を追い越すのはやめました。', 'The road was narrow, so I decided not to overtake the bicycle ahead.', 'transport'],
  ['be-connected', 'つながる', 'つながる', 'to connect; to get through by telephone', gi, '受付に電話がつながるまで、しばらく待ちました。', 'I waited a while until my call got through to reception.', 'communication'],
  ['connect', 'つなぐ', 'つなぐ', 'to connect or join two things', gt, 'パソコンと画面をつなぐためのケーブルを借りました。', 'I borrowed a cable for connecting the computer to the display.', 'technology'],
  ['lengthen-intransitive', '伸びる', 'のびる', 'to grow longer; to extend', ii, '髪が伸びるのが早いので、毎月美容院に行きます。', 'My hair grows quickly, so I go to the hair salon every month.', 'daily'],
  ['lengthen-transitive', '伸ばす', 'のばす', 'to extend; to lengthen or stretch something', gt, '箱を取ろうとして腕を伸ばすと、棚の上まで手が届きました。', 'When I stretched my arm to get the box, my hand reached the top of the shelf.', 'daily'],
  ['increase-transitive', '増やす', 'ふやす', 'to increase the amount or number of something', gt, '参加できる人を増やすため、夜の講座も開きます。', 'To increase the number of people able to attend, we will also offer an evening class.', 'education'],
  ['reduce-transitive', '減らす', 'へらす', 'to reduce the amount or number of something', gt, '旅行の荷物を減らすため、大きなタオルは置いていきます。', 'To reduce my travel luggage, I will leave the large towel behind.', 'travel'],
  ['person-responsible', '担当者', 'たんとうしゃ', 'person in charge of a particular matter', n, '修理の担当者から、部品が届いたと連絡がありました。', 'The person responsible for the repair contacted me to say the part had arrived.', 'work'],
  ['conversation-topic', '話題', 'わだい', 'topic of conversation; subject being discussed', n, '歓迎会では、近所の店のことが話題になりました。', 'At the welcome party, the local shops became a topic of conversation.', 'communication'],
  ['joke', '冗談', 'じょうだん', 'joke; something said without serious intent', n, '友人の冗談を本当の話だと思って、驚いてしまいました。', 'I mistook my friend’s joke for a true story and was startled.', 'communication'],
  ['complaint', '苦情', 'くじょう', 'complaint about a problem or dissatisfaction', n, '夜の音について住民から苦情があったので、練習の時間を変えました。', 'Residents complained about the noise at night, so we changed our practice time.', 'community'],
  ['advice', '助言', 'じょげん', 'advice; a suggestion offered to help', s, '先生の助言を受けて、作文の最後を書き直しました。', 'Following my teacher’s advice, I rewrote the end of my composition.', 'education'],
];
export const datasetIntermediateVocabulary: Vocabulary[] = wordRows.map(([slug, word, reading, meaning, wordClass, example, exampleTranslation, topicId]) => ({ id: `ds-v-n3-${slug}`, word, reading, meaning, wordClass, example, exampleTranslation, topicId, level: 'N3-style', jlptLevel: 'n3' }));
export const datasetIntermediateGrammar: Grammar[] = [];
export const datasetIntermediateReadings: Reading[] = [];
export const datasetIntermediateListening: Listening[] = [];
export const datasetIntermediateQuestions: Question[] = [];
type Choice = [text: string, explanation: string];
type Choices = [Choice, Choice, Choice, Choice];
function q(slug: string, skill: Question['skill'], topicId: TopicId, questionType: QuestionType, prompt: string, choices: Choices, links: Partial<Question>): string {
  const id = `ds-q-n3-${slug}`;
  const shift = [...id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 4;
  const ordered = [...choices.slice(shift), ...choices.slice(0, shift)];
  const options = ordered.map(([text], i) => ({ id: `${id}-${'abcd'[i]}`, text }));
  datasetIntermediateQuestions.push({ id, skill, topicId, questionType, jlptLevel: 'n3', prompt, options, correctOptionId: options[ordered.indexOf(choices[0])].id, explanations: Object.fromEntries(ordered.map(([, reason], i) => [options[i].id, reason])), ...links });
  return id;
}
type Form = { before: string; after: string; choices: Choices; translation: string };
const form = (before: string, after: string, translation: string, choices: Choices): Form => ({ before, after, translation, choices });
function lesson(slug: string, title: string, meaning: string, attachment: string[], comparison: string, category: string, topicId: TopicId, forms: [Form, Form]): void {
  const id = `ds-g-n3-${slug}`;
  const examples = forms.map(f => ({ ja: f.before + f.choices[0][0] + f.after, en: f.translation }));
  const questionIds = forms.map((f, i) => q(`g-${slug}-${i + 1}`, 'grammar', topicId, 'grammar-form', `（　）に入る最もよいものを一つ選んでください。\n${f.before}（　）${f.after}`, f.choices, { grammarId: id }));
  datasetIntermediateGrammar.push({ id, title, meaning, attachment, comparison, category, topicId, level: 'N3-style', jlptLevel: 'n3', examples, questionIds, mistake: { wrong: forms[0].before + forms[0].choices[1][0] + forms[0].after, correct: examples[0].ja, explanation: forms[0].choices[1][1] } });
}

lesson('known-reason', '～のだから', 'Since this is an established fact, the speaker draws a conclusion or urges an appropriate action.', ['Verb / い-adjective plain form + のだから.', 'Noun / な-adjective + なのだから; conversational のだから may become んだから.'], 'Unlike a simple ～から explanation, ～のだから presents the reason as something the listener should take into account. It is common in reminders and persuasion and can sound insistent.', 'reasons', 'people', [
  form('二人で使う道具', '、一人で決めずに相談してください。', 'Since these are tools for both of us to use, please discuss the decision instead of making it alone.', [
    ['なのだから', '道具 is a noun, so it takes なのだから. The shared use is the known reason for asking the person to consult the other user.'],
    ['のだから', 'A noun needs な before explanatory の here: 道具なのだから. Noun + のだから is missing that connection.'],
    ['にのだから', 'に does not connect 道具 to explanatory の. Use noun + なのだから.'],
    ['なのだからです', 'The added です cannot connect this reason clause to the following request. End the connector at なのだから.'],
  ]),
  form('もう参加すると約束した', '、急にやめるなら相手に理由を伝えるべきです。', 'Since you have already promised to participate, you should explain why if you suddenly decide not to.', [
    ['のだから', 'The plain past verb 約束した attaches directly to のだから. The existing promise supports the advice that follows.'],
    ['なのだから', 'な is required after a noun or a な-adjective, but it is not inserted after the verb 約束した.'],
    ['のだに', 'のだに is not a reason connector. The conclusion requires the complete expression のだから.'],
    ['のだからを', 'を cannot follow this clause connector. のだから already connects the reason to the conclusion.'],
  ]),
]);
lesson('adverse-condition', '～ては／～では（困る条件）', 'If the stated situation occurs, an undesirable result follows; often used in warnings or objections.', ['Verb て / で-form + は.', 'い-adjective ～くては; な-adjective / noun + では.'], 'This use predicts trouble from a condition. It is different from permission ～てもいい and the full prohibition ～てはいけない; the following clause states the actual unwanted consequence.', 'conditions', 'daily', [
  form('この狭い通路に箱を', '、人が通れなくなります。', 'If you put boxes in this narrow passage, people will no longer be able to get through.', [
    ['置いては', '置く becomes 置いて. 置いては introduces the situation that would cause the unwanted result of blocking the passage.'],
    ['置くては', 'Dictionary-form 置く cannot take ては directly. Its て-form is 置いて.'],
    ['置きは', '置き is a verb stem. This conditional pattern needs the て-form 置いて before は.'],
    ['置いたは', '置いた is past tense, and it does not attach directly to は to form this adverse condition.'],
  ]),
  form('台所がこんなに', '、十人で料理教室を開けません。', 'If the kitchen is this small, we cannot hold a cooking class for ten people.', [
    ['狭くては', '狭い changes to 狭くて before は. The limited space is the condition that makes the class impossible.'],
    ['狭いては', 'An い-adjective changes final い to くて before は. 狭いては is not its correct form.'],
    ['狭いでは', 'では follows a noun or a な-adjective stem. 狭い is an い-adjective and needs 狭くては.'],
    ['狭かったは', 'A plain past adjective does not attach directly to は for this condition. Use 狭くては.'],
  ]),
]);
lesson('minimum-condition', '～さえ～ば', 'As long as the emphasized minimum condition is met, the desired outcome is possible.', ['Noun + さえ + conditional predicate: 住所さえ分かれば.', 'Verb ます-stem + さえすれば; noun / な-adjective + でさえあれば.'], 'Standalone さえ can mean even. With a conditional such as ～ば, it instead highlights a sufficient minimum requirement. It often reassures the listener that other details need not be perfect.', 'conditions', 'education', [
  form('この講座は、名前', '書けば申し込めます。住所を書く必要はありません。', 'You can apply for this course as long as you write your name. There is no need to write your address.', [
    ['さえ', '名前さえ書けば marks the name as the minimum sufficient information, matching the explicit statement that an address is unnecessary.'],
    ['さえを', 'In this construction, さえ replaces the object particle を. Adding を after さえ is not the required form.'],
    ['にさえ', '名前 is what the applicant writes, not the destination of writing. The particle に gives the wrong relationship.'],
    ['さえで', 'さえで does not connect the object 名前 to 書けば. Use 名前さえ書けば.'],
  ]),
  form('出発までに予約の確認', 'すれば、ほかの準備は明日でも大丈夫です。', 'As long as you confirm the reservation before departure, the other preparations can wait until tomorrow.', [
    ['さえ', '確認さえすれば emphasizes reservation confirmation as the one necessary action, contrasting it with preparations that can wait.'],
    ['さえを', 'さえ replaces を after the action noun in 確認さえすれば. A further を cannot be added here.'],
    ['さえに', 'に does not join the action noun to すれば in this pattern. Use 確認さえすれば.'],
    ['さえな', 'な does not connect 確認 to すれば. The complete pattern is action noun + さえすれば.'],
  ]),
]);
lesson('reported-message', '～ということだ／～とのことだ（伝聞）', 'Relay information or a message received from another source.', ['Plain clause + ということだ / とのことだ; polite report endings include ということです / とのことです.', 'For a noun or な-adjective report, retain plain だ: 休みだとのことです.'], 'In this lesson, the stated source makes the expression hearsay. ～ということだ can also explain what something means; source phrases such as 係の人によると identify the reporting use. とのことです is common in polite messages.', 'reporting', 'communication', [
  form('係の人によると、集合場所は駅の東口だ', '。', 'According to the staff member, the meeting place is the station’s east exit.', [
    ['とのことです', 'Plain だ is retained in the reported noun predicate 東口だとのことです. The information comes from the staff member.'],
    ['ということにです', 'ということにです is malformed. A report ends with ということです or とのことです.'],
    ['とすることです', 'とすることです does not relay the staff member’s message; it introduces a different construction about treating something as something else.'],
    ['ということでに', 'The ending ということでに cannot function as the sentence-final polite report here.'],
  ]),
  form('受付からメールが来ました。今週の講座はオンラインで行う', '。', 'An email arrived from reception. It says this week’s class will be held online.', [
    ['ということです', 'The email is the source. Plain 行う + ということです relays its message that the class will be online.'],
    ['とことです', 'The reporting expression is ということです or とのことです. とことです leaves out the required connection.'],
    ['ということをです', 'を cannot appear before the copula です in this reported-information ending.'],
    ['ということなです', 'なです is not a valid ending for the noun こと. Use ということです.'],
  ]),
]);
lesson('widely-said', '～と言われている', 'Present a description or view as something people commonly say, without naming a particular speaker.', ['Plain clause + と言われている / と言われています.', 'Noun / な-adjective predicates retain だ: 人気だと言われている.'], 'A report such as 田中さんが言っていた identifies one speaker. ～と言われている presents a broader reputation or shared description; it does not by itself prove that the claim is true.', 'reporting', 'culture', [
  form('この祭りは、町で一番大きな行事', 'と言われています。', 'This festival is said to be the biggest event in town.', [
    ['だ', '行事 is a noun predicate, so its plain statement ends in だ before the quotation particle と.'],
    ['な', 'な modifies a following noun; it does not finish the noun predicate before と言われています.'],
    ['に', 'に does not form the quoted statement 行事だ. The report requires a complete plain noun predicate.'],
    ['の', 'の alone cannot complete this quoted noun predicate. Use 行事だと言われています.'],
  ]),
  form('この道から見る夕日は美しい', '。昔から町の人の間でよく知られています。', 'The sunset seen from this road is said to be beautiful. Local people have known about it for a long time.', [
    ['と言われています', 'The following sentence identifies a familiar local reputation. と言われています presents the description as a generally shared view.'],
    ['に言われています', 'Quotation uses と, not に, after the complete statement 夕日は美しい.'],
    ['を言われています', 'を does not attach an entire quoted statement to 言われています in this construction.'],
    ['と言ってあります', '言ってあります describes an arrangement made by telling someone something in advance. It does not express the broadly shared reputation described here.'],
  ]),
]);
lesson('uncertain-report', '～とか（伝聞）', 'Mention something heard without presenting it as fully confirmed; common in conversation.', ['Plain clause + とか: 来月引っ越すとか.', 'Noun / な-adjective predicate + だとか; often followed by 聞きました or 言っていました.'], 'This hearsay とか takes a whole statement and often signals uncertainty. Listing とか in 本とか雑誌とか attaches to listed examples instead. In formal notices, a sourced expression such as とのことです is usually clearer.', 'reporting', 'people', [
  form('佐藤さんは来月、別の町へ引っ越す', '。詳しいことはまだ聞いていません。', 'I heard that Sato is moving to another town next month. I have not heard the details yet.', [
    ['とか', 'Plain 引っ越す + とか tentatively relays something heard. The lack of detailed information supports this conversational report.'],
    ['だとか', 'A verb clause attaches directly to とか. だ is not inserted after 引っ越す.'],
    ['なとか', 'な does not connect a verb clause to hearsay とか. Use 引っ越すとか.'],
    ['をとか', 'を cannot be placed between the verb clause and the reporting marker とか.'],
  ]),
  form('あの店は日曜日が休み', '聞きましたが、行く前に確認します。', 'I heard that the shop is closed on Sundays, but I will check before going.', [
    ['だとか', '休み is a noun predicate and takes だ before hearsay とか. The speaker explicitly plans to verify the report.'],
    ['なとか', 'な is not the sentence-ending form of the noun 休み in the reported clause. Use 休みだとか.'],
    ['にとか', 'に does not form a quoted noun statement about the shop’s closing day.'],
    ['をとか', 'を cannot connect the predicate 休み to hearsay とか.'],
  ]),
]);
lesson('qualified-admission', '～ことは～が', 'Admit that something is true, then add a limitation that prevents a simple positive conclusion.', ['Repeat the predicate: verb plain form + ことは + same verb + が.', 'い-adjective + ことは + same adjective + が; な-adjective + なことは + adjective + だが. Keep tense consistent.'], '～が alone simply connects a contrast. Repetition with ～ことは～が explicitly acknowledges the first point while reserving judgment; the second clause explains the qualification. Useful in balanced evaluations.', 'contrast', 'shopping', [
  form('このかばんは軽いことは', 'が、持ち手が細くて長く持つと手が痛くなります。', 'This bag is light, admittedly, but its handles are thin and my hand hurts if I carry it for long.', [
    ['軽い', 'The adjective is repeated: 軽いことは軽いが. The speaker admits its lightness before explaining a practical drawback.'],
    ['軽く', '軽く is adverbial and cannot complete the repeated adjective predicate directly before が.'],
    ['軽さ', '軽さ is a noun meaning lightness. The construction repeats the adjective 軽い, not a derived noun.'],
    ['軽いな', 'An い-adjective does not add な before the conjunction が. Repeat 軽い unchanged.'],
  ]),
  form('説明書を読んだことは', 'が、操作の仕方はまだよく分かりません。', 'I did read the manual, but I still do not really understand how to operate it.', [
    ['読んだ', 'Repeat the same past verb in 読んだことは読んだが. Reading happened, but comprehension remains limited.'],
    ['読み', '読み is a stem, not a complete repeated past predicate. The acknowledged action is 読んだ.'],
    ['読んで', '読んで is the て-form and does not fit directly before が in this repeated-predicate construction.'],
    ['読んだな', 'Adding the sentence-ending particle な changes the clause structure. The standard connection is 読んだが.'],
  ]),
]);
lesson('written-rule', '～こと（指示・規則）', 'Give a written instruction or rule in notices and organized lists.', ['Verb dictionary form + こと for a required action.', 'Verb ない-form + こと for an action that is prohibited.'], 'This sentence-final こと gives an instruction; it is distinct from nominalization in 読むことが好きだ. It is common in written rules and can sound authoritative in direct conversation, where ～てください is often gentler.', 'instructions', 'education', [
  form('【教室の利用規則】使った道具は、元の場所に', 'こと。', 'Classroom rule: Return the tools you have used to their original places.', [
    ['戻す', 'A positive written instruction uses the dictionary form before こと: 戻すこと. It tells users what they must do.'],
    ['戻して', 'The て-form fits a request such as 戻してください, but the written-rule ending here requires 戻すこと.'],
    ['戻します', 'The polite form does not attach directly to sentence-final rule こと. Use the dictionary form 戻す.'],
    ['戻し', 'The bare verb stem cannot form this instruction before こと.'],
  ]),
  form('【参加者への注意】許可なく作品の写真を', 'こと。', 'Instruction for participants: Do not photograph the works without permission.', [
    ['撮らない', 'The negative rule uses the ない-form: 撮らないこと. It prohibits taking photographs without permission.'],
    ['撮らなく', '撮らなく is a connecting form. Sentence-final negative rule こと needs 撮らない.'],
    ['撮りません', 'A polite negative cannot directly precede rule こと. Use plain 撮らない.'],
    ['撮らないで', '撮らないで can precede ください, but not this rule ending. The required attachment is 撮らないこと.'],
  ]),
]);
lesson('permission-humble', '～させていただく', 'Politely describe or request permission to perform one’s own action, treating the permission as a benefit.', ['Verb causative て-form + いただく: 説明する → 説明させていただく.', 'Permission request: ～させていただいてもよろしいでしょうか. Use when the other party can actually permit the action.'], '～ていただく has the other person do something for the speaker. ～させていただく has the speaker do the action with the other party’s permission. Plain humble お～する / いたす often suits routine actions that require no permission.', 'politeness', 'work', [
  form('会場の担当者に聞きます。「準備のため、開始の三十分前に部屋を', 'いただいてもよろしいでしょうか。」', 'I ask the person in charge of the venue: May we have permission to use the room thirty minutes before the start for preparation?', [
    ['使わせて', '使う has the causative 使わせる and its て-form 使わせて. The speaker asks permission for their own use of the room.'],
    ['使うさせて', '使う does not take させて after its dictionary form. Its causative is 使わせる.'],
    ['使わしてです', 'The inserted です cannot connect the verb to いただく. The standard causative て-form here is 使わせて.'],
    ['使わせた', '使わせた is past tense. いただく requires the causative て-form 使わせて.'],
  ]),
  form('受付の人に聞きます。「申込書をここで', 'いただいてもよろしいでしょうか。」', 'I ask the receptionist: May I have permission to make a copy of the application form here?', [
    ['コピーさせて', 'The causative of コピーする is コピーさせる. コピーさせていただく requests permission for the speaker to make the copy.'],
    ['コピーするさせて', 'する changes to させる for the causative; do not append させて to コピーする.'],
    ['コピーさせた', 'The past causative cannot attach to いただく. Use the causative て-form コピーさせて.'],
    ['コピーさせます', 'A polite verb form cannot attach directly to いただく. The linking form is コピーさせて.'],
  ]),
]);
lesson('biased-repetition', '～ばかり／～てばかりいる', 'Describe a strongly biased selection or repeated activity, often with criticism about what is being neglected.', ['Noun + ばかり: 甘い物ばかり.', 'Verb て / で-form + ばかりいる: 遊んでばかりいる; ばかり normally replaces object を.'], '～たばかり means an action was recent, while ～てばかりいる describes repeated behavior. Noun + ばかり stresses a skewed selection; ～だけ more neutrally states a limit and need not imply criticism.', 'focus', 'daily', [
  form('弟は休みの日、ゲームで', 'ばかりいて、宿題を後回しにしています。', 'On days off, my younger brother keeps playing games and puts his homework off.', [
    ['遊んで', '遊ぶ has the て-form 遊んで. 遊んでばかりいて describes repeated play while homework is neglected.'],
    ['遊ぶ', 'Dictionary form does not attach to the repeated-behavior pattern ばかりいる. Use 遊んで.'],
    ['遊び', 'The verb stem is not the required attachment. The pattern uses the て-form.'],
    ['遊んだ', 'Past 遊んだばかり would mean having just played. It does not form the intended repeated behavior with いて.'],
  ]),
  form('友人は最近、同じ作家の小説', '読んでいて、ほかの作家の本は読んでいません。', 'Recently my friend has been reading novels by the same author all the time and has not been reading other authors.', [
    ['ばかり', 'Noun + ばかり marks the friend’s biased selection. It replaces the object particle in 小説ばかり読んでいる.'],
    ['ばかりをで', 'をで cannot connect the noun phrase to 読んでいる. Use 小説ばかり読んでいて.'],
    ['ばかりに', 'ばかりに marks an unfortunate cause when attached in an appropriate clause. It does not mark the object selection here.'],
    ['ばかりの', 'ばかりの would need a following noun to modify. 読んでいて is a verb, so this option cannot connect it.'],
  ]),
]);

type SourceQuestion = { prompt: string; type: QuestionType; evidence: string; choices: Choices };
function reading(slug: string, title: string, type: Reading['type'], topicId: TopicId, body: string, translation: string, specs: [SourceQuestion, SourceQuestion]): void {
  const id = `ds-r-n3-${slug}`;
  const questionIds = specs.map((item, i) => q(`r-${slug}-${i + 1}`, 'reading', topicId, item.type, item.prompt, item.choices, { passageId: id, evidence: item.evidence }));
  datasetIntermediateReadings.push({ id, title, type, topicId, body, translation, questionIds, jlptLevel: 'n3' });
}
function listening(slug: string, title: string, topicId: TopicId, script: string, translation: string, specs: [SourceQuestion, SourceQuestion]): void {
  const id = `ds-l-n3-${slug}`;
  const questionIds = specs.map((item, i) => q(`l-${slug}-${i + 1}`, 'listening', topicId, item.type, item.prompt, item.choices, { listeningId: id, evidence: item.evidence }));
  datasetIntermediateListening.push({ id, title, topicId, script, translation, questionIds, jlptLevel: 'n3' });
}

reading('photo-captions', '写真展の説明文をそろえる', 'email', 'culture',
  '写真展に参加する皆さんへ\n\n昨日、皆さんの写真を会場に並べてみました。同じ場所で撮った写真でも、人によって見え方が違っていて、おもしろい展示になりそうです。ただ、写真につける説明文の長さがばらばらで、写真より説明のほうが目立つものもありました。\nそこで、説明文は六十字以内にそろえることにしました。作品名と撮った場所は、説明文とは別の欄に書いてください。今の説明文が六十字以内なら、書き直す必要はありません。長い人だけ、金曜日の正午までに短くした文をメールで送ってください。写真はすでに印刷してあるので、送り直さなくて大丈夫です。\n土曜日は十時から準備をします。私は会場の入口で案内をするため、写真を並べる作業は皆さんにお願いしたいと思っています。並べる順番は当日一緒に相談しましょう。\n写真展係　山田',
  'To everyone taking part in the photo exhibition: Yesterday I tried arranging your photographs in the venue. Even photos of the same place show different perspectives, so the display looks promising. However, the captions varied in length, and some drew more attention than the photographs. We have therefore decided to limit captions to sixty characters. Write the work’s title and location in separate fields. If your current caption is already within sixty characters, you need not rewrite it. Only people with longer captions should email a shortened version by noon Friday. The photographs have already been printed, so you need not resend them. Preparation begins at ten on Saturday. I will guide people at the entrance, so I would like you to arrange the photographs. Let us discuss the order together that day. Yamada, exhibition coordinator.', [
    { prompt: '説明文を六十字以内にするのは、主にどうしてですか。', type: 'reading-medium', evidence: '写真につける説明文の長さがばらばらで、写真より説明のほうが目立つものもありました。', choices: [
      ['長さの違いで、説明文が写真より目立つのを防ぐため。', 'The problem is that unevenly long captions can draw more attention than the photos. The limit addresses that display issue.'],
      ['写真を小さく印刷し直すため。', 'The email says the photos have already been printed. It does not propose printing them again at a smaller size.'],
      ['撮った場所を皆に秘密にするため。', 'Locations are to be written in a separate field, so they are still included rather than kept secret.'],
      ['すべての写真に同じ説明をつけるため。', 'The captions are limited in length, but each can describe its own photograph. Their wording need not be identical.'],
    ] },
    { prompt: '説明文が八十字の人は、金曜日の正午までに何をすればいいですか。', type: 'reading-medium', evidence: '長い人だけ、金曜日の正午までに短くした文をメールで送ってください。写真はすでに印刷してあるので、送り直さなくて大丈夫です。', choices: [
      ['六十字以内にした説明文をメールで送る。', 'Eighty characters exceeds the limit. The required action is to shorten the caption to sixty or fewer and email it by the deadline.'],
      ['写真をもう一度印刷して会場へ持って行く。', 'The photos have already been printed, and the email explicitly says they need not be sent again.'],
      ['作品名と撮った場所を説明文に加える。', 'Those details belong in separate fields. Adding them to the caption would not solve its excessive length.'],
      ['土曜日の写真の順番を一人で決める。', 'The arrangement will be discussed together on Saturday. No individual is asked to decide it before Friday.'],
    ] },
  ]);

reading('exchange-market', '交換市の出店案内', 'notice', 'community',
  '使わなくなった物の交換市\n\n来月の第一日曜日、地域センターで交換市を開きます。まだ使える本や食器などを持ち寄り、ほしい人に無料で譲る行事です。物を売ることはできません。電気を使う物と食べ物は受け付けません。また、汚れや傷がある物は、相手が選ぶ前にその状態を説明してください。\n机を使って物を並べたい人は、今月二十五日までに申し込んでください。机は一人につき一台です。申込者が多い場合は、先に申し込んだ人から順に受け付けます。予約した机を使わなくなったときは、待っている人に譲れるよう、早めに連絡してください。\n物をもらうだけの人は、予約も参加費も必要ありません。当日の受付は午前十時から、交換は十時半から正午までです。もらった物を入れる袋は、各自でお持ちください。譲れずに残った物は、センターに置いていかず、持ち帰ること。',
  'Exchange market for things you no longer use: On the first Sunday of next month, the community center will hold a market where people bring usable books, dishes, and similar items and give them away free to people who want them. Selling is not allowed. Electrical items and food are not accepted. Explain any dirt or damage before the other person chooses an item. Anyone wanting a table to display their items must apply by the twenty-fifth of this month. Each person gets one table; if there are too many applications, earlier applicants receive priority. Contact us early if you no longer need your table so it can go to someone waiting. People who only want to receive items need neither a reservation nor a participation fee. Reception begins at ten, and exchanges run from ten thirty to noon. Bring your own bag. Take home items that remain; do not leave them at the center.', [
    { prompt: 'この交換市でできることは、どれですか。', type: 'reading-information', evidence: 'まだ使える本や食器などを持ち寄り、ほしい人に無料で譲る行事です。物を売ることはできません。電気を使う物と食べ物は受け付けません。また、汚れや傷がある物は、相手が選ぶ前にその状態を説明してください。', choices: [
      ['小さな傷がある皿について説明し、無料で譲る。', 'Usable dishes are accepted. Damage must be explained before the recipient chooses, and items must be given away free.'],
      ['まだ使える電気の時計を無料で譲る。', 'All items that use electricity are excluded, even when usable and offered free.'],
      ['読まなくなった本を安い値段で売る。', 'Selling is explicitly prohibited. A low price does not change that condition.'],
      ['手作りのお菓子を机に並べて無料で配る。', 'Food is not accepted. Offering it for free does not make it eligible.'],
    ] },
    { prompt: '予約した机を使わなくなった人が、早く連絡するように言われているのはなぜですか。', type: 'reading-information', evidence: '予約した机を使わなくなったときは、待っている人に譲れるよう、早めに連絡してください。', choices: [
      ['机を待っている別の人が使えるようにするため。', 'The notice gives the reason directly: early notice allows a reserved table to be reassigned to someone waiting.'],
      ['センターから参加費を返してもらうため。', 'The instruction concerns table allocation. No table participation fee or refund procedure is stated.'],
      ['机に残った物をセンターに引き取ってもらうため。', 'Leftover items must be taken home; the center does not agree to take them.'],
      ['当日の交換を十時に始められるようにするため。', 'Reception begins at ten, but the exchange starts at ten thirty. A cancellation does not change those times.'],
    ] },
  ]);

reading('imperfect-notebook', 'うまくいかなかった日の記録', 'article', 'education',
  '私は以前、日本語の勉強の記録に、できたことだけを書いていた。「新しい言葉を二十覚えた」「長い文章を最後まで読んだ」という記録が増えると、勉強が進んでいるようでうれしかった。一方、何もできなかったと思う日は、ノートを開くのも嫌だった。\nある日、先生にそのノートを見せると、「分からなかったことも書いてみたら」と言われた。最初は、失敗を残すようで気が進まなかった。しかし、似た言葉を何度も間違えていたと書いておくと、次の週に何を復習すればいいか、すぐに分かった。友人との会話で聞き取れなかった表現も、忘れずに先生に質問できた。\n今は、できたことと困ったことを一つずつ書くことにしている。ノートが立派に見えるかどうかより、次にすることが分かるかどうかのほうが大切だと思う。何も進まなかったように感じる日にも、勉強を続けるための材料は見つけられるのだ。',
  'I used to write only achievements in my Japanese study record. Entries such as “learned twenty new words” and “read a long passage to the end” made me happy because they seemed to show progress. On days when I felt I had achieved nothing, however, I did not even want to open the notebook. One day my teacher suggested writing down things I had not understood too. Initially I disliked the idea because it felt like preserving failures. But when I recorded repeatedly confusing similar words, I could immediately see what to review the next week. I could also remember to ask my teacher about expressions I had failed to understand in conversation with a friend. Now I write one achievement and one difficulty. What matters more than how impressive the notebook looks is whether it helps me see what to do next. Even a day that seems unproductive can provide material for continuing to learn.', [
    { prompt: '筆者が「分からなかったこと」を書いてよかったと感じたのは、どうしてですか。', type: 'reading-medium', evidence: '似た言葉を何度も間違えていたと書いておくと、次の週に何を復習すればいいか、すぐに分かった。友人との会話で聞き取れなかった表現も、忘れずに先生に質問できた。', choices: [
      ['復習する内容や先生に聞くことが分かるようになったから。', 'The new entries identify review needs and preserve expressions to ask about. Those concrete benefits changed the writer’s view.'],
      ['失敗を書けば、似た言葉を一度で覚えられたから。', 'The passage does not claim instant memorization. Recording mistakes helps choose what to review later.'],
      ['先生に毎日ノートを書いてもらえるようになったから。', 'The teacher offers a suggestion. The writer continues making the entries personally.'],
      ['友人との会話では、もう聞き取れない表現がなくなったから。', 'The record preserves expressions that were not understood; the writer never says listening problems disappeared.'],
    ] },
    { prompt: '筆者は、勉強のノートについて今はどう考えていますか。', type: 'reading-medium', evidence: 'ノートが立派に見えるかどうかより、次にすることが分かるかどうかのほうが大切だと思う。', choices: [
      ['よい結果だけでなく、次の勉強に役立つ内容を残すことが大切だ。', 'The writer values guidance for future study over an impressive-looking record and now records both achievements and difficulties.'],
      ['うまくいかなかった日は、何も書かずに休むほうがいい。', 'The final sentence says even apparently unproductive days can supply learning material. Omitting those days contradicts the writer’s current approach.'],
      ['覚えた言葉の数を増やせば、ノートの役割は十分だ。', 'Counting successes was the earlier limited method. The present view includes difficulties that inform the next step.'],
      ['ほかの人に立派だと思われるように、内容を選ぶべきだ。', 'The writer explicitly prioritizes knowing the next action over making the notebook look impressive.'],
    ] },
  ]);

reading('tool-lending', '買う前に道具を借りる', 'advertisement', 'home',
  '日曜大工の道具、必要な日だけ借りられます\n\n棚を作りたいけれど、使い続けるか分からない道具を買うのは迷う。そんな方は、さくら道具店の貸出サービスをお試しください。のこぎりや木に穴を開ける道具などを、一日五百円から借りられます。初めて借りる方は、住所を確認できる身分証明書をお持ちください。貸出料金とは別に預かり金千円が必要ですが、道具を返すときに、壊れたところがなければ全額お返しします。\n予約は前日の午後五時まで、電話で受け付けます。受け取りは午前九時から十一時、返却は同じ日の午後六時までです。一日だけ借りる場合も、郵送での返却はできません。返しに来られない日は予約しないでください。\nどの道具を使うか分からない方は、作りたい物の大きさを書いた紙を持って、まず店でご相談ください。道具の選び方と基本的な使い方は、貸出前に無料で説明します。木などの材料は貸出料金に含まれません。',
  'Borrow DIY tools only on the days you need them. If you want to build a shelf but hesitate to buy tools you may not keep using, try Sakura Tool Shop’s lending service. Saws and tools for making holes in wood are available from five hundred yen per day. First-time borrowers must bring identification that confirms their address. In addition to the rental fee, a thousand-yen deposit is required. It will be returned in full when the tools are brought back without damage. Telephone reservations are accepted until five the previous afternoon. Collect tools between nine and eleven in the morning and return them by six the same day. Postal returns are not allowed, even for a one-day rental. Do not reserve for a day when you cannot come back. If you are unsure which tools you need, first visit with a paper showing the dimensions of what you want to build. Advice on choosing tools and basic use is free before lending. Materials such as wood are not included in the rental fee.', [
    { prompt: '初めて借りる人が千円の預かり金を全額返してもらえるのは、どんなときですか。', type: 'reading-information', evidence: '道具を返すときに、壊れたところがなければ全額お返しします。', choices: [
      ['道具を壊さずに店へ返したとき。', 'The full deposit is returned when the tools are returned without damage. Returns must be made at the shop.'],
      ['前日の午後五時までに電話で予約したとき。', 'That is the reservation deadline. The deposit is not returned merely for making a reservation.'],
      ['住所を確認できる身分証明書を持ってきたとき。', 'Identification is a first-time borrowing requirement. Deposit repayment depends on the condition when the tools are returned.'],
      ['材料を道具と一緒に店で買ったとき。', 'Buying materials is not a stated condition for recovering the deposit. The advertisement specifies undamaged returned tools.'],
    ] },
    { prompt: '棚を作りたいが必要な道具が分からない人は、まずどうすればいいですか。', type: 'reading-information', evidence: 'どの道具を使うか分からない方は、作りたい物の大きさを書いた紙を持って、まず店でご相談ください。', choices: [
      ['棚の大きさを書いた紙を持ち、店で相談する。', 'The advertisement explicitly directs uncertain customers to bring the planned object’s dimensions and consult the shop first.'],
      ['借りられる道具を全部電話で予約する。', 'The shop offers help selecting suitable tools. Reserving every tool is neither required nor suggested.'],
      ['材料を郵送して、店で棚を作ってもらう。', 'No construction or mailed-material service is advertised. The service lends tools for the customer’s use.'],
      ['棚を完成させてから、使い方の説明を受ける。', 'Advice and basic instructions are offered before lending. Waiting until the shelf is finished reverses the stated sequence.'],
    ] },
  ]);

listening('duplicate-order', '重ねて買った本を返す', 'shopping',
  '客：先週こちらで買った本を返品したいんですが。家族が同じ本を買っていたんです。\n店員：そうでしたか。本と領収書を見せていただけますか。\n客：はい。まだ袋も開けていません。カードで払いました。\n店員：この状態なら返品できます。ただ、カードへの返金には、買ったときのカードが必要です。今日はお持ちですか。\n客：別のかばんに入れてしまって。現金で返してもらうことはできますか。\n店員：申し訳ありませんが、現金ではお返しできないんです。カードと本と領収書を一緒にお持ちください。\n客：では、明日また来ます。\n店員：明日は店の点検で休業します。あさってなら、いつもの時間に開いています。\n客：分かりました。あさって、必要な物をそろえて来ます。',
  'Customer: I would like to return the book I bought here last week. My family bought the same one. Clerk: May I see the book and receipt? Customer: Here they are. I have not even opened the bag. I paid by card. Clerk: We can accept it in this condition, but a refund to your card requires the card used for the purchase. Do you have it today? Customer: I left it in another bag. Could you refund me in cash? Clerk: Sorry, we cannot refund in cash. Please bring the card, book, and receipt together. Customer: I will come back tomorrow. Clerk: We are closed tomorrow for an inspection. The day after tomorrow we will be open at our usual hours. Customer: Understood. I will bring all the required things the day after tomorrow.', [
    { prompt: '客は、返品のために次にどうすることにしましたか。', type: 'listening-task', evidence: '客：分かりました。あさって、必要な物をそろえて来ます。', choices: [
      ['あさって、本と領収書と支払いに使ったカードを持って来る。', 'The customer accepts the closure and agrees to return the day after tomorrow with the three required items.'],
      ['明日、本と領収書だけを持って来る。', 'Tomorrow is a closure day, and the payment card is also required. Both details conflict with the plan.'],
      ['今日、本を置いて現金で返金してもらう。', 'The clerk explicitly refuses a cash refund and needs the original card, which the customer does not have today.'],
      ['あさって、家族が買った本だけを持って来る。', 'The return concerns the book purchased from this shop and requires its receipt and the original payment card. The family’s book is not the agreed item.'],
    ] },
    { prompt: '店員は、今日返金できない理由として何を説明していますか。', type: 'listening-points', evidence: 'カードへの返金には、買ったときのカードが必要です。今日はお持ちですか。', choices: [
      ['客が、支払いに使ったカードを持っていないから。', 'The clerk can accept the book’s condition but needs the card used for payment, which the customer left in another bag.'],
      ['本の袋がすでに開いているから。', 'The customer says the bag is unopened, and the clerk says the book is returnable in that condition.'],
      ['領収書に買った日が書かれていないから。', 'No missing date is mentioned. The stated obstacle is the absent payment card.'],
      ['今日の店が点検で休業しているから。', 'The inspection closure is tomorrow. The clerk is serving the customer today.'],
    ] },
  ]);

listening('display-labels', '展示の札を作り直す', 'culture',
  '森：写真展の札を印刷しました。作品名を大きく、撮った場所をその下に入れました。これでどうでしょう。\n林：見やすいですね。あ、撮った人の名前はありますか。\n森：裏に書いてあります。表には入れなくてもいいと思ったんですが。\n林：見に来た人が作者に話しかけられるように、名前も表にあると助かります。\n森：分かりました。場所の名前を消して、そこに作者の名前を入れましょうか。\n林：場所も残してください。同じ町で撮った写真を比べる展示ですから。作品名を少し小さくすれば、三つとも入りますよ。\n森：では、作品名の下に場所と作者の名前を並べます。印刷した札は全部取り替えますね。\n林：お願いします。札の大きさは今のままで大丈夫です。',
  'Mori: I printed the photo exhibition labels, with the titles in large type and locations underneath. How are they? Hayashi: They are easy to read. Are the photographers’ names included? Mori: They are on the back. I thought we did not need them on the front. Hayashi: It would help to have names on the front so visitors can speak to the creators. Mori: Should I delete the locations and put the names there? Hayashi: Keep the locations too. This exhibition compares photos taken in the same town. All three details will fit if the titles are a little smaller. Mori: Then I will put the locations and creators’ names together below the titles and replace all the printed labels. Hayashi: Please do. The label size can stay as it is.', [
    { prompt: '森さんは、札をどう直しますか。', type: 'listening-task', evidence: '森：では、作品名の下に場所と作者の名前を並べます。印刷した札は全部取り替えますね。', choices: [
      ['作品名を少し小さくし、その下に場所と作者の名前を入れる。', 'The final agreed change retains all three details, reduces title size, and puts the location and creator’s name underneath.'],
      ['撮った場所を消し、作者の名前だけを作品名の下に入れる。', 'That is Mori’s initial suggestion, but Hayashi explicitly asks that locations remain.'],
      ['札を大きくし、作者の名前は裏に書く。', 'Names must be visible on the front, and Hayashi says the existing label size is fine.'],
      ['作品名を消し、場所と作者の名前だけを大きく書く。', 'No one agrees to remove the work titles. They will simply be made smaller.'],
    ] },
    { prompt: '林さんが作者の名前を表に入れてほしいのは、なぜですか。', type: 'listening-points', evidence: '見に来た人が作者に話しかけられるように、名前も表にあると助かります。', choices: [
      ['来場者が作者に話しかけやすくなるから。', 'Hayashi states that visible names help visiting viewers approach and speak to the creators.'],
      ['作品名を覚えなくてもよくなるから。', 'The work titles remain. Forgetting or replacing them is not the reason for including creator names.'],
      ['写真を撮った町を隠せるから。', 'The exhibition compares photographs of the same town, and Hayashi insists that location information remain.'],
      ['作者が札を持ち帰りやすくなるから。', 'Taking labels home is not discussed. The request concerns communication during the exhibition.'],
    ] },
  ]);

listening('bridge-detour', '橋の工事と駅への道', 'transport',
  '友人：明日、新しい家に寄ってから一緒に駅へ行ってもいい？\n住人：いいよ。駅までは川沿いを歩けば十五分ぐらいだけど、今は橋を工事しているんだ。\n友人：じゃあ、バスのほうが早い？\n住人：乗っている時間は五分。でも、朝は混雑で遅れることがあるし、次のバスまで二十分待つこともあるよ。\n友人：電車に遅れたくないな。歩ける別の道はないの？\n住人：商店街を通れば、橋を使わずに駅に行ける。二十五分ぐらいかかるけど、時間は読みやすい。\n友人：それなら、その道を歩こう。お店を見るのも楽しそうだし。\n住人：朝早いから、店はまだ開いていないと思うよ。\n友人：そうか。まあ、ちゃんと電車に間に合うほうが大事だね。いつもより十分早く出よう。',
  'Friend: May I stop by your new home tomorrow and then go to the station with you? Resident: Sure. Along the river it takes about fifteen minutes, but the bridge is under construction now. Friend: Would the bus be faster? Resident: The ride is five minutes, but morning congestion can delay it, and we sometimes wait twenty minutes for the next one. Friend: I do not want to miss the train. Is there another walking route? Resident: Through the shopping street, you can reach the station without the bridge. It takes about twenty-five minutes, but the time is predictable. Friend: Let us walk that way. Looking at the shops sounds fun too. Resident: It will be early, so they probably will not be open. Friend: I see. Getting to the train on time matters more anyway. Let us leave ten minutes earlier than usual.', [
    { prompt: '二人は、明日どうやって駅へ行きますか。', type: 'listening-task', evidence: '友人：それなら、その道を歩こう。', choices: [
      ['いつもより早く出て、商店街を通って歩く。', 'They choose the predictable twenty-five-minute walking route through the shopping street and agree to depart ten minutes earlier.'],
      ['工事中の橋を渡り、川沿いを歩く。', 'The bridge construction is the reason they need an alternative. They do not choose the river route.'],
      ['店が開くまで待ってから、バスに乗る。', 'They decide to walk and prioritize catching the train. They do not agree to wait for shops to open.'],
      ['二十分遅く出て、家の前からバスに乗る。', 'A possible twenty-minute bus wait is a drawback, not a chosen delayed departure. They instead leave earlier and walk.'],
    ] },
    { prompt: '友人が最後に一番大切だと考えていることは、何ですか。', type: 'listening-points', evidence: 'まあ、ちゃんと電車に間に合うほうが大事だね。', choices: [
      ['予定の電車に確実に間に合うこと。', 'The final remark explicitly prioritizes arriving in time for the train over browsing shops or minimizing the walking time.'],
      ['開いている店をたくさん見ること。', 'The resident says shops will probably still be closed. The friend then prioritizes the train instead.'],
      ['歩く時間を必ず十五分以内にすること。', 'The chosen route takes about twenty-five minutes. Predictability matters more than the shortest walking time.'],
      ['新しい橋が完成するのを見届けること。', 'The bridge is under construction, but watching its completion is never proposed as their purpose.'],
    ] },
  ]);

listening('study-location', '音読の練習をする場所', 'education',
  '学生Ａ：土曜日、三人で日本語の発表の練習をしよう。図書館の読書室なら静かだよね。\n学生Ｂ：静かだけど、声を出す練習はできないんじゃない？\n学生Ａ：そうか。駅前のカフェはどう？広い席があったよ。\n学生Ｂ：土曜日は行列ができるし、長く席を使うのは悪い気がする。学校の小さい会議室を予約できないかな。\n学生Ａ：調べたら、午後二時から四時まで空いていた。ただ、予約するには先生の許可がいるって。\n学生Ｂ：じゃあ、今日先生に聞いてみよう。私は四時半から仕事だから、四時までなら大丈夫。\n学生Ａ：分かった。先生に許可をもらってから、私が予約するよ。もう一人には、場所が決まってから連絡しよう。\n学生Ｂ：うん。発表の原稿も忘れずに持っていこう。',
  'Student A: Let us practice our Japanese presentations with three people on Saturday. The library reading room would be quiet. Student B: It would, but we probably cannot practice aloud there. A: What about the station café? It has a large table. B: People queue there on Saturdays, and I would feel bad using a table for a long time. Could we book the school’s small meeting room? A: I checked; it is free from two to four. But booking requires the teacher’s permission. B: Let us ask the teacher today. My job begins at four thirty, so finishing by four works for me. A: All right. After getting permission, I will reserve it. Let us contact the other student once the place is decided. B: Yes, and remember to bring our presentation drafts.', [
    { prompt: '会議室を予約する前に、二人がすることは何ですか。', type: 'listening-task', evidence: '先生に許可をもらってから、私が予約するよ。', choices: [
      ['先生に会議室を使ってよいか聞く。', 'Teacher permission is a prerequisite. A explicitly says the reservation will be made after receiving it.'],
      ['カフェの行列に並び、席を取る。', 'They do not choose the crowded café. Joining its queue is not part of the booking procedure.'],
      ['図書館で大きな声を出して練習する。', 'The inability to practice aloud is the reason they reject the reading room.'],
      ['もう一人に、会議室に来るよう連絡する。', 'They plan to contact the third student after the place is settled. Permission comes before confirming that location.'],
    ] },
    { prompt: '学生Ｂは、カフェで練習することをどう思っていますか。', type: 'listening-points', evidence: '土曜日は行列ができるし、長く席を使うのは悪い気がする。', choices: [
      ['混む日に長く席を使うのは、ほかの客に悪いと思っている。', 'B refers to Saturday queues and feels uncomfortable occupying a seat for a long time while others wait.'],
      ['席が広すぎて、三人では話しにくいと思っている。', 'A mentions a large table as an advantage. B does not object to its size.'],
      ['午後四時半に閉店するので、練習できないと思っている。', 'Four thirty is B’s work start time. No café closing time is given.'],
      ['先生の許可があれば、必ずカフェを使いたいと思っている。', 'Teacher permission concerns the school meeting room. B proposes that room after expressing concern about the café.'],
    ] },
  ]);

listening('community-stories', '町の思い出を聞く会', 'community',
  '司会：来月から、町の思い出を聞く会を始めるそうですね。古い写真を集めるんですか。\n主催者：写真があればうれしいですが、何かを持ってこなければ話せない会にはしたくないんです。引っ越してきた日のことや、昔通っていた店のことなど、覚えている話を聞かせてもらいます。\n司会：正しい年や店の名前が分からなくても、参加できますか。\n主催者：もちろんです。最初から細かいところを全部確認するのではなく、まず話すことを楽しんでほしいですね。分からない点は後で、ほかの参加者と一緒に調べられますから。\n司会：町の歴史の本を作る予定なんでしょうか。\n主催者：今のところ、その予定はありません。それより、近所に住んでいても話したことのない人同士が、知り合う機会になればと思っています。\n司会：では、長く住んでいる人だけの会ではないんですね。\n主催者：はい。最近来た人にも、聞き手として気軽に参加してほしいです。',
  'Host: I hear you will start meetings to share memories of the town next month. Are you collecting old photographs? Organizer: Photos would be welcome, but I do not want a meeting where you need to bring something in order to speak. People can tell remembered stories, such as the day they moved here or shops they used to visit. Host: Can they participate without knowing the exact year or shop name? Organizer: Of course. Rather than checking every detail from the start, I first want them to enjoy telling stories. Unclear points can be investigated with other participants later. Host: Are you planning a town history book? Organizer: Not currently. I hope instead that people who live near each other but have never spoken will get to know one another. Host: So it is not only for long-term residents. Organizer: Right. I would also like recent arrivals to feel free to join as listeners.', [
    { prompt: '主催者は、この会をどんな機会にしたいと考えていますか。', type: 'listening-outline', evidence: '近所に住んでいても話したことのない人同士が、知り合う機会になればと思っています。', choices: [
      ['町の話を通して、近所の人同士が知り合う機会。', 'The organizer explicitly prioritizes helping neighbors who have not spoken get to know one another through shared stories.'],
      ['正しい年を覚えている人だけが知識を競う機会。', 'Precise dates are not required. The organizer favors enjoying stories before verifying details.'],
      ['歴史の本を売り、その売り上げを集める機会。', 'There is no current plan to produce a history book, and no sales or fund collection is mentioned.'],
      ['引っ越してきたばかりの人が、古い写真を提出する機会。', 'Photos are optional, and newcomers are invited as listeners. Submitting photographs is not the meeting’s purpose.'],
    ] },
    { prompt: '思い出の話に、はっきり分からない点があるときは、どうすることができますか。', type: 'listening-points', evidence: '分からない点は後で、ほかの参加者と一緒に調べられますから。', choices: [
      ['まず話して、後から参加者と一緒に調べる。', 'The organizer accepts uncertain details during storytelling and proposes checking them with others afterward.'],
      ['会に来る前に全部調べ、正しいと分かってから参加する。', 'Complete advance checking is explicitly unnecessary. Participation does not depend on knowing every detail.'],
      ['写真がなければ、その話をするのはやめる。', 'The organizer does not want an event where bringing an object is necessary to speak. Photographs are optional.'],
      ['最近来た人だけに、すぐ答えを教えてもらう。', 'No such role is assigned to newcomers. The plan is to investigate later together with participants.'],
    ] },
  ]);

listening('shift-and-delivery', '荷物の確認を引き受ける', 'work',
  '先輩：明日の朝、配達の人が来たら、私の代わりに荷物を確認してもらえますか。会議が九時からなんです。\n後輩：はい。届くのは、新しい商品の見本ですよね。\n先輩：そうです。箱は二つの予定ですが、数だけ合っていても安心できません。中の商品名を注文の一覧と比べてください。\n後輩：分かりました。間違っていたら、すぐ送り返しますか。\n先輩：いいえ。配達の人には、その場で待ってもらわなくて大丈夫です。箱はここに置いて、私にメッセージを送ってください。私から店に問い合わせます。\n後輩：では、箱を開けて商品名を確認します。違っていたら、先輩に連絡するんですね。\n先輩：お願いします。一覧はこの机の引き出しにあります。\n後輩：はい、今のうちに見ておきます。\n先輩：助かります。確認した後で、届いた数も一覧に書いておいてください。',
  'Senior colleague: When the delivery arrives tomorrow morning, could you check the goods in my place? My meeting begins at nine. Junior colleague: Yes. They are the new product samples, right? Senior: Right. We expect two boxes, but the number alone is not enough. Compare the product names inside with the order list. Junior: If something is wrong, should I send it back immediately? Senior: No. The courier need not wait. Leave the boxes here and message me. I will contact the shop. Junior: Then I will open the boxes and check the names, and contact you if they differ. Senior: Please do. The list is in this desk drawer. Junior: I will look at it now. Senior: That helps. After checking, also write the delivered quantities on the list.', [
    { prompt: '後輩は、届いた商品が一覧と違っていたら、どうしますか。', type: 'listening-task', evidence: '箱はここに置いて、私にメッセージを送ってください。私から店に問い合わせます。', choices: [
      ['箱を職場に置き、先輩にメッセージを送る。', 'The senior rejects immediate return and instructs the junior to leave the boxes there and send a message. The senior will contact the shop.'],
      ['配達の人に待ってもらい、その場で全部返す。', 'The senior explicitly says the courier need not wait and does not authorize an immediate return.'],
      ['自分で店に電話し、先輩には知らせない。', 'The senior will make the inquiry. The junior’s assigned action is to inform the senior.'],
      ['一覧の商品名を、届いた商品に合わせて直す。', 'The list is the comparison reference. Altering the ordered names would hide the mismatch rather than report it.'],
    ] },
    { prompt: '後輩が「箱が二つ届けば、確認は終わりですね」と聞いた場合、先輩の返事として内容の合うものはどれですか。', type: 'listening-response', evidence: '箱は二つの予定ですが、数だけ合っていても安心できません。中の商品名を注文の一覧と比べてください。', choices: [
      ['いいえ、箱の数だけでなく、中の商品名も一覧と比べてください。', 'This response preserves the explicit instruction: counting boxes is insufficient, and product names inside must match the order list.'],
      ['はい、箱が二つなら、中を開ける必要はありません。', 'The senior explicitly requires checking the contents, so this reassurance contradicts the instruction.'],
      ['いいえ、箱は一つの予定ですから、二つなら返してください。', 'Two boxes are expected, not one. A return is also not the instructed response to a problem.'],
      ['はい、一覧は配達の人が持っていますから、もらってください。', 'The list is in the desk drawer. The courier is not identified as its holder.'],
    ] },
  ]);
