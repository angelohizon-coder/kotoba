import type { Grammar, Kanji, Listening, Question, QuestionType, Reading, TopicId, Vocabulary } from '../types';

// Authored for this app. Level labels are teaching routes, not official item lists.
export const foundationScopeNote = 'These original N5–N3 study routes review useful foundations. The JLPT does not publish an exhaustive vocabulary or grammar syllabus. Level labels are course guidance; these lessons and questions are not official past examination papers.';
export const foundationLevels = [
  {id:'n5', title:'N5 · Start with the basics', description:'Everyday words, particles, polite forms, simple notices and short conversations.'},
  {id:'n4', title:'N4 · Connect your ideas', description:'Conditions, ability, experience, reasons and practical conversations.'},
  {id:'n3', title:'N3 · Build your independence', description:'The existing intermediate course: longer texts, nuanced grammar and everyday decisions.'},
] as const;
type FoundationLevel = 'n5' | 'n4';
type WordRow = [slug:string, word:string, reading:string, meaning:string, wordClass:string, example:string, translation:string, topicId:TopicId];
const n='noun', vt='godan verb (transitive)', vi='godan verb (intransitive)', it='ichidan verb (transitive)';
const wordRows: Record<FoundationLevel, WordRow[]> = {
  n5: [
    ['school','学校','がっこう','school',n,'学校は駅の近くにあります。','The school is near the station.','education'],
    ['student','学生','がくせい','student',n,'私は日本語を勉強している学生です。','I am a student studying Japanese.','education'],
    ['teacher','先生','せんせい','teacher',n,'先生に名前を言いました。','I told the teacher my name.','education'],
    ['friend','友達','ともだち','friend',n,'友達と映画を見ます。','I will watch a film with a friend.','people'],
    ['child','子供','こども','child',n,'子供が公園で遊んでいます。','A child is playing in the park.','people'],
    ['father','父','ちち','my father',n,'父は毎朝新聞を読みます。','My father reads the newspaper every morning.','people'],
    ['mother','母','はは','my mother',n,'母は今、台所にいます。','My mother is in the kitchen now.','people'],
    ['older-brother','兄','あに','my older brother',n,'兄は大学の学生です。','My older brother is a university student.','people'],
    ['older-sister','姉','あね','my older sister',n,'姉は銀行で働いています。','My older sister works at a bank.','people'],
    ['younger-brother','弟','おとうと','younger brother',n,'弟はサッカーが好きです。','My younger brother likes football.','people'],
    ['younger-sister','妹','いもうと','younger sister',n,'妹と一緒にご飯を食べました。','I ate a meal with my younger sister.','people'],
    ['dog','犬','いぬ','dog',n,'犬が庭にいます。','There is a dog in the garden.','nature'],
    ['cat','猫','ねこ','cat',n,'猫は椅子の下で寝ています。','The cat is sleeping under the chair.','nature'],
    ['water','水','みず','water',n,'水を一杯飲みました。','I drank a glass of water.','food'],
    ['milk','牛乳','ぎゅうにゅう','milk',n,'朝ご飯のときに牛乳を飲みます。','I drink milk with breakfast.','food'],
    ['tea','お茶','おちゃ','tea',n,'熱いお茶をください。','Please give me some hot tea.','food'],
    ['meal','ご飯','ごはん','cooked rice; meal',n,'友達とご飯を食べます。','I will eat a meal with a friend.','food'],
    ['bread','パン','ぱん','bread',n,'朝はパンを食べました。','I ate bread in the morning.','food'],
    ['morning','朝','あさ','morning',n,'朝はいつも七時に起きます。','I always get up at seven in the morning.','time'],
    ['night','夜','よる','night; evening',n,'夜は家で本を読みます。','I read books at home in the evening.','time'],
    ['today','今日','きょう','today',n,'今日は学校が休みです。','There is no school today.','time'],
    ['tomorrow','明日','あした','tomorrow',n,'明日は雨です。','It will rain tomorrow.','time'],
    ['yesterday','昨日','きのう','yesterday',n,'昨日は友達に会いました。','I met a friend yesterday.','time'],
    ['every-day','毎日','まいにち','every day',n,'毎日、日本語を勉強します。','I study Japanese every day.','time'],
    ['this-week','今週','こんしゅう','this week',n,'今週は仕事が忙しいです。','I am busy with work this week.','time'],
    ['next-week','来週','らいしゅう','next week',n,'来週、東京へ行きます。','I will go to Tokyo next week.','time'],
    ['station','駅','えき','station',n,'駅で友達を待ちます。','I will wait for my friend at the station.','transport'],
    ['train','電車','でんしゃ','train',n,'電車で学校へ行きます。','I go to school by train.','transport'],
    ['bicycle','自転車','じてんしゃ','bicycle',n,'自転車で公園へ行きました。','I went to the park by bicycle.','transport'],
    ['car','自動車','じどうしゃ','automobile; car',n,'新しい自動車を買いました。','I bought a new car.','transport'],
    ['shop','店','みせ','shop; store',n,'あの店で靴を買いました。','I bought shoes at that shop.','shopping'],
    ['hospital','病院','びょういん','hospital',n,'病院で医者に会います。','I will see a doctor at the hospital.','health'],
    ['bank','銀行','ぎんこう','bank',n,'銀行は九時に開きます。','The bank opens at nine.','services'],
    ['post-office','郵便局','ゆうびんきょく','post office',n,'郵便局で切手を買いました。','I bought stamps at the post office.','services'],
    ['book','本','ほん','book',n,'この本は日本語の本です。','This book is a Japanese-language book.','education'],
    ['desk','机','つくえ','desk',n,'机の上に本があります。','There is a book on the desk.','home'],
    ['chair','椅子','いす','chair',n,'椅子に座ってください。','Please sit on the chair.','home'],
    ['umbrella','傘','かさ','umbrella',n,'雨なので、傘を持っていきます。','It is raining, so I will take an umbrella.','daily'],
    ['shoes','靴','くつ','shoes',n,'玄関で靴を脱ぎます。','I take off my shoes at the entrance.','daily'],
    ['clothes','服','ふく','clothes',n,'この服は少し大きいです。','These clothes are a little big.','shopping'],
    ['newspaper','新聞','しんぶん','newspaper',n,'朝、新聞を読みます。','I read the newspaper in the morning.','communication'],
    ['film','映画','えいが','film; movie',n,'日曜日に映画を見ます。','I will watch a film on Sunday.','culture'],
    ['music','音楽','おんがく','music',n,'日本の音楽が好きです。','I like Japanese music.','culture'],
    ['weather','天気','てんき','weather',n,'今日は天気がいいです。','The weather is good today.','nature'],
    ['rain','雨','あめ','rain',n,'雨が降っています。','It is raining.','nature'],
    ['snow','雪','ゆき','snow',n,'山に雪があります。','There is snow on the mountain.','nature'],
    ['mountain','山','やま','mountain',n,'あの山は高いです。','That mountain is high.','nature'],
    ['sea','海','うみ','sea',n,'夏は海で泳ぎます。','I swim in the sea in summer.','nature'],
    ['house','家','いえ','house; home',n,'私の家は駅から近いです。','My house is near the station.','home'],
    ['go','行く','いく','to go',vi,'明日は学校へ行く。','I will go to school tomorrow.','transport'],
    ['eat','食べる','たべる','to eat',it,'朝はパンを食べる。','I eat bread in the morning.','food'],
    ['drink','飲む','のむ','to drink',vt,'毎朝、牛乳を飲む。','I drink milk every morning.','food'],
    ['read','読む','よむ','to read',vt,'寝る前に本を読む。','I read a book before going to bed.','education'],
    ['write','書く','かく','to write',vt,'ノートに名前を書く。','I write my name in the notebook.','education'],
    ['see','見る','みる','to see; to watch',it,'日曜日は映画を見る。','I watch films on Sundays.','culture'],
    ['listen','聞く','きく','to hear; to listen; to ask',vt,'毎日、日本の音楽を聞く。','I listen to Japanese music every day.','communication'],
  ],
  n4: [
    ['pupil','生徒','せいと','pupil; student at a school',n,'教室に生徒が二十人います。','There are twenty pupils in the classroom.','education'],
    ['high-school','高校','こうこう','high school',n,'妹は来年、高校に入ります。','My younger sister will enter high school next year.','education'],
    ['university','大学','だいがく','university',n,'大学で歴史を勉強しています。','I am studying history at university.','education'],
    ['math','数学','すうがく','mathematics',n,'数学の問題を三つ解きました。','I solved three mathematics problems.','education'],
    ['history','歴史','れきし','history',n,'この町の歴史を調べています。','I am studying the history of this town.','culture'],
    ['grammar','文法','ぶんぽう','grammar',n,'新しい文法で文を作りました。','I made a sentence with the new grammar.','education'],
    ['pronunciation','発音','はつおん','pronunciation',n,'先生の発音を聞いて練習します。','I practise by listening to the teacher’s pronunciation.','education'],
    ['venue','会場','かいじょう','venue; event site',n,'会場は駅から歩いて十分です。','The venue is ten minutes on foot from the station.','community'],
    ['classroom','教室','きょうしつ','classroom',n,'授業が終わってから教室を掃除しました。','We cleaned the classroom after the lesson ended.','education'],
    ['address','住所','じゅうしょ','address',n,'ここに名前と住所を書いてください。','Please write your name and address here.','services'],
    ['number','番号','ばんごう','number',n,'自分の番号を呼ばれるまで待ちます。','I wait until my number is called.','services'],
    ['parking','駐車場','ちゅうしゃじょう','car park; parking lot',n,'この駐車場は夜も使えます。','This car park can also be used at night.','transport'],
    ['embassy','大使館','たいしかん','embassy',n,'大使館で書類について聞きました。','I asked about the documents at the embassy.','services'],
    ['airport','空港','くうこう','airport',n,'空港へ行くバスに乗りました。','I took a bus going to the airport.','travel'],
    ['plane','飛行機','ひこうき','airplane',n,'飛行機は午後二時に出発します。','The plane leaves at two in the afternoon.','travel'],
    ['ship','船','ふね','ship; boat',n,'島へ行くために船に乗りました。','I took a boat to get to the island.','travel'],
    ['port','港','みなと','port; harbour',n,'港に大きな船があります。','There is a large ship in the harbour.','travel'],
    ['limited-express','特急','とっきゅう','limited-express train',n,'特急の切符を買ってから駅に行きます。','I will go to the station after buying a limited-express ticket.','transport'],
    ['express','急行','きゅうこう','express train',n,'急行はこの小さな駅には止まりません。','The express train does not stop at this small station.','transport'],
    ['subway','地下鉄','ちかてつ','subway; underground railway',n,'地下鉄で博物館へ行きました。','I went to the museum by subway.','transport'],
    ['traffic-accident','交通事故','こうつうじこ','traffic accident',n,'交通事故のため、バスが遅れています。','The bus is delayed because of a traffic accident.','transport'],
    ['sand','砂','すな','sand',n,'靴の中に砂が入りました。','Sand got into my shoes.','nature'],
    ['stone','石','いし','stone',n,'川の近くで丸い石を見つけました。','I found a round stone near the river.','nature'],
    ['island','島','しま','island',n,'その島には小さな村があります。','There is a small village on that island.','nature'],
    ['woods','林','はやし','woods; grove',n,'林の中をゆっくり歩きました。','I walked slowly through the woods.','nature'],
    ['cloud','雲','くも','cloud',n,'今日は空に雲が多いです。','There are many clouds in the sky today.','nature'],
    ['wind','風','かぜ','wind',n,'風が強いので、窓を閉めました。','I closed the window because the wind was strong.','nature'],
    ['star','星','ほし','star',n,'山では夜に星がよく見えます。','The stars are easy to see at night in the mountains.','nature'],
    ['sun','太陽','たいよう','sun',n,'朝、太陽が出てきました。','The sun came out in the morning.','nature'],
    ['doll','人形','にんぎょう','doll',n,'妹は小さい人形を集めています。','My younger sister collects small dolls.','culture'],
    ['comic','漫画','まんが','manga; comic',n,'日本語の漫画を読んでみました。','I tried reading a manga in Japanese.','culture'],
    ['story','物語','ものがたり','story; tale',n,'子供に短い物語を読みました。','I read a short story to a child.','culture'],
    ['finger','指','ゆび','finger',n,'料理をしていて指を切りました。','I cut my finger while cooking.','health'],
    ['neck','首','くび','neck',n,'長く下を向いていたので、首が痛いです。','My neck hurts because I was looking down for a long time.','health'],
    ['back','背中','せなか','back of the body',n,'重い荷物を持ったので、背中が痛くなりました。','My back began to hurt because I carried heavy luggage.','health'],
    ['hair','髪','かみ','hair on the head',n,'昨日、美容院で髪を切りました。','I had my hair cut at the hairdresser yesterday.','daily'],
    ['arm','腕','うで','arm',n,'泳いだ後、腕が少し疲れました。','My arms were a little tired after swimming.','health'],
    ['leg','足','あし','foot; leg',n,'歩きすぎて足が痛いです。','My feet hurt because I walked too much.','health'],
    ['tooth','歯','は','tooth',n,'歯が痛いので、歯医者に行きます。','I will see a dentist because my tooth hurts.','health'],
    ['blood','血','ち','blood',n,'指から少し血が出ています。','A little blood is coming from my finger.','health'],
    ['gloves','手袋','てぶくろ','gloves',n,'寒いので、手袋をしています。','I am wearing gloves because it is cold.','daily'],
    ['kimono','着物','きもの','kimono',n,'祭りの日に着物を着ました。','I wore a kimono on the day of the festival.','culture'],
    ['wallet','財布','さいふ','wallet; purse',n,'店に財布を忘れてしまいました。','I accidentally left my wallet at the shop.','shopping'],
    ['clock','時計','とけい','clock; watch',n,'この時計は五分進んでいます。','This clock is five minutes fast.','time'],
    ['parent','親','おや','parent',n,'週末に親と電話で話しました。','I spoke to my parents on the phone at the weekend.','people'],
    ['baby','赤ちゃん','あかちゃん','baby',n,'赤ちゃんが静かに寝ています。','The baby is sleeping quietly.','people'],
    ['man','男性','だんせい','man; male person',n,'あの男性は新しい先生です。','That man is the new teacher.','people'],
    ['woman','女性','じょせい','woman; female person',n,'受付に女性が二人います。','There are two women at reception.','people'],
    ['shop-assistant','店員','てんいん','shop assistant',n,'店員に小さいサイズがあるか聞きました。','I asked the shop assistant whether there was a smaller size.','shopping'],
    ['art-museum','美術館','びじゅつかん','art museum',n,'日曜日に美術館へ行って絵を見ました。','I went to an art museum and looked at paintings on Sunday.','culture'],
    ['zoo','動物園','どうぶつえん','zoo',n,'動物園で大きな象を見ました。','I saw a large elephant at the zoo.','culture'],
  ],
};

