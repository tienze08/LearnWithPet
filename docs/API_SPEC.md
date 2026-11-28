# API_SPEC — VocaPet Japanese Learning Platform

**Base URL:** `http://localhost:8080` (dev) / `${VITE_API_URL}` (prod)  
**Auth:** Bearer JWT in `Authorization` header  
**Content-Type:** `application/json`

---

## 1. Authentication (`/api/auth`)

### POST /api/auth/register
```json
Request: { "name": "string", "email": "string", "password": "string" }
Response 201: { "token": "string", "refreshToken": "string", "name": "string" }
Response 409: { "message": "Email already exists" }
```

### POST /api/auth/login
```json
Request: { "email": "string", "password": "string" }
Response 200: { "token": "string", "refreshToken": "string", "name": "string" }
Response 401: { "message": "Invalid credentials" }
```

### POST /api/auth/refresh
```json
Request: { "refreshToken": "string" }
Response 200: { "token": "string", "refreshToken": "string", "name": "string" }
```

---

## 2. User (`/api/users`)

### GET /api/users/me
```json
Response 200: {
  "id": "long", "name": "string", "email": "string",
  "avatar": "FOX|PANDA|KOALA|...", "level": "int", "xp": "int",
  "coin": "int", "streak": "int", "onboarded": "boolean",
  "currentPet": { "id": "long", "name": "string", "species": "string", "level": "int", "xp": "int" }
}
```

### GET /api/users/streak
```json
Response 200: { "currentStreak": "int", "longestStreak": "int", "lastActiveDate": "date" }
```

### POST /api/users/onboarding
```json
Request: { "petName": "string", "petSpecies": "CAT|FOX|BUNNY|PANDA|DRAGON" }
Response 200: UserResponse
```

### PATCH /api/users/avatar
```json
Request: { "avatarType": "FOX|PANDA|KOALA|FROG|MONKEY|UNICORN|TIGER|PENGUIN|OCTOPUS|STAR|ROCKET|CLOVER" }
Response 200: UserResponse
```

---

## 3. Decks (`/api/decks`)

### GET /api/decks
```json
Response 200: [{ "id": "long", "name": "string", "emoji": "string", "color": "string",
  "description": "string", "isPublic": "boolean", "wordCount": "int", "createdAt": "datetime" }]
```

### POST /api/decks
```json
Request: { "name": "string", "emoji": "string", "color": "string", "description": "string" }
Response 201: DeckResponse
```

### PUT /api/decks/{id}
```json
Request: { "name": "string", "emoji": "string", "color": "string", "description": "string" }
Response 200: DeckResponse
```

### DELETE /api/decks/{id}
```
Response 204: (no content)
```

---

## 4. Vocabulary (`/api/decks/{deckId}/vocabularies`)

### GET /api/decks/{deckId}/vocabularies
```json
Response 200: [{ "id": "long", "word": "string", "meaning": "string",
  "example": "string", "difficulty": "EASY|MEDIUM|HARD",
  "partOfSpeech": "NOUN|VERB|..." }]
```

### POST /api/decks/{deckId}/vocabularies
```json
Request: { "word": "string", "meaning": "string", "example": "string",
  "difficulty": "EASY|MEDIUM|HARD", "partOfSpeech": "NOUN|VERB|..." }
Response 201: VocabularyResponse
```

### PUT /api/decks/{deckId}/vocabularies/{vocabularyId}
```json
Request: (same as POST)
Response 200: VocabularyResponse
```

### DELETE /api/decks/{deckId}/vocabularies/{vocabularyId}
```
Response 204: (no content)
```

---

## 5. Study Sessions (`/api/study-sessions`)

### POST /api/study-sessions/start
```json
Request: { "deckId": "long" }
Response 200: { "sessionId": "long", "totalCards": "int" }
```

