# VocaPet Redesign: Architecture and UI/UX Audit (Phase 1, read-only)

Status: audit only. No application source was changed. Awaiting approval before Phase 2.
Audited against the working tree on `feature/japanese-mode` (uncommitted Tango and Kana work included).

## 0. Inputs and gaps

- **Benkyo reference:** not found in the workspace (searched the drive to depth 4 for `*benkyo*`). Section 5 is based on VocaPet's own docs and the current UI. Please give me the Benkyo path or repo and I will do the design-pattern pass before Phase 2.
- **Frontend audit depth:** I read the shell, sidebar, route list and file sizes. I did not read every Tango and Deck page line by line. Treat the UI notes in section 1.3 as a first pass.
- **Stray file:** the repo root contains a file literally named `et HEAD~1` (a mistyped git command output). It is not used. I have not deleted it.
- **Existing docs:** `docs/TANGO_*.md` and `docs/SITEMAP.md`, `DESIGN.md` already describe parts of this plan. They should be reconciled with this audit, not extended in parallel.

## 1. Current architecture analysis

### 1.1 Backend: progress data is split into two systems

| Concern | Flashcard system | Tango system |
|---|---|---|
| Content | `vocabularies` (`Vocabulary`), owned by `decks` (`Deck`) | `tango_vocabularies` (`TangoVocabulary`) + meanings/examples, grouped by `tango_lessons` via `TangoLessonVocabulary` |
| Per-user word progress | `user_vocabulary_progress` (`UserVocabularyProgress`): FSRS fields `stability`, `difficulty`, `repetitions`, `lapses`, `nextReviewTime`, `status` | `user_tango_vocabulary_progress` (`UserTangoVocabularyProgress`): `status`, `answeredCount`, `correctCount`, `incorrectCount`, `masteredAt`, no scheduling |
| Per-user collection progress | `user_deck_progress` (`UserDeckProgress`): `progress` double, `lastStudied` | `user_tango_lesson_progress` (`UserTangoLessonProgress`): status, `quizPassed`, `bestQuizAccuracy`, `completedAt` |
| Session/event history | `study_sessions`, `study_reviews` (`StudySession`, `StudyReview`) | `tango_quiz_attempts`, `tango_quiz_answers` |
| Scheduler | `FsrsServiceImpl`: a simplified FSRS (the code comment says "core FSRS idea simplified"), next interval from stability | None. Status is computed by `TangoStatusCalculator` |
| Writers | `StudySessionServiceImpl.review()`, `QuizServiceImpl.answer()` | `TangoLearningService.studyProgress()`, `submitAttempt()` |

**Conflict:** a learner who studies "食べる" in a Tango lesson and in a deck gets two unrelated progress rows, and neither sees the other. `UserVocabularyProgress` points at `Vocabulary`, and `UserTangoVocabularyProgress` points at `TangoVocabulary`. Nothing links the two. Both can exist for the same real word, so the spec's "one progress record per user per word" is not met today.

**Duplicated content:** `Vocabulary` (deck card) stores its own `word`, `meaning`, `example`. `TangoVocabulary` stores the same kind of content with better structure. Decks that cover JLPT words copy the text.

### 1.2 Cross-system side effects

- XP and coins: only `QuizServiceImpl.answer()` (10 XP, hardcoded) and mission claims grant rewards. Study-session reviews and Tango attempts grant nothing. The reward path is coupled to Pet and Companion through `CompanionService`, `PetBehaviorService` and `StudySessionServiceImpl.finishSession()`, which posts a `SESSION_COMPLETED` companion event. These are the Pet hooks the spec asks to isolate.
- Streaks: `StreakService.updateMyStreak()` is called from flashcard review only. Tango study does not update streaks, so the dashboard streak will undercount Tango learners.
- Missions: `MissionService` tracks flashcard events (`LEARN_WORDS`, `REVIEW_COUNT`, `FINISH_SESSION`, `DESKTOP_QUIZ`). Tango activity does not count.
- Learning profile: `LearningProfileServiceImpl` already exists. Check whether it can host the "current JLPT level" and daily goal before adding anything.

### 1.3 Frontend