export const foundationVocabulary: Vocabulary[] = [];
export const foundationGrammar: Grammar[] = [];
export const foundationReadings: Reading[] = [];
export const foundationListening: Listening[] = [];
export const foundationQuestions: Question[] = [];

type Choice = [text:string, explanation:string];
function question(id:string, skill:Question['skill'], level:FoundationLevel, topicId:TopicId, questionType:QuestionType, prompt:string, choices:[Choice,Choice,Choice,Choice], links:Partial<Question>={}):string {
  const shift=[...id].reduce((total,c)=>total+c.charCodeAt(0),0)%4;
  const ordered=[...choices.slice(shift),...choices.slice(0,shift)];
  const options=ordered.map(([text],i)=>({id:`${id}-${'abcd'[i]}`,text}));
  foundationQuestions.push({id,skill,jlptLevel:level,topicId,questionType,prompt,options,
    correctOptionId:options[ordered.indexOf(choices[0])].id,
    explanations:Object.fromEntries(ordered.map((choice,i)=>[options[i].id,choice[1]])),...links});
  return id;
}
for(const level of ['n5','n4'] as const) {
  const rows=wordRows[level];
  for(const [index,row] of rows.entries()) {
    const [slug,word,reading,meaning,wordClass,example,exampleTranslation,topicId]=row;
    const id=`fv-${level}-${slug}`;
    foundationVocabulary.push({id,word,reading,meaning,wordClass,example,exampleTranslation,topicId,level:'review',jlptLevel:level});
    const hasKanji=/\p{Script=Han}/u.test(word);
    const different=rows.filter(candidate=>candidate[2]!==reading&&candidate[3]!==meaning)
      .sort((a,b)=>Math.abs(a[2].length-reading.length)-Math.abs(b[2].length-reading.length));
    const distractors=[0,1,2].map((offset)=>different[(index+offset)%different.length]);
    const choices:[Choice,Choice,Choice,Choice]=hasKanji
      ? [[reading,`${word} is read ${reading} and means “${meaning}”. In context: ${exampleTranslation}`],...distractors.map(v=>[v[2],`${v[2]} is the reading of ${v[1]} (“${v[3]}”), rather than ${word} (${reading}).`] as Choice)] as [Choice,Choice,Choice,Choice]
      : [[meaning,`${word} means “${meaning}”. In context: ${exampleTranslation}`],...distractors.map(v=>[v[3],`“${v[3]}” is the meaning of ${v[1]}, while ${word} means “${meaning}”.`] as Choice)] as [Choice,Choice,Choice,Choice];
    question(`qfv-${level}-${slug}`,hasKanji?'kanji':'vocabulary',level,topicId,hasKanji?'kanji-reading':'vocabulary-context',hasKanji?`「${word}」の読み方として、正しいものを選んでください。\n${example}`:`「${word}」の意味を選んでください。\n${example}`,choices,{vocabularyId:id});
  }
}

// Share existing kanji identities; add foundation example-word links without
// changing earlier IDs or their vocabulary/question keys.
const kanjiMeanings: Record<string,string> = {学:'study; learning',校:'school',生:'life; birth',先:'before; ahead',友:'friend',達:'reach; plural marker',子:'child',供:'provide; accompany',父:'father',母:'mother',兄:'older brother',姉:'older sister',弟:'younger brother',妹:'younger sister',犬:'dog',猫:'cat',水:'water',牛:'cow',乳:'milk',茶:'tea',飯:'meal; cooked rice',朝:'morning',夜:'night',今:'now',日:'day; sun',明:'bright',昨:'previous',毎:'every',週:'week',来:'come',駅:'station',電:'electricity',車:'vehicle',自:'self',転:'turn',動:'move',店:'shop',病:'illness',院:'institution',銀:'silver',行:'go; conduct',郵:'mail',便:'convenience; post',局:'office; bureau',本:'book; origin',机:'desk',椅:'chair',傘:'umbrella',靴:'shoes',服:'clothing',新:'new',聞:'hear; ask',映:'project; reflect',画:'picture',音:'sound',楽:'music; pleasure',天:'sky; heaven',気:'spirit; air',雨:'rain',雪:'snow',山:'mountain',海:'sea',家:'house; family',食:'eat',飲:'drink',読:'read',書:'write',見:'see',高:'high',大:'big',数:'number',歴:'history',史:'history; chronicle',文:'writing',法:'law; method',発:'start; emit',会:'meet',場:'place',教:'teach',室:'room',住:'live; reside',所:'place',番:'number; turn',号:'number; designation',駐:'park; station',使:'use; envoy',館:'building',空:'sky; empty',港:'port',飛:'fly',機:'machine',船:'ship',特:'special',急:'urgent',地:'ground',下:'below',鉄:'iron',交:'intersect; exchange',通:'pass; communicate',事:'matter; event',故:'reason; incident',砂:'sand',石:'stone',島:'island',林:'woods',雲:'cloud',風:'wind',星:'star',太:'thick; great',陽:'sun; positive',人:'person',形:'shape',漫:'unrestrained; manga',物:'thing',語:'language; word',指:'finger; point',首:'neck; head',背:'back',中:'middle',髪:'hair',腕:'arm',足:'foot; leg',歯:'tooth',血:'blood',手:'hand',袋:'bag',着:'wear; arrive',財:'wealth',布:'cloth',時:'time',計:'measure',親:'parent',赤:'red',男:'male',性:'nature; gender',女:'female',員:'member',美:'beauty',術:'art; technique',園:'garden; park'};
export function withFoundationKanji(existing:Kanji[]):Kanji[] {
  const result=existing.map(k=>({...k,wordIds:[...new Set([...k.wordIds,...foundationVocabulary.filter(v=>v.word.includes(k.character)).map(v=>v.id)])]}));
  const used=new Set(result.map(k=>k.character));
  for(const word of foundationVocabulary) for(const character of word.word) {
    if(!/\p{Script=Han}/u.test(character)||used.has(character)) continue;
    used.add(character);
    result.push({id:`fk-${character.codePointAt(0)?.toString(16)}`,character,meaning:kanjiMeanings[character]||word.meaning,
      wordIds:foundationVocabulary.filter(v=>v.word.includes(character)).map(v=>v.id),topicId:word.topicId,jlptLevel:word.jlptLevel});
  }
  return result;
}

type Form = {before:string; answers:[string,string,string,string]; after:string; en:string; wrong:[string,string,string]};
const f=(before:string,answers:Form['answers'],after:string,en:string,wrong:Form['wrong']):Form=>({before,answers,after,en,wrong});
function lesson(level:FoundationLevel,slug:string,title:string,meaning:string,attachment:string[],category:string,topicId:TopicId,comparison:string,forms:[Form,Form]):void {
  const id=`fg-${level}-${slug}`;
  const examples=forms.map(form=>({ja:form.before+form.answers[0]+form.after,en:form.en}));
  const questionIds=forms.map((form,i)=>question(`qfg-${level}-${slug}-${i+1}`,'grammar',level,topicId,'grammar-form',`（　）に入る最もよいものを一つ選んでください。\n${form.before}（　）${form.after}`,
    [[form.answers[0],`${title}: ${meaning} The sentence means: ${form.en}`],...form.wrong.map((reason,j)=>[form.answers[j+1],reason] as Choice)] as [Choice,Choice,Choice,Choice],{grammarId:id}));
  foundationGrammar.push({id,title,meaning,attachment,category,topicId,level:'review',jlptLevel:level,examples,questionIds,
    mistake:{wrong:forms[0].before+forms[0].answers[1]+forms[0].after,correct:examples[0].ja,explanation:forms[0].wrong[0]},comparison});
}

