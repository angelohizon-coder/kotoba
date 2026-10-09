import type { Grammar, Listening, Question, QuestionType, Reading, TopicId, Vocabulary } from '../types';

// Original course material; levels are authored teaching routes, not an official exhaustive syllabus.
// Publisher scope inspected 2026-10-09; no exercises, passages, or answer keys reproduced:
// https://ask-books.com/book-details/?slug=9784866396514 (N5 integrated skills)
// https://ask-books.com/book-details/?slug=9784866396491 (N4 everyday kanji / words)
// https://ask-books.com/book-details/?slug=9784866396477 (N4 grammar / reading / listening)
// https://www.3anet.co.jp/np/books/3606/ (N4 scope and grammar contents)
// https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_contents_en.pdf (A1 everyday tasks)
// https://www.irodori.jpf.go.jp/assets/data/elementary01/pdf/Y_contents_en.pdf (A2 everyday tasks)
// Irodori's A1/A2 bands are context, not an assertion of equivalence to JLPT levels.
type FoundationLevel = 'n5' | 'n4';
type WordRow = [slug: string, word: string, reading: string, meaning: string, wordClass: string, example: string, translation: string, topicId: TopicId];
const n = 'noun', ia = 'い-adjective', na = 'な-adjective';
const gi = 'godan verb (intransitive)', gt = 'godan verb (transitive)', ii = 'ichidan verb (intransitive)', it = 'ichidan verb (transitive)';