- Stack: React 19, TanStack Router (file routes), TanStack Query, Zustand, Tailwind 4, framer-motion, pixi.js (pet). Path alias `@/`.
- Shell: `components/AppShell.tsx` has a desktop sidebar and a mobile nav. Current groups are "Learn" (Home, Study & decks, Reader, Missions), "Tiếng Nhật" (Alphabet, Tango) and "Your companion" (Pets, Progress & awards, Settings). `PetCompanion` is mounted globally in the shell (`AppShell.tsx`), so pet UI appears on every page. It must be removed from the mount point, not hidden per page.
- Routes that exist: `app.index` (dashboard; it references pets), `app.decks.*`, `app.japanese.alphabet`, `app.japanese.kana`, `app.japanese.tango.{index,lessons,learn,practice,mistakes,vocabularies}`, `app.reader`, `app.tasks` (missions), `app.achievements`, `app.pets`, `app.profile`.
- Missing routes for the target nav: Kanji, Grammar, Listening, JLPT Practice, Review Center, My Vocabulary, My Progress, Dashboard v2.
- The Tango pages are large (lessons 225 lines, practice 280, index 221). The Tango index is list-driven. This is the "monotonous list" the spec describes.
- Alphabet (`app.japanese.alphabet.tsx`, 722 lines) and Kana (`app.japanese.kana.tsx`, 362 lines) are two separate screens for overlapping content. Keep Alphabet working. Merge them only in Phase 2 after a regression check.
- Uncommitted work touches `AppShell.tsx`, `__root.tsx`, `styles.css`, `routeTree.gen.ts` and `application.yaml`. Any Phase 2 change to the shell will collide with it. Commit or stash that work first.

### 1.4 Things the spec assumes that I could not confirm

- The Benkyo design reference (see section 0).
- Whether the database schema is managed by a migration tool (Flyway or Liquibase) or by `ddl-auto`. This decides how section 7 is executed. I have not checked `application.yaml`.
- Audio: `TangoVocabulary.audioUrl` exists, but I did not check whether any audio files are populated.

## 2. Existing Flashcard integration opportunities

Reuse, do not rewrite:

1. **`UserVocabularyProgress` + `FsrsServiceImpl` + `findDueCards`** are the working scheduler. Make them the single scheduler for all sources. Replace the simplified FSRS with the real FSRS library only if review quality is a problem. The interface can stay the same.
2. **`StudySessionService`** (`startSession`, `getNextCard`, `review`, `finishSession`) becomes the "Review Center" backend. It already returns due cards, so no new endpoint is needed for the review queue.
3. **`QuizServiceImpl.randomQuestion(deckId)`** already builds questions from due cards. It is the basis for the Quiz redesign in Phase 4.
4. **`Deck` / `Vocabulary`** stay as the user-owned flashcard collection. Add an optional link from `Vocabulary` to a canonical lexical item (section 3). Existing deck data does not need to change.
5. **`DeckService` / `UserDeckProgress`** can back "collection progress" in the library for user decks. Tango lessons need their own equivalent, which already exists (`UserTangoLessonProgress`).
6. **Frontend:** `components/deck/Flashcards.tsx`, `FlashSide.tsx`, `StudySessionFlashcards.tsx` and `QuizGame.tsx` are the flashcard UI. The new Vocabulary Learning screen's Flashcard mode should reuse `FlashSide` and `StudySessionFlashcards`, not copy them. `components/reader/utils/speakWord` covers pronunciation.
7. **`TangoAnswerNormalizer`, `TangoStatusCalculator`** are reusable for the answer checking and status display in the new screens.

## 3. Shared Learning Engine design

### 3.1 Principle

One canonical vocabulary item, one progress record per user per item, and any activity writes to that record. Pet and rewards consume events. They never write progress.

### 3.2 Canonical content (recommended option A)

- Add `lexical_items` as the canonical word table. In practice this is `TangoVocabulary` promoted to canonical: keep the table, rename it only if you want to, and treat it as the source of truth.
- Add nullable `lexical_item_id` to `vocabularies`. Existing deck words without a match stay null and keep working.
- Matching rule for existing deck words: exact `expression_key` + `kana` match; unmatched words stay unlinked. No automatic merge of meanings.
- Repoint `user_vocabulary_progress` from `vocabulary_id` to `lexical_item_id`, or add the column and backfill. Because the table is keyed to `Vocabulary` today, the cleanest path is: add `lexical_item_id`, backfill it through the link, then make it the unique key `(user_id, lexical_item_id)`.

Option B (not recommended): keep both tables and write both from a facade. This is a dual write, and it will drift.

### 3.3 Unified progress record