lesson('n5','copula','です・ではありません','State what someone or something is; make a polite noun sentence negative.',['Noun + です.','Noun + ではありません; conversational じゃありません is also possible.'],'basics','people','です connects a noun to the polite ending. Verbs have their own endings; avoid adding です directly to a polite verb.',[
 f('私は学生',['です','ます','をです','がです'],'。','I am a student.',['ます attaches to a verb stem, not directly to the noun 学生.','The noun predicate does not need the object marker を.','Do not insert が between the noun predicate and です.']),
 f('田中さんは先生では',['ありません','います','あります','です'],'。','Tanaka is not a teacher.',['います expresses the existence of people; it is not the negative copula.','あります is affirmative existence; the negative here is ありません.','ではです is not the negative noun predicate.']),
]);
lesson('n5','past-copula','でした・ではありませんでした','State a past noun situation or deny it politely.',['Noun + でした.','Noun + ではありませんでした.'],'time-aspect','time','A past noun sentence uses でした. An い-adjective changes its own ending (高かったです), rather than taking でした directly.',[
 f('昨日は日曜日',['でした','です','します','なりました'],'。','Yesterday was Sunday.',['昨日 calls for a past statement in this context; です is present.','A day of the week is a noun and does not take します here.','なりました requires に after a noun and describes becoming, rather than stating the past day.']),
 f('去年、私は大学の学生では',['ありませんでした','ありません','います','ありました'],'。','Last year, I was not a university student.',['ありません is nonpast; the sentence specifies last year.','います describes existence and does not form the negative noun predicate.','ありました is affirmative existence, not the negative copula.']),
]);
lesson('n5','polite-tense','～ます・～ました・～ません','Use polite verb endings for nonpast, past and negative actions.',['ます-stem + ます / ました.','ます-stem + ません / ませんでした.'],'basics','daily','Japanese nonpast can describe a habit or a future action. The surrounding time words help establish the intended time.',[
 f('昨日、図書館で本を',['読みました','読みます','読むました','読んます'],'。','I read a book at the library yesterday.',['読みます is nonpast; 昨日 makes the completed past action clear.','読む is dictionary form; ました attaches to 読み.','読ん is not the ます-stem of 読む.']),
 f('明日は学校に',['行きません','行きませんでした','行くません','行いた'],'。','I will not go to school tomorrow.',['行きませんでした is past, but 明日 is tomorrow.','The negative polite ending attaches to 行き, not 行く.','行いた is not a conjugation of 行く.']),
]);
lesson('n5','topic','は・がの基本','Use は to establish a topic and が for the subject of an existence statement.',['Topic + は + comment.','Place + に + person / thing + が + います / あります.'],'particles','people','The choice between は and が depends on discourse. These exercises provide neutral introductions or existence statements; this is not a rule that they are always interchangeable.',[
 f('自己紹介です。私',['は','を','に','で'],'学生です。','Introducing myself: I am a student.',['を marks a direct object, not the topic of this noun sentence.','に would mark a destination or other relation, not the self-introduction topic.','で marks a location of action or means; neither fits this noun predicate.']),
 f('部屋に猫',['が','を','へ','で'],'います。','There is a cat in the room.',['を marks an object, while 猫 is the subject of います.','へ marks a direction, not the subject of existence.','で does not mark the person or animal that exists.']),
]);
lesson('n5','object','～を','Mark the direct object of actions such as eating, reading and writing.',['Noun + を + transitive verb.','The particle を is pronounced お.'],'particles','food','Compare を for the thing affected with で for the location of an action: 家で本を読みます.',[
 f('毎朝、パン',['を','に','が','へ'],'食べます。','I eat bread every morning.',['に does not mark the thing eaten.','In this neutral action sentence, パン is the direct object, not the subject.','へ marks movement toward a destination, not food eaten.']),
 f('ノートに名前',['を','で','へ','と'],'書いてください。','Please write your name in the notebook.',['で cannot mark the content that is written.','へ marks a direction, not the written name.','と can mark quoted content, but 名前と書く would mean write the literal word 名前, not write one’s name.']),
]);
lesson('n5','movement','～に・～へ行く','Mark the destination of movement. Both に and へ can introduce a destination.',['Destination + に / へ + 行く・来る・帰る.','へ is pronounced え when it is a particle.'],'particles','transport','Use で for a means of travel: 電車で学校に行きます. The destination and the means have different roles.',[
 f('毎日、学校',['に','を','が','と'],'行きます。','I go to school every day.',['学校 is the destination, not a direct object in this sentence.','が marks a subject and cannot mark the destination here.','と marks a companion or quotation, not the destination.']),
 f('日曜日は京都',['へ','を','が','と'],'行きます。','I will go to Kyoto on Sunday.',['を does not mark this destination with 行きます.','が would mark a subject rather than the place being visited.','と does not mark a destination.']),
]);
lesson('n5','action-location','～で：場所・手段','Use で for where an action occurs or for the means used.',['Action location + で + action.','Means / tool + で + action.'],'particles','transport','Existence takes に (机の上に本があります); the location of reading takes で (図書館で読みます).',[
 f('図書館',['で','に','を','へ'],'本を読みます。','I read books at the library.',['に marks existence or a destination; 読みます is an action at the library.','を cannot mark the location of reading here.','へ indicates a movement destination, but no movement verb appears.']),
 f('電車',['で','に','を','が'],'学校へ行きます。','I go to school by train.',['に would be used with 乗る to mark what is boarded, not to express the means with 行く here.','を does not mean by train.','が marks a subject, not a means of travel.']),
]);
lesson('n5','possession','～の・～も','Connect a possessor or modifier to a noun; add another member with も.',['Possessor / modifier + の + noun.','Noun + も + comment: also / too.'],'particles','home','の links nouns; も replaces は, が or を in many simple “also” statements. It is not added after は in these examples.',[
 f('これは私',['の','を','が','へ'],'本です。','This is my book.',['を marks an object and cannot link 私 to 本.','が is a subject marker; the possessor requires の.','へ indicates direction and cannot mean my book.']),
 f('兄は学生です。姉',['も','を','で','の'],'学生です。','My brother is a student. My sister is a student too.',['を cannot mark the subject or topic of this noun sentence.','で cannot express also in this sentence.','の would need another modified noun and cannot mark 姉 as also a student.']),
]);
lesson('n5','existence','あります・います','Express that a thing or a living person/animal exists.',['Place + に + thing + が + あります.','Place + に + person / animal + が + います.'],'basics','home','あります is generally for inanimate things; います is for people and animals. A location precedes に in these existence statements.',[
 f('机の上に本が',['あります','います','します','行きます'],'。','There is a book on the desk.',['A book is inanimate, so います is not the neutral existence verb here.','します means do and does not state that a book exists.','行きます means go; the sentence asks about a book being present.']),
 f('庭に犬が',['います','あります','です','読みます'],'。','There is a dog in the garden.',['A living dog is described with います, not あります.','です does not fit this location-plus-existence construction.','読みます means read and does not express presence.']),
]);
lesson('n5','specific-time','時間＋に','Use に with a specified time for an action; relative day words normally stand alone.',['七時に / 月曜日に + action.','今日・明日・昨日・毎日 normally do not take に in basic time expressions.'],'time-aspect','time','An explicit clock time normally takes に. Expressions such as 朝 can appear with or without に depending on context; do not treat all time words identically.',[
 f('毎朝、七時',['に','で','を','へ'],'起きます。','I get up at seven every morning.',['で does not mark the clock time of getting up.','を marks an object; 七時 is a time.','へ marks a direction rather than an action time.']),
 f('昨日',['、','に、','で、','を、'],'友達に会いました。','I met a friend yesterday.',['Relative 昨日 normally appears without に in this basic sentence.','で does not mark the relative day 昨日 here.','を cannot make 昨日 the time of meeting.']),
]);
lesson('n5','i-adjective','い形容詞の否定・過去','Change an い-adjective ending to express a negative or past description.',['Remove final い + くないです.','Remove final い + かったです. いい → よくない / よかった.'],'description','shopping','A noun or な-adjective uses ではありません / でした. An い-adjective conjugates before です.',[
 f('このかばんは',['高くない','高いない','高いではない','高くありませんでした'],'です。','This bag is not expensive.',['Remove final い before adding くない; 高いない is malformed.','An い-adjective does not take the noun negative ではない directly.','高くありませんでした is already a complete past polite phrase and cannot take the extra です.']),
 f('昨日はとても',['寒かった','寒いでした','寒くた','寒かったでした'],'です。','It was very cold yesterday.',['寒い conjugates to 寒かった; it does not take でした directly.','The past ending is かった, not くた.','Use 寒かったです; do not add でした after the adjective’s past form.']),
]);
lesson('n5','na-adjective','な形容詞：名詞の前のな','Put な between a な-adjective stem and the noun it describes.',['な-adjective stem + な + noun.','な-adjective stem + です at the end of a polite sentence.'],'description','home','い-adjectives keep い before a noun (広い部屋). な-adjectives need な before the noun (静かな部屋).',[
 f('ここは静か',['な','い','の','に'],'町です。','This is a quiet town.',['静か is a な-adjective and cannot take an added い.','静かの does not make this adjective modify 町.','に marks an adverbial use, not the form before the noun 町.']),
 f('この辞書は便利',['です','なです','いです','をです'],'。','This dictionary is convenient.',['な belongs before a noun; it is not needed before です.','便利 is a な-adjective and has no final adjective い.','The predicate does not require the object marker を.']),
]);
lesson('n5','request','～てください','Make a polite request with the verb’s て-form.',['Verb て-form + ください.','Verb ない-form + でください asks someone not to do something.'],'requests','communication','The て-form changes by verb group. 読む → 読んで and 書く → 書いて; 行く has the special form 行って.',[
 f('ここに名前を',['書いて','書き','書く','書いた'],'ください。','Please write your name here.',['書き is the ます-stem; this request requires the て-form 書いて.','The dictionary form 書く does not attach directly to ください.','書いた is past; the request uses 書いて.']),
 f('この部屋でたばこを',['吸わないで','吸わない','吸うないで','吸って'],'ください。吸ってはいけません。','Please do not smoke in this room. Smoking is prohibited.',['A negative request needs ないで, not ない directly before ください.','吸う changes to 吸わない; 吸うない is not the negative form.','吸ってください would ask someone to smoke, contradicting the stated prohibition.']),
]);
lesson('n5','progress','～ています：進行中','Describe an action that is happening now.',['Verb て-form + います.','今 often helps identify the ongoing-action interpretation.'],'time-aspect','daily','～ています also expresses some continuing states or habits. These examples explicitly describe actions in progress now.',[
 f('今、母は料理を',['作って','作り','作る','作った'],'います。','My mother is cooking now.',['作り is a verb stem and cannot attach directly to います.','Use the て-form, not dictionary form 作る.','作った is past; います requires 作って.']),
 f('今、友達は本を',['読んで','読み','読む','読んだ'],'います。','My friend is reading a book now.',['読み is the ます-stem; the progressive needs 読んで.','読む does not attach directly to います.','読んだ is the plain past form, not the connecting て-form.']),
]);
lesson('n5','sequence','～て、～','Connect actions in their stated order using the て-form.',['First verb in て-form + second clause.','The final verb carries the polite or past ending.'],'sequence','daily','～て can have other relationships, including cause. These examples describe an ordinary sequence of actions.',[
 f('朝ご飯を',['食べて','食べます','食べる','食べたです'],'、学校へ行きます。','I eat breakfast and then go to school.',['The first action is connected with 食べて; 食べます followed only by a comma does not form the requested construction.','Dictionary form 食べる does not make this て-form connection.','食べたです is not a grammatical past polite form.']),
 f('昨日、駅へ',['行って','行いて','行くて','行きましてました'],'、友達に会いました。','Yesterday I went to the station and met my friend.',['行く is exceptional: its て-form is 行って, not 行いて.','The dictionary ending く is replaced; 行くて is malformed.','行きましてました mixes connecting and past endings incorrectly.']),
]);
lesson('n5','desire','～たい','Express the speaker’s wish to do something.',['Verb ます-stem + たいです.','Negative: たくないです; past: たかったです.'],'feelings','food','～たい describes a wish. A plan or prediction is different. With a desired action’s object, を is possible, and が is also common.',[
 f('私は日本へ',['行きたい','行くたい','行ってたい','行ったたい'],'です。','I want to go to Japan.',['たい follows the ます-stem 行き, not the dictionary form 行く.','The て-form does not attach directly to たい in this construction.','The past form 行った cannot directly take たい.']),
 f('おなかがいっぱいなので、今は何も',['食べたくない','食べたいない','食べるたくない','食べませんたい'],'です。','I am full, so I do not want to eat anything now.',['たい behaves like an い-adjective: たくない, not たいない.','たい attaches to 食べ, not 食べる.','The polite negative 食べません cannot directly take たい.']),
]);
lesson('n5','invitation','～ませんか・～ましょう','Invite someone to an activity or suggest doing something together.',['ます-stem + ませんか: would you like to…?','ます-stem + ましょう: let’s….'],'requests','culture','～ませんか is phrased as a negative question but commonly functions as an invitation. ～ましょう is a more direct suggestion.',[
 f('誘っています。一緒に映画を',['見ませんか','見ましたか','見ないでしたか','見るませんか'],'。','An invitation: would you like to see a film together?',['見ましたか asks about a past action, not the stated invitation.','見ないでした is not the correct polite past negative.','ませんか attaches to 見, not the dictionary form 見る.']),
 f('もう十二時です。一緒に昼ご飯を',['食べましょう','食べますた','食べるましょう','食べたでした'],'。','It is already noon. Let’s eat lunch together.',['ますた is not a verb ending.','ましょう attaches to the stem 食べ, not 食べる.','食べたでした wrongly combines a verb’s past with the copula’s past.']),
]);
lesson('n5','reason','～から：理由','Give a reason before the resulting action or judgment.',['Plain or polite clause + から + result.','Noun / な-adjective + だから in plain speech.'],'reasons','nature','から can also mean “from” after a place or time. A complete reason clause gives the because interpretation here.',[
 f('雨です',['から','まで','だけ','より'],'、今日は家にいます。','Because it is raining, I will stay at home today.',['まで means until and cannot connect this reason clause.','だけ means only and does not give the reason for staying home.','より gives a comparison or starting point, not this because relation.']),
 f('明日は休み',['だから','だまで','なから','のから'],'、ゆっくり寝ます。','Tomorrow is a day off, so I will sleep in.',['だまで does not connect a noun reason.','The noun 休み takes だ before reason から, not な.','のから is not this noun-plus-because construction.']),
]);
lesson('n5','comparison','～より・～のほうが','Compare two things and identify which has more of a quality.',['A は B より adjective.','A より B のほうが adjective.'],'comparison','transport','より marks the comparison standard. のほうが identifies the side with the greater stated property.',[
 f('電車はバス',['より','まで','だけ','に'],'速いです。','The train is faster than the bus.',['まで means up to, not the comparison standard.','だけ means only and does not compare speed.','に does not express than in this basic comparison.']),
 f('このかばんより、あのかばん',['のほうが','のためが','にほうが','をほうが'],'軽いです。','That bag is lighter than this bag.',['のためが is not the structure for identifying the lighter side.','A noun takes の before ほう; にほう is malformed.','を cannot connect the noun to ほう.']),
]);
lesson('n5','counters','数・助数詞：人と冊','Use counters appropriate to people and bound books.',['People: 一人（ひとり）、二人（ふたり）、三人（さんにん）.','Books: 一冊（いっさつ）、二冊（にさつ）.'],'quantity','shopping','Japanese counters depend on the kind of object. These two counters cannot be exchanged just because the number is the same.',[
 f('子供が',['二人','二冊','二本','二枚'],'います。','There are two children.',['冊 counts bound volumes, not children.','本 counts long thin objects, not people.','枚 counts flat objects, not children.']),
 f('本を',['三冊','三人','三匹','三台'],'買いました。','I bought three books.',['人 counts people; this is a purchase of books.','匹 counts small animals, not bound books.','台 counts machines or vehicles, not books.']),
]);