const wordRows: Record<FoundationLevel, WordRow[]> = {
  n5: [
    ['big','大きい','おおきい','big; large',ia,'このかばんは大きいです。','This bag is large.','shopping'],
    ['small','小さい','ちいさい','small',ia,'私の部屋は小さいです。','My room is small.','home'],
    ['new','新しい','あたらしい','new',ia,'これは新しい靴です。','These are new shoes.','shopping'],
    ['old','古い','ふるい','old (of things)',ia,'あの建物は古いです。','That building is old.','home'],
    ['high','高い','たかい','high; tall; expensive',ia,'この時計は高いです。','This watch is expensive.','shopping'],
    ['cheap','安い','やすい','cheap; inexpensive',ia,'この店のパンは安いです。','The bread at this shop is inexpensive.','shopping'],
    ['long','長い','ながい','long',ia,'駅までの道は長いです。','The road to the station is long.','transport'],
    ['short','短い','みじかい','short (length or time)',ia,'この鉛筆は短いです。','This pencil is short.','education'],
    ['spacious','広い','ひろい','wide; spacious',ia,'学校の庭は広いです。','The school garden is spacious.','education'],
    ['narrow','狭い','せまい','narrow; cramped',ia,'この道は狭いです。','This road is narrow.','transport'],
    ['hot-weather','暑い','あつい','hot (weather)',ia,'今日は暑いです。','It is hot today.','nature'],
    ['cold-weather','寒い','さむい','cold (weather)',ia,'冬の朝は寒いです。','Winter mornings are cold.','nature'],
    ['warm','暖かい','あたたかい','warm (weather or surroundings)',ia,'春は暖かいです。','It is warm in spring.','nature'],
    ['cool','涼しい','すずしい','cool; pleasantly cool',ia,'山の朝は涼しいです。','Mornings in the mountains are cool.','nature'],
    ['hot-touch','熱い','あつい','hot (to the touch)',ia,'このお茶は熱いです。','This tea is hot.','food'],
    ['cold-touch','冷たい','つめたい','cold (to the touch)',ia,'冷たい水を飲みます。','I drink cold water.','food'],
    ['busy','忙しい','いそがしい','busy',ia,'父は今日は忙しいです。','My father is busy today.','work'],
    ['fun','楽しい','たのしい','fun; enjoyable',ia,'友達との旅行は楽しいです。','Traveling with friends is fun.','travel'],
    ['interesting','面白い','おもしろい','interesting; amusing',ia,'この映画は面白いです。','This film is interesting.','culture'],
    ['difficult','難しい','むずかしい','difficult',ia,'この問題は難しいです。','This question is difficult.','education'],
    ['easy','易しい','やさしい','easy; simple (a task)',ia,'これは易しい問題です。','This is an easy question.','education'],
    ['delicious','おいしい','おいしい','delicious; tasty',ia,'このパンはおいしいです。','This bread is delicious.','food'],
    ['sweet','甘い','あまい','sweet',ia,'このりんごは甘いです。','This apple is sweet.','food'],
    ['spicy','辛い','からい','spicy; hot (flavor)',ia,'このカレーは辛いです。','This curry is spicy.','food'],
    ['heavy','重い','おもい','heavy',ia,'この箱は重いです。','This box is heavy.','daily'],
    ['light','軽い','かるい','light (weight)',ia,'このかばんは軽いです。','This bag is light.','shopping'],
    ['early','早い','はやい','early',ia,'今日は帰る時間が早いです。','I go home early today.','time'],
    ['late','遅い','おそい','late; slow',ia,'今日は電車の出発が遅いです。','The train leaves late today.','transport'],
    ['red','赤い','あかい','red',ia,'赤い靴を買いました。','I bought red shoes.','shopping'],
    ['blue','青い','あおい','blue',ia,'今日は空が青いです。','The sky is blue today.','nature'],
    ['white','白い','しろい','white',ia,'白いシャツを着ています。','I am wearing a white shirt.','daily'],
    ['black','黒い','くろい','black',ia,'黒い猫がいます。','There is a black cat.','nature'],
    ['quiet','静か','しずか','quiet',na,'図書館は静かです。','The library is quiet.','education'],
    ['beautiful','きれい','きれい','beautiful; clean',na,'この部屋はきれいです。','This room is clean.','home'],
    ['well','元気','げんき','well; energetic',na,'祖母は元気です。','My grandmother is well.','health'],
    ['famous','有名','ゆうめい','famous',na,'この山は有名です。','This mountain is famous.','travel'],
    ['like','好き','すき','liked; fond of',na,'私は音楽が好きです。','I like music.','feelings'],
    ['dislike','嫌い','きらい','disliked; disliked by someone',na,'弟は辛い食べ物が嫌いです。','My younger brother dislikes spicy food.','food'],
    ['skillful','上手','じょうず','skillful; good at',na,'姉は料理が上手です。','My older sister is good at cooking.','people'],
    ['unskillful','下手','へた','unskillful; poor at',na,'私は絵が下手です。','I am poor at drawing.','culture'],
    ['convenient','便利','べんり','convenient; useful',na,'この地図は便利です。','This map is useful.','travel'],
    ['above','上','うえ','above; on top',n,'机の上に本があります。','There is a book on the desk.','home'],
    ['below','下','した','below; underneath',n,'椅子の下に猫がいます。','There is a cat under the chair.','home'],
    ['inside','中','なか','inside; middle',n,'箱の中に靴があります。','There are shoes inside the box.','home'],
    ['outside','外','そと','outside',n,'犬は家の外にいます。','The dog is outside the house.','home'],
    ['front','前','まえ','front; before',n,'駅の前で友達に会います。','I will meet my friend in front of the station.','transport'],
    ['behind','後ろ','うしろ','behind; back',n,'学校の後ろに公園があります。','There is a park behind the school.','education'],
    ['right','右','みぎ','right (direction)',n,'銀行は駅の右にあります。','The bank is to the right of the station.','transport'],
    ['left','左','ひだり','left (direction)',n,'店の左に郵便局があります。','There is a post office to the left of the shop.','transport'],
    ['east','東','ひがし','east',n,'駅の東に学校があります。','There is a school east of the station.','transport'],
    ['west','西','にし','west',n,'私の家は町の西にあります。','My house is in the west of town.','home'],
    ['south','南','みなみ','south',n,'学校の南に病院があります。','There is a hospital south of the school.','transport'],
    ['north','北','きた','north',n,'町の北に山があります。','There is a mountain north of town.','nature'],
    ['spring','春','はる','spring',n,'春は花がきれいです。','Flowers are beautiful in spring.','nature'],
    ['summer','夏','なつ','summer',n,'夏は海へ行きます。','I go to the sea in summer.','nature'],
    ['autumn','秋','あき','autumn; fall',n,'秋は山へ行きます。','I go to the mountains in autumn.','nature'],
    ['winter','冬','ふゆ','winter',n,'冬は雪が降ります。','It snows in winter.','nature'],
    ['monday','月曜日','げつようび','Monday',n,'月曜日は学校へ行きます。','I go to school on Monday.','time'],
    ['tuesday','火曜日','かようび','Tuesday',n,'火曜日に友達と会います。','I meet my friend on Tuesday.','time'],
    ['wednesday','水曜日','すいようび','Wednesday',n,'水曜日は図書館で勉強します。','I study at the library on Wednesday.','time'],
    ['thursday','木曜日','もくようび','Thursday',n,'木曜日に映画を見ます。','I watch a film on Thursday.','time'],
    ['friday','金曜日','きんようび','Friday',n,'金曜日に銀行へ行きます。','I go to the bank on Friday.','time'],
    ['saturday','土曜日','どようび','Saturday',n,'土曜日は学校が休みです。','There is no school on Saturday.','time'],
    ['sunday','日曜日','にちようび','Sunday',n,'日曜日に家族とご飯を食べます。','I eat a meal with my family on Sunday.','time'],
    ['last-week','先週','せんしゅう','last week',n,'先週、靴を買いました。','I bought shoes last week.','time'],
    ['last-month','先月','せんげつ','last month',n,'先月、京都へ行きました。','I went to Kyoto last month.','time'],
    ['this-month','今月','こんげつ','this month',n,'今月は仕事が多いです。','I have a lot of work this month.','time'],
    ['next-month','来月','らいげつ','next month',n,'来月、父が来ます。','My father is coming next month.','time'],
    ['last-year','去年','きょねん','last year',n,'去年、日本へ来ました。','I came to Japan last year.','time'],
    ['this-year','今年','ことし','this year',n,'今年は日本語を勉強します。','I am studying Japanese this year.','time'],
    ['next-year','来年','らいねん','next year',n,'来年、大学に入ります。','I will enter university next year.','time'],
    ['early-evening','夕方','ゆうがた','late afternoon; early evening',n,'夕方、犬と散歩します。','I take a walk with my dog in the early evening.','time'],
    ['daytime','昼','ひる','noon; daytime',n,'昼はパンを食べます。','I eat bread at lunchtime.','time'],
    ['head','頭','あたま','head',n,'今日は頭が痛いです。','My head hurts today.','health'],
    ['face','顔','かお','face',n,'朝、顔を洗います。','I wash my face in the morning.','daily'],
    ['eye','目','め','eye',n,'本をたくさん読んで、目が疲れました。','My eyes got tired from reading a lot.','health'],
    ['ear','耳','みみ','ear',n,'犬の耳は大きいです。','The dog has big ears.','nature'],
    ['mouth','口','くち','mouth',n,'口を開けてください。','Please open your mouth.','health'],
    ['hand','手','て','hand',n,'食事の前に手を洗います。','I wash my hands before meals.','daily'],
    ['stomach','お腹','おなか','stomach; belly',n,'お腹がすきました。','I am hungry.','health'],
    ['stamp','切手','きって','postage stamp',n,'切手を二枚買いました。','I bought two stamps.','services'],
    ['letter','手紙','てがみ','letter',n,'母に手紙を書きます。','I write a letter to my mother.','communication'],
    ['postcard','はがき','はがき','postcard',n,'旅行中に友達へはがきを書きました。','I wrote a postcard to my friend during my trip.','communication'],
    ['notebook','ノート','のーと','notebook',n,'ノートに名前を書きます。','I write my name in the notebook.','education'],
    ['pencil','鉛筆','えんぴつ','pencil',n,'鉛筆で字を書きます。','I write characters with a pencil.','education'],
    ['ballpoint','ボールペン','ぼーるぺん','ballpoint pen',n,'青いボールペンを使います。','I use a blue ballpoint pen.','education'],
    ['eraser','消しゴム','けしごむ','eraser',n,'消しゴムは机の上にあります。','The eraser is on the desk.','education'],
    ['key','鍵','かぎ','key',n,'家の鍵をかばんに入れます。','I put my house key in my bag.','home'],
    ['bag','かばん','かばん','bag',n,'このかばんは軽いです。','This bag is light.','shopping'],
    ['glass','コップ','こっぷ','drinking glass; cup',n,'コップに水を入れます。','I put water in the glass.','food'],
    ['plate','皿','さら','plate; dish',n,'白い皿を三枚買いました。','I bought three white plates.','food'],
    ['apple','りんご','りんご','apple',n,'りんごを一つ食べます。','I eat one apple.','food'],
    ['mandarin','みかん','みかん','mandarin orange',n,'冬はみかんをよく食べます。','I often eat mandarin oranges in winter.','food'],
    ['banana','バナナ','ばなな','banana',n,'朝ご飯にバナナを食べます。','I eat a banana for breakfast.','food'],
    ['black-tea','紅茶','こうちゃ','black tea',n,'紅茶に牛乳を入れます。','I put milk in my black tea.','food'],
    ['coffee','コーヒー','こーひー','coffee',n,'朝、コーヒーを飲みます。','I drink coffee in the morning.','food'],
    ['juice','ジュース','じゅーす','juice',n,'冷たいジュースをください。','Please give me some cold juice.','food'],
    ['time','時間','じかん','time; duration',n,'今日は勉強する時間があります。','I have time to study today.','time'],
    ['money','お金','おかね','money',n,'銀行でお金を下ろします。','I withdraw money at the bank.','shopping'],
    ['name','名前','なまえ','name',n,'ここに名前を書いてください。','Please write your name here.','communication'],
  ],
  n4: [
    ['gather','集まる','あつまる','to gather; to come together',gi,'日曜日は駅の前に集まる。','We gather in front of the station on Sunday.','community'],
    ['collect','集める','あつめる','to collect; to gather something',it,'私は外国の切手を集める。','I collect foreign stamps.','culture'],
    ['raise','育てる','そだてる','to raise; to grow something',it,'庭で野菜を育てる。','I grow vegetables in the garden.','nature'],
    ['break-intransitive','壊れる','こわれる','to break; to stop working',ii,'この古い機械はよく壊れる。','This old machine often breaks down.','technology'],
    ['break-transitive','壊す','こわす','to break something',gt,'強く押すと箱を壊すことがあります。','You may break the box if you push hard.','daily'],
    ['drop-transitive','落とす','おとす','to drop; to lose something',gt,'急いで歩くと鍵を落とすことがある。','I sometimes drop my keys when I walk in a hurry.','daily'],
    ['fall','落ちる','おちる','to fall; to drop',ii,'秋になると木の葉が落ちる。','Leaves fall from trees when autumn comes.','nature'],
    ['fix','直す','なおす','to fix; to correct',gt,'作文の間違いを直す。','I correct the mistakes in my composition.','education'],
    ['be-fixed','直る','なおる','to be fixed; to be corrected',gi,'この時計は部品を替えれば直る。','This watch will work again if its part is replaced.','daily'],
    ['pick-up','拾う','ひろう','to pick up something',gt,'公園でごみを拾う。','I pick up litter in the park.','community'],
    ['throw-away','捨てる','すてる','to throw away',it,'古い紙を捨てる。','I throw away old paper.','home'],
    ['carry','運ぶ','はこぶ','to carry; to transport',gt,'椅子を教室へ運ぶ。','I carry the chairs to the classroom.','education'],
    ['help','手伝う','てつだう','to help; to assist',gt,'休日は父の仕事を手伝う。','I help my father with his work on days off.','people'],
    ['take-exam','受ける','うける','to take (an exam); to receive',it,'来月、日本語の試験を受ける。','I will take a Japanese exam next month.','education'],
    ['send','送る','おくる','to send',gt,'家族に写真を送る。','I send photos to my family.','communication'],
    ['continue-intransitive','続く','つづく','to continue; to last',gi,'雨の日が三日続く。','The rainy weather lasts for three days.','nature'],
    ['get-used-to','慣れる','なれる','to get used to',ii,'毎日話せば、日本語に少しずつ慣れる。','If you speak every day, you gradually get used to Japanese.','education'],
    ['change-intransitive','変わる','かわる','to change; to become different',gi,'季節が変わると、店の服も変わる。','When the season changes, the clothes in shops change too.','shopping'],
    ['change-transitive','変える','かえる','to change something',it,'今日は部屋の机の位置を変える。','Today I change the position of the desk in my room.','home'],
    ['find-transitive','見つける','みつける','to find; to discover',it,'辞書で新しい言葉を見つける。','I find a new word in the dictionary.','education'],
    ['be-found','見つかる','みつかる','to be found',gi,'かばんを調べると、鍵が見つかる。','When I check my bag, I find my keys.','daily'],
    ['search-for','探す','さがす','to look for; to search for',gt,'駅の近くで部屋を探す。','I look for a room near the station.','home'],
    ['investigate','調べる','しらべる','to look up; to investigate; to check',it,'出かける前に電車の時間を調べる。','I check the train times before going out.','transport'],
    ['be-decided','決まる','きまる','to be decided',gi,'来月の予定は明日決まる。','Next month’s schedule will be decided tomorrow.','time'],
    ['decide','決める','きめる','to decide something',it,'友達と旅行の日を決める。','I decide the date of the trip with my friend.','travel'],
    ['begin','始まる','はじまる','to begin; to start',gi,'授業は九時に始まる。','Class begins at nine.','education'],
    ['end','終わる','おわる','to end; to finish',gi,'仕事は五時に終わる。','Work ends at five.','work'],
    ['stop-intransitive','止まる','とまる','to stop; to come to a stop',gi,'バスは学校の前に止まる。','The bus stops in front of the school.','transport'],
    ['stop-transitive','止める','とめる','to stop something',it,'危ないときは機械を止める。','I stop the machine when there is danger.','technology'],
    ['move-intransitive','動く','うごく','to move; to operate',gi,'この時計はまだ動く。','This clock still works.','daily'],
    ['move-transitive','動かす','うごかす','to move something; to operate',gt,'掃除のときに机を動かす。','I move the desk when cleaning.','home'],
    ['be-audible','聞こえる','きこえる','to be audible; to be heard',ii,'この部屋から鳥の声が聞こえる。','Birdsong can be heard from this room.','nature'],
    ['be-visible','見える','みえる','to be visible; to be seen',ii,'窓から海が見える。','The sea can be seen from the window.','nature'],
    ['resemble','似る','にる','to resemble',ii,'子供の顔は親に似ることが多い。','Children’s faces often resemble their parents’.','people'],
    ['be-enough','足りる','たりる','to be enough; to suffice',ii,'水は二本あれば足りる。','Two bottles of water will be enough.','daily'],
    ['mistake-transitive','間違える','まちがえる','to get something wrong; to mistake',it,'急ぐと電話番号を間違える。','I get the phone number wrong when I rush.','communication'],
    ['be-mistaken','間違う','まちがう','to be mistaken; to make a mistake','godan verb (intransitive / transitive uses)','誰でも時々間違う。','Everyone makes mistakes sometimes.','education'],
    ['put-back','戻す','もどす','to return something; to put back',gt,'読んだ本を棚に戻す。','I put the book I have read back on the shelf.','home'],
    ['boil-intransitive','沸く','わく','to boil (water)',gi,'お湯が沸くまで待ちます。','I wait until the water boils.','food'],
    ['boil-transitive','沸かす','わかす','to boil (water)',gt,'お茶を飲むためにお湯を沸かす。','I boil water to make tea.','food'],
    ['scold','叱る','しかる','to scold',gt,'先生は危ないことをした生徒を叱る。','The teacher scolds a pupil who has done something dangerous.','people'],
    ['praise','ほめる','ほめる','to praise',it,'先生はよくできた作文をほめる。','The teacher praises a well-written composition.','education'],
    ['welcome','迎える','むかえる','to welcome; to meet an arriving person',it,'空港で友達を迎える。','I meet my arriving friend at the airport.','travel'],
    ['pray','祈る','いのる','to pray; to wish for',gt,'家族の健康を祈る。','I pray for my family’s health.','people'],
    ['plant','植える','うえる','to plant',it,'春に庭へ花を植える。','I plant flowers in the garden in spring.','nature'],
    ['escape','逃げる','にげる','to run away; to escape',ii,'大きな音がすると猫が逃げる。','The cat runs away when there is a loud noise.','nature'],
    ['stop-by','寄る','よる','to stop by',gi,'帰る前にスーパーに寄る。','I stop by the supermarket before going home.','shopping'],
    ['pull','引く','ひく','to pull',gt,'このドアは手前に引く。','Pull this door toward you.','daily'],
    ['push','押す','おす','to push; to press',gt,'このボタンを押すと電気がつきます。','The light comes on when you press this button.','technology'],
    ['build','建てる','たてる','to build (a building)',it,'駅の近くに家を建てる。','I build a house near the station.','home'],
    ['wake-someone','起こす','おこす','to wake someone up',gt,'毎朝六時に弟を起こす。','I wake my younger brother at six every morning.','people'],
    ['pass-through','通る','とおる','to pass through; to go along',gi,'学校へ行くときにこの道を通る。','I take this road when going to school.','transport'],
    ['commute','通う','かよう','to attend regularly; to commute',gi,'週に二回、日本語の学校に通う。','I attend Japanese school twice a week.','education'],
    ['decorate','飾る','かざる','to decorate; to display',gt,'部屋に花を飾る。','I decorate the room with flowers.','home'],
    ['deliver','届ける','とどける','to deliver; to take something to someone',it,'母の家に荷物を届ける。','I deliver a package to my mother’s house.','services'],
    ['lose-match','負ける','まける','to lose (a match)',ii,'練習しないと試合に負ける。','If we do not practise, we lose the match.','culture'],
    ['win','勝つ','かつ','to win',gi,'今日は試合に勝つために頑張ります。','Today I will do my best to win the match.','culture'],
    ['step-on','踏む','ふむ','to step on',gt,'暗いと庭の花を踏むことがある。','When it is dark, I sometimes step on the garden flowers.','daily'],
    ['chew','噛む','かむ','to chew; to bite',gt,'ご飯はゆっくり噛む。','I chew my food slowly.','health'],
    ['grow-up','育つ','そだつ','to grow; to be raised',gi,'この野菜は暖かい所でよく育つ。','This vegetable grows well in warm places.','nature'],
    ['primary-school','小学校','しょうがっこう','primary school; elementary school',n,'弟は小学校に通っています。','My younger brother attends primary school.','education'],
    ['middle-school','中学校','ちゅうがっこう','junior high school',n,'妹は来年、中学校に入ります。','My younger sister will enter junior high school next year.','education'],
    ['principal','校長','こうちょう','school principal',n,'校長が学生に話をしました。','The principal gave a talk to the students.','education'],
    ['auditorium','講堂','こうどう','auditorium; assembly hall',n,'学校の講堂で音楽を聞きました。','I listened to music in the school auditorium.','education'],
    ['office','事務所','じむしょ','office',n,'事務所はこの建物の二階です。','The office is on the second floor of this building.','work'],
    ['factory','工場','こうじょう','factory',n,'父は自動車の工場で働いています。','My father works at a car factory.','work'],
    ['closet','押し入れ','おしいれ','built-in storage closet',n,'布団を押し入れに入れました。','I put the futon in the closet.','home'],
    ['tatami','畳','たたみ','tatami mat',n,'この部屋には畳が六枚あります。','This room has six tatami mats.','home'],
    ['police','警察','けいさつ','police',n,'財布を落としたので警察に行きました。','I went to the police because I lost my wallet.','services'],
    ['fire-station','消防署','しょうぼうしょ','fire station',n,'消防署は病院の隣にあります。','The fire station is next to the hospital.','services'],
    ['driver','運転手','うんてんしゅ','driver',n,'バスの運転手に駅の場所を聞きました。','I asked the bus driver where the station was.','transport'],
    ['nurse','看護師','かんごし','nurse',n,'看護師が体温を測りました。','The nurse took my temperature.','health'],
    ['absence','留守','るす','absence from home; being away',n,'午後は家族全員が留守です。','The whole family is away from home this afternoon.','home'],
    ['house-sitting','留守番','るすばん','looking after a home while others are out','noun / する verb','弟は家で留守番をしています。','My younger brother is looking after the house.','home'],
    ['sick-visit','お見舞い','おみまい','visit to someone who is ill',n,'日曜日に祖母のお見舞いに行きます。','I will visit my sick grandmother on Sunday.','health'],
    ['sightseeing','見物','けんぶつ','watching; sightseeing','noun / する verb','町の祭りを見物しました。','I watched the town festival.','culture'],
    ['flower-viewing','花見','はなみ','cherry-blossom viewing',n,'春に友達と花見をしました。','I went cherry-blossom viewing with friends in spring.','culture'],
    ['celebration','お祝い','おいわい','celebration; congratulatory gift',n,'姉の卒業のお祝いに花を買いました。','I bought flowers to celebrate my older sister’s graduation.','culture'],
    ['thanks','お礼','おれい','thanks; a token of thanks',n,'手伝ってくれた友達にお礼を言いました。','I thanked the friend who helped me.','communication'],
    ['side-dish','おかず','おかず','side dish served with rice',n,'今日のおかずは魚と野菜です。','Today’s side dishes are fish and vegetables.','food'],
    ['uncooked-rice','米','こめ','uncooked rice; rice grain',n,'夕食の前に米を洗います。','I wash the rice before dinner.','food'],
    ['hot-water','湯','ゆ','hot water',n,'湯が熱いので水を少し入れました。','I added a little water because the hot water was too hot.','food'],
    ['miso','味噌','みそ','miso; fermented soybean paste',n,'スープに味噌を入れます。','I put miso in the soup.','food'],
    ['beans','豆','まめ','bean; beans',n,'この料理には豆が入っています。','This dish contains beans.','food'],
    ['tofu','豆腐','とうふ','tofu',n,'夕食に豆腐を食べました。','I ate tofu for dinner.','food'],
    ['soup','汁','しる','soup; liquid; juice',n,'この汁は少し塩辛いです。','This soup is a little salty.','food'],
    ['boxed-meal','弁当','べんとう','packed meal; boxed lunch',n,'学校に弁当を持っていきます。','I take a packed lunch to school.','food'],
    ['pork','豚肉','ぶたにく','pork',n,'夕食に豚肉を焼きました。','I grilled pork for dinner.','food'],
    ['beef','牛肉','ぎゅうにく','beef',n,'今日は牛肉が安いです。','Beef is inexpensive today.','shopping'],
    ['chicken','鶏肉','とりにく','chicken meat',n,'スープに鶏肉を入れます。','I put chicken in the soup.','food'],
    ['grapes','ぶどう','ぶどう','grapes',n,'朝ご飯にぶどうを食べました。','I ate grapes for breakfast.','food'],
    ['pear','梨','なし','pear (especially Asian pear)',n,'この梨は甘いです。','This pear is sweet.','food'],
    ['peach','桃','もも','peach',n,'桃を二つ買いました。','I bought two peaches.','food'],
    ['bottle','瓶','びん','bottle; jar',n,'空の瓶を洗いました。','I washed the empty bottle.','home'],
    ['can','缶','かん','can; tin',n,'飲んだ後、缶をごみ箱に入れます。','I put the can in the bin after drinking.','daily'],
    ['beard','ひげ','ひげ','beard; mustache',n,'父はひげが長いです。','My father has a long beard.','people'],
    ['fingernail','爪','つめ','nail (finger or toe)',n,'日曜日に爪を切ります。','I cut my nails on Sunday.','daily'],
    ['shoulder','肩','かた','shoulder',n,'重いかばんを持ったので肩が痛いです。','My shoulder hurts because I carried a heavy bag.','health'],
    ['chest','胸','むね','chest; breast',n,'走った後、胸が痛くなりました。','My chest began to hurt after running.','health'],
    ['heart','心','こころ','heart; mind; feelings',n,'友達の言葉で心が明るくなりました。','My friend’s words lifted my spirits.','feelings'],
  ],
};