### GET /api/study-sessions/{sessionId}/next-card
```json
Response 200: { "vocabularyId": "long", "word": "string", "meaning": "string",
  "example": "string", "stability": "double", "repetitions": "int" }
Response 404: NoMoreCardsException
```

### POST /api/study-sessions/{sessionId}/review
```json
Request: { "vocabularyId": "long", "rating": "AGAIN|HARD|GOOD|EASY" }
Response 200: { "nextReviewTime": "datetime", "newStatus": "NEW|LEARNING|MASTERED",
  "streakUpdated": "boolean", "companionReaction": "string" }
```
> Note: KHÔNG trả về xpEarned/coinEarned. XP chỉ được cấp khi user claim Daily Mission reward.

### POST /api/study-sessions/{sessionId}/finish
```
Response 200 OK (no body)
```
> Note: Trả về Void — không có JSON body. Chỉ cập nhật finishedAt và trigger mission tracking.

### GET /api/study-sessions/dashboard
```json
Response 200: {
  "dailyGoal": "int", "dailyProgress": "int",
  "totalWords": "int", "masteredWords": "int",
  "accuracy": "double", "streak": "int"
}
```

### GET /api/study-sessions/recent
```json
Response 200: [{ "word": "string", "rating": "AGAIN|HARD|GOOD|EASY", "reviewedAt": "datetime" }]
```

---

## 6. Quiz (`/api/quiz`)

### GET /api/quiz/random?deckId={deckId}
```json
Response 200: { "questionId": "long", "question": "string", "options": ["string×4"],
  "correctIndex": "int" }
```

### POST /api/quiz/answer
```json
Request: { "questionId": "long", "selectedIndex": "int" }
Response 200: { "correct": "boolean", "xpEarned": "int", "explanation": "string" }
```

---

## 7. Pets (`/api/pets`)

### GET /api/pets/me
```json
Response 200: { "id": "long", "name": "string", "species": "string",
  "mood": "HAPPY|SAD|CRYING|WAITING", "level": "int", "xp": "int",
  "xpToNextLevel": "int" }
```
> Note: level và xp hiện luôn = 1 và 0 (backend stub). Phase 1 sẽ implement grantPetReward() để cập nhật các field này.

### GET /api/pets/unlocked
```json
Response 200: [PetResponse]
```

### GET /api/pets/starter
```json
Response 200: [{ "species": "string", "description": "string", "unlockCondition": "string" }]
```

### POST /api/pets/unlock
```json
Request: { "species": "CAT|FOX|BUNNY|PANDA|DRAGON" }
Response 200: PetResponse
```

### POST /api/pets/select
```json
Request: { "petId": "long" }
Response 200: PetResponse
```

---

## 8. Companion (`/api/companion`)

### GET /api/companion/state
```json
Response 200: { "mood": "string", "energy": "int", "intent": "string",
  "message": "string", "action": "IDLE|WALK|STUDY|CELEBRATE|..." }
```

### GET /api/companion/learning-profile
```json
Response 200: { "usualStudyHour": "int", "studyDays": "int",
  "averageSessionMinutes": "int", "totalSessionsTogether": "int" }
```

### POST /api/companion/events
```json
Request: { "eventType": "APP_OPENED|STUDY_STARTED|REVIEW_COMPLETED|SESSION_COMPLETED|ANSWER_CORRECT|ANSWER_WRONG|DAILY_GOAL_COMPLETED|STREAK_BROKEN" }
Response 200: CompanionStateResponse
```

### PATCH /api/companion/preferences
```json
Request: { "personality": "GENTLE|PLAYFUL|FOCUSED",
  "remindersEnabled": "boolean", "quietHoursStart": "int", "quietHoursEnd": "int" }
Response 200: CompanionStateResponse (full state, same as GET /state)
```

---

## 9. Missions (`/api/missions`)

### GET /api/missions/daily
```json
Response 200: [{ "id": "long", "title": "string", "description": "string",
  "type": "MissionType", "target": "int", "currentValue": "int",
  "completed": "boolean", "rewardClaimed": "boolean",
  "rewardXp": "int", "rewardCoin": "int" }]
```