lesson('n4','experience','～たことがある','Describe a past experience without specifying a completed event date.',['Verb た-form + ことがあります.','Verb た-form + ことがありません means no such experience.'],'experience','travel','An event at a stated time usually uses the ordinary past. ～たことがある asks whether the experience has occurred at least once.',[
 f('私は一度、京都へ',['行った','行く','行って','行き'],'ことがあります。','I have been to Kyoto once.',['An experience requires the past form before ことがある.','The connecting て-form cannot replace the た-form.','The ます-stem does not attach directly to こと in this pattern.']),
 f('私はまだ日本の着物を',['着た','着る','着て','着ない'],'ことがありません。','I have never worn a Japanese kimono.',['For absence of a past experience, use 着たことがありません.','The experience pattern uses た-form, not て-form.','着ないことがありません has a different logical meaning and does not state never having worn it.']),
]);
lesson('n4','potential','可能形：できること','Express an ability or something possible under the circumstances.',['Godan: u sound → e + る (読む → 読める).','Ichidan: remove る + られる (食べる → 食べられる). する → できる; 来る → 来られる.'],'ability','education','Potential forms differ from requests and ordinary actions. Some ichidan forms also have passive meanings; context establishes ability in these examples.',[
 f('簡単な漢字なら、私は一人で',['読めます','読みますた','読むます','読まます'],'。','I can read simple kanji on my own.',['読みますた is not a verb form; the potential is 読めます.','The polite ending cannot attach to dictionary form 読む.','読ま is the negative stem, not the potential stem.']),
 f('食べ物の好き嫌いはありません。私は何でも',['食べられます','食べれません','食べますた','食べるられます'],'。','I have no food dislikes. I can eat anything.',['This negative colloquial form contradicts being able to eat anything.','ますた is not an ending and does not express ability.','Remove る before adding られる to 食べる.']),
]);
lesson('n4','obligation','～なければならない','Express that something must be done.',['Verb ない-form: replace final い with ければ + なりません.','More conversational alternatives include ～ないといけません.'],'obligation','education','～なくてもいい grants permission not to do something; ～なければならない states an obligation. The meanings differ.',[
 f('明日、試験があるので、今日勉強し',['なければ','ないければ','なくても','ないで'],'なりません。','I must study today because there is an exam tomorrow.',['しない becomes しなければ; ないければ is malformed.','なくても followed by なりません does not make the taught obligation form.','ないで means without doing or a negative request, not this obligation construction.']),
 f('図書館の本は今日返さ',['なければなりません','なくてもいいです','ないことがあります','ないでした'],'。期限は今日です。','I must return the library book today. Its deadline is today.',['なくてもいい gives permission not to return it, contradicting today’s deadline.','ないことがあります means there are occasions when it is not returned, not an obligation.','ない conjugates to なかった for the past; ないでした is not the correct negative ending or an obligation.']),
]);
lesson('n4','permission','～てもいい・～なくてもいい','Give permission to do something, or say it is not necessary.',['Verb て-form + もいいです.','Verb ない-form: remove い + くてもいいです.'],'permission','communication','Permission to act is ～てもいい; permission to omit an action is ～なくてもいい. ～てはいけない prohibits an action.',[
 f('ここでは写真を',['撮っても','撮るも','撮ったも','撮りも'],'いいです。','You may take photographs here.',['The permission pattern needs the て-form, not dictionary form 撮る.','The plain past does not attach directly to もいい here.','The ます-stem 撮り cannot directly take もいい.']),
 f('この宿題は自由です。明日までに出さ',['なくてもいいです','なければなりません','ないではいいです','なくてはいけません'],'。','This homework is optional. You do not have to hand it in by tomorrow.',['なければなりません makes it compulsory, contradicting 自由です.','ないではいい is not the normal form for permission to omit an action.','なくてはいけません states an obligation, not optional work.']),
]);
lesson('n4','prohibition','～てはいけない','State a rule that prohibits an action.',['Verb て-form + はいけません.','Use ないでください for a negative request directed to someone.'],'permission','community','～てはいけない states prohibition; ～なくてもいい says an action is unnecessary. Avoid reversing their meaning.',[
 f('図書館の中で大きな声で',['話して','話す','話した','話し'],'はいけません。','You must not speak loudly inside the library.',['The prohibition attaches to the て-form 話して, not the dictionary form.','The plain past 話した does not connect to はいけません.','話し is a stem; the pattern requires 話して.']),
 f('赤い信号のときは、道を渡って',['はいけません','もいいです','ください','います'],'。','You must not cross the road when the light is red.',['もいい grants permission, contrary to a red light.','ください requests crossing, contrary to the red light.','います describes an ongoing action rather than the road rule.']),
]);
lesson('n4','before-after','～前に・～後で','Place one action before or after another.',['Dictionary verb + 前に.','Verb た-form + 後で. Noun + の前に / の後で.'],'sequence','daily','The verb before 前に stays in dictionary form even in a sentence about the past; before 後で use the た-form.',[
 f('寝る',['前に','後で','前で','後に前'],'歯を磨きます。まだ寝ていません。','I brush my teeth before going to bed. I have not gone to bed yet.',['For after sleeping, the verb would be 寝た後で; the context says before sleep.','The basic time expression is 前に, not 前で.','後に前 is not a temporal expression.']),
 f('ご飯を',['食べた','食べる','食べて','食べます'],'後で、薬を飲みます。','I take the medicine after eating.',['後で takes the completed-action た-form, not 食べる.','The て-form does not attach to 後で.','Polite ます does not directly precede 後で in this construction.']),
]);
lesson('n4','tara','～たら','Use a completed/past form plus ら for a condition or a time after an event.',['Verb た-form + ら.','い-adjective: ～かったら; noun / な-adjective: ～だったら.'],'conditions','nature','～たら can express a hypothetical condition or an event after which something happens. The form’s た does not automatically mean the whole sentence is past.',[
 f('雨が',['降ったら','降るら','降ってら','降りたら'],'、試合は中止です。','If it rains, the match will be cancelled.',['Use 降った before ら; dictionary form 降る cannot directly take ら.','The て-form is not the conditional form used here.','降る is a godan verb: its past is 降った, not 降りた.']),
 f('駅に',['着いたら','着くたら','着いてたらます','着きら'],'、電話してください。','Please call me when you arrive at the station.',['着く becomes 着いた; 着くたら is malformed.','着いてたらます mixes incompatible endings.','The ます-stem 着き cannot directly take ら.']),
]);
lesson('n4','ba','～ば','Describe a condition or requirement with the ば-form.',['Godan: u sound → e + ば. Ichidan: remove る + れば.','い-adjective: final い → ければ; いい → よければ.'],'conditions','daily','～ば is often useful for general conditions. Other conditionals have different restrictions; do not exchange them automatically in every sentence.',[
 f('天気が',['よければ','いいば','よかったば','よいれば'],'、公園へ行きます。','If the weather is good, I will go to the park.',['いい has the conditional よければ, not いいば.','The past よかった would take ら, not ば.','An adjective does not take verb-like れば after its final い.']),
 f('このボタンを',['押せば','押すば','押しば','押しますば'],'、ドアが開きます。','If you press this button, the door opens.',['押す changes its final sound to せ before ば.','The ます-stem 押し does not form the ば-conditional.','Polite ます cannot take ば directly.']),
]);
lesson('n4','to-conditional','～と：自然な結果','Express an automatic, regular or generally expected result.',['Plain nonpast verb + と + expected result.','For a negative condition: ない-form + と.'],'conditions','technology','This と differs from the quotation particle. For a one-time request such as “call me when you arrive”, ～たら is often more suitable.',[
 f('このスイッチを',['押すと','押したと','押してと','押しと'],'、電気がつきます。','When you press this switch, the light comes on.',['Use nonpast 押すと for the regular result, not 押したと.','The て-form does not attach directly to conditional と.','The stem 押し does not make this conditional.']),
 f('春に',['なると','なったと','なってと','なりますとだった'],'、この公園で花が咲きます。','When spring arrives, flowers bloom in this park.',['This general seasonal result uses the nonpast なると.','なってと does not form this conditional.','The mixture of ますと and だった is malformed.']),
]);
lesson('n4','nara','～なら','Make a suggestion based on a stated topic, intention or assumption.',['Noun / plain clause + なら.','The advice depends on the premise introduced by なら.'],'conditions','travel','なら can introduce advice before an intended action takes place. It does not always mean “after doing”.',[
 f('京都へ行く',['なら','のでしたらます','だけにで','からと'],'、この地図を持っていくといいですよ。','If you are going to Kyoto, it is a good idea to take this map.',['のでしたらます mixes endings and cannot connect this premise.','だけにで is not a conditional expression.','からと mixes a reason marker with と and does not express this premise.']),
 f('静かな部屋',['なら','だなら','ななら','になら'],'、二階にありますよ。','If you are looking for a quiet room, there is one on the second floor.',['A noun attaches directly to なら; do not add だ first.','The noun 部屋 does not take な before なら.','に marks a location or direction and is not used to attach this premise.']),
]);
lesson('n4','node','～ので','Explain a reason, often in a softer or more explanatory way.',['Plain verb / い-adjective + ので.','Noun / な-adjective + なので.'],'reasons','health','から and ので can both state reasons. ので commonly presents the circumstance as an explanation, though tone depends on the whole context.',[
 f('熱がある',['ので','のに','ながら','まで'],'、今日は学校を休みます。','I have a fever, so I will stay home from school today.',['のに means although and conflicts with presenting the fever as the reason for staying home.','ながら joins simultaneous actions and does not attach to this state in the taught way.','まで means until, not because.']),
 f('今日は休み',['なので','だので','のにので','にので'],'、店は閉まっています。','Today is a day off, so the shop is closed.',['A noun before ので uses な, not だ.','のにので mixes although with because.','にので is not the noun-plus-reason construction.']),
]);
lesson('n4','while','～ながら','Describe two actions performed at the same time by the same person.',['Verb ます-stem + ながら + main action.','The final action normally receives the main emphasis.'],'sequence','daily','～てから marks order, while ～ながら marks simultaneous actions. The subjects of both actions are normally the same.',[
 f('音楽を',['聞きながら','聞くながら','聞いてながら','聞いたながら'],'料理をします。','I cook while listening to music.',['ながら takes the stem 聞き, not dictionary form 聞く.','The て-form does not directly attach to ながら.','The past form 聞いた does not attach to ながら in this construction.']),
 f('コーヒーを',['飲みながら','飲むながら','飲んだながら','飲めながら'],'新聞を読みました。','I read the newspaper while drinking coffee.',['Use the ます-stem 飲み before ながら.','The past 飲んだ does not form the simultaneous-action pattern.','飲め is a potential/imperative stem, not the required ます-stem.']),
]);
lesson('n4','listing','～たり～たりする','List examples of activities without claiming they are the only activities.',['Verb た-form + り、verb た-form + り + します.','The final する carries the tense and politeness.'],'sequence','culture','～たり lists representative activities. ～て often gives a chronological sequence and has a different emphasis.',[
 f('休日は本を読んだり、映画を',['見たり','見るたり','見てたりました','見ますたり'],'します。','On days off, I do things such as reading books and watching films.',['The listing pattern uses 見た + り, not 見る + たり.','The mixture with たりました is malformed before します.','ます does not attach to たり.']),
 f('昨日は買い物を',['したり','するたり','してり','しますり'],'、散歩したりしました。','Yesterday I did things such as shopping and taking a walk.',['する changes to した before り.','The て-form is not the form before listing り.','The polite form します cannot directly take り.']),
]);
lesson('n4','try','～てみる','Try doing something to find out what it is like.',['Verb て-form + みます.','Negative: ～てみません; past: ～てみました.'],'experience','food','～ようとする describes an attempt or intention. ～てみる usually implies carrying out the action as a trial.',[
 f('この料理を一度',['食べて','食べる','食べた','食べ'],'みたいです。','I would like to try this dish once.',['Dictionary form 食べる cannot attach directly to みる in the trial pattern.','The past 食べた does not attach directly to みる here.','The stem 食べ needs て before みる.']),
 f('サイズが分からないので、この服を',['着て','着る','着た','着るて'],'みます。','I do not know the size, so I will try on these clothes.',['Use 着て before みます, not 着る.','着た is past rather than the connecting て-form.','For 着る, remove る and add て; 着るて is malformed.']),
]);
lesson('n4','preparation','～ておく','Do something in preparation for a later purpose.',['Verb て-form + おきます.','Casual contractions such as ～とく occur in speech; these lessons use the full form.'],'preparation','travel','～ておく emphasizes preparation or leaving a state ready; ～てみる emphasizes trying an action.',[
 f('明日の旅行のために、切符を',['買って','買う','買った','買い'],'おきます。','I will buy the ticket in advance for tomorrow’s trip.',['Dictionary form 買う cannot attach directly to おく.','The past 買った is not the required connecting form.','The ます-stem 買い needs て before おく.']),
 f('お客さんが来る前に、部屋を掃除して',['おきます','みるでした','しまうです','いるました'],'。','I will clean the room beforehand, before the guests arrive.',['みるでした is malformed and would focus on a trial rather than preparation.','しまうです is malformed; preparation here is expressed with ておきます.','いるました incorrectly combines dictionary and polite past endings.']),
]);
lesson('n4','giving','あげる・くれる・もらう','Describe giving and receiving while attending to whose viewpoint is used.',['Giver は receiver に thing を あげる.','Someone は me/us に thing を くれる. Receiver は giver に/から thing を もらう.'],'giving-receiving','people','あげる describes giving outward from the stated giver; くれる describes giving toward the speaker’s side. もらう makes the receiver the subject.',[
 f('私は友達に本を',['あげました','くれました','もらいました','借りられました'],'。友達へのプレゼントです。','I gave my friend a book. It is a present for my friend.',['くれる is used for giving toward the speaker’s side, not 私 giving to a friend here.','もらう would make 私 the recipient, reversing the stated gift direction.','借りる is borrowing, not giving the stated present to the friend.']),
 f('友達は私に誕生日のプレゼントを',['くれました','もらいました','借りました','習いました'],'。','My friend gave me a birthday present.',['もらう would make the friend the recipient, but 私に marks the recipient here.','借りました means borrowed, not gave a birthday present to me.','習いました means learned and cannot describe handing me a gift.']),
]);
lesson('n4','benefit','～てくれる・～てもらう','Describe a helpful action done for someone and the perspective of receiving that help.',['Helper は me に/for me + verb て-form + くれる.','Receiver は helper に + verb て-form + もらう.'],'giving-receiving','education','～てくれる uses the helper as subject; ～てもらう uses the person receiving the help as subject. Both can describe the same event from different viewpoints.',[
 f('先生が私に漢字を教えて',['くれました','もらいました','あげました','いますた'],'。','The teacher taught me kanji as a favour.',['もらう would make the teacher the person receiving help, contrary to the stated subject.','あげる describes giving outward; toward 私 the helpful action is expressed with くれる.','いますた is not a valid verb ending.']),
 f('私は友達に宿題を手伝って',['もらいました','くれました','くださいました','あります'],'。','I had my friend help me with my homework.',['With 私 as subject and 友達に as the helper, use もらいました.','くださいました has the helper as the subject, not 私 receiving help in this frame.','てあります describes a resulting prepared state, not receiving a person’s help here.']),
]);
lesson('n4','advice','～たほうがいい・～ないほうがいい','Recommend doing something or advise avoiding it.',['Verb た-form + ほうがいいです.','Verb ない-form + ほうがいいです.'],'advice','health','～ほうがいい gives advice; ～なければならない expresses obligation. Advice can sound strong, so use considerate context.',[
 f('熱があるなら、今日は早く',['寝た','寝て','寝ます','寝るた'],'ほうがいいです。','If you have a fever, you should go to bed early today.',['The affirmative advice pattern taught here uses the た-form 寝た.','Polite ます cannot directly precede ほうがいい.','寝るた is not the た-form of 寝る.']),
 f('夜、眠れなくなるので、寝る前にコーヒーを',['飲まない','飲まなかった','飲まないで','飲むない'],'ほうがいいです。','You should not drink coffee before bed because you may be unable to sleep.',['For general advice to avoid an action, use the plain negative 飲まない.','ないで is used for without doing or a request, not directly before ほう.','飲む changes to 飲まない; 飲むない is malformed.']),
]);
lesson('n4','excess','～すぎる','Say that an action or quality exceeds a suitable amount.',['Verb ます-stem + すぎる.','い-adjective without い + すぎる; な-adjective stem + すぎる.'],'quantity','food','～すぎる means too much relative to a suitable amount. とても simply means very and does not necessarily suggest a problem.',[
 f('昨日はお菓子を',['食べすぎ','食べるすぎ','食べてすぎ','食べたすぎ'],'ました。','I ate too many sweets yesterday.',['すぎる attaches to the stem 食べ, not 食べる.','The て-form does not directly attach to すぎる.','The past 食べた cannot directly take すぎる.']),
 f('このかばんは',['重すぎ','重いすぎ','重くすぎ','重かったすぎ'],'ます。持てません。','This bag is too heavy. I cannot carry it.',['Remove the adjective’s final い before adding すぎる.','The linking form 重く does not attach to すぎる.','The adjective’s past 重かった does not directly take すぎる.']),
]);
lesson('n4','hearsay','～そうです：聞いた情報','Report information learned from a source using the hearsay construction.',['Plain verb / い-adjective + そうです.','Noun / な-adjective + だそうです.'],'certainty','communication','Hearsay uses plain forms: 雨が降るそうです. Appearance uses a stem: 雨が降りそうです. The source makes the reported-information meaning clear.',[
 f('聞いた情報をそのまま伝えます。天気予報によると、明日は雨が',['降るそうです','降りそうです','降ってそうでしたます','降りますそうです'],'。','Relaying the information I heard: according to the weather forecast, it will rain tomorrow.',['降りそう expresses apparent likelihood. This exercise explicitly asks to relay the heard information using the hearsay construction, which takes 降るそうです.','This combination of endings is malformed.','For hearsay, use plain 降る before そうです, not 降ります.']),
 f('田中さんから聞きました。新しい先生は日本人',['だそうです','なそうです','をそうです','にそうです'],'。','I heard from Tanaka that the new teacher is Japanese.',['A noun takes だ before hearsay そうです, not な.','The object marker を cannot link a noun predicate to hearsay そうです.','に does not form the noun-predicate hearsay construction.']),
]);