export const datasetFoundationVocabulary: Vocabulary[] = (['n5','n4'] as const).flatMap(jlptLevel => wordRows[jlptLevel].map(([slug,word,reading,meaning,wordClass,example,exampleTranslation,topicId]) => ({ id: `ds-v-${jlptLevel}-${slug}`, word, reading, meaning, wordClass, example, exampleTranslation, topicId, level: 'review' as const, jlptLevel })));
export const datasetFoundationGrammar: Grammar[] = [];
export const datasetFoundationReadings: Reading[] = [];
export const datasetFoundationListening: Listening[] = [];
export const datasetFoundationQuestions: Question[] = [];

type Choice = [text: string, explanation: string];
type Choices = [Choice, Choice, Choice, Choice];
function question(id: string, skill: 'grammar' | 'reading' | 'listening', jlptLevel: FoundationLevel, topicId: TopicId, questionType: QuestionType, prompt: string, choices: Choices, link: Pick<Question,'grammarId' | 'passageId' | 'listeningId' | 'evidence'>): string {
  const rotation = datasetFoundationQuestions.length % 4;
  const order = [0,1,2,3].map(index => (index + rotation) % 4);
  const options = order.map((index,slot) => ({ id: `${id}-o${slot + 1}`, text: choices[index][0] }));
  datasetFoundationQuestions.push({ id, skill, jlptLevel, topicId, questionType, prompt, options, correctOptionId: options[order.indexOf(0)].id, explanations: Object.fromEntries(order.map((index,slot) => [options[slot].id, choices[index][1]])), ...link });
  return id;
}
type Form = { before: string; after: string; choices: Choices; translation: string };
function form(before: string, after: string, translation: string, choices: Choices): Form { return { before, after, translation, choices }; }
function grammar(jlptLevel: FoundationLevel, slug: string, title: string, meaning: string, attachment: string[], topicId: TopicId, category: string, comparison: string, forms: [Form,Form]): void {
  const id = `ds-g-${jlptLevel}-${slug}`;
  const examples = forms.map(f => ({ ja: f.before + f.choices[0][0] + f.after, en: f.translation }));
  const questionIds = forms.map((f,index) => question(`ds-q-${jlptLevel}-g-${slug}-${index+1}`, 'grammar', jlptLevel, topicId, 'grammar-form', `（　）に入る最もよいものを一つ選んでください。\n${f.before}（　）${f.after}`, f.choices, {grammarId:id}));
  datasetFoundationGrammar.push({id,title,meaning,attachment,topicId,category,level:'review',jlptLevel,comparison,examples,questionIds,mistake:{wrong:forms[0].before + forms[0].choices[1][0] + forms[0].after,correct:examples[0].ja,explanation:forms[0].choices[1][1]}});
}

grammar('n5','demonstratives','これ・この・ここ', 'Point to a thing, identify a noun, or indicate a place. こ refers to the speaker’s side; そ to the listener’s side or a mentioned item; あ to something away from both.', ['これ／それ／あれ stand alone as noun expressions.', 'この／その／あの + noun; ここ／そこ／あそこ indicate places.', 'どれ／どの + noun／どこ ask which thing or place.'], 'daily','demonstratives','これは本です uses a standalone pronoun. この本は… uses a noun modifier; この cannot replace これ by itself.',[
  form('私の手にある', '本は日本語の本です。','This book in my hand is a Japanese-language book.',[
    ['この','この modifies the following noun 本 and refers to the book in the speaker’s hand.'],['これ','これ stands alone; it cannot directly modify 本.'],['ここ','ここ means this place, rather than this book.'],['こう','こう describes a way of doing something, not a noun.']]),
  form('', 'は私の鍵です。','This is my key.',[
    ['これ','これ can stand alone as the subject: this is my key.'],['この','この needs a following noun, such as この鍵.'],['こう','こう means in this way and cannot identify a key.'],['こんな','こんな modifies a following noun; none follows here.']]),
]);

grammar('n5','to-list-companion','～と：一緒に・全部のリスト','Use と for a companion in an action or to join named items in a complete list.', ['Person + と + action: 友達と行きます.', 'Noun + と + noun joins the named items; と follows each item except the last.'], 'people','particles','～や gives examples from a larger set. Companion と means together with; action location uses で.',[
  form('日曜日は友達', '図書館へ行きます。','On Sunday I go to the library with my friend.',[
    ['と','と identifies the person who accompanies the speaker.'],['に','に can mark a destination or recipient, but a friend is the companion here.'],['を','を marks an object or route; it does not mark a companion.'],['で','で marks location or means, not a person accompanying the speaker.']]),
  form('朝ご飯はパン', '牛乳です。','Breakfast is bread and milk.',[
    ['と','と joins the two nouns パン and 牛乳.'],['を','を marks an object of a verb and cannot join the nouns before this copula.'],['へ','へ marks direction and cannot join these food nouns.'],['が','が would begin a separate predicate about 牛乳, but 牛乳です does not form one here.']]),
]);