### POST /api/missions/{missionId}/claim
```json
Response 200: { "xpEarned": "int", "coinEarned": "int" }
```

---

## 10. Achievements (`/api/achievements`)

### GET /api/achievements/me
```json
Response 200: [{ "code": "string", "name": "string", "description": "string",
  "type": "AchievementType", "target": "int", "progress": "int",
  "unlocked": "boolean", "unlockedAt": "datetime|null",
  "rewardXp": "int" }]
```

---

## 11. Bookmarks (`/api/bookmarks`)

### GET /api/bookmarks
```json
Response 200: [{ "id": "long", "vocabulary": VocabularyResponse }]
```

### POST /api/bookmarks/{vocabularyId}
```json
Response 201: BookmarkResponse
```

### DELETE /api/bookmarks/{vocabularyId}
```
Response 204: (no content)
```

---

## 12. Reader AI (`/api/reader`)

### POST /api/reader/generate-flashcards
```json
Request: { "text": "string (highlighted text from PDF)" }
Response 200: { "cards": [{ "word": "string", "meaning": "string", "example": "string" }] }
Response 429: GeminiQuotaExceededException
```

### POST /api/reader/suggest-vocabulary
```json
Request: { "text": "string" }
Response 200: { "suggestions": [{ "word": "string", "meaning": "string", "partOfSpeech": "string" }] }
```

---

## 13. NEW — Kana Progress (`/api/japanese/kana`) — Phase 1

> **Frontend route note:** UI route đổi từ `/app/japanese/kana` → `/app/japanese/alphabet`.
> Backend API path `/api/japanese/kana/*` **không thay đổi**.

### Romaji normalization (frontend-side)
Trước khi so sánh câu trả lời user nhập:
1. `toLowerCase()` + `trim()`
2. Check canonical romaji (e.g. "kya")
3. Check ROMAJI_VARIANTS nếu không khớp canonical:
   - shi ↔ si, chi ↔ ti, tsu ↔ tu, fu ↔ hu
   - sha ↔ sya, shu ↔ syu, sho ↔ syo
   - cha ↔ tya/cya, chu ↔ tyu/cyu, cho ↔ tyo/cyo
   - ja ↔ jya/zya, ju ↔ jyu/zyu, jo ↔ jyo/zyo

> `isCorrect` gửi về backend = `true` chỉ khi user **tự nhập đúng** (không nhấn Reveal trước).
> User nhấn Reveal và chọn "Got it" → ghi `isCorrect: false` (không tự nhớ).

### POST /api/japanese/kana/attempts

Submit kết quả 1 lần quiz. Idempotent qua `clientAttemptId`.

**Validation rules:**
- `script` phải là `"hiragana"` hoặc `"katakana"`
- `section` phải là `"basic"`, `"dakuten"`, `"handakuten"`, hoặc `"yoon"`
- `score` ≥ 0 và ≤ `total`
- `total` ≥ 1
- `answers.length` == `total`
- Mỗi `answers[].kana` phải là ký tự hợp lệ của script+section đó
- `clientAttemptId` là UUID v4 hợp lệ (optional nhưng khuyến khích)

```json
Request:
{
  "clientAttemptId": "550e8400-e29b-41d4-a716-446655440000",
  "script": "hiragana",
  "section": "basic",
  "score": 8,
  "total": 10,
  "durationSeconds": 45,
  "answers": [
    { "kana": "あ", "isCorrect": true },
    { "kana": "い", "isCorrect": false },
    { "kana": "う", "isCorrect": true }
  ]
}

Response 201 (new attempt):
{
  "attemptId": 123,
  "script": "hiragana",
  "section": "basic",
  "score": 8,
  "total": 10,
  "accuracy": 0.8,
  "completedAt": "2026-11-16T10:30:00",
  "weakKana": [
    { "kana": "い", "romaji": "i", "wrongCount": 3, "accuracy": 0.25 }
  ],
  "isNew": true
}

Response 200 (duplicate clientAttemptId — idempotent):
{ ...same response as 201..., "isNew": false }

Response 400: validation errors
{
  "message": "Invalid script value: 'invalid'. Must be hiragana or katakana.",
  "field": "script"
}
```

