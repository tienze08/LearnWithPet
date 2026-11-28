# DATABASE — VocaPet Japanese Learning Platform

**Database:** MySQL 8.0+  
**ORM:** Spring Data JPA + Hibernate (`ddl-auto: update`)  
**Location:** `backend/src/main/java/com/vocabpet/backend/entity/`

---

## 1. Existing Entities (22 — không thay đổi)

### User
```
id, email (unique), password, role (USER|ADMIN), name,
avatar (AvatarType enum), level, xp, totalXp, coin, streak,
lastStudyAt, onboarded, createdAt, updatedAt,
currentPet (1:1 → Pet)
```

### Pet
```
id, user (1:1 FK), name, species (CAT|FOX|BUNNY|PANDA|DRAGON),
mood (HAPPY|SAD|CRYING|WAITING), level, xp, createdAt
```
> ⚠️ Stub: `Pet.xp` luôn = 0, `Pet.level` luôn = 1. Không có service nào cập nhật 2 field này hiện tại. Frontend hiển thị pet level từ Zustand localStorage (local-only, mất khi clear storage). Phase 1 sẽ implement `RewardService.grantPetReward()` để fix.

### CompanionProfile
```
id, pet (1:1 FK, unique), personality (GENTLE|PLAYFUL|FOCUSED),
remindersEnabled, quietHoursStart, quietHoursEnd
```

### CompanionMemory
```
id, profile (1:1 FK), energy, lastSeenAt, lastStudyAt,
lastReminderAt, lastBreakSuggestionAt, lastIntentAt,
lastGreetingDate, lastYesterdayRecallDate, lastIntent (PetIntent),
firstStudyDate, usualStudyHour, studyDays, totalSessionsTogether,
averageSessionMinutes, lastEvent (CompanionEventType),
totalInteractions
```

### CompanionWordMemory
```
id, profile (FK), vocabulary (FK), reviewCount, wrongCount,
correctCount, mastered, lastReviewedAt
UNIQUE: (profile_id, vocabulary_id)
```

### Deck
```
id, name, description, emoji, color, isPublic,
user (FK), createdAt
```

### Vocabulary
```
id, word, meaning (TEXT), example (TEXT),
difficulty (EASY|MEDIUM|HARD),
partOfSpeech (NOUN|VERB|ADJECTIVE|ADVERB|PRONOUN|PREPOSITION|CONJUNCTION|INTERJECTION),
deck (FK)
```

### UserVocabularyProgress (FSRS)
```
id, user (FK), vocabulary (FK),
status (NEW|LEARNING|MASTERED),
stability (double), difficulty (double),
repetitions, lapses, lastReviewTime, nextReviewTime
UNIQUE: (user_id, vocabulary_id)
```

### StudySession
```
id, user (FK), deck (FK), startedAt, finishedAt,
totalReviews, uniqueCards
```

### StudyReview
```
id, session (FK), user (FK), vocabulary (FK),
rating (AGAIN|HARD|GOOD|EASY), reviewedAt
```

### UserStreak
```
id, user (1:1 FK), currentStreak, longestStreak, lastActiveDate
```

### UserDeckProgress
```
id, user (FK), deck (FK), progress (double 0-100), lastStudied
```

### DailyQuest (templates)
```
id, title, description, type (MissionType enum),
target, rewardXp, rewardCoin, active
```

### UserMission (instance per user per day)
```
id, userId, dailyQuest (FK), date (LocalDate),
currentValue, completed, rewardClaimed
UNIQUE: (user_id, daily_quest_id, date)
```

### UserDailyQuest (legacy — tech debt, duplicate of UserMission)
```
id, user (FK), dailyQuest (FK), progress, completed, date, completedAt
```

### Achievement (templates)
```
id, code (unique), name, description, target,
rewardXp, rewardPetXp, type (AchievementType enum)
```

### UserAchievement
```
id, user (FK), achievement (FK), unlockedAt
UNIQUE: (user_id, achievement_id)
```