grammar('n5','ya-examples','～や～など','List examples without claiming to name every item.', ['Noun + や + noun (+ など).', 'や connects nouns. など means and the like and can follow the last example.'], 'shopping','particles','～と joins a complete list of the named items. ～や…など leaves room for further examples.',[
  form('机の上には本', 'ノートなどがあります。','There are books, notebooks, and other things on the desk.',[
    ['や','や joins 本 and ノート as examples, with など indicating other things as well.'],['が','本がノートなどがあります leaves two unconnected subjects; use や to join the noun examples.'],['を','を marks an object; 本 is an example in a list here.'],['へ','へ marks direction and cannot list items on a desk.']]),
  form('店ではパンや牛乳', 'を売っています。','The shop sells bread, milk, and other things.',[
    ['など','など closes the example list before the object marker を.'],['ながら','ながら attaches to a verb stem for simultaneous actions, not this noun list.'],['からで','からで cannot close this list of products before を.'],['だった','だった is the past copula and cannot connect this list to を.']]),
]);

grammar('n5','range','～から～まで：範囲','State the beginning and end of a time or place range.', ['Starting time or place + から; ending time or place + まで.', 'A range can precede an action: 九時から五時まで働きます.'], 'time','particles','から marks the starting point and まで the endpoint. Deadline までに means by a time and is a separate N4 lesson.',[
  form('図書館は九時', '五時まで開いています。','The library is open from nine to five.',[
    ['から','から marks nine as the start of the opening interval.'],['に','に marks a point in time but does not establish the start of this range.'],['で','で does not mean from nine in this interval.'],['と','と would list times rather than give the start of the interval.']]),
  form('ここ', '駅まで歩いて十分です。','It is ten minutes on foot from here to the station.',[
    ['から','から marks this place as the start, paired with 駅まで.'],['を','を may mark a route traversed, but the required starting point is ここから.'],['で','で marks location or means; it does not indicate from here.'],['へ','へ marks a destination, while here is the starting point.']]),
]);

grammar('n5','negative-frequency','あまり・全然＋否定','あまり with a negative means not very much or not often. 全然 with a negative means not at all in the beginner usage taught here.', ['あまり + negative predicate (あまり食べません／あまり高くないです).', '全然 + negative predicate (全然分かりません).', 'Affirmative colloquial 全然 is outside this lesson.'], 'daily','adverbs','よく＋affirmative means often; あまり＋negative means not often. 全然＋negative is stronger and describes no occurrence or no degree.',[
  form('コーヒーはあまり', '。週に一回ぐらいです。','I do not drink coffee very often, about once a week.',[
    ['飲みません','あまり uses a negative predicate here; once a week is not very often.'],['飲みます','The affirmative does not form the beginner expression あまり…ません.'],['飲むです','Dictionary-form 飲む cannot attach directly to です.'],['飲みませんだ','Polite 飲みません does not take the additional copula だ.']]),
  form('この店は高いです。一回も行きません。私は全然', '。','This shop is expensive. I do not go there even once. I never go there.',[
    ['行きません','全然 with negative 行きません means the speaker does not go there at all.'],['行きます','The taught negative-frequency expression requires a negative predicate.'],['行くです','行くです combines a dictionary verb with です incorrectly.'],['行きませんですます','ですます cannot be added after the complete polite negative form.']]),
]);

grammar('n5','likes-skills','～が好き・～が上手','Use が to mark what someone likes or is good at.', ['Person/topic + は + noun + が + 好きです／嫌いです.', 'Person/topic + は + activity noun + が + 上手です／下手です.', '好き and 上手 are な-adjectives: 好きな音楽／上手な人.'], 'feelings','preferences','食べます takes an object with を. 好きです describes a preference and normally marks its target with が in the basic sentence taught here.',[
  form('私は日本の音楽', '好きです。','I like Japanese music.',[
    ['が','が marks the object of liking in 音楽が好きです.'],['を','を marks a verb’s direct object; 好きです is an adjective predicate.'],['に','に would indicate a target or location in other constructions, not what is liked here.'],['へ','へ marks direction and cannot mark the target of 好き here.']]),
  form('姉は料理', '上手です。','My older sister is good at cooking.',[
    ['が','料理が上手 describes cooking as her skill.'],['を','上手 is an adjective, so this basic skill expression does not use object を.'],['に','料理に上手 is not the basic construction for being good at cooking.'],['と','と marks a companion or list, rather than the skill being evaluated.']]),
]);

grammar('n5','plain-verbs','動詞の普通形：辞書形・ない形','Use dictionary forms for plain nonpast statements and ない forms for plain negatives.', ['Godan negative: final u sound changes to a + ない; 行く → 行かない, 買う → 買わない.', 'Ichidan negative: remove る + ない; 食べる → 食べない.', 'する → しない; 来る → 来ない（こない）. Plain nonpast can describe habits or future actions.'], 'daily','verb forms','働きます and 行きません are polite. 働く and 行かない are the corresponding plain forms; the choice of style depends on the relationship and situation.',[
  form('毎日ここで', '。（普通形の文）','I work here every day. (Plain style.)',[
    ['働く','働く is the dictionary form, completing a plain nonpast sentence.'],['働き','働き is a stem and does not complete this sentence by itself.'],['働いて','働いて is a connecting or requesting て-form, not the requested plain statement.'],['働きました','働きました is polite past, rather than plain nonpast.']]),
  form('明日は学校に', '。（普通形の否定）','I will not go to school tomorrow. (Plain negative.)',[
    ['行かない','行く is godan: く changes to か before ない.'],['行かません','The polite negative is 行きません, not 行かません.'],['行きない','The ます-stem 行き cannot take plain negative ない directly.'],['行くない','Godan 行く must change its final sound before ない.']]),
]);

grammar('n5','movement-purpose','動詞のます形の語幹＋に行く','Say what action you go somewhere to do.', ['Verb ます-form without ます + に + 行く／来る／帰る.', 'An activity noun can also take に: 買い物に行く.', 'A destination can be marked separately with へ or に.'], 'transport','purpose','学校に行く gives a destination. 勉強しに行く gives the purpose; に after the verb stem does not mark a place.',[
  form('駅へ友達を', 'に行きます。','I go to the station to meet my arriving friend.',[
    ['迎え','迎え is the stem of 迎えます, followed by purpose に.'],['迎える','Use the ます-stem 迎え, not dictionary form 迎える, before purpose に行く.'],['迎えて','The て-form cannot attach to purpose に this way.'],['迎えた','The past form does not attach to purpose に行く.']]),
  form('公園へ', 'に行きます。','I go to the park to play.',[
    ['遊び','遊び is the stem of 遊びます and can precede purpose に.'],['遊ぶ','Dictionary form 遊ぶ must change to the ます-stem here.'],['遊んで','遊んで is the て-form, not the stem used before に行く.'],['遊んだ','Past 遊んだ cannot form this purpose expression.']]),
]);

grammar('n5','want-object','～が欲しい','Express wanting a thing, generally the speaker’s own desire in a statement.', ['Desired noun + が + 欲しいです.', '欲しい is an い-adjective: 欲しくない／欲しかった.', 'Ask the listener directly with ～が欲しいですか. Avoid treating an unconfirmed third person’s private desire as your own direct statement.'], 'shopping','desire','～たい expresses wanting to do an action: 時計を買いたい. ～が欲しい expresses wanting the thing itself: 時計が欲しい.',[
  form('私は新しい時計', '欲しいです。','I want a new watch.',[
    ['が','が marks the desired thing in 時計が欲しいです.'],['を','The adjective 欲しい uses が in this basic object-desire construction.'],['に','に does not mark the desired object in this expression.'],['で','で marks means or location in other constructions, not the thing wanted.']]),
  form('子供のとき、自転車が', '。','When I was a child, I wanted a bicycle.',[
    ['欲しかったです','欲しい is an い-adjective: replace い with かった for past desire.'],['欲しいでした','An い-adjective uses its own past form; it does not take でした directly.'],['欲しいだった','だ cannot make the past tense of an い-adjective.'],['欲しでした','Removing い and adding でした is not the い-adjective past pattern.']]),
]);

grammar('n5','adjective-link','形容詞をつなぐ：～くて・～で','Join descriptions of the same person or thing.', ['い-adjective: replace final い with くて (軽い → 軽くて).', 'いい → よくて; な-adjective stem + で (静か → 静かで).', 'The last adjective determines the tense and politeness of the sentence.'], 'home','adjective forms','Verb て-forms connect actions. Adjective ～くて／～で connects qualities; な is used before a noun, not between these predicates.',[
  form('このかばんは軽', '、便利です。','This bag is light and useful.',[
    ['くて','軽い changes to 軽くて when linking it to another description.'],['いて','Do not add て to the unchanged final い; the linking form is くて.'],['いで','い-adjectives link with くて, not いで.'],['かった','軽かった is past and lacks the connector needed before 便利です.']]),
  form('この町は静か', '、きれいです。','This town is quiet and beautiful.',[
    ['で','静か is a な-adjective and uses で to link descriptions.'],['くて','くて is the い-adjective connector; 静か does not take it.'],['な','な modifies a following noun, whereas きれいです is another predicate.'],['だ','だ is a plain copula; use connecting で to join these descriptions.']]),
]);

grammar('n4','deadline','～までに：締め切り','Complete an action by the stated deadline, at any time before or at that point.', ['Time + までに + a completed or bounded action.', 'Distinguish まで for an action that continues until a time: 五時まで働く.'], 'time','deadlines','五時まで働く means keep working until five. 五時までに出す means submit by five, possibly earlier.',[
  form('締め切りは金曜日です。この紙は金曜日', '出してください。','The deadline is Friday. Please submit this paper by Friday.',[
    ['までに','までに marks the deadline by which submission must be completed.'],['まで','まで normally marks continuation until Friday, rather than the completion deadline for submitting a paper.'],['から','から would make Friday the starting point, which would miss the deadline meaning.'],['の後で','の後で means after Friday and would miss the stated Friday deadline.']]),
  form('六時に店が閉まります。六時', '買い物を終えてください。','The shop closes at six. Please finish shopping by six.',[
    ['までに','までに requires finishing no later than the closing time.'],['から','Starting from six would be after the shop closes.'],['の後に','の後に means after six, too late for this instruction.'],['を過ぎてから','を過ぎてから means after six has passed, also too late.']]),
]);