Extend `UserVocabularyProgress` (do not create a second entity) with the spec's fields:

- `timesSeen`, `correctCount`, `incorrectCount`, `accuracy` (derived, or stored for queries)
- `mastery` (replaces or maps from `Status`: NEW, LEARNING, REVIEW, MASTERED)
- `lastReviewedAt`, `nextReviewAt` (already present as `lastReviewTime`, `nextReviewTime`)
- `intervalDays` (the scheduler interval; `stability` already drives it)
- `lastSource` plus per-source counters or a small event log (see 3.5)

`UserTangoVocabularyProgress` is folded into the same record. Its counters map to `correctCount` and `incorrectCount`. `masteredAt` maps to the mastery timestamp.

### 3.4 Learning sources and the write path

Introduce one service, `LearningEngineService`, with a single entry point:

```
recordAttempt(userId, lexicalItemId, source, outcome, grade?)
```

- `source`: TANGO, FLASHCARD, REVIEW, QUIZ (enum). Guided learning reports TANGO, the flashcard mode of the new screen reports FLASHCARD, Review Center reports REVIEW, quizzes report QUIZ.
- `outcome`: correct / incorrect / seen. For flashcards, the self-rating (Again, Hard, Good, Easy) maps to `Rating`.
- It updates the unified record, applies the scheduler (FSRS for rated reviews; for Tango and quizzes, a fixed-step scheduler is enough for the MVP), and emits a learning event.

`StudySessionServiceImpl.review`, `QuizServiceImpl.answer` and `TangoLearningService.studyProgress` / `submitAttempt` each become a thin caller of this service. Their existing endpoints and response shapes stay the same.

### 3.5 Events for Pet later

Emit, do not call. Define a `LearningEvent` (`LESSON_COMPLETED`, `QUIZ_COMPLETED`, `DAILY_GOAL_COMPLETED`, `REVIEW_SESSION_COMPLETED`, `LEARNING_STREAK_UPDATED`) published with Spring's `ApplicationEventPublisher`. Pet, companion and reward listeners subscribe with `@TransactionalEventListener`. The Learning Engine has no import of any Pet class. The existing direct calls (`CompanionService` from `StudySessionServiceImpl`, `PetBehaviorService` from `QuizServiceImpl`, `rewardService.grantReward` from `QuizServiceImpl`) move behind listeners in Phase 3. While Pet is hidden, these listeners stay registered but the UI does not show them. Nothing is deleted.

### 3.6 Scheduler choice

MVP: keep the existing simplified FSRS for flashcard and Review Center grades. Tango and quiz answers update the counters and move `mastery` and `nextReviewAt` with a fixed ladder (for example 1, 3, 7, 14 days, reset on error). Revisit real FSRS after Phase 4 if review quality is poor.

## 4. Navigation structure

Proposed sidebar (target), with what each item maps to today:

| Group | Item | Route (new) | Current source |
|---|---|---|---|
| MAIN | Dashboard | `/app` | `app.index` (rebuild) |
| LEARNING | Alphabet | `/app/japanese/alphabet` | existing; Kana merged in later |
| LEARNING | Vocabulary | `/app/japanese/tango` | existing Tango index (rebuild as library) |
| LEARNING | Kanji | `/app/japanese/kanji` | new, placeholder |
| LEARNING | Grammar | `/app/japanese/grammar` | new, placeholder |
| LEARNING | Listening | `/app/japanese/listening` | new, placeholder (audio only; no quiz type yet) |
| LEARNING | JLPT Practice | `/app/japanese/jlpt` | new; entry to the Quiz redesign |
| PRACTICE | Flashcards | `/app/decks` | existing Decks (kept) |
| PRACTICE | Review Center | `/app/review` | new screen over `StudySessionService` due cards |
| PRACTICE | My Vocabulary | `/app/vocabulary` | new; favorites and mistakes from Tango, plus deck words |
| PERSONAL | My Progress | `/app/progress` | `app.achievements` (rebuilt; keep the achievements data) |
| PERSONAL | Settings | `/app/profile` | existing |
| hidden | Pets, Companion, Missions, Reader | kept routes, removed from nav | Reader and Missions must be placed; they are not in the spec's list. Decide: keep Reader under PRACTICE and Missions under MY PROGRESS, or hide them too. |

The spec does not mention Reader or Missions. Those are my proposal, and they need your decision (section 9).

## 5. Design system proposal