type SourceSpec={prompt:string; answer:string; evidence:string; reason:string; wrong:[Choice,Choice,Choice]};
const s=(prompt:string,answer:string,evidence:string,reason:string,wrong:[Choice,Choice,Choice]):SourceSpec=>({prompt,answer,evidence,reason,wrong});
function source(kind:'reading'|'listening',level:FoundationLevel,slug:string,title:string,topicId:TopicId,text:string,translation:string,specs:[SourceSpec,SourceSpec],type:Reading['type']='notice',category?:QuestionType):void {
  const id=`f${kind==='reading'?'r':'l'}-${level}-${slug}`;
  const questionIds=specs.map((spec,index)=>{
    if(!text.includes(spec.evidence)) throw new Error(`${id}: answer evidence must appear literally in the source.`);
    return question(`q${id}-${index+1}`,kind,level,topicId,category||(kind==='reading'?'reading-short':index===0?'listening-task':'listening-points'),spec.prompt,
      [[spec.answer,spec.reason],...spec.wrong],{...(kind==='reading'?{passageId:id}:{listeningId:id}),evidence:spec.evidence});
  });
  if(kind==='reading') foundationReadings.push({id,title,type,topicId,jlptLevel:level,body:text,translation,questionIds});
  else foundationListening.push({id,title,topicId,jlptLevel:level,script:text,translation,questionIds});
}

source('reading','n5','class','A classroom notice','education',
 '明日の日本語の授業は、午前九時からです。教室は二階の二〇一です。本と鉛筆を持ってきてください。辞書はいりません。',
 'Tomorrow’s Japanese lesson starts at nine in the morning. The classroom is room 201 on the second floor. Please bring a book and a pencil. You do not need a dictionary.',[
 s('授業は何時からですか。','午前九時','午前九時からです','The notice explicitly states that the lesson starts at nine in the morning.',[['午前八時','Eight is not the stated starting time.'],['午後九時','九時 is preceded by 午前, so it is not nine in the evening.'],['午後二時','Two refers to the floor in 二階, not the lesson time.']]),
 s('何を持っていきますか。','本と鉛筆','本と鉛筆を持ってきてください','The requested items are the book and pencil; the dictionary is explicitly unnecessary.',[['本と辞書','The notice says 辞書はいりません: a dictionary is not needed.'],['鉛筆と辞書','A pencil is needed, but the other requested item is a book, not a dictionary.'],['辞書だけ','The dictionary is unnecessary, and two other items are requested.']]),
]);
source('reading','n5','friend','An invitation from a friend','people',
 '山田さんへ。土曜日に一緒に映画を見ませんか。午後二時に駅の前で会いましょう。映画は三時からです。映画の後でご飯を食べましょう。ミナより。',
 'To Yamada: Would you like to see a film together on Saturday? Let’s meet in front of the station at two in the afternoon. The film starts at three. Let’s eat after the film. From Mina.',[
 s('二人はどこで会いますか。','駅の前','駅の前で会いましょう','The meeting place is in front of the station, not the cinema or restaurant.',[['映画館の中','The message discusses a film, but the meeting is in front of the station.'],['ミナさんの家','Mina’s house is not given as the meeting place.'],['レストランの前','The meal is after the film; no restaurant meeting is specified.']]),
 s('映画の後で何をしますか。','ご飯を食べる','映画の後でご飯を食べましょう','The invitation explicitly proposes eating after watching the film.',[['駅へ行って初めて会う','They meet at the station before the film, not afterward.'],['学校で勉強する','No school or study plan appears in the invitation.'],['もう一つ映画を見る','Only one film is planned; afterward they will eat.']]),
],'email');
source('reading','n5','cafe','A simple café menu','food',
 'みどりカフェ\nお茶：二百円\nコーヒー：三百円\nパン：百五十円\n店は午前十時から午後六時までです。月曜日は休みです。',
 'Midori Café. Tea: 200 yen. Coffee: 300 yen. Bread: 150 yen. The café is open from ten in the morning until six in the evening. It is closed on Mondays.',[
 s('お茶とパンを一つずつ買うと、いくらですか。','三百五十円','お茶：二百円\nコーヒー：三百円\nパン：百五十円','Tea costs 200 yen and bread costs 150 yen; their total is 350 yen.',[['二百円','Two hundred yen covers only the tea, without the bread.'],['四百五十円','Four hundred fifty yen is the coffee-and-bread total, not tea and bread.'],['五百円','Five hundred yen is tea plus coffee, not tea plus bread.']]),
 s('この店はいつ休みですか。','月曜日','月曜日は休みです','The notice identifies Monday as the closing day.',[['日曜日','Sunday is not identified as a closing day.'],['土曜日','Saturday is not identified as a closing day.'],['毎日','The café has opening hours and closes only on the stated weekday.']]),
],'advertisement','reading-information');
source('reading','n5','park','A park rule','community',
 '公園は朝七時から夜八時までです。自転車は入口に置いてください。公園の中で自転車に乗らないでください。犬と一緒に入ってもいいです。',
 'The park is open from seven in the morning until eight at night. Please leave bicycles at the entrance. Do not ride a bicycle inside the park. You may enter with a dog.',[
 s('自転車はどこに置きますか。','入口','自転車は入口に置いてください','The notice asks visitors to leave bicycles at the entrance.',[['公園の真ん中','Visitors are directed to the entrance, not the middle of the park.'],['犬の近く','The dog rule does not specify where a bicycle should be placed.'],['駅の前','The station is not mentioned in the park notice.']]),
 s('公園でしてもいいことは何ですか。','犬と一緒に入る','犬と一緒に入ってもいいです','The permission form ～てもいい explicitly allows entry with a dog.',[['夜九時に入る','The park closes at eight at night, so nine is outside its hours.'],['中で自転車に乗る','Riding a bicycle inside is expressly prohibited.'],['入口を自転車でふさぐ','Leaving a bicycle at the entrance does not give permission to block the entrance.']]),
]);
source('reading','n5','routine','A student’s morning','daily',
 '私は毎朝六時に起きます。朝ご飯を食べて、七時に家を出ます。学校へは電車で行きます。駅から学校まで歩いて十分です。授業は八時半に始まります。',
 'I get up at six every morning. I eat breakfast and leave home at seven. I go to school by train. It is a ten-minute walk from the station to school. Lessons start at eight thirty.',[
 s('この人は何時に家を出ますか。','七時','七時に家を出ます','The stated departure from home is at seven; six is the wake-up time.',[['六時','Six is when the writer gets up, rather than leaves home.'],['八時半','Eight thirty is when lessons start.'],['十時','十分 is a ten-minute walk, not a departure at ten.']]),
 s('駅から学校までどうやって行きますか。','歩いて行く','駅から学校まで歩いて十分です','The train is used before the station-to-school part; that last part is on foot.',[['電車に乗る','The writer travels by train to the station, then walks to school.'],['自転車に乗る','A bicycle is not part of the described journey.'],['バスに乗る','The station-to-school stretch is explicitly a walk, not a bus trip.']]),
],'article');
source('reading','n5','library','A small library notice','services',
 '図書館は火曜日から日曜日まで、午前九時から午後五時まで開いています。本は一人三冊まで借りられます。二週間で返してください。月曜日は開いていません。',
 'The library is open Tuesday through Sunday, from nine in the morning to five in the afternoon. Each person may borrow up to three books. Please return them within two weeks. It is not open on Monday.',[
 s('一人で何冊まで借りられますか。','三冊','本は一人三冊まで借りられます','The borrowing limit is three books per person.',[['一冊','一人 means per person; it does not mean a one-book limit.'],['二冊','Two is the number of weeks, not the maximum number of books.'],['五冊','Five is the closing hour, not the book limit.']]),
 s('いつ本を返しますか。','二週間で返す','二週間で返してください','The return period is explicitly two weeks.',[['一週間で返す','One week is not the stated return period.'],['二か月で返す','The notice says weeks, not months.'],['借りた日に必ず返す','Books may be kept for the stated two-week period.']]),
],'notice','reading-information');
source('reading','n5','shopping','A note for a shopping trip','shopping',
 'お母さんへ。牛乳がありません。帰りに牛乳を二本買ってください。パンはまだありますから、買わなくてもいいです。お金は机の上にあります。健より。',
 'To Mum: We have no milk. Please buy two bottles on your way home. We still have bread, so you do not need to buy any. The money is on the desk. From Ken.',[
 s('何を買いますか。','牛乳を二本','牛乳を二本買ってください','Ken requests two bottles of milk and says bread is unnecessary.',[['パンを二つ','The bread is still available and need not be purchased.'],['牛乳とパン','Milk is requested, but bread is explicitly unnecessary.'],['牛乳を一本','The requested amount is two bottles, not one.']]),
 s('お金はどこにありますか。','机の上','お金は机の上にあります','The note gives the exact money location as on the desk.',[['店の中','The note does not say the money is at the shop.'],['椅子の下','The money is on the desk, not under a chair.'],['お母さんのかばん','A bag is not given as the money location.']]),
],'email');
source('reading','n5','weather','A plan for Sunday','nature',
 '日曜日は友達と山へ行く予定でした。でも、日曜日は雨ですから、山へは行きません。友達は私の家に来ます。一緒に昼ご飯を作ります。',
 'I had planned to go to the mountains with a friend on Sunday. But it will rain on Sunday, so we will not go to the mountains. My friend will come to my house. We will make lunch together.',[
 s('山へ行かない理由は何ですか。','雨だから','日曜日は雨ですから、山へは行きません','The rain is explicitly given as the reason for abandoning the mountain trip.',[['友達が来ないから','The friend is coming to the writer’s house instead.'],['山が遠いから','Distance is not given as a reason.'],['昼ご飯がないから','They plan to cook lunch; a lack of lunch is not why the trip changed.']]),
 s('二人は日曜日に何をしますか。','家で昼ご飯を作る','一緒に昼ご飯を作ります','The revised plan is for the friend to visit and make lunch together at home.',[['山で昼ご飯を食べる','They will not go to the mountains because of rain.'],['一人で店へ行く','The friend will join the writer at home; no solo shopping trip is stated.'],['学校で勉強する','There is no school or study plan in the passage.']]),
],'article');