grammar('n4','easy-action','～やすい','Describe an action as easy to do or a tendency as likely to occur.', ['Verb ます-form without ます + やすい.', 'Conjugate the resulting い-adjective: 読みやすくない／読みやすかった.', 'The action-ease use is emphasized in the examples; 壊れやすい can describe a tendency.'], 'daily','ease and difficulty','やさしい describes something as easy or kind depending on spelling and context. ～やすい attaches to a verb stem to specify an easy action.',[
  form('このペンはとても', 'です。','This pen is very easy to write with.',[
    ['書きやすい','The stem 書き plus やすい describes ease of writing.'],['書くやすい','Dictionary form 書く cannot attach directly to やすい.'],['書いてやすい','The て-form is not the attachment form for やすい.'],['書いたやすい','The past form does not take やすい directly.']]),
  form('この本は字が大きくて、', 'です。','This book has large print and is easy to read.',[
    ['読みやすい','読み is the stem of 読みます; 読みやすい describes ease of reading.'],['読むやすい','Use the ます-stem 読み rather than dictionary form 読む.'],['読んでやすい','読んで is a て-form and cannot attach to やすい.'],['読みやすだ','The result is an い-adjective, so 読みやすだ is not its form.']]),
]);

grammar('n4','difficult-action','～にくい','Describe an action as difficult to do.', ['Verb ます-form without ます + にくい.', 'The result is an い-adjective: 使いにくい／使いにくかった.', 'This describes practical difficulty, rather than a prohibition.'], 'technology','ease and difficulty','～やすい means easy to do; ～にくい means difficult to do. ～てはいけない prohibits an action rather than assessing its difficulty.',[
  form('このドアは重くて、', 'です。','This door is heavy and difficult to open.',[
    ['開けにくい','開け is the stem of 開けます; にくい describes difficulty opening it.'],['開けるにくい','The dictionary form does not attach directly to にくい.'],['開けてにくい','The て-form is not the attachment form for にくい.'],['開けたにくい','The past form cannot attach directly to にくい.']]),
  form('この機械はボタンが小さくて、', 'です。','This machine has small buttons and is difficult to use.',[
    ['使いにくい','使い is the ます-stem, and 使いにくい evaluates ease of use.'],['使うにくい','Godan 使う changes to its stem 使い before にくい.'],['使ってにくい','Use the verb stem, not て-form 使って.'],['使いにくな','にくい forms an い-adjective, not a な-adjective.']]),
]);

grammar('n4','whether','～かどうか','Embed a yes/no question: whether or not something is the case.', ['Verb / い-adjective plain form + かどうか.', 'Noun / な-adjective nonpast affirmative: omit だ before かどうか.', 'Follow with a verb such as 分かる／調べる／聞く.'], 'communication','embedded questions','いつ来るか asks when someone will come. 来るかどうか asks whether the person will come at all.',[
  form('先生が来る', '、まだ分かりません。','I do not yet know whether the teacher will come.',[
    ['かどうか','来るかどうか embeds the yes/no question of the teacher’s attendance.'],['何か','何か means something and cannot turn this clause into a whether-question.'],['どこか','どこか means somewhere; the clause asks about coming, not a place.'],['誰か','誰か means someone and cannot serve as the question connector.']]),
  form('明日が休み', '、会社に聞きます。','I will ask the company whether tomorrow is a day off.',[
    ['かどうか','休み is a noun; omit だ before かどうか.'],['だかどうか','The nonpast affirmative copula だ is omitted in this construction.'],['なかどうか','な is used in some noun-linking patterns, but not before かどうか.'],['をかどうか','を cannot be inserted between the noun predicate and かどうか.']]),
]);

grammar('n4','embedded-wh','疑問詞＋普通形＋か','Put a who, what, where, when, or which question inside a larger sentence.', ['Question word inside a clause + plain predicate + か + main verb.', 'Noun / な-adjective nonpast affirmative omit だ before か.', 'The embedded clause has no independent question mark; the main verb gives the overall action.'], 'communication','embedded questions','かどうか embeds a yes/no question. A clause that already asks 何時／どこ／どの needs か, because its answer is a time, place, or choice.',[
  form('電車が何時に来る', '、駅で聞きました。','I asked at the station what time the train would come.',[
    ['か','何時 asks for a time; か closes that embedded question.'],['かどうか','かどうか asks whether an event occurs, not the time requested by 何時.'],['そうで','そうで reports hearsay or appearance and does not close an embedded what-time question.'],['ながら','ながら describes simultaneous actions and does not embed a question.']]),
  form('どの電車に乗る', '教えてください。','Please tell me which train to take.',[
    ['か','どの電車 asks which train; か makes it the information requested by 教えてください.'],['かどうか','Whether or not to board is different from which train to board.'],['ようで','ようで gives an appearance or resemblance, not an embedded which-question.'],['ので','ので gives a reason and does not connect the requested information as a question.']]),
]);

grammar('n4','volitional-intention','～（よ）うと思う','State an intention using the volitional form plus と思う. ～と思っている often presents an intention already being held.', ['Godan: final u sound → o + う (休む → 休もう).', 'Ichidan: remove る + よう (食べる → 食べよう).', 'する → しよう; 来る → 来よう（こよう）; volitional + と思う／と思っている.'], 'time','intentions','～ましょう can invite another person. ～ようと思っています presents a personal intention; ～つもりです is another way of stating a plan.',[
  form('週末は少し', 'と思っています。','I am planning to rest a little this weekend.',[
    ['休もう','休む is godan; its volitional is 休もう before と思う.'],['休むよう','Dictionary form plus よう does not make the volitional of 休む.'],['休みよう','The ます-stem does not take よう to form this godan volitional.'],['休んよう','休ん is not a volitional base; use 休もう.']]),
  form('来年は日本で', 'と思っています。','I intend to study in Japan next year.',[
    ['勉強しよう','The volitional of 勉強する is 勉強しよう.'],['勉強するよう','Dictionary form する plus よう is a different construction, not the intended volitional.'],['勉強しょう','する changes to しよう, retaining し before よう.'],['勉強しように','に cannot be inserted between the volitional and quotation marker と.']]),
]);

grammar('n4','nasai','～なさい','Give a firm instruction, often from a teacher to a student or a parent to a child.', ['Verb ます-form without ます + なさい.', 'する → しなさい; 来る → 来なさい（きなさい）.', 'This can sound authoritative; ～てください is appropriate for many ordinary requests.'], 'education','instructions','～てください is a polite request. ～なさい conveys an instruction from someone in a guiding or authoritative role and should be chosen with the relationship in mind.',[
  form('先生「名前をここに', '。」','Teacher: Write your name here.',[
    ['書きなさい','書き is the ます-stem, followed by instruction なさい.'],['書くなさい','Dictionary form 書く cannot attach directly to なさい.'],['書きますなさい','Remove ます before adding なさい.'],['書きなさいます','なさい is already the instruction form; it does not take ます.']]),
  form('母「もう遅いから、早く', '。」','Mother: It is late, so go to bed soon.',[
    ['寝なさい','Remove る from ichidan 寝る and add なさい.'],['寝るなさい','Dictionary-form る must be removed before なさい.'],['寝ますなさい','なさい attaches to the stem 寝, not the full polite form 寝ます.'],['寝なさいる','なさい is not a verb stem to which る can be added.']]),
]);

grammar('n4','make-adjective','～くする・～にする','Actively make something have a different quality or state.', ['Object + を + い-adjective without い + くする.', 'Object + を + な-adjective stem / noun + にする.', 'いい → よくする; conjugate する for tense or politeness.'], 'home','changes','部屋を明るくする means someone makes the room brighter. 部屋が明るくなる describes the resulting change without naming a deliberate actor.',[
  form('部屋が暗いので、電気をつけて明る', 'します。','The room is dark, so I turn on the light to make it brighter.',[
    ['く','An い-adjective changes final い to く before する: 明るくする.'],['い','The unchanged い-adjective cannot attach directly to する.'],['いに','に is used for nouns and な-adjectives, not after 明るい.'],['くに','く is sufficient; adding に makes the connection incorrect.']]),
  form('ごみを捨てて、部屋を', 'しました。','I threw away the rubbish and made the room clean.',[
    ['きれいに','きれい is a な-adjective and takes に before する.'],['きれく','きれい is not an い-adjective; its final い is not removed.'],['きれいく','Do not add the い-adjective connector く to きれい.'],['きれいで','で can join descriptions but does not form the make-clean construction with する.']]),
]);

grammar('n4','become-adjective','～くなる・～になる','Describe a change in state or quality.', ['い-adjective without い + くなる; いい → よくなる.', 'な-adjective stem / noun + になる.', 'The subject of the change is normally marked by が or presented with は.'], 'nature','changes','～くする／～にする describes making a change. ～くなる／～になる describes something becoming different; ～ようになる concerns changes in ability or habitual action.',[
  form('春になって、暖か', 'なりました。','Spring came and it became warm.',[
    ['く','暖かい changes its final い to く before なる.'],['い','The い-adjective cannot attach directly to なる.'],['いに','に is not added after an unchanged い-adjective.'],['くに','Use the adverbial く alone; no extra に is required.']]),
  form('病院で休んで、', 'なりました。','I rested in the hospital and got better.',[
    ['元気に','元気 is a な-adjective; 元気になる means become well.'],['元気な','な connects the adjective to a noun, not to なる.'],['元気く','The く ending belongs to い-adjectives, while 元気 is a な-adjective.'],['元気を','を marks an object; it does not connect this quality to なる.']]),
]);

grammar('n4','hope-to-ii','～といい','Express a hope that a desirable situation will occur, often in ～といいですね／～といいな.', ['Verb plain nonpast + といい.', 'い-adjective plain nonpast + といい; noun / な-adjective + だといい.', 'といいですね commonly expresses a shared hope or a hope for the listener; といいな expresses the speaker’s wish.'], 'feelings','hopes','晴れるといいですね expresses a hope. 晴れると思います states a prediction; conditional と by itself describes a regular result.',[
  form('明日の旅行の日は、', 'といいですね。','I hope it is sunny on the day of tomorrow’s trip.',[
    ['晴れる','Plain nonpast 晴れる before といい expresses hope for clear weather.'],['晴れよう','The volitional suggests intending to clear up; it is not the plain future weather event used in this wish.'],['晴れて','といい takes a plain clause rather than this て-form.'],['晴れたで','晴れたで is not a plain predicate that can precede といい.']]),
  form('試験に', 'といいですね。','I hope you pass the exam.',[
    ['合格する','Plain nonpast 合格する presents passing as the hoped-for event.'],['合格しよう','A volitional form expresses intention and does not form this event-wish pattern.'],['合格したい','合格したい describes wanting to pass; the wish here concerns actually passing.'],['合格して','The て-form does not attach to といい in this pattern.']]),
]);

