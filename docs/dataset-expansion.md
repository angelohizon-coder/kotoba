# Original N5–N1 dataset expansion

Content version **2026.10.5**, source metadata checked **2026-10-09**. This release adds original vocabulary, grammar, reading, listening and linked practice across all five study levels. Level labels are authored teaching estimates. They do not form an official exhaustive JLPT syllabus, a full textbook reproduction or a book/chapter/page correspondence claim.

## Measured inventory

The inventory is calculated from the complete source exports in [src/content/index.ts](../src/content/index.ts), rather than manually counting rows or inferring coverage from reference books. **Settings → Library and sources** presents these live totals by level.

The following snapshot was measured on **2026-10-09** through a native import of the complete **2026.10.5** source bank using the same resolver pattern as the dataset check.

| Level | Vocabulary | Linked kanji | Grammar | Readings | Listening | Questions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| N5 | 156 | 148 | 30 | 12 | 20 | 368 |
| N4 | 151 | 169 | 30 | 12 | 20 | 371 |
| N3 | 480 | 517 | 132 | 24 | 36 | 1,184 |
| N2 | 150 | 223 | 30 | 12 | 22 | 423 |
| N1 | 152 | 227 | 30 | 12 | 22 | 430 |
| **Whole library** | **1,089** | **904 distinct** | **252** | **72** | **120** | **2,776** |

The expansion adds **240 new shared kanji identities**, plus new example-word links on established characters. Other additions by level are:

| Level | New words | New grammar | New readings | New listening | New questions |
| --- | ---: | ---: | ---: | ---: | ---: |
| N5 | 100 | 10 | 4 | 6 | 228 |
| N4 | 100 | 10 | 4 | 6 | 236 |
| N3 | 50 | 10 | 4 | 6 | 137 |
| N2 | 100 | 10 | 4 | 6 | 232 |
| N1 | 102 | 10 | 4 | 6 | 242 |
| **Added** | **452** | **50** | **20** | **30** | **1,075** |

Question additions include generated word-meaning retrieval and kanji-reading questions as well as the two authored questions for every new grammar lesson, passage and listening activity.

Each vocabulary entry has a distinct spelling, kana reading, meaning, word class, original example, translation, topic and level. The expansion preserves existing spellings and level assignments. Every new word has a context/meaning retrieval question; words written with kanji also have a whole-word reading question. English definition choices are a study adaptation rather than an exact JLPT question-format claim.

Kanji are shared character identities linked to example words. Existing character IDs and word links are retained, with additional links added. Per-level kanji counts include distinct characters appearing in that level's words; a shared character can appear in more than one level's count. Those rows therefore should not be added to obtain the global distinct-character count. New character entries teach meanings through linked words, without claiming a complete reading inventory or stroke-order curriculum.

## Original teaching scope

| Level | Added teaching emphasis |
| --- | --- |
| N5 | Basic adjectives, directions, time and everyday objects; demonstratives, noun lists, plain verbs, action purpose and connected descriptions; short messages and simple dialogues. |
| N4 | Everyday verb pairs, practical nouns, deadlines, ease/difficulty, embedded questions, intentions and changes; notices, arrangements, service conversations and explicit action sequences. |
| N3 | Practical coordination, transactions, changes and lexical distinctions; connected grammar, purpose and contextual interpretation; original everyday reading and listening decisions. |
| N2 | Advanced vocabulary and sentence relationships; arguments, policy choices, qualifications and coherent conversations; original task, key-point, outline, integrated and quick-response practice. |
| N1 | Precise vocabulary, stance and restrictions; complex arguments, competing viewpoints and information retrieval; original task, key-point, outline, integrated and quick-response practice. |

Every added grammar lesson includes attachment rules, at least two translated examples, a comparison, a corrected mistake with an explanation, and two linked four-choice exercises. Every added reading or listening activity has two linked questions, four distinct answer choices, one canonical answer key and an explanation for every option. Comprehension questions include an exact literal Japanese evidence substring from their own source. Literal evidence verifies support in the authored text; it does not by itself certify naturalness or exam difficulty.

Dedicated N2/N1 quick-response activities are now part of listening practice. All added scripts are original and use the existing Japanese device-speech player. They include translations and follow the app's established submission, replay, failure, script-study and scoring rules. No publisher or official human recording is bundled.

The original modules are [dataset-foundations.ts](../src/content/dataset-foundations.ts), [dataset-intermediate.ts](../src/content/dataset-intermediate.ts) and [dataset-advanced.ts](../src/content/dataset-advanced.ts). [dataset-builders.ts](../src/content/dataset-builders.ts) creates word-retrieval questions and expands kanji links. The existing browser build carries these source exports into the local static app; no package install, account, API key, database execution or deployment is required to study them.

## Integrated paths and saved progress

All five levels have integrated paths with vocabulary, linked kanji, grammar, reading, listening and assessed retrieval. N5/N4 follow their foundation form sequence. N3–N1 retain prerequisite grammar families. Daily portions contain at most seven new words and two grammar patterns, with cumulative review after groups of six study lessons. Unit counts follow available content rather than a textbook's advertised number of weeks. Daily context sentences literally use selected word and grammar examples; longer comprehension tasks supply additional skill practice and do not claim to contain every daily target.