Build on the Tailwind 4 tokens already used by `styles.css` (`bg-primary`, `text-muted-foreground`, and so on). Replace values, do not replace the token names.

- **Colors (light):** primary natural green (proposal `#3F7D58`, hover `#336A49`); surface warm cream for the app background (`#FBF7EE`); cards white (`#FFFFFF`); foreground near-black green (`#1F2A22`); muted `#6B7366`; success `#2E7D4F`, warning amber `#B7791F`, danger `#B4442F`. Status colors: Not Started (gray), In Progress (amber), Completed (green), Needs Review (rust).
- **Dark mode:** same tokens, dark greens and warm charcoal; define in `:root.dark`.
- **Type:** UI sans (Inter or the Japanese-capable system stack). Japanese: Noto Sans JP for text, Noto Serif JP for large kanji display. Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48 (kanji hero). Line-height 1.5 for body, 1.2 for headings.
- **Spacing:** 4px base; section gap 24/32px; card padding 16/20px.
- **Radius:** 12px cards, 10px inputs and buttons, 999px for chips and progress pills. Not larger.
- **Shadow:** one soft shadow (`0 1px 2px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.06)`) and a hover variant. No gradients except a flat progress fill.
- **Components to build once:** `LessonCard`, `StatusChip`, `ProgressBar`, `SectionHeader`, `StatCompact` (one line, not a card), `WordCard` (the learning card), `ModeSwitch` (Guided / Flashcard), `QuizOption`, `ResultSummary`, `NavGroup`. Reuse `components/ui/*` (shadcn-style) where they exist.
- **Avoid:** plain bordered boxes everywhere, identical grids of the same card, big illustrations, multiple gradients.

Pet is removed from the design system's scope. `PetCard`, `PetCompanion`, `PetSpeechBubble` are not used by any new screen.

## 6. Five screen specifications

### 6.1 Dashboard (`/app`)

Order by priority, top to bottom:
1. **Greeting bar:** "Good evening, {name}" plus the streak chip and JLPT level chip.
2. **Continue Learning (hero):** the last in-progress lesson or word set, with its progress and one primary button.
3. **Due today:** count of words due, one button to Review Center. Hidden when zero, replaced by "All caught up".
4. **Daily goal:** a single progress ring or bar (words or minutes, set in Settings).
5. **Learning modules:** a row of six compact tiles (Alphabet, Vocabulary, Kanji, Grammar, Listening, JLPT) with a one-line status each. Kanji, Grammar, Listening are "Coming soon".
6. **Recent lessons:** up to 3 rows.
7. **Vocabulary progress:** stacked bar by mastery status, plus a count.
8. **Weekly activity:** a 7-day bar chart. Last, not first.

No pet, no XP tiles. Stats are one-line summaries, not cards.

### 6.2 Vocabulary library (`/app/japanese/tango`)

- Header: JLPT level segmented control (N5–N1), overview strip (lessons, words, overall progress percent), Continue Learning button.
- Filters: search box, status filter (Not Started / In Progress / Completed / Needs Review), sort.
- Body: responsive grid of `LessonCard` (1 column on phone, 2 on tablet, 3 on desktop). Each card: lesson number and title, description (2 lines), word count, a progress bar, a `StatusChip`, and one primary action that changes with status (Start / Continue / Review / Retry).
- "Needs Review" comes from `UserTangoLessonProgress` plus mistake counts, which the backend already partly computes in `TangoProgressService.getWeak`.

### 6.3 Lesson detail (`/app/japanese/tango/lessons/:id`)

- Header: title, JLPT chip, description, word count, progress bar.
- Actions: primary "Start / Continue Learning", secondary "Start Quiz", tertiary "Review Mistakes" (disabled when no mistakes).
- Vocabulary preview: a horizontal strip of 6 word chips (kanji, kana). A "Browse all" toggle switches to a compact table, off by default.

### 6.4 Vocabulary learning (`/app/japanese/tango/learn/:lessonId`)

- Top bar: lesson title, position "7 / 30", mode switch (Guided / Flashcard), Flashcard shortcut.
- Card: kanji (or kana if none), furigana above kanji, romaji, kana reading, part of speech chip, audio button, Vietnamese meaning (hidden in Guided mode until toggled; hidden by default in Flashcard mode until the user reveals), example sentence with the target word highlighted.
- Flashcard mode: show the prompt first, user taps "Show answer", then rates (Again / Hard / Good / Easy). The rating writes to the unified progress (source FLASHCARD).
- Guided mode: all fields visible, user marks Known or Unknown (source TANGO).
- Controls: Previous / Next, favorite star, keyboard: Left/Right to move, Space to reveal, 1–4 to rate, P to play audio.
- Both modes write to the same record. Show the record's current mastery on the card.