type Comprehension = { slug: string; prompt: string; questionType: QuestionType; choices: Choices; evidence: string };
function comprehension(slug: string, prompt: string, questionType: QuestionType, evidence: string, choices: Choices): Comprehension { return {slug,prompt,questionType,evidence,choices}; }
function reading(jlptLevel: FoundationLevel, slug: string, title: string, type: Reading['type'], topicId: TopicId, body: string, translation: string, tasks: [Comprehension,Comprehension]): void {
  const id = `ds-r-${jlptLevel}-${slug}`;
  const questionIds = tasks.map(t => question(`ds-q-${jlptLevel}-r-${slug}-${t.slug}`, 'reading', jlptLevel, topicId, t.questionType, t.prompt, t.choices, {passageId:id,evidence:t.evidence}));
  datasetFoundationReadings.push({id,title,type,topicId,body,translation,questionIds,jlptLevel});
}
function listening(jlptLevel: FoundationLevel, slug: string, title: string, topicId: TopicId, script: string, translation: string, tasks: [Comprehension,Comprehension]): void {
  const id = `ds-l-${jlptLevel}-${slug}`;
  const questionIds = tasks.map(t => question(`ds-q-${jlptLevel}-l-${slug}-${t.slug}`, 'listening', jlptLevel, topicId, t.questionType, t.prompt, t.choices, {listeningId:id,evidence:t.evidence}));
  // No audioUrl: the existing course player reads these original scripts using device speech.
  datasetFoundationListening.push({id,title,topicId,script,translation,questionIds,jlptLevel});
}

reading('n5','lunch-invitation','土曜日の昼ご飯','email','people',
  'ミナさんへ\n土曜日、私の家で一緒に昼ご飯を食べませんか。十二時に来てください。私はパンとスープを作ります。ジュースはありますから、飲み物はいりません。ミナさんの旅行の写真を見たいです。写真を持ってきてください。\nアキ',
  'Dear Mina, Would you like to have lunch together at my house on Saturday? Please come at twelve. I will make bread and soup. I have juice, so you do not need to bring drinks. I would like to see the photos of your trip. Please bring the photos. Aki.',[
    comprehension('time','ミナさんは何時にアキさんの家へ行きますか。','reading-short','十二時に来てください。',[
      ['十二時','Aki directly asks Mina to come at twelve.'],['十時','Ten is not given as the arrival time.'],['十一時','The email specifies twelve, not eleven.'],['一時','One is an hour after the requested arrival time.']]),
    comprehension('bring','ミナさんは何を持っていきますか。','reading-short','写真を持ってきてください。',[
      ['旅行の写真','Aki asks to see Mina’s travel photos and tells her to bring them.'],['パン','Aki will make the bread. Mina is not asked to bring it.'],['スープ','Aki will make the soup along with the bread.'],['ジュース','The email says juice is already available and drinks are unnecessary.']]),
  ]);

reading('n5','library-holiday','図書館の休みの日','notice','education',
  '図書館からのお知らせ\n来週の月曜日は休みです。火曜日は朝九時から開いています。休みの日に本を返すときは、入口の右にある箱に入れてください。ＣＤは箱に入れないでください。ＣＤは火曜日に図書館の人に返してください。',
  'Library notice: The library is closed next Monday. It opens at nine in the morning on Tuesday. To return books on the closed day, put them in the box to the right of the entrance. Do not put CDs in the box. Return CDs to library staff on Tuesday.',[
    comprehension('open','火曜日、図書館は何時に開きますか。','reading-information','火曜日は朝九時から開いています。',[
      ['朝九時','The notice explicitly says the library opens from nine on Tuesday morning.'],['朝八時','Eight is not the opening time stated in the notice.'],['昼十二時','The library opens in the morning, not at noon.'],['午後三時','Three in the afternoon is much later than the stated opening time.']]),
    comprehension('cd','休みの日にＣＤを返したい人は、どうしますか。','reading-information','ＣＤは火曜日に図書館の人に返してください。',[
      ['火曜日に図書館の人に返します。','CDs must be handed to staff on Tuesday.'],['月曜日に右の箱に入れます。','The box is for books; the notice specifically forbids putting CDs there.'],['入口の左に置きます。','No return location on the left is mentioned, and CDs require a staff handover.'],['家でＣＤを捨てます。','The notice asks for CDs to be returned, not discarded.']]),
  ]);

reading('n5','morning-study','朝の十分','article','daily',
  '私は毎朝七時に起きます。朝ご飯の後で、日本語の本を十分読みます。夜は仕事で疲れていますから、勉強しません。朝は家が静かです。短い時間ですが、毎日新しい言葉を三つ覚えます。日曜日も同じです。',
  'I get up at seven every morning. After breakfast, I read a Japanese book for ten minutes. I am tired from work at night, so I do not study then. The house is quiet in the morning. It is a short time, but I learn three new words every day. Sunday is the same.',[
    comprehension('when','この人はいつ日本語の本を読みますか。','reading-short','朝ご飯の後で、日本語の本を十分読みます。',[
      ['朝ご飯の後','The person reads for ten minutes after breakfast.'],['朝ご飯の前','The passage explicitly places reading after breakfast.'],['夜の仕事の後','The person is tired at night and does not study then.'],['日曜日だけ','The person reads every morning, including Sunday.']]),
    comprehension('amount','この人は毎日、新しい言葉をいくつ覚えますか。','reading-short','毎日新しい言葉を三つ覚えます。',[
      ['三つ','The passage states three new words every day.'],['一つ','One is not the stated daily number.'],['七つ','Seven is the wake-up hour, not the number of words.'],['十','Ten describes minutes spent reading, not words learned.']]),
  ]);

reading('n5','bread-shop','青いパン屋','advertisement','shopping',
  '青いパン屋\n駅の西にある小さい店です。毎日、朝八時から午後四時まで開いています。パンは一つ百五十円です。パンとコーヒーのセットは二百五十円です。店の中に椅子があります。そこでパンを食べて、コーヒーを飲んでください。',
  'Blue Bakery: We are a small shop west of the station, open every day from eight in the morning to four in the afternoon. One bread item costs 150 yen. A bread and coffee set costs 250 yen. There are chairs inside. Please eat your bread and drink your coffee there.',[
    comprehension('place','青いパン屋はどこにありますか。','reading-information','駅の西にある小さい店です。',[
      ['駅の西','The advertisement locates the bakery west of the station.'],['駅の東','East is the opposite of the stated direction.'],['学校の中','The location is near the station, not inside a school.'],['病院の北','The advertisement gives no location relative to a hospital.']]),
    comprehension('set-price','パンとコーヒーのセットはいくらですか。','reading-information','パンとコーヒーのセットは二百五十円です。',[
      ['二百五十円','The set price is explicitly 250 yen.'],['百五十円','150 yen is the price of one bread item by itself.'],['四百円','400 yen is not a price given in the advertisement.'],['八百円','Eight is the opening hour, not an 800-yen price.']]),
  ]);

reading('n4','parcel-handover','荷物を受け取る日','email','services',
  'ユウさんへ\n注文した机が木曜日の午後、私の家に届きます。でも、私は三時まで仕事があります。二時から三時まで、私の家で荷物を受け取ってもらえませんか。机を動かすのは、私が帰ってから一緒にお願いします。鍵は水曜日の授業の後で渡します。もし木曜日が忙しかったら、水曜日の昼までに返事をください。\nリナ',
  'Dear Yu, The desk I ordered will arrive at my house on Thursday afternoon, but I have work until three. Could you receive the package at my house between two and three? Please help me move the desk after I come home. I will give you the key after Wednesday’s class. If you are busy on Thursday, please reply by noon on Wednesday. Rina.',[
    comprehension('first','木曜日の二時から三時まで、ユウさんにしてほしいことは何ですか。','reading-medium','二時から三時まで、私の家で荷物を受け取ってもらえませんか。',[
      ['リナさんの家で荷物を受け取ること','Rina asks Yu to receive the desk package at her home between two and three.'],['机を店へ返すこと','The desk is arriving from an order; there is no request to return it to the shop.'],['一人で机を動かすこと','Moving the desk is to happen together after Rina comes home.'],['リナさんの会社へ鍵を持っていくこと','Rina will give Yu the key after Wednesday’s class; there is no company delivery request.']]),
    comprehension('reply','木曜日が忙しい場合、ユウさんはいつまでに返事をしますか。','reading-information','もし木曜日が忙しかったら、水曜日の昼までに返事をください。',[
      ['水曜日の昼まで','The fallback reply deadline is noon on Wednesday.'],['水曜日の授業の後まで','After class is the key handover time, not the reply deadline.'],['木曜日の二時まで','Two on Thursday is the beginning of the receiving period, not the deadline for replying.'],['木曜日の三時まで','Three is when Rina’s work ends, not the requested reply deadline.']]),
  ]);

reading('n4','cooking-class','料理教室の持ち物','notice','food',
  '土曜日の料理教室に参加する皆さんへ\n教室は午前十時から十二時までです。九時五十分までに一階の受付へ来てください。今回は豆腐と野菜の料理を作ります。包丁や皿は教室にありますから、持ってくる必要はありません。手をふく小さいタオルだけ、自分で持ってきてください。作った料理は教室で食べます。家に持って帰ることはできません。',
  'To everyone attending Saturday’s cooking class: The class runs from ten until noon. Please come to reception on the first floor by 9:50. This time we will make a dish with tofu and vegetables. Knives and plates are provided, so you do not need to bring them. Please bring your own small towel for drying your hands. We will eat the finished food in the classroom; you cannot take it home.',[
    comprehension('bring','参加する人が自分で持ってくる物は何ですか。','reading-information','手をふく小さいタオルだけ、自分で持ってきてください。',[
      ['小さいタオル','The only item participants are asked to bring themselves is a small hand towel.'],['包丁','The notice says knives are provided in the classroom.'],['皿','Plates are provided and do not need to be brought.'],['豆腐と野菜','Tofu and vegetables describe the dish; they are not listed as items participants must bring.']]),
    comprehension('meal','作った料理はどうしますか。','reading-medium','作った料理は教室で食べます。家に持って帰ることはできません。',[
      ['教室で食べます。','The food is eaten in the classroom, and taking it home is explicitly disallowed.'],['家に持って帰ります。','The notice explicitly says the food cannot be taken home.'],['一階の受付で売ります。','Reception is the arrival point; no sale of the food is mentioned.'],['日曜日まで教室に置きます。','The notice says to eat the food in class, not keep it until Sunday.']]),
  ]);

reading('n4','cycling-town','自転車で知った町','article','transport',
  '引っ越したばかりのころ、私は毎日駅までバスに乗っていました。町の道がよく分からなかったからです。先月、自転車を買って、休みの日に町を走ってみました。すると、小さい公園や安い野菜の店が見つかりました。今は晴れた日には自転車で駅へ行きます。雨の日は道が滑りやすいので、前と同じようにバスに乗ります。',
  'Just after I moved here, I took the bus to the station every day because I did not know the town’s roads well. Last month I bought a bicycle and tried riding around town on a day off. I discovered small parks and a shop with inexpensive vegetables. Now I cycle to the station on sunny days. On rainy days the roads are slippery, so I take the bus as before.',[
    comprehension('discovery','自転車で町を走って、この人は何を見つけましたか。','reading-medium','小さい公園や安い野菜の店が見つかりました。',[
      ['小さい公園や野菜の店','The person found small parks and a shop selling inexpensive vegetables.'],['新しいバスの停留所だけ','The discovered places were parks and a vegetable shop, not only a bus stop.'],['自転車を売る工場','The person bought a bicycle before exploring; no bicycle factory was discovered.'],['駅の中の大きい店','The passage says small parks and a vegetable shop around town, not a large station shop.']]),
    comprehension('rain','雨の日、この人がバスに乗るのはどうしてですか。','reading-medium','雨の日は道が滑りやすいので、前と同じようにバスに乗ります。',[
      ['道が滑りやすいから','The stated reason for taking the bus on rainy days is the slippery road.'],['まだ町の道が全然分からないから','Not knowing the roads was the initial reason, before the bicycle exploration.'],['自転車が壊れたから','No broken bicycle is mentioned.'],['野菜の店が休みだから','The shop’s opening days are not given and do not explain the rainy-day bus choice.']]),
  ]);

