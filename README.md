# Kotoba — little lessons, big progress

An original Japanese study app with integrated learning paths across N5–N1. Its Duolingo-inspired interface uses a learning path, raised buttons, rounded cards and Momo, an original tanuki companion. Choose light or dark mode and arrange the home screen around your study habits. Plain HTML, CSS and JavaScript: **no npm, installation, account, API key or build step is required to use the app.**

## Open locally

**Double-click index.html.** Keep it beside the web/ folder. Direct-file launch is supported in Chrome.

For an optional localhost server, double-click run.cmd on Windows, or use an existing Node.js 24+ installation:

~~~sh
cd jlpt-n3
node tools/serve.mjs
~~~

Open **http://127.0.0.1:5173**. Stop with Ctrl+C. The tools use only built-in modules and download nothing.

Progress belongs to a browser profile and address. Export a backup in Settings before moving from a local file or localhost to GitHub Pages, or between browsers. Import it at the new address. The save indicator reports whether browser storage succeeded.

## Deploy to GitHub Pages

Use GitHub's free github.io address. GitHub Pages supports public repositories on GitHub Free; creating and publishing the repository requires a GitHub account. A custom domain, credit card, paid asset, subscription or external service is unnecessary. Treat the repository and every published asset as public. This is a static app with no backend or runtime package download. See [GitHub Pages availability and site types](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

1. Create a GitHub repository and upload **the contents of jlpt-n3/ into the repository root**. Include the hidden .github/ folder. index.html, web/, tools/, src/, scripts/ and .github/ must be siblings in the repository.
2. Open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**.
3. Push to main or master, or open **Actions → Publish Kotoba to GitHub Pages → Run workflow** and select one of those branches. Pull requests and manual runs on other branches validate without publishing.
4. After deployment finishes, open the URL shown by the github-pages deployment or Settings → Pages.