---

### GET /api/japanese/kana/progress

Tiến độ tổng quan theo từng script và section. Bao gồm cả section chưa học (totalKana từ catalog constants).

```json
Response 200:
{
  "sections": [
    {
      "script": "hiragana",
      "section": "basic",
      "totalKana": 46,
      "seen": 20,
      "mastered": 10,
      "needsImprovement": 5,
      "notYetSeen": 26,
      "overallAccuracy": 0.72,
      "lastAttempted": "2026-11-16T10:30:00"
    },
    {
      "script": "hiragana",
      "section": "dakuten",
      "totalKana": 20,
      "seen": 0,
      "mastered": 0,
      "needsImprovement": 0,
      "notYetSeen": 20,
      "overallAccuracy": null,
      "lastAttempted": null
    },
    { "script": "katakana", "section": "basic", "totalKana": 46, ... },
    ...
  ]
}
```

**Field definitions:**
- `totalKana`: hardcoded catalog size (46/20/5/33 per section)
- `seen`: số kana user đã gặp ít nhất 1 lần
- `mastered`: kana với `mastered = true` (correctCount ≥ 5, accuracy ≥ 80%)
- `needsImprovement`: seen nhưng `wrongCount > 0 AND !mastered`
- `notYetSeen`: `totalKana - seen`
- `overallAccuracy`: trung bình accuracy của tất cả `seen` kana, `null` nếu chưa học

---

### GET /api/japanese/kana/progress/weak?script=hiragana

Danh sách kana yếu nhất cần luyện thêm, có thứ tự ưu tiên.

**Query params:**
- `script` (required): `"hiragana"` hoặc `"katakana"`
- `section` (optional): filter theo section cụ thể
- `limit` (optional, default 20): số lượng tối đa trả về

**Sort order (priority luyện tập):**
1. `accuracy ASC` — accuracy thấp nhất trước
2. `wrong_count DESC` — nhiều lần sai nhất
3. `last_seen_at ASC` — lâu không ôn nhất

```json
Response 200: [
  {
    "kana": "へ",
    "romaji": "he",
    "script": "hiragana",
    "section": "basic",
    "correctCount": 1,
    "wrongCount": 4,
    "totalSeen": 5,
    "accuracy": 0.2,
    "mastered": false,
    "lastSeenAt": "2026-11-14T08:00:00"
  },
  {
    "kana": "ゑ",
    "romaji": "we",
    "script": "hiragana",
    "section": "basic",
    "correctCount": 0,
    "wrongCount": 3,
    "totalSeen": 3,
    "accuracy": 0.0,
    "mastered": false,
    "lastSeenAt": "2026-11-15T09:30:00"
  }
]
```

---

## 14. Future — Japanese Kanji (Phase 3), Grammar (Phase 4), JLPT (Phase 5)

> Chưa implement. Placeholder để track future API design.

```
Phase 3: GET /api/japanese/kanji?level=N5
         GET /api/japanese/kanji/{id}
         POST /api/japanese/kanji/attempts

Phase 4: GET /api/japanese/grammar?level=N5
         GET /api/japanese/grammar/{id}

Phase 5: POST /api/japanese/jlpt/practice?level=N5
         GET  /api/japanese/jlpt/history
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthenticated (missing or expired token) |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Conflict (email exists, duplicate bookmark) |
| 429 | Gemini API quota exceeded |
| 500 | Internal server error |

```json
Error body: { "message": "string", "timestamp": "datetime" }
```