source('reading','n4','homework','Two ways to hand in homework','education',
 '来週の宿題について。紙で出す人は、金曜日の授業の前に先生の机に置いてください。メールで出す人は、木曜日の夜十時までに送ってください。メールの件名には、自分の名前とクラスを書いてください。紙とメールの両方で出す必要はありません。',
 'About next week’s homework: If you hand it in on paper, put it on the teacher’s desk before Friday’s lesson. If you use email, send it by ten on Thursday night. Put your own name and class in the email subject. You do not need to submit both paper and email versions.',[
 s('メールで出す場合、いつまでに送りますか。','木曜日の夜十時まで','木曜日の夜十時までに送ってください','The email deadline is Thursday at ten at night; Friday’s lesson is for paper submissions.',[['金曜日の授業の後まで','Friday before class applies to paper; after class is not the deadline.'],['金曜日の夜十時まで','The email deadline is Thursday, not Friday.'],['木曜日の朝十時まで','The notice specifies 夜十時, not ten in the morning.']]),
 s('宿題の出し方として、正しいものはどれですか。','紙かメールのどちらかで出す','紙とメールの両方で出す必要はありません','Either submission method is allowed; submitting both is expressly unnecessary.',[['必ず紙とメールの両方で出す','The final sentence explicitly says both methods are not required.'],['紙は金曜日の授業の後に置く','Paper must be placed on the teacher’s desk before the lesson.'],['メールにはクラスを書かない','The email must include the writer’s name and class.']]),
],'notice','reading-information');
source('reading','n4','museum','A museum’s changing hours','culture',
 '青空美術館はふだん午後六時までですが、土曜日は午後八時まで開いています。入ることができるのは、閉まる三十分前までです。今月の十日から二十日までは、二階の部屋は使えません。一階の展示はいつもどおり見ることができます。',
 'Aozora Art Museum normally closes at six, but stays open until eight on Saturdays. Admission is possible until thirty minutes before closing. From the tenth through the twentieth of this month, the second-floor room is unavailable. The ground-floor exhibition can be viewed as usual.',[
 s('土曜日は何時まで入れますか。','午後七時半まで','土曜日は午後八時まで開いています。入ることができるのは、閉まる三十分前までです','Saturday closing is eight; admission ends thirty minutes earlier, at seven thirty.',[['午後八時まで','Eight is the closing time; entry stops thirty minutes earlier.'],['午後五時半まで','Five thirty is the usual last-entry time for a six o’clock close, not Saturday’s.'],['午後六時まで','Six is the usual closing time, but Saturday has extended hours.']]),
 s('今月十五日に見ることができるのはどこですか。','一階の展示','一階の展示はいつもどおり見ることができます','The fifteenth falls in the closure period for the second floor; the first-floor exhibition remains open.',[['二階の部屋だけ','The second-floor room is unavailable from the tenth through the twentieth.'],['一階と二階の全部','The first floor is open, but the second-floor room is closed that day.'],['どこも見ることができない','The first-floor exhibition remains available as usual.']]),
],'notice','reading-information');
source('reading','n4','recipe','Preparing a simple soup','food',
 '野菜のスープを作ります。初めに、野菜を小さく切ってください。それから、なべに野菜と水を入れて、十分煮ます。塩を入れる前に、味を見てください。塩を入れすぎたら、水を少し足すといいです。',
 'Make a vegetable soup. First cut the vegetables into small pieces. Then put the vegetables and water in a pot and cook them for ten minutes. Taste the soup before adding salt. If you add too much salt, you can add a little water.',[
 s('塩を入れる前に、何をしますか。','味を見る','塩を入れる前に、味を見てください','The instructions explicitly require tasting before adding salt.',[['水を全部捨てる','The recipe does not direct you to discard all the water.'],['野菜を初めて切る','The vegetables are cut at the start, before cooking.'],['十分冷やす','Ten minutes is the cooking period, not a cooling step.']]),
 s('塩を入れすぎたときは、どうしますか。','水を少し足す','塩を入れすぎたら、水を少し足すといいです','The final sentence advises a little extra water if the soup is too salty.',[['塩をもっと入れる','Adding salt would not correct having too much salt.'],['水を全部なくす','The recipe advises adding water, not removing it.'],['野菜を全部捨てる','Discarding the vegetables is not the proposed correction.']]),
],'article','reading-medium');
source('reading','n4','borrow','An extended library loan','services',
 '借りている本をまだ読み終わっていない場合、返す日の前に電話すると、一週間長く借りられます。ただし、ほかの人が予約している本は長く借りられません。その場合は、最初に決まった日までに返してください。',
 'If you have not finished a borrowed book, you can telephone before its return date to keep it for one extra week. However, a book reserved by someone else cannot be kept longer. In that case, return it by the original date.',[
 s('長く借りたいときは、いつ電話しますか。','返す日の前','返す日の前に電話すると','The extension procedure requires calling before the return date.',[['返す日の一週間後','The call must be before the due date, not a week after it.'],['本を返した後','The extension concerns keeping the borrowed book, not calling after its return.'],['いつでも、返す日を過ぎてもいい','The passage sets a condition: call before the original due date.']]),
 s('長く借りられないのは、どんな本ですか。','ほかの人が予約している本','ほかの人が予約している本は長く借りられません','A reservation by another reader is the specific exception to the extension.',[['まだ読み終わっていない本','Not finishing is the circumstance in which an extension can be requested.'],['電話で相談した本全部','Calling does not itself prevent an extension; another reader’s reservation does.'],['一週間で読める本','The text does not make estimated reading time the exception.']]),
],'notice','reading-information');
source('reading','n4','return','Returning a purchased shirt','shopping',
 'シャツの返品は、買った日から一週間以内にお願いします。着ていない物だけ返品できます。レシートを一緒に持ってきてください。小さいサイズに変えたい場合も、同じ決まりです。レシートがない場合は、返品も交換もできません。',
 'Please return shirts within one week of purchase. Only unworn items can be returned. Bring the receipt. The same rules apply when changing to a smaller size. Without a receipt, neither returns nor exchanges are possible.',[
 s('小さいサイズに変えるとき、何が必要ですか。','レシート','レシートを一緒に持ってきてください','The same rules apply to exchanging the size, including bringing the receipt.',[['銀行のカードだけ','A bank card is not the required proof stated in the notice.'],['着た後の写真','Only unworn items are eligible, and a photo is not required.'],['新しいシャツの箱だけ','A box is not stated as the necessary document; the receipt is.']]),
 s('返品できるシャツはどれですか。','三日前に買って、まだ着ていないシャツ','買った日から一週間以内にお願いします。着ていない物だけ返品できます','An unworn shirt purchased three days ago satisfies both the time and use conditions.',[['二週間前に買って、着ていないシャツ','Two weeks exceeds the one-week return period.'],['昨日買って、もう着たシャツ','The time condition is met, but worn shirts cannot be returned.'],['三日前に買ったが、レシートがないシャツ','The receipt is required even when purchase was within one week.']]),
],'notice','reading-information');
source('reading','n4','study','Learning with a short daily habit','education',
 '日本語の勉強を始めたとき、私は毎晩二時間勉強しようと思っていました。でも、仕事で疲れると、何もできない日が多くなりました。今は、朝の電車で十個の単語を復習することにしています。短い時間ですが、毎日続けられるので、前よりよく覚えられます。',
 'When I began learning Japanese, I intended to study for two hours every evening. But when work made me tired, there were many days when I did nothing. Now I have made a habit of reviewing ten words on the morning train. It is a short time, but because I can keep doing it daily, I remember better than before.',[
 s('前の勉強の仕方には、どんな問題がありましたか。','疲れると、勉強できない日が多かった','仕事で疲れると、何もできない日が多くなりました','The earlier plan often failed when the writer was tired from work.',[['毎朝二時間勉強していた','The original intention was two hours each evening, not each morning.'],['電車に乗る時間が長すぎた','The train is part of the newer method, not the earlier problem.'],['日本語の単語が十個しかなかった','Ten is the daily review amount, not the total vocabulary available.']]),
 s('今の方法がよいと思っている理由は何ですか。','短くても毎日続けられるから','短い時間ですが、毎日続けられるので、前よりよく覚えられます','The writer values consistency, connecting daily short practice to improved recall.',[['毎日二時間勉強できるから','The new method is short, not a daily two-hour session.'],['夜は何も覚えなくてもよいから','The writer does not claim that remembering at night is unnecessary.'],['仕事をやめたから','The passage does not say the writer left the job.']]),
],'article','reading-medium');
source('reading','n4','lost-wallet','Finding a lost wallet','daily',
 '昨日、駅で財布をなくしてしまいました。駅の人に聞きましたが、そのときは見つかりませんでした。今朝、駅から電話があって、財布が見つかったと聞きました。受け取るときは、名前が分かる物を持っていかなければなりません。',
 'Yesterday I lost my wallet at the station. I asked a member of station staff, but it had not been found then. This morning I received a call from the station saying it had been found. When collecting it, I must take something that shows my name.',[
 s('財布が見つかったことを、いつ知りましたか。','今朝','今朝、駅から電話があって、財布が見つかったと聞きました','The writer learned this during the station’s telephone call this morning.',[['昨日、なくしたとき','It was still missing when the writer asked yesterday.'],['昨日の夜、家で財布を見たとき','The wallet was found at the station; no discovery at home is described.'],['駅で財布を受け取った後','The writer learned by phone before collecting it.']]),
 s('財布を受け取るとき、何を持っていきますか。','自分の名前が分かる物','名前が分かる物を持っていかなければなりません','Identification showing the writer’s name is the stated collection requirement.',[['財布と同じ色のかばん','A matching bag colour is not the stated requirement.'],['電車の時刻表','A timetable does not satisfy the named identification requirement.'],['友達の名前を書いた紙','The required item must identify the person collecting their own wallet.']]),
],'article','reading-medium');
source('reading','n4','plants','Looking after a friend’s plants','home',
 '旅行中、植物の世話をお願いします。小さい鉢には毎朝少し水をあげてください。大きい鉢は、土が乾いていたら水をあげてください。雨の日は外にある鉢に水をあげなくてもいいです。来週の月曜日に帰ります。',
 'Please take care of my plants while I travel. Give the small pots a little water every morning. Water the large pots if their soil is dry. On rainy days, you do not need to water the pots outside. I return next Monday.',[
 s('大きい鉢には、どんなとき水をあげますか。','土が乾いているとき','大きい鉢は、土が乾いていたら水をあげてください','Watering the large pots is conditional on dry soil.',[['毎朝、土がぬれていても','Every morning applies to small pots, while large pots depend on the soil.'],['月曜日に帰ってからだけ','The care is requested during the trip; Monday is the return day.'],['必ず雨の日だけ','Rain does not define when the large pots need watering; dry soil does.']]),
 s('雨の日に水をあげなくてもいいのはどれですか。','外にある鉢','雨の日は外にある鉢に水をあげなくてもいいです','The exception on rainy days explicitly applies to pots outside.',[['部屋の中の鉢全部','The exception refers to outside pots, not all indoor pots.'],['小さい鉢だけ','Size is not the rain-day exception; being outside is.'],['すべての鉢','The note does not remove the watering requirement for every plant.']]),
],'email','reading-medium');