reading('n4','gym-visit','体育館の見学','advertisement','community',
  '新しい市民体育館を見学しませんか\n見学は来週の火曜日と土曜日です。火曜日は午後六時から、土曜日は午前十時からです。どちらも一時間ぐらいで、参加は無料です。見学したい日の前の日の午後五時までに、電話で申し込んでください。体育館の中を歩くので、歩きやすい靴をはいてきてください。運動はしませんから、運動の服に着替える必要はありません。',
  'Would you like to tour the new public gym? Tours are next Tuesday and Saturday, at six in the evening on Tuesday and ten in the morning on Saturday. Each lasts about an hour and is free. Register by telephone no later than five in the afternoon on the day before your desired tour. Wear shoes that are easy to walk in, as we will walk around the gym. We will not exercise, so you do not need to change into sports clothes.',[
    comprehension('saturday-deadline','土曜日の見学に参加したい人は、いつまでに申し込みますか。','reading-information','見学したい日の前の日の午後五時までに、電話で申し込んでください。',[
      ['金曜日の午後五時まで','For a Saturday tour, the previous-day deadline is Friday at five in the afternoon.'],['火曜日の午後六時まで','Tuesday at six is the other tour’s starting time.'],['土曜日の午前十時まで','Saturday at ten is the tour start and is later than the previous-day registration deadline.'],['日曜日の午後五時まで','Sunday is after the Saturday tour and cannot satisfy the previous-day deadline.']]),
    comprehension('clothes','参加する人は、何に気をつけますか。','reading-medium','歩きやすい靴をはいてきてください。',[
      ['歩きやすい靴をはくこと','The advertisement explicitly requests shoes suitable for walking.'],['必ず運動の服に着替えること','The advertisement says changing into sports clothes is unnecessary.'],['千円を持ってくること','Participation is free, so no 1,000-yen fee is required.'],['必ず二時間運動すること','The tour lasts about an hour and includes no exercise session.']]),
  ]);

listening('n5','notebook-choice','ノートを買う','shopping',
  '店員：いらっしゃいませ。\n客：小さい青いノートはありますか。\n店員：青いノートは大きいのだけです。小さいノートは白いのと赤いのがあります。\n客：では、小さい白いノートをください。いくらですか。\n店員：百二十円です。\n客：はい。これを一冊買います。',
  'Clerk: Welcome. Customer: Do you have a small blue notebook? Clerk: The blue notebooks are only large. We have small white and red notebooks. Customer: Then please give me a small white notebook. How much is it? Clerk: 120 yen. Customer: Okay, I will buy one.',[
    comprehension('choice','客はどのノートを買いますか。','listening-task','小さい白いノートをください。',[
      ['小さい白いノート','The customer’s final choice is the small white notebook.'],['小さい青いノート','The customer first asks for this, but the shop does not have one.'],['大きい青いノート','Large blue notebooks are available, but the customer chooses a small white one.'],['小さい赤いノート','Red is available in the small size, but the customer selects white.']]),
    comprehension('price','買うノートはいくらですか。','listening-points','百二十円です。',[
      ['百二十円','The clerk gives the notebook price as 120 yen.'],['百円','The clerk does not give a 100-yen price.'],['二百円','200 yen is not stated.'],['三百円','300 yen is not stated.']]),
  ]);

listening('n5','cafe-order','喫茶店で注文する','food',
  '店員：何にしますか。\n客：パンを一つと、温かい紅茶をください。\n店員：紅茶に牛乳を入れますか。\n客：いいえ。牛乳はいりません。\n店員：ここで食べますか。\n客：はい。あの窓のそばの椅子に座ります。',
  'Clerk: What would you like? Customer: One bread item and warm black tea, please. Clerk: Would you like milk in the tea? Customer: No, I do not need milk. Clerk: Will you eat here? Customer: Yes. I will sit on the chair by that window.',[
    comprehension('drink','客は何を飲みますか。','listening-points','温かい紅茶をください。',[
      ['温かい紅茶','The customer orders warm black tea.'],['冷たい紅茶','The tea is requested warm, not cold.'],['牛乳','The customer explicitly says milk is unnecessary.'],['コーヒー','No coffee is ordered.']]),
    comprehension('eat-place','客はどこでパンを食べますか。','listening-task','ここで食べますか。\n客：はい。あの窓のそばの椅子に座ります。',[
      ['店の窓のそば','The customer agrees to eat at the café and chooses the chair by the window.'],['家','The customer agrees to eat here, so is not taking the bread home.'],['駅の前','The station is not mentioned as an eating place.'],['店の外','The customer chooses a chair by the café’s window, not outside.']]),
  ]);

listening('n5','meeting-rain','雨の日に会う','people',
  'ケン：ミナさん、明日は駅の前で会いますか。\nミナ：明日は雨ですよ。駅の中で会いましょう。\nケン：そうですね。東の入口はどうですか。\nミナ：東の入口は人が多いです。西の入口がいいです。\nケン：分かりました。西の入口で十一時に会いましょう。\nミナ：はい、十一時ですね。',
  'Ken: Mina, shall we meet in front of the station tomorrow? Mina: It will rain tomorrow. Let us meet inside the station. Ken: Good idea. How about the east entrance? Mina: The east entrance is crowded. The west entrance is better. Ken: Understood. Let us meet at the west entrance at eleven. Mina: Yes, eleven.',[
    comprehension('entrance','二人は駅のどこで会いますか。','listening-task','西の入口で十一時に会いましょう。',[
      ['西の入口','Ken and Mina settle on the west entrance.'],['東の入口','Ken suggests east, but Mina rejects it because there are many people.'],['駅の前','Their initial outdoor suggestion is changed because of rain.'],['駅の南の公園','No park south of the station is proposed.']]),
    comprehension('time','二人は何時に会いますか。','listening-points','はい、十一時ですね。',[
      ['十一時','Mina confirms the agreed eleven o’clock meeting time.'],['九時','Nine is not a time mentioned in the agreement.'],['十時','The agreed time is eleven, not ten.'],['十二時','Twelve is an hour later than the confirmed time.']]),
  ]);

listening('n5','shopping-help','夕食の買い物','home',
  '母：リオ、店へ行きますか。\nリオ：はい。お菓子を買います。\n母：では、夕食の魚も買ってください。野菜は冷蔵庫にあります。\nリオ：魚ですね。牛乳も買いますか。\n母：牛乳はあります。魚だけお願いします。\nリオ：分かりました。家に帰ります。それから、お皿を机に置きますね。',
  'Mother: Rio, are you going to the shop? Rio: Yes, I will buy snacks. Mother: Then please buy fish for dinner too. There are vegetables in the refrigerator. Rio: Fish, right. Should I buy milk too? Mother: We have milk. Just the fish, please. Rio: Understood. When I get back, I will put the plates on the table.',[
    comprehension('request','母がリオさんに買ってほしい物は何ですか。','listening-task','魚だけお願いします。',[
      ['魚','The mother’s shopping request is fish for dinner, repeated as fish only.'],['野菜','The mother says vegetables are already in the refrigerator.'],['牛乳','The mother says milk is already available.'],['お皿','Rio plans to put plates on the table, not buy them.']]),
    comprehension('after-return','リオさんは家に帰ります。それから何をしますか。','listening-task','家に帰ります。それから、お皿を机に置きますね。',[
      ['お皿を机に置きます。','Rio says that after returning, he will place the plates on the table.'],['牛乳を買いに行きます。','Milk does not need to be purchased.'],['魚を冷蔵庫から出します。','Rio is buying the fish; he does not say he will take it from the refrigerator.'],['野菜を店に持っていきます。','Vegetables remain in the refrigerator; no return to the shop with them is planned.']]),
  ]);

listening('n5','classroom-message','明日の授業','education',
  '先生：明日の授業は二階の教室です。九時に始まります。\n学生：いつもの本を持ってきますか。\n先生：明日は本を使いません。ノートと鉛筆を持ってきてください。\n学生：分かりました。辞書はいりますか。\n先生：辞書は教室にありますから、いりません。',
  'Teacher: Tomorrow’s class is in the classroom on the second floor. It starts at nine. Student: Should we bring the usual book? Teacher: We will not use the book tomorrow. Bring a notebook and pencil. Student: Understood. Do we need a dictionary? Teacher: There are dictionaries in the classroom, so you do not have to bring one.',[
    comprehension('items','学生は何を持ってきますか。','listening-task','ノートと鉛筆を持ってきてください。',[
      ['ノートと鉛筆','The teacher asks students to bring a notebook and pencil.'],['いつもの本と辞書','The usual book will not be used, and dictionaries are provided.'],['本とノート','The teacher says no book is needed and asks for a pencil as well as a notebook.'],['辞書と鉛筆','The pencil is needed, but the dictionary is provided; the notebook must also be brought.']]),
    comprehension('floor','明日の授業はどこですか。','listening-points','明日の授業は二階の教室です。',[
      ['二階の教室','The teacher explicitly identifies the second-floor classroom.'],['一階の教室','The stated classroom is on the second floor, not the first.'],['図書館','The dialogue mentions classroom dictionaries, not a class in the library.'],['駅の前','The station is not mentioned as the class location.']]),
  ]);

listening('n5','bus-to-park','公園へ行くバス','transport',
  '旅行者：すみません。公園へ行くバスは何時ですか。\n係の人：次は十時半です。三番のバスに乗ってください。\n旅行者：一番のバスではありませんか。\n係の人：一番は病院へ行きます。公園は三番です。\n旅行者：切符はいくらですか。\n係の人：二百円です。',
  'Traveler: Excuse me, what time is the bus to the park? Staff: The next one is at ten thirty. Take the number three bus. Traveler: Is it not the number one bus? Staff: Number one goes to the hospital. The park is number three. Traveler: How much is the ticket? Staff: 200 yen.',[
    comprehension('bus','旅行者は何番のバスに乗りますか。','listening-task','公園は三番です。',[
      ['三番','The staff member repeats that bus number three goes to the park.'],['一番','Number one goes to the hospital, not the park.'],['二番','No number-two bus is identified as going to the park.'],['十番','Ten is part of the departure time, not the route number.']]),
    comprehension('departure','次の公園へ行くバスは何時ですか。','listening-points','次は十時半です。',[
      ['十時半','The next bus is explicitly at ten thirty.'],['十時','The stated departure includes 半: half past ten.'],['十一時','Eleven is not the departure given by staff.'],['十二時半','Twelve thirty is two hours later than the stated departure.']]),
  ]);