### UserStats
```
id, user (1:1 FK), totalCorrect, totalWrong, totalQuiz
```

### UserReward
```
userId (PK), xp, coin, level
```

### Bookmark
```
id, user (FK), vocabulary (FK)
UNIQUE: (user_id, vocabulary_id)
```

### PetUnlock
```
id, user (FK), species (PetSpecies), unlockedAt
```

### RefreshToken
```
id, token, expiryDate, user (FK), createdAt
```

---

## 2. New Entities — Phase 1 (Alphabet)

> Phase 1 không thêm enum, không đụng vào MissionType/AchievementType. Chỉ 2 entity mới cho Learning Progress.

### KanaAttempt — lịch sử mỗi lần quiz

```
TABLE: kana_attempts

id              BIGINT PK AUTO_INCREMENT
user_id         BIGINT FK → users (NOT NULL)
script          VARCHAR(20)   NOT NULL   -- "hiragana" | "katakana"
section         VARCHAR(30)   NOT NULL   -- "basic" | "dakuten" | "handakuten" | "yoon"
score           INT           NOT NULL   -- số câu đúng
total           INT           NOT NULL   -- tổng số câu trong lần quiz
duration_seconds INT                    -- thời gian làm bài (giây)
completed_at    DATETIME      NOT NULL
client_attempt_id VARCHAR(36) UNIQUE     -- UUID từ client, dùng để chống ghi trùng khi retry
```

**Mục đích:** Lưu lịch sử toàn bộ lần quiz, cho phép hiển thị lịch sử học và phân tích trend.

**Idempotency:** `clientAttemptId` (UUID v4) do frontend generate trước khi gọi API. Backend check EXISTS trước khi insert — nếu đã tồn tại trả về attempt cũ.

---

### KanaItemProgress — tiến độ per-kana per-user

```
TABLE: kana_item_progress

id              BIGINT PK AUTO_INCREMENT
user_id         BIGINT FK → users (NOT NULL)
kana            VARCHAR(10)   NOT NULL   -- "あ", "が", "きゃ", "ア", etc.
script          VARCHAR(20)   NOT NULL   -- "hiragana" | "katakana"
section         VARCHAR(30)   NOT NULL   -- "basic" | "dakuten" | "handakuten" | "yoon"
correct_count   INT DEFAULT 0
wrong_count     INT DEFAULT 0
last_seen_at    DATETIME
mastered        BOOLEAN DEFAULT FALSE

UNIQUE (user_id, script, kana)
```

**Mục đích:** Theo dõi accuracy từng ký tự, phân biệt riêng hiragana vs katakana. Dùng để xác định weak kana và compute mastery.

**Mastery logic (constants trong service):**
```java
// KanaProgressServiceImpl
private static final int MIN_TOTAL_SEEN = 5;    // tổng lần gặp ký tự tối thiểu
private static final double MIN_ACCURACY = 0.80; // accuracy tối thiểu 80%

boolean isMastered(KanaItemProgress p) {
    int total = p.correctCount + p.wrongCount;
    return total >= MIN_TOTAL_SEEN
        && (double) p.correctCount / total >= MIN_ACCURACY;
}
```
> Thay đổi ngưỡng: chỉ sửa 2 constants trong service, không cần migration.

---

### Kana Catalog Constants (hardcoded trong backend service)

Dùng để tính `totalKana` per section trong Progress API — không cần bảng riêng:

```java
Map<String, Integer> KANA_SECTION_TOTALS = Map.of(
    "basic",        46,   // 5+5+5+5+5+5+5+3+5+2+1 = 46 per script
    "dakuten",      20,   // が(5) + ざ(5) + だ(5) + ば(5)
    "handakuten",    5,   // ぱ(5)
    "yoon",         33    // 11 bases × 3 combos (kya/kyu/kyo)
);
// Áp dụng cho cả hiragana và katakana
```