The [Pages workflow](.github/workflows/pages.yml) regenerates browser assets, checks content and learner behavior, and packages only index.html, 404.html, sw.js, web/ and .nojekyll into _site/. It uses Node 24 without npm. Only trusted main/master push or manual runs upload and deploy. Write permissions are restricted to the deployment job; pull requests receive no publishing credentials. Enable Pages and permit GitHub Actions in the repository; see [GitHub's custom workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). The current [checkout](https://github.com/actions/checkout/blob/main/README.md) and [setup-node](https://github.com/actions/setup-node/blob/main/README.md) actions are v7; package-manager caching is disabled because this build installs no packages.

Relative assets and hash navigation work beneath the actual repository path. The packager reads GITHUB_REPOSITORY: an owner.github.io repository uses /, and a project repository uses /repository-name/. The generated 404 page returns to that base. Local packaging without the variable uses a relative home link. No placeholder domain, canonical URL or sitemap is published.

If the app stays inside a larger repository, GitHub discovers workflows only in that repository's root .github/workflows/. Move the workflow there, set the build job's defaults.run.working-directory to jlpt-n3, and change the upload artifact path to jlpt-n3/_site. The upload action's path is relative to the repository root.

To prepare the public artifact locally:

~~~sh
node tools/build-browser.mjs
node tools/build-offline.mjs
node tools/package-site.mjs
~~~

_site/ is generated and ignored by git. Copy its contents to any static host. Opening the app locally still requires neither Node nor a build.

To update the public site, change the source, run contributor checks and push to the production branch. To restore a previous version, revert the source changes on main/master and push; the workflow publishes that revision. Alternatively, manually run it on the corrected production branch. Keep learner backups before moving to a different origin or repository URL. No publication has been performed from this workspace.

## Learning paths, levels and references

Use **Study level** to choose N5, N4, N3, N2 or N1 when browsing and practising. Filters sit above study content, and the sidebar's level card follows your selection. All five levels have integrated paths combining vocabulary, kanji, grammar, reading, listening and retrieval. N5/N4 build everyday foundations; N3 connects practical situations; N2/N1 develop advanced vocabulary, arguments, viewpoints and dialogue tasks. These are authored teaching groups, not an exhaustive JLPT syllabus. Completing them does not certify textbook coverage or predict passing.

| Content across N5–N1 | Included |
| --- | ---: |
| Vocabulary with readings, examples and translations | 1,089 |
| Kanji linked to vocabulary words | 904 |
| Guided grammar lessons | 252 |
| Original reading passages | 72 |
| Original listening scripts | 120 |
| Questions with four choices and per-choice explanations | 2,776 |

Version **2026.10.5** adds **452 words, 240 linked kanji identities, 50 grammar lessons, 20 readings, 30 listening activities and 1,075 questions** across all five levels, including evidence-backed comprehension and dedicated N2/N1 quick-response listening. The totals above were measured from the integrated source exports. The per-level inventory and authoring scope are recorded in [docs/dataset-expansion.md](docs/dataset-expansion.md). Existing vocabulary and grammar keep their identities and level assignments.

The learning paths use manageable daily portions: at most **seven new words and two grammar patterns per lesson**, then cumulative review after each group of six study lessons. N5/N4 retain their basic-form sequence, and N3–N1 follow prerequisite grammar families. Unit counts follow actual available material rather than a fixed set of topic tags. Daily context sentences literally use that lesson's selected word and grammar examples. Longer readings/dialogues add skill practice; they do not claim to contain every daily target. Cumulative and mixed retrieval connect new study with earlier material and weak answers.

N3–N1 append separately identified **Extra study** units. Every established lesson keeps its saved ID, teaching targets, contexts and question checks. Its original revision remains available as **Earlier library revision and mock**, followed by the extra units and a separate full-library revision. Old completion marks therefore keep their original meaning; they do not complete new lessons. N5/N4 now have integrated paths over their complete level libraries.

**Nihongo So-matome supplies the pacing reference; Shin Kanzen Master supplies supplementary topic/skill structure; TRY! supplies references for grammar in context.** [REFERENCES.md](REFERENCES.md) and [src/content/reference-map.ts](src/content/reference-map.ts) record **65 skill references for 43 books identified by ISBN across N5–N1**, including publisher metadata, separate app objectives and representative content IDs. Combined volumes appear under their supported skills; the skill records do not represent 65 separate books. No Shin Kanzen Master N5 volume was identified in the checked public catalogue, and TRY! is mapped as an integrated grammar/vocabulary/reading/listening volume without a dedicated kanji-book claim.

Grammar lessons show publisher links for the selected lesson's own level, including when browsing all levels. Open **Edition, topic links and gaps** to distinguish a representative topic link from a general level reference and inspect the remaining gaps. These links describe compatible topics and teaching approaches; exact construction, chapter/page alignment and complete book coverage remain unverified.

Open **Settings → Library and sources** for live counts by level and the source guide: **43 publisher books deduplicated by ISBN plus five primary institutional resources**. Each source separates inspected metadata/topics, the app's original application and remaining limits. Japan Foundation *Irodori* Starter and Elementary 1 contribute everyday communication contexts; their A1/A2 labels have no official JLPT N5/N4 crosswalk.

Current expanded/revised Sou-matome volume pages advertise eight weeks, two pages a day and Day 7 review; the general series overview still says six weeks. Kotoba adapts the small-study/review rhythm into its own variable-length route. Exact chapters, textbook days and page mappings remain unavailable. Publisher-linked N3 sample images returned HTTP 403 during verification, so unseen sample headings were not inferred. The full commercial books were not accessed, and all app examples and questions are original.

Remaining gaps are recorded in the map and shown in the path's reference disclosure:

- Publisher catalogue topics are verified; exact chapter/day/page alignment and full-volume coverage remain unverified.
- The expanded N5–N1 libraries remain selected original teaching groups; complete vocabulary, grammar and textbook scope is unverified.
- Device speech supplies no publisher/official human recordings. N3 picture-based verbal expressions are adapted into written situations. Dedicated N2/N1 quick-response drills are original; expert linguistic review and human audio validation remain outstanding.
- Original mocks balance the available formats. They do not reproduce a historical per-format blueprint, an official scaled score or a pass predictor.

The former fixed six-week plan remains only as legacy data for validating older saves. The current learning path uses variable units. Topics are browsing tags: daily life, people, home, shopping, food, travel, transport, work, education, health, nature, technology, community, culture, feelings, communication, time and services.

### Your home screen

The default home screen shows **Learning path, Daily goal and Mistake review**. Open **Customize home** to show or hide widgets, then choose **Rearrange cards** for compact cards you can drag by their headings or **Move** controls. Press **Done** to return to full lessons. Additional choices are optional Goals and rewards, Skill balance, Study habit, Recent activity, Skill library, Topic explorer, Book approaches and Foundation review. Cards can also be moved directly on the normal home screen, and the editor's order list supports dragging or up/down buttons. A preview of the widget's actual rendered content follows the pointer while neighboring widgets shift into their previewed positions. Widgets use their content's natural height; long drag previews are capped to fit the viewport and marked as content previews. The order is saved when you release. Mouse and touch are supported; focused Move controls also support Arrow Up/Down and Home/End. Escape cancels an active drag and restores its original order, or exits rearranging. **Restore default widgets** returns to the initial layout.

The floating editor closes with its close button, Escape, or an outside click. It scrolls within the mobile viewport and leaves the dashboard in place. Press the Kotoba logo for a brief Momo wave while returning home. Both effects respect reduced-motion preferences.

Widget choices and order are saved with progress and exported backups. All widgets may be hidden; the customization control stays available. A resumable-session card still appears when there is an active session. Progress charts describe actual activity and assessed answers; task marks do not imply exam mastery.

### Study controls and flashcards

Vocabulary and kanji support topic filters, search, bookmarks and 24-card pages. **Completed words and kanji move after unfinished items across the full filtered list, before pagination.** Clearing a completion mark restores the item's original position among unfinished items. Bookmarks show a filled gold icon and **Saved** label. **Completion** offers **All items, Unfinished and Completed** in vocabulary, kanji, Bookmarks, grammar, reading, listening and flashcards, together with the other browsing filters. Grammar supports family filters and pattern/meaning search; reading/listening have topic filters. Practice can target a level, skill, topic or question format.

Custom dropdowns show a chosen-item checkmark and support arrow keys, Home/End, typeahead, Enter/Space, Escape, Tab, outside dismissal and touch. Native selects provide the fallback when enhancement is unavailable.

Open **Vocabulary & kanji → Flashcards**, or **Cards** in the mobile bar. Word backs show reading, meaning, word class, example and translation; kanji backs show meanings through linked words. **Study level, Deck, Everyday topic and Completion** stay visible above the cards. **More options** contains bookmarked-word and furigana preferences. Click or tap the card, or press Space or Enter while it has focus, to flip. Arrow keys move between cards. Scrolling or selecting an answer does not flip it, and filters retain normal keyboard behavior.

**Got it** records a saved completion mark; **Again** clears it. Ratings and deck order belong to the current tab's flashcard session. Revealing/rating a card records a study action once per item per local day, without affecting assessed accuracy or review mastery.

Study items and integrated path lessons have compact **Complete** checkboxes near their headings. Word headers fit the available space and keep **Save** and **Complete** together when space allows. Flashcards show completed status in the card header. Marks survive reload/backups and can be cleared. Flashcards use the same Japanese word or character font size and line height on both faces, with furigana optional. Both faces reserve the answer's natural height so card dimensions and page position stay stable when flipping. Long answers expand the card and remain reachable through normal page scrolling, without an internal answer scrollbar. The hidden face stays outside keyboard navigation and the accessibility tree. Vocabulary cards reserve space for definitions and examples.

In **Learn**, **Study word** opens that word's vocabulary card with its definition revealed. **Kanji connections** opens the matching character and linked words. These shortcuts clear stale browsing filters, reach the correct page, preserve existing completion marks and record a study action once per item per local day.

**Mark studied** records daily learning activity. **Complete** is your saved checklist mark. **Spaced-review mastery** follows assessed due retries; it requires three consecutive successful due reviews. Recording study or ticking a checklist does not advance that review schedule or imply exam mastery.

Grammar, reading and listening lists match the selected detail's height on desktop and scroll independently when long; mobile lists are bounded to 45dvh. Navigation is **Learn, Cards, Practice, Listen, Menu** on mobile. Menu opens all nine screens. Short transitions and feedback effects respect reduced-motion settings.

Use the header's moon/sun button or **Settings → Appearance** for saved light/dark mode. The theme covers all screens and dialogs without changing active answers or review schedules.

## Study and assessment

Learning is untimed, with explanations after a checked answer. Reading translations and evidence unlock after submission. Checked answers stay locked. Question and option order shuffle once per saved session and survive reload.

Practice's **Number of questions** accepts a whole number from 1 to 100, limited by the available pool after filtering. The available count updates with filters; invalid counts prevent starting.

**Prioritize weak points** is on by default. Selection uses submitted assessed answers: due unmastered reviews first, then recent misses and weaker words, patterns, formats and skills. Sessions keep some unseen material; learners without assessment history receive a balanced mix. Filters still apply. Unscored script study, excluded audio and unfinished attempts are not weakness evidence. Selection does not change review due dates.

Hover, focus, click or tap a dotted-underlined word in a reading lesson or integrated Learn reading to see its dictionary reading and definition. The fixed popup leaves the passage layout unchanged. Practice supplies the same help for background words while protecting tested words, answer choices and evidence before checking, including evidence for unanswered questions sharing the passage. Escape or outside interaction dismisses the popup. Mock tests have no definition controls. Looking up a word does not choose an answer or change progress.

### Full mocks

Mocks are original N5–N1 practice. N5/N4/N3 use three timed sections; N2/N1 combine language knowledge and reading into one section, then listening. Times follow the [official testing blocks](https://www.jlpt.jp/e/guideline/testsections.html). Counts are authored practice targets, not counts attributed to a historical exam.

| Level | Timed sections: questions and minutes | Total questions |
| --- | --- | ---: |
| N5 | Vocabulary 35 / 20 min; grammar/reading 32 / 40 min; listening 24 / 30 min | 91 |
| N4 | Vocabulary 35 / 25 min; grammar/reading 35 / 55 min; listening 28 / 35 min | 98 |
| N3 | Vocabulary 35 / 30 min; grammar/reading 39 / 70 min; listening 28 / 40 min | 102 |
| N2 | Language knowledge/reading 75 / 105 min; listening 32 / 50 min | 107 |
| N1 | Language knowledge/reading 71 / 110 min; listening 30 / 55 min | 101 |

Submitting a section or reaching its deadline locks it. Start the next section explicitly; breaks have no countdown. Active deadlines continue through navigation, background tabs and reload; reopening after expiry submits once. Explanations and translations unlock after every section is submitted. Study pages and past-answer reviews stay closed while a mock is active. Earlier saved mini mocks remain resumable and viewable.

The [JLPT FAQ](https://www.jlpt.jp/e/faq/) explains why there is no complete published archive of every previous exam. The [2012 and 2018 official workbooks](https://www.jlpt.jp/e/samples/sampleindex.html) contain selected previously used questions, scripts and audio. The app links to these releases and supplies original practice, without copying unreleased or commercial papers.

Unanswered assessed questions count as incorrect and appear separately. Results show raw accuracy and skill breakdowns without official scaled scores or a pass predictor. A question's first assessed submission counts toward initial accuracy; later submissions count toward repeat performance. Script study and technically excluded audio enter neither accuracy bucket. Viewing historical results does not change performance.

Listening starts through Play, waits for Japanese voice discovery and supports replay/stop. If playback fails, use **Study the script instead**. Reading the script makes its questions unscored for that browser tab, including after hiding it or reloading. Technical failures allow retry or exclusion without lowering accuracy. Browser voices vary by device; no recordings are supplied. N3 verbal-expression items adapt picture-based tasks into written situations.

Browser speech offers **Natural, Anime-inspired · Bright, Calm and Deep** styles plus a **Japanese voice** selector. Styles adjust pitch and pace using the browser's Japanese voices; the result depends on the available voice and device. Voice and style preferences are saved across reloads and travel in exported/imported backups. If a saved voice is unavailable, playback uses an automatic Japanese voice while retaining the preference. Full mocks use natural, neutral speech. Supplied audio files play as provided; speech preferences affect synthesized browser speech.

### Sound, keyboard and accessibility

Short local Web Audio cues accompany answers, completion, saving, opening customization, arranging cards, successful moves and the mascot wave. Soft pitch glides and short melodies give each action its own sound. Playback begins after an explicit user action, never on page load, and pauses for listening audio. Sounds default to enabled; **Settings → Sound effects** saves mute, stops current cues when muted and includes **Preview sounds**. Unsupported or blocked audio leaves written feedback available. Tones require no recordings, downloads or external service.

The interface provides keyboard controls, visible focus, labeled inputs, a skip link, Japanese language markup and text alongside answer colors. It uses included assets and system fonts. Light/dark, sound and speech preferences travel in backups; older saves default to light mode, sounds enabled, Natural speech and automatic voice selection.

## Progress and backups

Progress uses localStorage key **kotoba-n3-progress**, schema **1**, content version **2026.10.5**. Saved data includes settings, level/path position, home widgets, bookmarks, task marks, study events, orders, answers, reviews, history and active sessions. Valid 2026.10.1, 2026.10.2, 2026.10.3 and 2026.10.4 saves/backups migrate automatically, including earlier mini mocks. Original content IDs and established lesson targets/checks remain available; unknown versions and invalid data are rejected.

Settings provides JSON export, validated import and confirmed reset. Imports are limited to 2 MB, validate canonical references/session consistency and require confirmation before replacement. Invalid imports preserve progress; invalid saved bytes remain recoverable until explicitly replaced. Blocked/full storage is reported as unsaved.

A study day follows the browser's local calendar. Revealing a word or studying kanji/grammar counts once per item per day. Answered, non-excluded questions in submitted sessions count as activity; unscored script study can count as activity without affecting accuracy. Opening a page alone does not count.

A missed assessed question is due after one day. Correct due retries schedule three days, then seven days; three consecutive correct due retries mark it mastered. Early retries do not advance mastery, and a new miss resets the streak. Intervals use local calendar days and retain the time of day.

No accounts or cloud synchronization are included. Keep backups before changing browsers, addresses or devices, or clearing data.

## Local learning, recall and offline features

Practice now includes a resumable **Learning lab** with 3–5 new concepts, retrieval, typed recall with optional kana help, sentence tiles, pairs, dictation, and original culture/usage exercises. Explicit **0–5 recall ratings** on flashcards and submitted answers create a separate SM-2 schedule; completion marks and assessed mistake mastery retain their existing meanings.

Settings includes optional private goals/rewards, accessibility and text-size controls, local reminders, editable transcript input, original JSON draft tools, and a hosted offline library with an ordered secondary IndexedDB archive. Goals and rewards can be added as a home widget. Future repository/API/schema/seed files are prepared without connecting or executing a database.

See [docs/local-features.md](docs/local-features.md) for controls, data behavior, exact scheduler policy, verification and remaining content/platform/backend gaps. Every new optional state travels through the existing validated export/import. No account, payment, API key or npm installation is required.

## Contributor checks and structure

Use Node.js **24+**, without installing dependencies:

~~~sh
node tools/build-browser.mjs
node scripts/check-core.mjs
node tools/check-browser-core.mjs
node tools/check-content.mjs
node tools/check-migration.mjs
node tools/check-learning.mjs
node tools/check-glossary.mjs
node tools/check-theme.mjs
node tools/check-full-mock.mjs
node tools/check-foundations.mjs
node tools/check-sounds.mjs
node tools/check-path.mjs
node tools/check-advanced.mjs
node tools/check-dataset-expansion.mjs
node tools/check-sm2.mjs
node tools/check-learnlab.mjs
node tools/check-motivation.mjs
node tools/check-speech-input.mjs
node tools/check-audio-features.mjs
node tools/check-flashcard-audio.mjs
node tools/check-local-features.mjs
node tools/check-repository.mjs
node tools/check-blueprint.mjs
node tools/check-local-data.mjs
node tools/check-path-recall.mjs
node tools/build-offline.mjs
node tools/package-site.mjs
~~~

Checks cover canonical grading and shuffled choices, timers and section locking, persistence/recovery/migration, review schedules, literal passage evidence, content links and format coverage, weak-point selection, definition protection, themes, sounds, original upper-level groups, path prerequisites/retrieval, publisher metadata and home-widget settings. Native TypeScript stripping executes actual source; it is not a full compiler type check or a guarantee of exhaustive linguistic coverage.

Chrome journeys cover live mouse/touch/keyboard widget previews, cancellation and saved order; completion sorting and combined filters; Learn navigation to matching study cards; reading definitions and assessment safeguards; speech preferences and fallback behavior; direct-file use; and responsive layouts. Flashcard checks compare actual front/back geometry, page position, font size and line height at 320/360/768/1440px with furigana on/off, inspect hidden-answer accessibility, and reach the final word of a long kanji answer through normal page scrolling. Screenshots support visual inspection. Remaining curriculum, audio and backlog gaps are recorded below and in the requirements audit.

For Chrome journeys, keep the server running, then run:

~~~sh
node tools/browser-check.mjs http://127.0.0.1:5173/_site/
~~~

This exercises the packaged app at a repository-style subpath and separately opens index.html directly. It covers study/navigation, saved sessions, grading/retries, expiry, import/reset, script/audio/storage failure handling, custom controls, keyboard focus, themes and responsive layouts, including the focused study and speech journeys. Screenshots go into artifacts/. It uses Chrome DevTools Protocol with built-in Node WebSocket; set CHROME_PATH for a nonstandard installation. The script creates and removes an isolated test profile. GitHub Actions runs build/logic checks; Chrome journeys are local verification. Browser checks do not certify full WCAG conformance or behavior in untested browsers.

The complete **2026.10.5** release passed **24 native suites with 385 check groups** (379 functional/content and six provenance), **67 Chrome journeys**, **33 browser-script syntax checks**, and the installed **TypeScript 6.0.3 strict source check with zero diagnostics** on 2026-10-09. Five focused expansion journeys and four focused widget journeys also passed. [docs/dataset-expansion.md](docs/dataset-expansion.md) records inventory, compatibility, executed checks and remaining source/content gaps; [docs/local-features.md](docs/local-features.md) records the local features and their earlier release scope. These checks do not imply complete textbook coverage or expert linguistic certification.

Content lives in src/content/; grading lives in src/lib/engine.ts and persistence in src/lib/storage.ts. Regenerate web/content.js, web/engine.js and web/storage.js after source changes. Browser responsibilities are separated to keep changes reviewable:

| Module | Responsibility |
| --- | --- |
| [web/app.js](web/app.js) | Navigation, saved-state coordination and screen composition |
| [web/dashboard.js](web/dashboard.js) | Home widgets, customization and ordering |
| [web/customize.js](web/customize.js) | Floating widget editor and focus/dismissal behavior |
| [web/widgets.js](web/widgets.js) | Pointer and keyboard reordering without changing learning results |
| [web/celebrations.js](web/celebrations.js) | Finite, user-triggered mascot greeting |
| [web/path.js](web/path.js) | Integrated daily lessons and reference coverage presentation |
| [web/path-recall.js](web/path-recall.js) | Assessed path mastery, 30-day review attention and existing-word retrieval |
| [web/study.js](web/study.js) | Vocabulary, grammar, reading and listening study |
| [web/flashcards.js](web/flashcards.js) | Vocabulary/kanji flashcards, deck filters and completion ratings |
| [web/references.js](web/references.js) | Selected-level publisher links and transparent mapping gaps |
| [web/glossary-ui.js](web/glossary-ui.js) | Accessible definition popups for reading and protected practice words |
| [web/audio.js](web/audio.js) | Browser speech, Japanese voice/style preferences and supplied audio playback |
| [web/sessions.js](web/sessions.js) | Practice and full-mock setup |
| [web/quiz.js](web/quiz.js) | Active questions and results |
| [web/srs.js](web/srs.js) | Explicit SM-2 ratings and due recall queues |
| [web/learnlab.js](web/learnlab.js) | Resumable micro lessons, typed recall and local content drafts |
| [web/motivation.js](web/motivation.js) | Optional private goals, reward receipts and cosmetics |
| [web/preferences.js](web/preferences.js) | Comfort controls, local reminders and active study minutes |
| [web/speech-input.js](web/speech-input.js) | Editable Japanese transcription and an independent microphone meter |
| [web/offline.js](web/offline.js) | Scoped library caching and the secondary IndexedDB progress archive |
| [web/local-data.js](web/local-data.js) | Aggregate export and confirmed draft/issue cleanup |
| [web/ui.js](web/ui.js) | Shared DOM controls and accessible labels |

Native HTML/CSS/JavaScript runs directly in the browser. The retained React prototype is inactive, and package.json has zero dependencies with optional plain-Node aliases.

## Sources and practical limits

The latest five supplied blueprints contain **350 numbered instructions**. [docs/blueprint-audit.json](docs/blueprint-audit.json) preserves each exact instruction, provenance, evidence and remaining gap. It distinguishes existing/new local features, partial support, intentional variants, future preparation and deferred work. The earlier [100-item audit](docs/requirements.json) remains a separate historical snapshot. No complete implementation of every prescription is claimed.

Publisher editions, catalogue topics, unavailable exact alignment, official mock durations and public Migii/Nihonez format references are documented in [REFERENCES.md](REFERENCES.md). Official sources are the [test sections](https://www.jlpt.jp/e/guideline/testsections.html), [level descriptions](https://www.jlpt.jp/e/about/levelsummary.html), [FAQ](https://www.jlpt.jp/e/faq/) and [released workbooks](https://www.jlpt.jp/e/samples/sampleindex.html).

Duolingo's [core-tabs redesign](https://blog.duolingo.com/core-tabs-redesign/) informed consistent navigation and rounded cards. Kotoba's mascot, branding, assets and study content are original; the app is not affiliated with JLPT or Duolingo.

Direct-file study assets need no network. Hosted offline reloads use a versioned service worker on HTTPS or opted-in localhost. Browser speech and recognition may require an online device service; text practice remains available offline. No remote GitHub deployment has been run from this workspace.