listening('n4','work-meeting','打ち合わせの前に','work',
  '田中：佐藤さん、明日の打ち合わせは十時でしたね。\n佐藤：山田さんが十時には来られないので、十一時に変わりました。\n田中：分かりました。資料は私がコピーしましょうか。\n佐藤：コピー機が壊れているんです。資料はメールで送ってください。\n田中：では、今日の午後、皆さんに送ります。\n佐藤：お願いします。部屋の準備は私がしておきます。',
  'Tanaka: Sato, tomorrow’s meeting was at ten, right? Sato: Yamada cannot come at ten, so it has changed to eleven. Tanaka: Understood. Shall I copy the materials? Sato: The copier is broken. Please email the materials. Tanaka: Then I will send them to everyone this afternoon. Sato: Thank you. I will prepare the room in advance.',[
    comprehension('time','明日の打ち合わせは何時からですか。','listening-points','十一時に変わりました。',[
      ['十一時','The meeting time has changed to eleven.'],['十時','Ten was the earlier time, changed because Yamada cannot attend then.'],['今日の午後','This afternoon is when Tanaka will email the materials; the meeting is tomorrow.'],['十二時','No noon start is proposed.']]),
    comprehension('tanaka-task','田中さんは今日の午後、何をしますか。','listening-task','資料はメールで送ってください。\n田中：では、今日の午後、皆さんに送ります。',[
      ['資料をメールで送ります。','Tanaka agrees to email the materials to everyone this afternoon.'],['資料をコピーします。','Copying is replaced by email because the copier is broken.'],['部屋を準備します。','Sato, not Tanaka, will prepare the room.'],['コピー機を買います。','The copier is broken, but nobody asks Tanaka to buy a new one.']]),
  ]);

listening('n4','clinic-appointment','病院の予約','health',
  '受付：はい、青木病院です。\n患者：来週の月曜日に予約したいんですが、午前中は空いていますか。\n受付：月曜日の午前は休みです。午後二時なら予約できます。火曜日は午前十時が空いています。\n患者：火曜日は仕事があるので、月曜日の二時をお願いします。\n受付：分かりました。初めての方は、予約の十五分前に来てください。\n患者：初めてですから、一時四十五分に行きます。',
  'Reception: Aoki Hospital. Patient: I would like an appointment next Monday. Is the morning available? Reception: We are closed Monday morning. You can book two in the afternoon. Tuesday at ten in the morning is available. Patient: I work on Tuesday, so please book Monday at two. Reception: Understood. First-time patients should come fifteen minutes before their appointment. Patient: It is my first visit, so I will come at 1:45.',[
    comprehension('appointment','患者はいつの予約をしましたか。','listening-points','月曜日の二時をお願いします。',[
      ['月曜日の午後二時','The patient books Monday at two in the afternoon.'],['月曜日の午前十時','Monday morning is closed, and ten is offered for Tuesday.'],['火曜日の午前十時','Tuesday ten is available, but the patient cannot attend because of work.'],['月曜日の午後一時四十五分','1:45 is the early arrival time, not the appointment time.']]),
    comprehension('arrival','患者は何時に病院へ行きますか。','listening-task','一時四十五分に行きます。',[
      ['午後一時四十五分','The patient explicitly confirms arrival at 1:45 as a first-time visitor.'],['午後二時','Two is the appointment time; this patient must arrive fifteen minutes earlier.'],['午後二時十五分','2:15 would be after the appointment, while the instruction is to come early.'],['午前十時','Ten is the unselected Tuesday appointment option.']]),
  ]);

listening('n4','found-wallet','財布を受け取る','services',
  '警察の人：中村さんですか。財布が見つかりました。駅の近くの交番で預かっています。\n中村：ありがとうございます。今から駅の中へ行けばいいですか。\n警察の人：いいえ。駅を出て、右にある交番へ来てください。名前と住所が分かる物も持ってきてください。\n中村：はい。五時ごろ行けます。\n警察の人：担当の人は六時までいますから、その前にお願いします。',
  'Police officer: Is this Nakamura? Your wallet has been found. It is being held at the police box near the station. Nakamura: Thank you. Should I go inside the station now? Officer: No. Exit the station and come to the police box on the right. Also bring something showing your name and address. Nakamura: Yes. I can come around five. Officer: The person in charge is there until six, so please come before then.',[
    comprehension('place','中村さんは財布を受け取りにどこへ行きますか。','listening-task','駅を出て、右にある交番へ来てください。',[
      ['駅の外の右にある交番','The officer directs Nakamura outside the station to the police box on the right.'],['駅の中の受付','The officer explicitly corrects the suggestion to go inside the station.'],['駅を出て左の店','The required place is the police box on the right, not a shop on the left.'],['中村さんの家','Nakamura must go to the police box; the wallet is not being delivered home.']]),
    comprehension('bring','中村さんは何を持っていきますか。','listening-task','名前と住所が分かる物も持ってきてください。',[
      ['名前と住所が分かる物','The officer requests an item showing Nakamura’s name and address.'],['駅の切符だけ','A station ticket alone is not the requested proof of name and address.'],['財布を入れる新しい箱','No new box is requested.'],['交番の鍵','Nakamura is not asked to bring a key to the police box.']]),
  ]);

listening('n4','library-extension','借りた本をもう一週間','education',
  '利用者：この本をもう一週間借りたいんですが。\n図書館の人：ほかの人の予約がなければ、借りる期間を長くできます。本の番号を調べますね。\n利用者：お願いします。\n図書館の人：この本には予約がありますから、今回は延ばせません。金曜日までに返してください。\n利用者：金曜日は仕事で来られません。木曜日の夜、入口の箱に入れてもいいですか。\n図書館の人：はい。本なら箱に返せます。',
  'Library user: I would like to borrow this book for another week. Librarian: If nobody else has reserved it, we can extend the loan period. I will check the book number. User: Please do. Librarian: This book has a reservation, so we cannot extend it this time. Please return it by Friday. User: I cannot come on Friday because of work. May I put it in the entrance box on Thursday night? Librarian: Yes. Books can be returned to the box.',[
    comprehension('reason','この本をもう一週間借りられないのはどうしてですか。','listening-points','この本には予約がありますから、今回は延ばせません。',[
      ['ほかの人の予約があるから','The checked book has a reservation from another person, so the loan cannot be extended.'],['本の番号がないから','The librarian checks the number successfully; no missing number is reported.'],['利用者が金曜日に仕事をするから','The work schedule affects when the user returns the book, not whether the loan can be extended.'],['図書館が一週間休みだから','No week-long closure is mentioned.']]),
    comprehension('return','利用者は本をどう返しますか。','listening-task','木曜日の夜、入口の箱に入れてもいいですか。\n図書館の人：はい。',[
      ['木曜日の夜、入口の箱に入れます。','The user proposes Thursday night’s box return, and the librarian approves it.'],['金曜日の夜、家の箱に入れます。','The user cannot come Friday and the return box is at the library entrance, not at home.'],['来週の金曜日に受付で返します。','The extension is refused, so waiting until next Friday is not permitted.'],['木曜日の朝、ほかの人の家に送ります。','The user plans an entrance-box return at night, not a home delivery in the morning.']]),
  ]);

listening('n4','rainy-picnic','土曜日の集まり','people',
  'アヤ：土曜日の公園の集まり、雨でも行いますか。\nユウ：天気予報では雨だそうです。公園ではなく、私の家で集まることにしました。\nアヤ：では、私が作る弁当はどうしましょう。\nユウ：予定どおり持ってきてください。皆で昼ご飯にしましょう。飲み物は私が用意します。\nアヤ：分かりました。十一時に行きます。\nユウ：お願いします。食べた後は家でゲームをしましょう。',
  'Aya: Will Saturday’s park gathering happen even if it rains? Yu: The forecast says rain. We have decided to gather at my house instead of the park. Aya: What should I do about the packed meals I am making? Yu: Bring them as planned. Let us have lunch together. I will prepare the drinks. Aya: Understood. I will come at eleven. Yu: Thank you. After eating, let us play games at home.',[
    comprehension('plan','土曜日、二人はどうしますか。','listening-outline','私の家で集まることにしました。',[
      ['ユウさんの家で集まります。','Yu says the gathering has been moved to Yu’s home.'],['雨の公園で集まります。','The park plan is changed because rain is forecast.'],['集まりを来週に変えます。','The place changes, but no change from Saturday to next week is made.'],['アヤさんの家で集まります。','The speaker offering the home is Yu, not Aya.']]),
    comprehension('aya-bring','アヤさんは何を持っていきますか。','listening-task','私が作る弁当はどうしましょう。\nユウ：予定どおり持ってきてください。',[
      ['作る予定の弁当','Yu asks Aya to bring the packed meals as originally planned.'],['皆の飲み物','Yu says Yu will prepare the drinks.'],['公園で使う椅子','They meet indoors, and no request to bring park chairs is made.'],['新しいゲーム','Games are an after-lunch activity, but Aya is not asked to bring a new one.']]),
  ]);

listening('n4','paper-recycling','古い紙を出す日','home',
  '住民：すみません。古い紙を捨てたいんですが、水曜日でいいですか。\n管理人：水曜日は缶と瓶の日です。紙は金曜日の朝八時までに出してください。\n住民：どこに置けばいいですか。\n管理人：入口の右の屋根がある所です。雨でぬれないようにしてください。紙はひもでまとめてから置いてください。\n住民：袋に入れますか。\n管理人：袋はいりません。紙だけをまとめてください。',
  'Resident: Excuse me, I would like to discard old paper. Is Wednesday right? Building manager: Wednesday is for cans and bottles. Put paper out by eight on Friday morning. Resident: Where should I put it? Manager: In the covered place to the right of the entrance. Keep it from getting wet in the rain. Tie the paper together before putting it there. Resident: Should I put it in a bag? Manager: You do not need a bag. Just bundle the paper together.',[
    comprehension('day','住民はいつまでに古い紙を出しますか。','listening-points','紙は金曜日の朝八時までに出してください。',[
      ['金曜日の朝八時まで','The manager gives a Friday morning eight o’clock deadline for paper.'],['水曜日の朝八時まで','Wednesday is for cans and bottles, not paper.'],['金曜日の午後八時まで','The manager says 朝八時, eight in the morning, not at night.'],['土曜日の朝八時まで','Saturday is a day after the stated paper collection deadline.']]),
    comprehension('prepare','紙を出す前に、住民は何をしますか。','listening-task','ひもでまとめてから置いてください。',[
      ['ひもでまとめます。','The manager asks the resident to bundle the paper with string before placing it out.'],['缶や瓶と一緒に袋に入れます。','Cans and bottles have a different collection day; the manager says a bag is unnecessary.'],['雨で紙をぬらします。','The covered location is intended to prevent the paper from getting wet.'],['入口の左で紙を燃やします。','The designated place is on the right, and burning paper is not requested.']]),
  ]);