---

## 3. Future Entities (Phase 2+, chưa implement)

> Ghi lại để tham khảo — chưa tạo trong Phase 1.

### Phase 2 — Tango
Tái sử dụng `Deck` + `Vocabulary` + `UserVocabularyProgress` hiện có. Seed public deck "JLPT N5 Tango" (800 từ). Không cần entity mới.

### Phase 3 — Kanji
```
KanjiItem: id, kanji, onyomi, kunyomi, meaning, radical, strokeCount, jlptLevel
KanjiItemProgress: id, userId, kanjiId, correctCount, wrongCount, mastered, lastSeenAt
                   UNIQUE(user_id, kanji_item_id)
```
Pattern giống KanaItemProgress.

### Phase 4 — Bunpo
```
GrammarRule: id, pattern, explanation, structure, examples (JSON), jlptLevel
```

---

## 4. Existing Enum Status (không thay đổi trong Phase 1)

### MissionType — 5 values, chỉ 4 hoạt động thực sự
```java
LEARN_WORDS    ✅ tracked
FINISH_SESSION ✅ tracked
REVIEW_COUNT   ✅ tracked
DESKTOP_QUIZ   ✅ tracked
STUDY_TIME     ⚠️ dead code (enum exists, no tracking method, not seeded)
```

### AchievementType — 5 values, một số không hoạt động
```java
STUDY_WORD    ✅ progressFor() → studyReviewRepository.countByUserId()
STREAK        ✅ progressFor() → user.getStreak()
COMPLETE_QUIZ ✅ progressFor() → user.getLevel() (tên misleading)
COMPLETE_DECK ⚠️ progressFor() returns 0 — never unlocks
PET_LEVEL     ⚠️ no case in progressFor() switch — never unlocks
```

---

## 4. Seeding Strategy

### JLPT Vocabulary Decks
Seed vào bảng `Deck` + `Vocabulary` hiện có (không cần entity mới):
```
Deck: { name: "JLPT N5", emoji: "🇯🇵", color: "#4ade80", isPublic: true }
  → Vocabulary × 800 (N5 word list)
Deck: { name: "JLPT N4", emoji: "🇯🇵", color: "#60a5fa", isPublic: true }
  → Vocabulary × 1500 (N4 word list)
```

### Kanji Seed
Seed vào bảng `KanjiItem`:
- N5: 103 kanji
- N4: 181 kanji (cộng dồn 284)
- N3: 367 kanji (cộng dồn 651)

### Grammar Seed
Seed vào bảng `GrammarRule`:
- N5: ~25 grammar patterns
- N4: ~25 grammar patterns

---

## 5. ER Diagram (simplified)

```
User ──┬── Pet ── CompanionProfile ── CompanionMemory
       │            └── CompanionWordMemory ── Vocabulary
       ├── Deck ── Vocabulary ── UserVocabularyProgress
       │            └── Bookmark
       ├── StudySession ── StudyReview
       ├── UserStreak
       ├── UserMission ── DailyQuest
       ├── UserAchievement ── Achievement
       ├── UserStats
       ├── PetUnlock
       └── RefreshToken

[NEW]
KanjiItem     (standalone, no FK to User — shared content)
GrammarRule   (standalone, shared content)
JLPTVocabItem ── Vocabulary (optional metadata layer)
```

---

## 6. Notes

- **Không dùng Flyway/Liquibase** — Hibernate `ddl-auto: update` tự tạo bảng mới. An toàn khi thêm entity mới, nhưng không tự xóa cột cũ.
- **UserDailyQuest** là tech debt (duplicate với UserMission) — để nguyên, không xóa trong MVP.
- **KanjiItem và GrammarRule** là shared content (không thuộc về user cụ thể) — không có `user_id` FK.
- Furigana cho JLPT vocabulary được lưu trong `JLPTVocabItem.furigana`, không phải trong `Vocabulary.word` để tránh break existing deck system.