source('listening','n5','meeting','Meeting a friend at the station','people',
 '女：明日、何時に会いますか。\n男：午後二時はどうですか。\n女：いいですね。駅の前で会いましょう。\n男：はい、午後二時に駅の前ですね。',
 'Woman: What time shall we meet tomorrow? Man: How about two in the afternoon? Woman: Good. Let’s meet in front of the station. Man: Yes, at two in front of the station.',[
 s('二人はどこで会いますか。','駅の前','駅の前で会いましょう','They agree to meet in front of the station.',[['駅の中','The location is in front of the station, not inside.'],['学校の前','A school meeting place is not mentioned.'],['店の中','No shop is chosen as the meeting place.']]),
 s('二人は何時に会いますか。','午後二時','午後二時に駅の前ですね','The final confirmation states two in the afternoon.',[['午前二時','They say 午後, not 午前.'],['午後一時','One is not the agreed hour.'],['午後三時','Three is not the agreed hour.']]),
]);
source('listening','n5','class-items','What to bring to class','education',
 '先生：明日は本と鉛筆を持ってきてください。\n学生：辞書もいりますか。\n先生：いいえ、辞書はいりません。授業は午前九時からです。\n学生：分かりました。',
 'Teacher: Bring a book and pencil tomorrow. Student: Do we need a dictionary too? Teacher: No, no dictionary is needed. The lesson starts at nine in the morning. Student: Understood.',[
 s('学生は何を持っていきますか。','本と鉛筆','本と鉛筆を持ってきてください','The teacher requests a book and pencil.',[['辞書だけ','The teacher says a dictionary is not needed.'],['鉛筆と辞書','A pencil is needed, but the requested second item is the book.'],['本と傘','An umbrella is not requested.']]),
 s('授業はいつ始まりますか。','午前九時','授業は午前九時からです','The teacher states the morning starting time as nine.',[['午後九時','The teacher specifies 午前, not 午後.'],['午前十時','Ten is not the starting time in this conversation.'],['午前八時','Eight is not the stated starting time.']]),
]);
source('listening','n5','bread','Buying bread','shopping',
 '客：このパンを二つください。\n店員：はい。一つ百五十円ですから、三百円です。袋はいりますか。\n客：いいえ、かばんがあります。\n店員：分かりました。',
 'Customer: Two of these breads, please. Assistant: Yes. Each is 150 yen, so that is 300 yen. Do you need a bag? Customer: No, I have a bag with me. Assistant: Understood.',[
 s('店員はどうしますか。','袋に入れずにパンを渡す','いいえ、かばんがあります','The customer declines the shop bag because they already have a bag.',[['パンを一つにする','The order remains two breads; declining a bag does not change it.'],['袋を二つ付ける','The customer expressly says no to a bag.'],['パンを温める','Heating the bread is not requested or discussed.']]),
 s('全部でいくらですか。','三百円','三百円です','Two items at 150 yen each total 300 yen, which the assistant also states.',[['百五十円','That is the price of just one bread.'],['二百円','Two hundred yen is not the price or total quoted.'],['四百五十円','That would pay for three breads, while the customer orders two.']]),
]);
source('listening','n5','bus','A bus to the hospital','transport',
 '女：病院へ行くバスは何番ですか。\n男：三番です。あそこの青いバスです。\n女：何時に出ますか。\n男：十時に出ます。あと五分です。',
 'Woman: Which numbered bus goes to the hospital? Man: Number three. It is the blue bus over there. Woman: When does it leave? Man: At ten. In another five minutes.',[
 s('女の人はどのバスに乗りますか。','三番の青いバス','三番です。あそこの青いバスです','The man identifies the hospital service as the blue number-three bus.',[['五番の青いバス','Five refers to minutes remaining, not the bus number.'],['三番の赤いバス','The number is correct, but the bus is blue, not red.'],['十番の青いバス','Ten is the departure hour, not the bus number.']]),
 s('バスは何時に出ますか。','十時','十時に出ます','The departure time is ten; five is the waiting time in minutes.',[['五時','Five is the remaining number of minutes, not the departure hour.'],['九時','Nine is not given as the departure time.'],['十時半','The man says ten, without the extra half hour.']]),
]);
source('listening','n5','lunch','Ordering a simple lunch','food',
 '店員：何にしますか。\n客：魚とご飯をください。\n店員：飲み物は。\n客：水をお願いします。お茶はいりません。',
 'Assistant: What would you like? Customer: Fish and rice, please. Assistant: And a drink? Customer: Water, please. I do not need tea.',[
 s('店員は何を持ってきますか。','魚とご飯と水','魚とご飯をください','The customer orders fish and rice and then requests water.',[['肉とご飯と水','The food requested is fish, not meat.'],['魚とパンとお茶','Rice and water are requested; bread and tea are not.'],['魚とご飯とお茶','Tea is explicitly declined; water is requested instead.']]),
 s('客がいらないと言った飲み物は何ですか。','お茶','お茶はいりません','The customer explicitly says that tea is not needed.',[['水','Water is the drink the customer requests.'],['牛乳','Milk is not the drink mentioned as unnecessary.'],['コーヒー','Coffee does not appear in this order.']]),
]);
source('listening','n5','umbrella','Finding a misplaced umbrella','daily',
 '女：私の傘はどこですか。\n男：赤い傘ですか。\n女：いいえ、私のは白いです。\n男：白い傘は入口の右にありますよ。',
 'Woman: Where is my umbrella? Man: The red umbrella? Woman: No, mine is white. Man: The white umbrella is to the right of the entrance.',[
 s('女の人はどこへ行きますか。','入口の右','白い傘は入口の右にありますよ','Her white umbrella is on the right of the entrance.',[['入口の左','The stated side is right, not left.'],['駅の前','The station is not part of this location.'],['部屋の奥','The umbrella is beside the entrance, not at the back of the room.']]),
 s('女の人の傘は何色ですか。','白','私のは白いです','She corrects the red-umbrella suggestion and says hers is white.',[['赤','Red is the man’s initial guess, which she rejects.'],['青','Blue is not the colour she gives.'],['黒','Black is not the colour she gives.']]),
]);
source('listening','n5','milk','A phone call before dinner','food',
 '母：帰りに牛乳を買ってきてください。\n子：パンも買いますか。\n母：パンはあります。牛乳だけ一本お願いします。\n子：はい、一本ですね。',
 'Mother: Buy some milk on your way home, please. Child: Should I buy bread too? Mother: We have bread. Just one bottle of milk, please. Child: Yes, one bottle.',[
 s('子供は何を買いますか。','牛乳だけ','牛乳だけ一本お願いします','The mother says to buy only milk because there is already bread.',[['パンだけ','The mother says bread is already available.'],['牛乳とパン','Bread is not needed; she asks for milk only.'],['何も買わない','The child agrees to buy the requested milk.']]),
 s('牛乳はいくつ買いますか。','一本','はい、一本ですね','The child confirms the requested one bottle.',[['二本','The mother requests one bottle, not two.'],['三本','Three bottles are not requested.'],['四本','Four bottles are not requested.']]),
]);
source('listening','n5','directions','Directions to a bank','services',
 '女：銀行はどこですか。\n男：この道をまっすぐ行って、右に曲がってください。郵便局の隣です。\n女：左ですか。\n男：いいえ、右です。',
 'Woman: Where is the bank? Man: Go straight along this road and turn right. It is beside the post office. Woman: Left? Man: No, right.',[
 s('女の人はまっすぐ行って、どうしますか。','右に曲がる','いいえ、右です','The man corrects her left-turn suggestion and confirms a right turn.',[['左に曲がる','The woman asks about left, but the man explicitly corrects it to right.'],['すぐ家に帰る','Returning home is not part of the directions to the bank.'],['同じ道を戻る','The instructions say go straight and turn, not retrace the road.']]),
 s('銀行の隣には何がありますか。','郵便局','郵便局の隣です','The bank is stated to be next to the post office.',[['学校','A school is not given as the neighbouring building.'],['病院','A hospital is not given as the neighbouring building.'],['映画館','A cinema is not mentioned as the bank’s neighbour.']]),
]);
source('listening','n5','rain','Before leaving in the rain','nature',
 '男：外は雨ですよ。\n女：そうですか。傘を持っていきます。\n男：靴もぬれますから、この黒い靴をはいてください。\n女：分かりました。',
 'Man: It is raining outside. Woman: Is it? I will take an umbrella. Man: Your shoes will get wet too, so wear these black shoes. Woman: Understood.',[
 s('女の人は何を持っていきますか。','傘','傘を持っていきます','She explicitly says she will take an umbrella.',[['新聞','A newspaper is not requested or mentioned.'],['白い靴','The man recommends black shoes, and she says she will take an umbrella.'],['牛乳','Milk has no part in this departure conversation.']]),
 s('どの靴をはきますか。','黒い靴','この黒い靴をはいてください','The recommendation is to wear the black shoes.',[['赤い靴','The man specifies black rather than red.'],['白い靴','The man specifies black rather than white.'],['青い靴','The man specifies black rather than blue.']]),
]);
source('listening','n5','library','Borrowing books','services',
 '学生：本は何冊借りられますか。\n係：一人三冊までです。\n学生：いつ返しますか。\n係：今日から二週間で返してください。',
 'Student: How many books may I borrow? Staff: Up to three per person. Student: When should I return them? Staff: Within two weeks from today.',[
 s('学生はいつまでに本を返しますか。','今日から二週間で','今日から二週間で返してください','The staff sets a two-week return period starting today.',[['今日中に','The student may keep the books for two weeks, rather than returning them today.'],['三週間後に','Three is the book limit, not the number of weeks.'],['二か月後に','The stated unit is weeks, not months.']]),
 s('一人何冊まで借りられますか。','三冊','一人三冊までです','The staff states a maximum of three books per person.',[['一冊','一人 means each person; it is not a one-book limit.'],['二冊','Two refers to the number of weeks, not the book limit.'],['四冊','Four exceeds the stated three-book maximum.']]),
]);
source('listening','n5','mother','Looking for someone at home','home',
 '子：お母さんはどこですか。\n父：台所です。今、昼ご飯を作っています。\n子：私も手伝います。\n父：じゃあ、台所に行ってください。',
 'Child: Where is Mum? Father: In the kitchen. She is making lunch now. Child: I will help too. Father: Then go to the kitchen.',[
 s('子供はどこに行きますか。','台所','台所に行ってください','The father directs the child to the kitchen to help.',[['庭','The mother is in the kitchen, not the garden.'],['学校','The conversation is about helping at home, not going to school.'],['玄関','The entrance is not the location given.']]),
 s('お母さんは今、何をしていますか。','昼ご飯を作っている','今、昼ご飯を作っています','The father says that she is preparing lunch now.',[['朝ご飯を食べている','The action is preparing lunch, not eating breakfast.'],['本を読んでいる','Reading a book is not the stated action.'],['庭で犬と遊んでいる','The location and action are the kitchen and cooking.']]),
]);
source('listening','n5','hotel','A room and a key','travel',
 '係：お部屋は三階の三〇二です。こちらがかぎです。\n客：朝ご飯はどこですか。\n係：一階で、七時から九時までです。\n客：ありがとうございます。',
 'Staff: Your room is 302 on the third floor. Here is the key. Guest: Where is breakfast? Staff: On the first floor, from seven until nine. Guest: Thank you.',[
 s('客は部屋へ行くとき、何階に行きますか。','三階','お部屋は三階の三〇二です','The assigned bedroom is on the third floor.',[['一階','The first floor is the breakfast location, not the bedroom.'],['二階','302 is a room number; the staff explicitly says third floor.'],['七階','Seven is breakfast’s starting hour, not a floor.']]),
 s('朝ご飯は何時からですか。','七時','七時から九時までです','Breakfast starts at seven and ends at nine.',[['三時','Three is the room’s floor, not the breakfast start.'],['九時','Nine is the end of breakfast, not its beginning.'],['十時','Ten is not within the stated breakfast hours.']]),
]);
source('listening','n5','music-lesson','Choosing a music lesson','culture',
 '女：音楽の授業は火曜日ですか。\n男：いいえ、水曜日です。午後四時からです。\n女：何を持っていきますか。\n男：ノートと鉛筆を持ってきてください。',
 'Woman: Is the music lesson on Tuesday? Man: No, Wednesday. It starts at four in the afternoon. Woman: What should I bring? Man: A notebook and pencil, please.',[
 s('女の人は何を持っていきますか。','ノートと鉛筆','ノートと鉛筆を持ってきてください','The man requests a notebook and pencil for the music lesson.',[['辞書と本','Neither a dictionary nor a book is requested.'],['かぎと時計','A key and watch are not the stated lesson materials.'],['ノートと傘','A notebook is requested, but the second item is a pencil, not an umbrella.']]),
 s('授業は何曜日ですか。','水曜日','いいえ、水曜日です','The man corrects Tuesday and identifies Wednesday.',[['火曜日','Tuesday is the initial suggestion, which the man rejects.'],['木曜日','Thursday is not the corrected day.'],['土曜日','Saturday is not given as the lesson day.']]),
]);
source('listening','n5','museum','Planning a museum visit','culture',
 '女：美術館へ行きませんか。\n男：いいですね。今日は五時までですか。\n女：はい。今、三時ですから、今から行きましょう。\n男：じゃあ、バスで行きましょう。',
 'Woman: Would you like to go to the art museum? Man: Yes. Is it open until five today? Woman: Yes. It is three now, so let’s go now. Man: Then let’s go by bus.',[
 s('二人はどうやって美術館へ行きますか。','バスで行く','バスで行きましょう','Their final agreed means of travel is the bus.',[['電車で行く','A train is not proposed as the means of travel.'],['歩いて行く','They decide on a bus rather than a walk.'],['自転車で行く','A bicycle is not mentioned as the means.']]),
 s('美術館は何時までですか。','五時','今日は五時までですか。\n女：はい','The woman confirms the museum’s five o’clock closing time.',[['三時','Three is the current time, not the closing time.'],['四時','Four is not the stated closing time.'],['六時','Six is not the confirmed closing time.']]),
]);

