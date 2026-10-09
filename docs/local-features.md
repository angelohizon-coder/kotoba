# Local learning and future storage

This phase implements broader local/offline features while keeping the app free, account-free, and runnable from `index.html`. It does not implement every literal prescription in the five blueprints. [The 350-item audit](blueprint-audit.json) records each instruction, exact source text, evidence, status and remaining gap. The earlier [100-item audit](requirements.json) is a separate historical snapshot.

## Use the new features

- **Practice → Learning lab:** choose typed recall, sentence building, matching, dictation, or culture/usage. Sessions introduce 3–5 concepts, include at least 20% retrieval, save their position, and finish with a challenge. Misses and accepted typos remain visible. These results are self-study records, separate from exam accuracy and mastery.
- **Flashcards and submitted results:** reveal the answer, then explicitly choose a recall quality from 0–5. “Got it” and “Again” continue to control completion only. Ratings save an SM-2 schedule. Submitted question ratings require a genuine scored answer and allow the appropriate correct/incorrect quality range.
- **Review → Spaced recall:** retrieve due vocabulary/kanji, reveal, rate and continue. Scheduled questions have their own retry control. The existing assessed mistake queue still uses its original 1/3/7-day progression and three successful due retries for mastery.
- **Learning path → Review attention:** gold nodes require mastery of all linked assessed questions. After 30 elapsed days without a successful linked assessment, a visible seam and text reminder suggest a rapid review of up to ten existing words. Smaller lesson pools show their actual size. Opening the lesson never clears the reminder or removes mastery.
- **Settings → Optional goals:** choose a learning goal, level, daily minutes/XP and optional hearts. New recorded learning earns private XP/coins, quests, badges, cosmetics, boosts and at most two streak freezes. Existing history is baselined when enabling. Checklist changes alone earn no XP. Hearts never block study. Add **Goals and rewards** through Customize home.
- **Settings → Comfort:** choose contrast, text size, reduced motion, optional haptics, quiet micro lessons, automatic word audio, kana assistance, automatic micro-lesson advancement, untimed full-length practice and prerequisite guidance. Native OS text scaling is supported through relative text sizes. Reminder permission is requested only when clicking its control; reminders work while the app is open.
- **Listening/word audio:** normal study offers selected Japanese browser voices and Slow playback. Automatic word speech requires opt-in and an interaction. Mocks preserve neutral playback. Voices may require a network and are not licensed character imitations.
- **Typed practice → Speak:** explicitly start Japanese transcript input or the separate microphone meter. Recognition only fills an editable field; it never submits, scores pronunciation, or stores recordings. Typing remains available. Browser recognition may use an online service; the independent waveform does not filter that service.
- **Settings → Local content notes/drafts:** preview, edit, validate, save and export original JSON drafts; group and resolve device-local issue notes. Drafts never silently join assessed content, and nothing is published or sent to a moderator.
- **Settings → Your local data:** inspect stored record counts, export an aggregate summary that excludes individual answers and personal text, and explicitly confirm removing drafts or issue notes independently. Learning history, SRS, rewards and settings stay intact. Previously downloaded backups are unaffected.

## Offline and backups

On HTTPS the public study library is cached by default; localhost can enable it in Settings. Direct-file use continues without a service worker. All URLs are relative to the actual GitHub Pages project folder. A content-derived cache version covers the included static assets only; API/private/remote requests are excluded. Updates require an explicit reload, and saved sessions must finish first. Turning caching off unregisters this scope and removes its library caches, preserving learner progress and archives.

Primary progress stays under the existing localStorage key. An ordered IndexedDB archive keeps the latest validated device snapshot as a secondary copy. Archive failure never blocks synchronous study. **Download device archive**, then **Import backup**, offers explicit recovery; the app never silently overwrites newer local progress with an older archive. It does not claim cloud synchronization or cross-tab transactional storage.

Export/import includes optional preferences, Lab sessions/results, SRS events, and validated reward receipts. Old schema-one saves preserve absent optional fields and the original content IDs. Invalid backups are rejected before replacement; unreadable original saved bytes remain recoverable. Keep portable backups before moving browser, origin or device.

## SM-2 and future API

The pure shared scheduler uses the requested EF-first variant: initial EF 2.5, floor 1.3, quality 0–5, successful intervals 1/6/`ceil(previous × updated EF)`, failed interval 1 with repetition reset, and UTC due arithmetic. The supplied prose says `ceil` while its sample code uses `round`; the implementation follows the formula. The pure default has no cap or random fuzz. UI ratings explicitly apply a 365-day cap and retain that policy in their audit events. A local clock remains learner-controlled.

The static app now saves through a local repository interface. A future authenticated API port, framework-neutral controller/routes, shared service entry points, OpenAPI contract, PostgreSQL schema, and a 100-word original N5/N4 SQL seed are reviewable in `server/`. They are **unconnected and unexecuted**. A memory adapter verifies owner isolation, compare-and-swap conflicts and mutation receipt replay without starting an HTTP server. Production authentication, a PostgreSQL transaction adapter, server-authoritative rewards/time, conflict presentation, account deletion and actual synchronization still need implementation. Never enable a client timestamp “last write wins” overwrite.

## Remaining limits

The app still has selected study banks rather than complete textbook or JLPT coverage. Exact chapter/day/page mappings, expert linguistic review, verified lexical pitch/radical data, handwriting assets and a human recording library remain missing. Speech transcription cannot provide reliable phoneme or pronunciation assessment. TTS buffers cannot be exported as a cached recording corpus.

Some local prescriptions are partial: there is no diagnostic-driven automatic skill-tree mastery, implicit-grammar mode throughout the entire curriculum, personalized travel/career scenario corpus, calendar heatmap/draggable weekly planner, full note search, universal kana-only mode, or complete learner CMS. Goals track XP/minutes, but the protected reward streak currently follows positive-XP activity days rather than requiring the selected daily goal. New 3–5-concept lessons coexist with the existing longer integrated path to preserve saved lesson IDs and checkmarks. The audit documents these differences.

Shared leagues/friends, emails, push delivery with the browser closed, AI teaching, CDN audio, publishing/moderation and trusted anti-cheat remain backend/asset work. Responsive checks and contrast controls do not certify WCAG AAA, a CEFR crosswalk, or legal compliance. Original mocks report raw practice accuracy and do not reproduce previous exam papers or predict passing.

## Verification on 2026-10-09

All 361 functional/content checks and six blueprint provenance checks passed across 23 native suites. The provenance checks matched all five original attachments. Strict TypeScript 6.0.3 reported zero source diagnostics; 33 browser scripts passed syntax checks.

The full packaged Chrome run passed 62 journeys, including mouse/touch/keyboard widget movement, saved sessions, responsive flashcard geometry, legacy study controls, explicit SM-2 ratings, Lab modes, data cleanup and offline recovery. Two separate widget runs also passed. After simplifying the review reminder text and rebuilding, all 13 local/offline journeys and the affected 17 path checks passed again. The final offline library contains 54 relative public assets, version `78f639c5e24ad315`.

Screenshots were inspected for the Learning lab, large high-contrast text and path review reminder. Voice/recognition availability and permission behavior still depend on the device; controlled fallback tests do not establish real Japanese transcription accuracy. The GitHub Pages artifact was built and tested at a repository-style subpath, with direct-file journeys included in the full run. No remote site, server or database was deployed.
