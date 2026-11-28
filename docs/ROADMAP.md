# ROADMAP — VocaPet Japanese Learning Platform

## Overview

Learning System là ưu tiên chính (Phase 1–6). Pet System tích hợp sau khi Learning System hoàn chỉnh (Phase 7).

```
Phase 0 (Done)   → Core infra (Auth, Deck, Pet, FSRS, Missions)
Phase 1          → Alphabet (Kana + Learning Progress API)
Phase 2          → Tango (JLPT N5 Vocabulary + FSRS review)
Phase 3          → Kanji (N5 Kanji + KanjiItemProgress)
Phase 4          → Bunpo (N5 Grammar + exercises)
Phase 5          → JLPT (Practice tests)
Phase 6          → Learning Enhancement (spaced review, analytics)
Phase 7          → Pet System Integration
```

---

## Phase 0 — Core Infrastructure (DONE ✅)

**Đã có và giữ nguyên:**
- Authentication (register/login/JWT refresh)
- Deck & Vocabulary CRUD
- 5 study modes (Browse, SRS, Flashcard, Quiz, Type)
- FSRS Spaced Repetition algorithm
- Pet System (5 species, moods, Pixi.js animations, personality engine)
- Companion/Learning Profile
- Achievements (5 types), Daily Missions (5 types)
- XP/Coin/Level/Streak system
- Reader AI (Gemini PDF flashcard gen)
- User Profile & Onboarding
- Japanese Kana chart + quiz (`/app/japanese/kana`) — frontend only, không có backend progress

**Tech debt biết trước (không xử lý trong Phase 1):**
- `Pet.xp` và `Pet.level` là stubs (luôn 0/1)
- `PetBehaviorServiceImpl.dailyCompleted` hardcoded false
- `STUDY_TIME` MissionType dead code
- `COMPLETE_DECK` / `PET_LEVEL` AchievementType không có logic

---

## Phase 1 — Alphabet Learning Module

**Goal:** Single-page scrollable kana reference + active recall quiz + per-kana progress tracking.
**Route:** `/app/japanese/alphabet` (rename từ `/app/japanese/kana`)
**Không có:** XP, Coin, Pet reward, Mission, Achievement.

### Kana Catalog
| Section | Per script | Mô tả |
|---------|-----------|-------|
| Basic | 46 | Gojūon (a-n, wa, wo included) |
| Dakuten | 20 | が、ざ、だ、ば rows |
| Handakuten | 5 | ぱ row |
| Yōon | 33 | 11 bases × 3 combos (kya/kyu/kyo) |
| **Total** | **104** | Per script × 2 = **208 ký tự** |

### Backend Tasks ✅ DONE

Backend đã được implement đầy đủ trong session trước và compile thành công:
- `entity/KanaAttempt.java` ✅
- `entity/KanaItemProgress.java` ✅ UNIQUE(user_id, script, kana)
- `repository/KanaAttemptRepository.java` ✅
- `repository/KanaItemProgressRepository.java` ✅
- `service/KanaProgressServiceImpl.java` ✅ MIN_SEEN=5, MIN_ACCURACY=80%
- `controller/KanaController.java` ✅ 3 endpoints
- `dto/KanaRe/*.java` ✅ 6 DTOs

### Frontend Tasks

**DONE (from previous session):**
- `kana.ts` — extended with Dakuten/Handakuten/Yōon data ✅
- `japanese.api.ts` — 3 API functions ✅
- `japanese.queries.ts` — 3 React Query hooks ✅
- `AppShell.tsx` — "Tiếng Nhật" section in sidebar ✅ (link still points to /kana)

**TODO — UI/UX Revision:**

**Step 1 — Add to `kana.ts`:**
- [ ] `ROMAJI_VARIANTS: Record<string, string[]>` — alternate romanizations (shi=si, chi=ti, etc.)
- [ ] `normalizeRomaji(input: string): string` — lowercase + trim
- [ ] `checkRomaji(input: string, canonical: string): boolean` — check canonical + variants

**Step 2 — New route `src/routes/app.japanese.alphabet.tsx`** (replaces kana.tsx)
- [ ] Single scrollable page (no tabs between sections)
- [ ] All 4 chart sections visible on scroll
- [ ] KanaCard component: character + romaji + mastery status dot (unseen/learning/mastered)
- [ ] KanaCard shows mastery from `useKanaProgressQuery()` data
- [ ] Progress summary at top: X/104 mastered, overall accuracy
- [ ] "Start Quiz" CTA → reveals QuizConfigPanel inline

**Step 3 — QuizConfigPanel component:**
- [ ] Script: Hiragana / Katakana
- [ ] Section: All / Basic / Dakuten / Handakuten / Yōon
- [ ] Count: 10 / 20 / All
- [ ] Mode: toggle "Weak kana only"

**Step 4 — FlashcardQuiz component (active recall):**
- [ ] Quiz view replaces chart (back button to return)
- [ ] Sticky QuizStatsBar: Accuracy | Remaining | Incorrect
- [ ] Large kana display (text-8xl sm:text-9xl)
- [ ] Autofocused text input for romaji
- [ ] Enter → submit answer (normalized + variant check)
- [ ] Space (when input unfocused) → reveal answer
- [ ] "Reveal Answer" button
- [ ] After correct: green flash → auto-advance 800ms
- [ ] After reveal: show answer + [✓ Got it] [✗ Need more practice]
- [ ] Wrong/revealed: re-queue to end of deck
- [ ] `isCorrect` = only true if typed correctly without reveal
- [ ] Session persistence: sessionStorage key `vocapet_kana_quiz`