N3–N1 append separately identified **Extra study** units. Every established lesson keeps its ID, vocabulary/kanji/grammar targets, context, selected reading/listening, questions and retrieval checks. The original revision unit is identified as **Earlier library revision and mock** and retains its earlier-library scope. A separate revision and mock unit after the additions covers the full level library. This protects the meaning of saved checkmarks and resume targets: an old completed lesson does not silently acquire new obligations or complete a new lesson. N5/N4 now have integrated paths over their complete level libraries.

Progress retains schema **1** and localStorage key **kotoba-n3-progress**. Valid content versions **2026.10.1–2026.10.4** migrate to **2026.10.5**, retaining bookmarks, completion marks, assessed answers, review state, active sessions, path resume and explicit SRS records. Existing canonical question IDs and answer keys remain unchanged. Expansion alone creates neither completion nor mastery.

## Source guide and correspondence limits

[dataset-sources.ts](../src/content/dataset-sources.ts) supplements the preserved publisher map. **Settings → Library and sources** lists **43 publisher books deduplicated by ISBN and five primary institutional resources**. The original 65 skill records can reference a combined book more than once; they do not represent 65 separate volumes.

The three official resources cover [JLPT competence descriptions](https://www.jlpt.jp/e/about/levelsummary.html), [test sections/question types](https://www.jlpt.jp/e/guideline/testsections.html) and the [study FAQ](https://www.jlpt.jp/e/faq/index.html). They inform complexity, task families and accurate coverage claims. They supply no exhaustive official item inventory and do not certify an app item or passing readiness.

Japan Foundation *Irodori* adds practical communication contexts. Starter is **A1**, with the inspected first-edition date **2020-11-30**; Elementary 1 is **A2**, with the inspected first-edition date **2020-03-31**. Both [Starter contents](https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_contents_en.pdf) and [Elementary 1 contents](https://www.irodori.jpf.go.jp/assets/data/elementary01/pdf/Y_contents_en.pdf) were inspected. Publication dates come from the linked publication PDFs recorded in [REFERENCES.md](../REFERENCES.md). Placing these contexts in the app's N5/N4 routes is our teaching choice, with **no official JLPT crosswalk**. No Irodori exercise, passage, key, illustration or audio is reproduced.

Nihongo Sō-matome informs short daily portions and regular consolidation; Shin Kanzen Master informs skill/topic structure; TRY! informs grammar in context. Inspected publisher descriptions and public contents support compatible teaching groups. They do not establish that every app word or grammar construction occurs in an associated book. Exact chapters, textbook days, pages and full-volume coverage remain unverified. Some N3 ASK preview images were inaccessible, and full commercial books were not accessed; unseen contents were not inferred. No Shin Kanzen Master N5 volume is asserted.

Each source-guide record separates edition/live-page metadata, organization, inspection basis, checked date, inspected topic, original app application and limits. Level/skill associations retain those limits and identify the original additions. [REFERENCES.md](../REFERENCES.md) preserves the earlier publisher links and expands the institutional-source details.

## Contributor validation

With the existing Node.js 24+ runtime, run:

~~~sh
node tools/check-dataset-expansion.mjs
~~~

The check imports actual TypeScript source with native type stripping and a resolver for local extensionless imports. It checks growth at all five levels; unchanged prior content and canonical keys against the 2026.10.4 baseline; preserved established lesson targets/context/retrieval; distinct spellings and kana readings; exact example spellings and kanji links; complete grammar exercises; literal passage evidence; four-choice grading independent of shuffle position; dedicated upper-level quick-response content; valid paths/source associations; and backup/SRS/migration behavior. Native execution is not a full compiler type check. The wider contributor and browser checks in [README.md](../README.md) remain applicable.

## Executed verification

The complete release source passed **24 native suites with 385 check groups**, including six blueprint provenance groups, and the installed **TypeScript 6.0.3 strict source check with zero diagnostics**. All **33 browser scripts** passed syntax checks. The twelve expansion groups verify the measured inventory, prior-content hashes, all established lesson hashes, canonical grading, sources, upper-level quick responses and saved-progress migration.

The packaged site passed the full **67-journey Chrome regression**, including all nine routes, direct-file loading, relative GitHub Pages subpaths, offline reload/save/archive, backups, grading, answer protection, recall ratings and responsive study controls. Five focused expansion journeys and four focused widget journeys also passed. They cover all levels, new flashcards, source links, added paths, normal long-card dragging, compact rearrangement, touch, edge scrolling, cancellation and saved answers. Source-guide and N5-path screenshots were inspected at desktop and mobile widths. Controlled speech fallbacks do not establish real Japanese voice availability or native-speaker audio quality.

The public `_site/` artifact contains **54 relative offline assets**, with offline revision **c1ffd1de55ce13e7**. Runtime use requires no npm installation. These checks do not deploy the site or connect a database.

## Remaining validation and mapping work

- Independent expert review of Japanese naturalness, nuances, level placement, distractor quality and passage/listening difficulty remains outstanding. Automated structural checks and editorial passes do not certify a complete curriculum.
- Human-recorded dialogue and validation of natural pacing, speaker changes, prosody and accent are still needed. Available device voices vary; browser speech is not publisher or official audio.
- Precise lexical, construction, chapter/day/page and complete-book mappings remain unverified, including inaccessible preview contents. Source associations are compatible teaching/context references.
- Original mocks use authored targets and the available format mix. They do not reproduce every historical paper, official scaled scoring, a precise historical format blueprint or a pass predictor.

This expansion is local source work. No site publication or remote deployment is included.