### 6.5 Quiz (`/app/japanese/tango/practice/:lessonId`)

Phase 4 scope, MVP:
- Supported now: Japanese → Meaning and Meaning → Japanese (match the existing `TangoQuizMode`). Japanese → Reading and Listening → Meaning are planned; show them as disabled until the backend supports them.
- Header: question count "4 / 10", progress bar.
- Question: prompt, 4 option buttons, keyboard 1–4.
- Feedback after each answer: correct or incorrect, the correct answer, one-line explanation (example sentence).
- Result: score, accuracy, list of incorrect answers with a "Review" link, "Practice again" button.

## 7. Database and API impact

### 7.1 Database (proposed; none applied)

| Change | Type | Risk |
|---|---|---|
| Add `lexical_item_id` to `vocabularies` (nullable, FK to `tango_vocabularies`) | additive | low |
| Backfill `lexical_item_id` by exact key match | data migration | medium: needs a report of unmatched words |
| Add `times_seen`, `correct_count`, `incorrect_count`, `interval_days`, `last_source`, `mastery` to `user_vocabulary_progress` | additive | low |
| Add a unique key on `(user_id, lexical_item_id)` | constraint | medium: must dedupe first if one user has both a deck row and a Tango row for one word |
| Merge `user_tango_vocabulary_progress` into the unified table | data migration | medium: keep the old table read-only for one release, then drop |
| Add `learning_event` (optional) for analytics and Pet later | additive | low |
| Nothing dropped in Phase 3 | — | — |

Pet tables, Pet services and Pet data stay untouched. Companion and Pet XP stay as they are; only their trigger point moves to events.

### 7.2 API

- Keep: all `/api/tango/*`, `/api/decks/*`, `/api/study/*`, `/api/quiz/*`, `/api/pets/*`, `/api/companion/*`, `/api/japanese/kana/*` response shapes.
- Add: `POST /api/learning/attempts` (one entry point for new clients), `GET /api/learning/review/queue` (due items across all sources), `GET /api/learning/progress/summary` (for Dashboard and My Progress), `GET /api/learning/vocabulary/mine` (My Vocabulary: favorites, mistakes, deck words).
- Change behavior only: the three legacy write endpoints keep their response shape but call `LearningEngineService`.
- Frontend: `TangoProgressService` and `TangoLearningService` results do not change shape in Phase 3.

## 8. Implementation roadmap

Phases follow the spec. Each phase ends with the report the spec asks for (files created and modified, reused features, API changes, DB changes, test results, known issues).

- **Phase 1 (this doc):** audit, navigation, design system, screens, DB and API assessment. Done once you approve.
- **Phase 2:** shell and nav rewrite; hide Pet UI at the mount point; Dashboard, Vocabulary library, Lesson detail. No backend change. Blocker: commit or stash the current uncommitted work first.
- **Phase 3:** `LearningEngineService`; add `lexical_item_id`; unified progress; Vocabulary learning screen (both modes); reuse flashcard components; move reward and companion calls behind events. Migrations here.
- **Phase 4:** Quiz redesign (two modes live); Review Center on `StudySessionService`; real SRS tuning.
- **Phase 5:** My Progress, responsive pass, tests, cleanup of `et HEAD~1` and dead Pet UI references.

Parallelism: Phase 2 (frontend shell) and Phase 3 backend (learning engine) can run in parallel if they touch different files. Phase 3's frontend depends on both.

## 9. Decisions I need from you

1. **Benkyo:** where is the source? I did not find it in the workspace.
2. **Canonical content:** confirm option A (promote `TangoVocabulary` to canonical, link deck words to it). Option B (dual write) is not recommended.
3. **Reader and Missions:** keep under PRACTICE/PROGRESS, or hide with Pet?
4. **Kana vs Alphabet:** merge in Phase 2, or keep both for now?
5. **Schema management:** Flyway/Liquibase or `ddl-auto`? I need this before writing migrations.
6. **Uncommitted work:** may I commit the current Tango/Kana branch state before Phase 2 starts?
7. **Stray file:** delete `et HEAD~1`?