**Step 5 — QuizResultScreen:**
- [ ] Stats: Total / Correct / Incorrect / Accuracy
- [ ] Weak kana grid (KanaCard style, with accuracy %)
- [ ] [Practice Mistakes] [Practice Again] [← Back to Chart]
- [ ] On "Back to Chart": submit attempt to backend

**Step 6 — Update `AppShell.tsx`:**
- [ ] Change link: `/app/japanese/kana` → `/app/japanese/alphabet`

### Dependencies
- Backend: done
- kana.ts extensions: done (data), adding ROMAJI_VARIANTS new

### Estimate
- kana.ts additions: 0.5 ngày
- AlphabetPage + KanaCard: 1 ngày
- FlashcardQuiz + QuizConfig + Stats: 1.5 ngày
- QuizResultScreen + persistence: 0.5 ngày
- AppShell update: 0.1 ngày
- **Total frontend: ~3–4 ngày**

---

## Phase 2 — Tango (JLPT N5 Vocabulary)

**Goal:** Học 800 từ N5 với FSRS spaced repetition.

**Reuse:** Deck + Vocabulary entities, StudySession + FSRS + StudyReview (đã có, không build thêm).

**Cần build:**
- [ ] Seed public Deck "JLPT N5 Tango" + 800 Vocabulary records
- [ ] (Optional) `JLPTVocabItem` entity cho furigana/example sentence metadata
- [ ] Route `/app/japanese/tango` — word list + "Start Review" vào StudySession flow
- [ ] Thêm "Tango" vào sidebar navigation

**Dependencies:** Phase 1 (navigation pattern)

---

## Phase 3 — Kanji (JLPT N5)

**Goal:** Học 103 Kanji N5 với nhận dạng, readings, nghĩa.

**Pattern:** Giống Phase 1 — `KanjiItem` (content) + `KanjiItemProgress` (per-user mastery, UNIQUE(user_id, kanji_item_id)).

**Cần build:**
- [ ] Entity `KanjiItem`: kanji, onyomi, kunyomi, meaning, radical, strokeCount, jlptLevel
- [ ] Entity `KanjiItemProgress`: pattern tương tự KanaItemProgress
- [ ] Seed 103 Kanji N5
- [ ] API: GET /api/japanese/kanji, GET /api/japanese/kanji/{id}, POST /api/japanese/kanji/attempts
- [ ] Route `/app/japanese/kanji`

---

## Phase 4 — Bunpo (JLPT N5 Grammar)

**Goal:** Học 25 grammar patterns N5 với ví dụ và bài tập.

**Cần build:**
- [ ] Entity `GrammarRule`: pattern, explanation, structure, examples (JSON), jlptLevel
- [ ] API: GET /api/japanese/grammar
- [ ] Route `/app/japanese/bunpo` — grammar cards + exercises

---

## Phase 5 — JLPT Practice

**Goal:** Luyện thi N5 với câu hỏi tổng hợp từ Tango + Kanji + Bunpo.

**Reuse:** QuizService (đã có) cho câu hỏi vocabulary.

**Cần build:**
- [ ] API: POST /api/japanese/jlpt/practice?level=N5 (mixed questions)
- [ ] Route `/app/japanese/jlpt` — practice test UI

---

## Phase 6 — Learning Enhancement

**Goal:** Nâng cao trải nghiệm học, analytics, cải thiện retention.

- [ ] Spaced review cho Kana (ưu tiên weak kana tự động)
- [ ] Japanese module hub page (`/app/japanese`) với progress overview
- [ ] Learning analytics (streak per module, accuracy trend)
- [ ] Dark mode verification
- [ ] Mobile responsive optimization
- [ ] N4 content expansion (vocabulary + kanji + grammar)

---

## Phase 7 — Pet System Integration

**Goal:** Kết nối Learning Progress với Pet System sau khi Learning System hoàn chỉnh.

- [ ] Implement `RewardService.grantPetReward(petId, petXp)` — cập nhật Pet.xp và Pet.level (exponential: BASE=100, GROWTH=1.2)
- [ ] Grant Pet XP khi hoàn thành Kana/Kanji attempts
- [ ] Grant User XP + Coin khi hoàn thành Learning milestones
- [ ] Thêm `KANA_MASTERY`, `KANJI_MASTERY` vào AchievementType
- [ ] Thêm `KANA_QUIZ`, `KANJI_REVIEW` vào MissionType
- [ ] Fix `PetBehaviorServiceImpl.dailyCompleted` hardcode
- [ ] Sync `petLevel`/`petExp` từ backend về Zustand store (thay vì local-only)

---

## Dependency Graph

```
Phase 0 (Done)
    │
    └─── Phase 1 (Alphabet + Progress API)
              │
              ├─── Phase 2 (Tango — reuse FSRS)
              │
              ├─── Phase 3 (Kanji — same pattern as Phase 1)
              │         │
              ├─── Phase 4 (Bunpo)
              │         │
              └─── Phase 5 (JLPT — needs Phase 2+3+4 data)
                        │
                   Phase 6 (Enhancement)
                        │
                   Phase 7 (Pet Integration)
```

---

## Implementation Checklist — Phase 1 Summary

| # | Task | Area | Risk |
|---|------|------|------|
| 1 | KanaAttempt + KanaItemProgress entities | Backend | Low |
| 2 | KanaAttemptRepository + KanaItemProgressRepository | Backend | Low |
| 3 | KanaProgressServiceImpl + DTOs | Backend | Low |
| 4 | KanaController (3 endpoints) | Backend | Low |
| 5 | Extend kana.ts (Dakuten/Handakuten/Yoon data) | Frontend | Low |
| 6 | japanese.api.ts + japanese.queries.ts | Frontend | Low |
| 7 | Update app.japanese.kana.tsx (sections + progress UI) | Frontend | Medium |
| 8 | Update AppShell.tsx (add sidebar navigation) | Frontend | Medium |