source('listening','n4','meeting-change','A changed meeting plan','work',
 '女：明日の会議は十時からでしたね。\n男：田中さんが遅れるので、十一時に変わりました。資料は私が印刷しておきます。\n女：では、私は何をしましょうか。\n男：新しい商品の写真を持ってきてください。',
 'Woman: Tomorrow’s meeting was at ten, right? Man: Tanaka will be late, so it has changed to eleven. I will print the handouts in advance. Woman: What should I do, then? Man: Bring photographs of the new product.',[
 s('女の人は何を準備しますか。','新しい商品の写真','新しい商品の写真を持ってきてください','The man assigns the photographs to the woman and says he will print the handouts himself.',[['印刷した資料','The man says that he will print the handouts.'],['田中さんの予定表','Tanaka’s lateness changes the time, but his schedule is not requested.'],['会議室のかぎ','A room key is not requested in the conversation.']]),
 s('会議は何時に始まりますか。','十一時','十一時に変わりました','The original ten o’clock meeting has been moved to eleven.',[['十時','Ten was the previous time, explicitly changed to eleven.'],['十二時','Noon is not the revised start time.'],['九時','Nine is not the time stated for the meeting.']]),
]);
source('listening','n4','express-train','Choosing the right train','transport',
 '女：海町へ行きたいんですが、この特急に乗ればいいですか。\n男：その特急は海町には止まりません。二番線の急行に乗ってください。十五分後に出ます。\n女：二番線ですね。ありがとうございます。',
 'Woman: I want to go to Umimachi. Should I take this limited express? Man: That limited express does not stop at Umimachi. Take the express on platform two. It leaves in fifteen minutes. Woman: Platform two. Thank you.',[
 s('女の人はどの電車に乗りますか。','二番線の急行','二番線の急行に乗ってください','The man directs her to the express on platform two.',[['今ある特急','The limited express does not stop at her destination.'],['一番線の急行','The stated platform is two, not one.'],['二番線の特急','The recommended service is an express, not the limited express.']]),
 s('特急に乗らないのはなぜですか。','海町に止まらないから','その特急は海町には止まりません','The limited express misses the destination, so she needs another service.',[['十五分待つから','Fifteen minutes is the express’s departure wait, not why the limited express is unsuitable.'],['切符が全部売り切れだから','There is no statement that tickets are sold out.'],['二番線が閉まっているから','Platform two is the recommended departure platform, not closed.']]),
]);
source('listening','n4','allergy','Changing a lunch order','food',
 '客：このセットには卵が入っていますか。\n店員：スープに入っています。卵が食べられないなら、スープをサラダに変えられます。\n客：お願いします。飲み物は水でいいです。\n店員：では、先に水をお持ちします。',
 'Customer: Does this set meal contain egg? Assistant: The soup does. If you cannot eat egg, we can change the soup to a salad. Customer: Please do. Water is fine for my drink. Assistant: I will bring the water first.',[
 s('店員は最初に何を持ってきますか。','水','先に水をお持ちします','The assistant explicitly says that water will be brought first.',[['卵のスープ','The customer has agreed to change the egg-containing soup to salad.'],['コーヒー','The customer chooses water, not coffee.'],['サラダだけ','The salad replaces soup, but water is the item explicitly brought first.']]),
 s('セットのスープはどうなりますか。','サラダに変わる','スープをサラダに変えられます','The customer accepts the offered replacement of soup with salad.',[['卵をもっと入れる','The concern is inability to eat egg; adding egg would contradict it.'],['そのまま出す','The customer asks for the offered change.'],['水に変えて、サラダは出さない','Water is the drink; salad replaces the soup.']]),
]);
source('listening','n4','assignment','Submitting homework online','education',
 '学生：宿題は明日の授業で出せばいいですか。\n先生：今回はメールで出してください。今日の夜十時までです。\n学生：紙でも出さなければなりませんか。\n先生：いいえ、メールだけでいいですよ。',
 'Student: Should I hand in the homework at tomorrow’s lesson? Teacher: This time, send it by email, by ten tonight. Student: Must I hand in a paper version too? Teacher: No, email alone is fine.',[
 s('学生は宿題をどうやって出しますか。','メールだけで出す','メールだけでいいですよ','The teacher says that only the email submission is required.',[['明日の授業で紙だけを出す','That was the student’s initial assumption; the teacher changes it to email.'],['紙とメールの両方で出す','The teacher explicitly says email alone is fine.'],['先生に電話で答えを読む','No telephone submission is offered.']]),
 s('いつまでに出しますか。','今日の夜十時まで','今日の夜十時までです','The deadline is ten tonight, rather than tomorrow’s class.',[['明日の授業の後まで','The deadline is tonight, before tomorrow’s class.'],['今日の朝十時まで','The teacher says 夜十時, not morning.'],['明日の夜十時まで','The stated day is today, not tomorrow.']]),
]);
source('listening','n4','clinic','Paying at a clinic','health',
 '係：診察が終わったら、一階の受付でお金を払ってください。\n客：薬も一階でもらいますか。\n係：薬は隣の建物です。この紙を持っていってください。\n客：では、先に受付ですね。',
 'Staff: After the consultation, pay at reception on the first floor. Patient: Do I get the medicine there too? Staff: The medicine is in the neighbouring building. Take this paper with you. Patient: Then reception first.',[
 s('診察の後、客は最初にどこへ行きますか。','一階の受付','では、先に受付ですね','The patient confirms going to reception first to pay.',[['隣の建物','The neighbouring building is for medicine, after the payment step.'],['二階の教室','No classroom or second-floor destination is mentioned.'],['家','The patient still needs to pay and collect medicine.']]),
 s('薬をもらうために何を持っていきますか。','係からもらった紙','この紙を持っていってください','The staff instructs the patient to take the provided paper to the medicine building.',[['診察室のかぎ','A key is not the document needed for medicine.'],['一階の地図','No first-floor map is requested.'],['空の薬の箱だけ','An empty medicine box is not the stated requirement.']]),
]);
source('listening','n4','library-reserved','When a loan cannot be extended','services',
 '客：この本をもう一週間借りたいんですが。\n係：すみません。その本はほかの人が予約しているので、明日までに返してください。\n客：分かりました。明日は何時までですか。\n係：午後五時までです。',
 'Patron: I would like to borrow this book for one more week. Staff: Sorry, another person has reserved it, so please return it by tomorrow. Patron: Understood. Until what time tomorrow? Staff: Until five in the afternoon.',[
 s('客はどうしなければなりませんか。','明日の午後五時までに返す','明日までに返してください','The extension is refused; the existing return deadline is tomorrow, with closing at five.',[['来週まで借りる','The extra week is requested but refused because another reader reserved the book.'],['今日の午前五時に返す','The required day is tomorrow and the stated closing hour is in the afternoon.'],['本を家に置いたままにする','The staff explicitly asks for the book to be returned.']]),
 s('長く借りられないのはなぜですか。','ほかの人が予約しているから','ほかの人が予約しているので','The staff gives another person’s reservation as the reason.',[['図書館が来週休みだから','No next-week closure is given as the reason.'],['客が本をなくしたから','The patron has the book and asks to extend it; loss is not mentioned.'],['本が新しくないから','The age of the book is not the stated reason.']]),
]);
source('listening','n4','rain-outing','A rainy-day change of plan','nature',
 '女：明日は山へ行く予定でしたが、雨だそうですね。\n男：では、美術館にしませんか。駅に十時に集まりましょう。\n女：私は十時には着けません。十時半なら大丈夫です。\n男：じゃあ、十時半にしましょう。',
 'Woman: We planned to go to the mountains tomorrow, but I hear it will rain. Man: Shall we go to the art museum instead? Let’s meet at the station at ten. Woman: I cannot arrive at ten. Ten thirty is fine. Man: Then let’s make it ten thirty.',[
 s('二人は明日、どこへ行きますか。','美術館','美術館にしませんか','The man proposes the art museum as the replacement for the mountain trip; they then arrange its meeting time.',[['山','The mountain plan is changed because of rain.'],['学校','School is not their proposed destination.'],['海','The sea is not proposed as the alternative.']]),
 s('駅に何時に集まりますか。','十時半','じゃあ、十時半にしましょう','Ten is proposed first, but the final agreed time is ten thirty.',[['十時','The woman cannot arrive at ten, so the time is changed.'],['九時半','Nine thirty is not suggested in the conversation.'],['十一時','Eleven is not the final agreed time.']]),
]);
source('listening','n4','airport','Getting to the airport','travel',
 '女：空港には十一時までに着きたいんですが。\n係：九時半のバスなら、十時半に着きます。大きい荷物はバスの下に入れてください。\n女：切符はどこで買いますか。\n係：あちらの窓口で、乗る前に買ってください。',
 'Woman: I want to arrive at the airport by eleven. Staff: The nine-thirty bus arrives at ten thirty. Put large luggage in the compartment beneath the bus. Woman: Where do I buy a ticket? Staff: At the counter over there, before boarding.',[
 s('女の人はバスに乗る前に何をしますか。','窓口で切符を買う','あちらの窓口で、乗る前に買ってください','The staff specifically requires buying the ticket at the counter before boarding.',[['バスの中で切符を買う','The specified purchase place is the counter, before boarding.'],['空港で初めてお金を払う','The ticket is to be bought before the bus trip, not after arrival.'],['荷物を窓口に預けたままにする','Large luggage goes under the bus, not left at the ticket counter.']]),
 s('勧められたバスは何時に空港に着きますか。','十時半','十時半に着きます','The recommended bus leaves at nine thirty and arrives at ten thirty.',[['九時半','Nine thirty is the departure time.'],['十一時','Eleven is the desired latest arrival, not the bus’s actual arrival.'],['十一時半','Eleven thirty is not the stated arrival time and would miss the desired deadline.']]),
]);
source('listening','n4','charger','Borrowing a charger','technology',
 '男：携帯の電池がなくなったので、充電器を貸してくれませんか。\n女：いいですよ。でも、五時に帰るので、それまでに返してください。\n男：はい。充電が終わったらすぐ返します。\n女：机の上にある白い物です。',
 'Man: My phone battery has run out. Could you lend me a charger? Woman: Certainly. I leave at five, though, so return it before then. Man: Yes, I will return it as soon as it has charged. Woman: It is the white one on the desk.',[
 s('男の人はどれを使いますか。','机の上の白い充電器','机の上にある白い物です','The woman identifies the white charger on the desk.',[['机の下の黒い充電器','Both the location and colour differ from her description.'],['女の人の携帯電話','The man borrows a charger, not her phone.'],['棚の上の白い時計','A clock on a shelf is not the item being lent.']]),
 s('いつまでに返さなければなりませんか。','五時まで','五時に帰るので、それまでに返してください','She needs it back before her five-o’clock departure.',[['明日の五時まで','She is leaving at five in this conversation, with no next-day extension.'],['六時まで','Six is later than her stated departure.'],['返さなくてもよい','The loan includes an explicit return condition.']]),
]);
source('listening','n4','volunteer','Getting ready for a local event','community',
 '係：まず入口に机を二つ置いてください。その後で、庭に椅子を運んでください。\n学生：椅子は何脚ですか。\n係：十脚です。雨が降ったら、庭ではなく二階の部屋に運びます。\n学生：今日は晴れているので、庭ですね。',
 'Organiser: First put two tables at the entrance. Then carry chairs to the garden. Student: How many chairs? Organiser: Ten. If it rains, carry them to the second-floor room instead. Student: It is sunny today, so the garden.',[
 s('学生は最初に何をしますか。','入口に机を二つ置く','まず入口に机を二つ置いてください','まず identifies arranging the two tables at the entrance as the first task.',[['二階に椅子を十脚運ぶ','The chairs are a later task, and the second floor is only the rain alternative.'],['庭に机を十個置く','The two tables belong at the entrance, not ten in the garden.'],['入口の椅子を片付ける','Clearing chairs is not the stated first task.']]),
 s('今日、椅子はどこに運びますか。','庭','今日は晴れているので、庭ですね','Because today is sunny, the student confirms the garden rather than the rain alternative.',[['二階の部屋','The second-floor room is used only if it rains.'],['入口','The entrance is for the tables; the chairs go to the garden today.'],['駅の前','The station is not a destination for these event chairs.']]),
]);
source('listening','n4','delivery','Rearranging a delivery','services',
 '配達員：今日の午後三時に荷物を届けてもいいですか。\n客：三時は家にいません。六時以降なら大丈夫です。\n配達員：では、六時半に行きます。着く前に電話します。\n客：お願いします。',
 'Delivery worker: May I deliver your parcel at three this afternoon? Customer: I will not be home at three. After six is fine. Worker: Then I will come at six thirty. I will telephone before arriving. Customer: Please do.',[
 s('配達員は着く前に何をしますか。','客に電話する','着く前に電話します','The worker promises to telephone the customer before arriving.',[['荷物を駅に置く','Leaving the parcel at a station is not discussed.'],['三時に家の中に入る','The customer is unavailable at three, and entry to the home is not authorised.'],['客にメールだけ送る','The agreed contact is a telephone call, not email.']]),
 s('荷物は何時に届く予定ですか。','六時半','六時半に行きます','Three is rejected; the worker specifies six thirty after hearing the customer’s availability.',[['三時','The customer is not home at three.'],['六時ちょうど','After six is acceptable, and the worker chooses six thirty specifically.'],['七時半','Seven thirty is not the agreed time.']]),
]);
source('listening','n4','party','Choosing a gift for a visit','people',
 '女：明日のパーティーにケーキを持っていこうと思います。\n男：ケーキは田中さんが作るそうですよ。花はどうですか。\n女：そうですね。花にします。場所は佐藤さんの家でしたね。\n男：はい、午後一時からです。',
 'Woman: I am thinking of taking a cake to tomorrow’s party. Man: I hear Tanaka will make the cake. How about flowers? Woman: Good idea. I will choose flowers. The place was Sato’s house, right? Man: Yes, from one in the afternoon.',[
 s('女の人は何を持っていきますか。','花','花にします','She changes her initial cake idea and explicitly chooses flowers.',[['ケーキ','Cake was her initial idea, but Tanaka is already making it.'],['写真','Photographs are not chosen as the gift.'],['本','A book is not the gift she selects.']]),
 s('パーティーはどこで行われますか。','佐藤さんの家','場所は佐藤さんの家でしたね。\n男：はい','The man confirms Sato’s house as the party location.',[['田中さんの家','Tanaka makes the cake, but Sato hosts the party.'],['花の店','A flower shop may sell the gift, but is not the party location.'],['駅の前','No station meeting is stated for the party.']]),
]);
source('listening','n4','seat','Finding a quiet café seat','food',
 '客：静かな席があれば、そちらに座りたいんですが。\n店員：入口の近くは人がよく通るので、奥の窓のそばはいかがですか。\n客：そこにします。禁煙ですよね。\n店員：はい、店の中は全部禁煙です。',
 'Customer: If there is a quiet seat, I would like it. Assistant: People often pass near the entrance, so how about beside the window at the back? Customer: I will choose that. It is non-smoking, right? Assistant: Yes, the entire inside of the café is non-smoking.',[
 s('客はどこに座りますか。','奥の窓のそば','奥の窓のそばはいかがですか','The assistant offers the window at the back, and the customer accepts that seat.',[['入口のすぐ近く','The entrance is busy, which is why another seat is offered.'],['店の外','The chosen seat is inside, by the back window.'],['台所の中','The kitchen is not a customer seat offered in the conversation.']]),
 s('たばこについて、正しいものはどれですか。','店の中では吸えない','店の中は全部禁煙です','The assistant states that the entire interior is non-smoking.',[['入口の近くだけ吸える','All indoor areas are non-smoking, including near the entrance.'],['窓のそばだけ吸える','The window seat is also inside the fully non-smoking café.'],['午後一時から吸える','No smoking time exception is stated.']]),
]);
source('listening','n4','moving','Packing for a move','home',
 '女：明日の引っ越しの前に、本を箱に入れておいてください。\n男：服も同じ箱に入れますか。\n女：本は重いので、小さい箱に。服は大きい箱にお願いします。\n男：分かりました。今日は本から始めます。',
 'Woman: Before tomorrow’s move, pack the books into boxes. Man: Should I put clothes in the same boxes? Woman: Books are heavy, so put them in small boxes. Clothes go in large boxes. Man: Understood. I will start with the books today.',[
 s('男の人は最初に何をしますか。','本を小さい箱に入れる','今日は本から始めます','He says he will start with the books; the woman has specified small boxes for them.',[['服を小さい箱に入れる','Clothes go in large boxes and are not the stated first task.'],['本と服を同じ箱に入れる','The woman gives different box sizes for books and clothes.'],['本を大きい箱に全部入れる','The heavy books are to be packed in small boxes.']]),
 s('服はどの箱に入れますか。','大きい箱','服は大きい箱にお願いします','The woman explicitly assigns the large boxes to clothes.',[['小さい箱','Small boxes are for the heavy books.'],['本が入った箱だけ','She directs different packing for books and clothes rather than the same box.'],['箱には入れない','The woman requests putting clothes into large boxes.']]),
]);
