# TANGO_API_SPEC — Hợp đồng API Tango

**Liên quan:** [TANGO_DATABASE.md](TANGO_DATABASE.md), [TANGO_PRD.md](TANGO_PRD.md).
**Base path:** `/api/japanese/tango`
**Auth:** `Authorization: Bearer <JWT>` (cùng cơ chế với `/api/**` hiện có; user lấy từ `CurrentUserService`).
**Content-Type:** `application/json`
**Trạng thái:** Thiết kế, chưa triển khai.

---

## 0. Quy ước chung

### Lỗi
Dùng `ErrorResponse` hiện có (`dto/AuthRe/ErrorResponse`: `status`, `message`, `timestamp`). Thêm trường `code` (chuỗi cố định) là tùy chọn, đề xuất thêm để frontend phân biệt lỗi.

```json
{ "status": 400, "code": "ANSWER_NOT_IN_LESSON", "message": "Vocabulary 42 is not in lesson 7", "timestamp": "2026-11-17T10:00:00" }
```

| HTTP | code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Thiếu trường, sai enum, sai kiểu |
| 400 | `ANSWER_NOT_IN_LESSON` | `vocabularyId` không thuộc lesson hoặc không required |
| 401 | — | Thiếu/sai JWT (đã có từ SecurityConfig) |
| 404 | `LESSON_NOT_FOUND` | Lesson không tồn tại hoặc `published=false` |
| 404 | `VOCABULARY_NOT_FOUND` | Từ không tồn tại |
| 409 | `LESSON_HAS_NO_REQUIRED_WORDS` | Lesson không có từ required để làm quiz |

Lưu ý: `GlobalExceptionHandler` hiện chưa xử lý `MethodArgumentNotValidException`. Cần thêm handler trả `VALIDATION_FAILED` cho Tango (hoặc chung).

### Danh sách và phân trang
Các endpoint danh sách nhận `page` (≥ 0, mặc định 0) và `size` (1–100, mặc định 20) khi trả nhiều bản ghi. Lesson và từ trong một lesson là danh sách nhỏ nên trả hết, không phân trang ở MVP.

### Enum
- `level`: `N5`, `N4`, `N3`, `N2`, `N1`
- `mode`: `JP_TO_MEANING`, `VI_TO_JP`, `MIXED`
- `scope`: `ALL`, `MISTAKES`
- `status` (từ): `NEW`, `LEARNING`, `MASTERED`, `NEED_REVIEW`
- `status` (lesson): `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` (NOT_STARTED là trạng thái suy ra, không lưu)

---

## 1. Endpoint theo yêu cầu

### 1.1 `GET /levels`

Danh sách level kèm thống kê của user.

**Response 200**
```json
{
  "levels": [
    {
      "level": "N5",
      "lessonCount": 25,
      "vocabularyCount": 800,
      "userSummary": { "new": 600, "learning": 120, "mastered": 60, "needReview": 20 },
      "completedLessons": 3
    }
  ]
}
```
- Level không có lesson đã publish: vẫn trả, `lessonCount = 0`. Frontend hiển thị empty state.

---

### 1.2 `GET /lessons?level=N5`

**Query:** `level` (bắt buộc, enum). Không có → 400 `VALIDATION_FAILED`.

**Response 200**
```json
{
  "level": "N5",
  "lessons": [
    {
      "id": 101,
      "lessonNumber": 1,
      "title": "Greetings",
      "vocabularyCount": 20,
      "requiredCount": 20,
      "viewedCount": 12,
      "status": "IN_PROGRESS",
      "progressPercent": 60,
      "lastStudiedAt": "2026-11-16T20:10:00"
    }
  ]
}
```
- `progressPercent` = `viewedCount / requiredCount` nếu chưa completed; `100` nếu completed.
- Sắp xếp theo `sortOrder`.

---

### 1.3 `GET /lessons/{id}`

**Response 200**
```json
{
  "id": 101,
  "jlptLevel": "N5",
  "lessonNumber": 1,
  "title": "Greetings",
  "description": "Chào hỏi cơ bản",
  "vocabularyCount": 20,
  "requiredCount": 20,
  "status": "IN_PROGRESS",
  "quizPassed": false,
  "bestQuizAccuracy": 0.7,
  "lastPosition": 5,
  "lastStudiedAt": "2026-11-16T20:10:00"
}
```
**Error:** 404 `LESSON_NOT_FOUND`.

---

### 1.4 `GET /lessons/{id}/vocabularies`

**Response 200**
```json
{
  "lessonId": 101,
  "vocabularies": [
    {
      "id": 5001,
      "position": 1,
      "required": true,
      "expression": "こんにちは",
      "kana": "こんにちは",
      "romaji": "konnichiwa",
      "partOfSpeech": "EXPRESSION",
      "primaryMeaning": "xin chào",
      "status": "LEARNING",
      "viewed": true,
      "favorite": false,
      "audioUrl": null
    }
  ]
}
```
- `expression` có thể `null`. Frontend hiển thị `expression ?? kana`.
- Trả `meanings` và `examples` ở endpoint chi tiết từ (1.11), không ở đây, để giảm payload.

---

### 1.5 `POST /lessons/{id}/start`

Đánh dấu bắt đầu học. **Idempotent**: nếu đã có progress thì trả lại trạng thái hiện tại, không ghi lại `startedAt`.

**Request:** không có body.

**Response 200** (đã có) hoặc **201** (vừa tạo)
```json
{ "lessonId": 101, "status": "IN_PROGRESS", "startedAt": "2026-11-17T09:00:00", "lastPosition": null, "created": true }
```
**Error:** 404 `LESSON_NOT_FOUND`.

---

### 1.6 `POST /lessons/{id}/study-progress`

Ghi nhận các từ đã xem. **Idempotent**: gọi lại không đổi `viewed_at` đã có.

**Request**
```json
{ "vocabularyIds": [5001, 5002], "lastPosition": 2 }
```

| Trường | Bắt buộc | Quy tắc |
|---|---|---|
| vocabularyIds | có | 1–50 phần tử, không trùng, mỗi id phải thuộc lesson (cả required lẫn không required) |
| lastPosition | không | ≥ 1; nếu có thì cập nhật `last_position` |

**Response 200**
```json
{
  "lessonId": 101,
  "viewedCount": 14,
  "requiredCount": 20,
  "lessonStatus": "IN_PROGRESS",
  "newlyViewed": 2
}
```
- Nếu sau khi ghi, mọi required đã viewed và `quizPassed = true` thì `lessonStatus = COMPLETED`. Điều kiện xem mục 4.2 của PRD.

**Error:** 400 `VALIDATION_FAILED` (rỗng, quá 50, sai kiểu), 400 `ANSWER_NOT_IN_LESSON` (id không thuộc lesson), 404 `LESSON_NOT_FOUND`.

---

### 1.7 `GET /lessons/{id}/quiz`

Sinh bộ câu hỏi. **Không** trả đáp án.

**Query**

| Param | Mặc định | Giá trị |
|---|---|---|
| mode | `MIXED` | `JP_TO_MEANING`, `VI_TO_JP`, `MIXED` |
| scope | `ALL` | `ALL` (mọi required), `MISTAKES` (required có status NEED_REVIEW) |

**Response 200**
```json
{
  "lessonId": 101,
  "mode": "MIXED",
  "scope": "ALL",
  "totalQuestions": 20,
  "questions": [
    { "vocabularyId": 5004, "mode": "JP_TO_MEANING", "prompt": { "text": "学校", "kana": "がっこう" }, "inputType": "TEXT" },
    { "vocabularyId": 5001, "mode": "VI_TO_JP", "prompt": { "text": "xin chào" }, "inputType": "TEXT" }
  ]
}
```
- `questions` đã được xáo ngẫu nhiên ở server (mỗi lần gọi khác nhau).
- Mỗi từ xuất hiện đúng một lần.
- `scope = MISTAKES` và không có từ NEED_REVIEW → 200 với `totalQuestions: 0`, `questions: []`. Frontend hiển thị empty state.
- `totalQuestions = 0` với scope ALL → 409 `LESSON_HAS_NO_REQUIRED_WORDS`.

**Error:** 400 `VALIDATION_FAILED` (mode/scope sai), 404 `LESSON_NOT_FOUND`.

---

### 1.8 `POST /lessons/{id}/attempts`

Nộp bài. Backend chấm điểm. **Idempotent theo `clientAttemptId`.**

**Request**
```json
{
  "clientAttemptId": "9b1e6f2a-6d3c-4f2e-9a2b-3c1d2e3f4a5b",
  "mode": "MIXED",
  "scope": "ALL",
  "durationSeconds": 240,
  "answers": [
    { "vocabularyId": 5004, "mode": "JP_TO_MEANING", "answer": "trường học" },
    { "vocabularyId": 5001, "mode": "VI_TO_JP", "answer": "こんにちは" }
  ]
}
```

| Trường | Bắt buộc | Quy tắc |
|---|---|---|
| clientAttemptId | có | UUID v4, ≤ 64 ký tự |
| mode | có | `JP_TO_MEANING`, `VI_TO_JP`, `MIXED` (MIXED chỉ là tham số quiz; `answers[].mode` phải là dạng cụ thể) |
| scope | có | `ALL`, `MISTAKES` |
| durationSeconds | không | 0–86400 |
| answers | có | 1–100 phần tử; mỗi `vocabularyId` một lần |
| answers[].mode | có | `JP_TO_MEANING` hoặc `VI_TO_JP` |
| answers[].answer | có | chuỗi, 0–255 ký tự; chuỗi rỗng được chấp nhận và tính sai |

**Trường bị bỏ qua:** `isCorrect`, `score`, `accuracy`, `correctCount` nếu frontend gửi. Backend không đọc các trường này.

**Quy trình backend (trong một transaction):**
1. Nếu `(user, clientAttemptId)` đã tồn tại → trả kết quả cũ với `replayed: true` (HTTP 200).
2. Kiểm tra mọi `vocabularyId` thuộc lesson và `required`. Sai → 400 `ANSWER_NOT_IN_LESSON`.
3. Với `scope = MISTAKES`: chỉ chấp nhận từ đang NEED_REVIEW; ngoài tập đó → 400 `ANSWER_NOT_IN_LESSON`.
4. Normalize và chấm từng câu (mục 3).
5. Ghi `tango_quiz_attempts`, `tango_quiz_answers`.
6. Cập nhật `user_tango_vocabulary_progress` (answered/correct/incorrect, last_answered_at, status).
7. Cập nhật `user_tango_lesson_progress` (best accuracy, quiz_passed nếu scope ALL và đạt ngưỡng, COMPLETED nếu đủ điều kiện).

**Response 201** (mới)
```json
{
  "attemptId": 77,
  "replayed": false,
  "lessonId": 101,
  "mode": "MIXED",
  "scope": "ALL",
  "totalQuestions": 2,
  "correctCount": 1,
  "incorrectCount": 1,
  "accuracy": 0.5,
  "passed": false,
  "lessonStatus": "IN_PROGRESS",
  "results": [
    { "vocabularyId": 5004, "mode": "JP_TO_MEANING", "isCorrect": true, "submittedAnswer": "trường học", "correctAnswers": ["trường học", "trường"] },
    { "vocabularyId": 5001, "mode": "VI_TO_JP", "isCorrect": false, "submittedAnswer": "こんにちは", "correctAnswers": ["こんにちは", "コンニチハ"] }
  ],
  "submittedAt": "2026-11-17T09:20:00"
}
```
- `correctAnswers` trả về **sau khi nộp** để hiển thị kết quả. Không có trước khi nộp.
- `replayed: true` trả HTTP 200 với cùng body.
- `accuracy` làm tròn 4 chữ số thập phân.

**Error:** 400 `VALIDATION_FAILED`, 400 `ANSWER_NOT_IN_LESSON`, 404 `LESSON_NOT_FOUND`, 409 `ATTEMPT_CONFLICT` (hai request cùng `clientAttemptId` đang xử lý song song và một bên thất bại do ràng buộc unique; server thử lại một lần, nếu vẫn lỗi thì trả 409).

---

### 1.9 `GET /progress`

Tổng quan tiến độ của user.

**Query:** `level` (tùy chọn).

**Response 200**
```json
{
  "level": "N5",
  "words": { "new": 600, "learning": 120, "mastered": 60, "needReview": 20, "total": 800 },
  "lessons": { "notStarted": 20, "inProgress": 4, "completed": 3, "total": 25 },
  "continueLearning": { "lessonId": 101, "lessonNumber": 1, "title": "Greetings", "lastPosition": 5 },
  "recentAttempts": [
    { "attemptId": 77, "lessonId": 101, "scope": "ALL", "accuracy": 0.5, "submittedAt": "2026-11-17T09:20:00" }
  ]
}
```
- `continueLearning`: lesson có `last_studied_at` mới nhất và chưa COMPLETED; nếu không có thì `null` (frontend hiển thị lesson đầu tiên chưa completed).
- `recentAttempts`: tối đa 5.

---

### 1.10 `GET /progress/weak`

**Query**

| Param | Mặc định | Quy tắc |
|---|---|---|
| level | không | nếu có thì lọc theo level |
| limit | 20 | 1–100 |

**Response 200**
```json
{
  "items": [
    {
      "vocabularyId": 5004,
      "expression": "学校",
      "kana": "がっこう",
      "primaryMeaning": "trường học",
      "status": "NEED_REVIEW",
      "answeredCount": 4,
      "correctCount": 1,
      "incorrectCount": 3,
      "accuracy": 0.25,
      "lastAnsweredAt": "2026-11-17T09:20:00"
    }
  ]
}
```
- Chỉ trả từ có `answeredCount > 0`. Sắp xếp theo PRD mục 4.3.

---

### 1.11 `GET /vocabularies/{id}`

**Response 200**
```json
{
  "id": 5004,
  "expression": "学校",
  "kana": "がっこう",
  "romaji": "gakkou",
  "partOfSpeech": "NOUN",
  "audioUrl": null,
  "meanings": [
    { "meaning": "trường học", "isPrimary": true, "note": null },
    { "meaning": "trường", "isPrimary": false, "note": null }
  ],
  "examples": [
    { "japanese": "学校に行きます。", "reading": "がっこうにいきます。", "vietnamese": "Tôi đi học." }
  ],
  "lessons": [{ "lessonId": 101, "jlptLevel": "N5", "lessonNumber": 1 }],
  "progress": { "status": "NEED_REVIEW", "viewed": true, "answeredCount": 4, "accuracy": 0.25, "favorite": false }
}
```
- `progress` là `null` nếu user chưa có bản ghi.
- **Error:** 404 `VOCABULARY_NOT_FOUND`.

---

## 2. Endpoint bổ sung (đề xuất, ngoài danh sách ban đầu)

### 2.1 `PUT /vocabularies/{id}/favorite` và `DELETE /vocabularies/{id}/favorite`
Idempotent. PUT tạo, DELETE xóa.
- **Response 200:** `{ "vocabularyId": 5004, "favorite": true }`
- **Error:** 404 `VOCABULARY_NOT_FOUND`.

### 2.2 `GET /favorites`
- **Query:** `page`, `size`.
- **Response 200:** `{ "items": [ { "vocabularyId": 5004, "expression": "学校", "kana": "がっこう", "primaryMeaning": "trường học" } ], "page": 0, "size": 20, "total": 1 }`

### 2.3 `GET /search`
- **Query:** `q` (bắt buộc, 1–100 ký tự, trim), `level` (tùy chọn), `type` (`lessons` | `vocabularies`, mặc định cả hai).
- **Chuẩn hóa `q`:** NFKC, katakana→hiragana, lowercase romaji.
- **Response 200:** `{ "lessons": [ ... ], "vocabularies": [ ... ] }`, mỗi nhóm tối đa 20.
- **Error:** 400 `VALIDATION_FAILED` nếu `q` rỗng sau trim.

Ghi chú: danh sách 1.2 không có tham số `q`. Nếu không muốn thêm endpoint search, có thể thêm `q` vào `GET /lessons`.

---

## 3. Chuẩn hóa và chấm đáp án

Áp dụng cho `answer` và đáp án đúng khi chấm:

| Bước | `JP_TO_MEANING` (đáp án là tiếng Việt) | `VI_TO_JP` (đáp án là tiếng Nhật) |
|---|---|---|
| 1 | Unicode NFC | Unicode NFKC (full-width → half-width, ｶﾀｶﾅ → カタカナ) |
| 2 | Trim, gộp khoảng trắng liên tiếp thành một | Xóa mọi khoảng trắng |
| 3 | Lowercase (`toLowerCase(Locale.forLanguageTag("vi"))`) | Katakana → hiragana |
| 4 | Bỏ dấu câu cuối (`.`, `!`, `?`, `。`) | Bỏ dấu câu cuối |
| 5 | Nếu `ignore-vietnamese-diacritics = true` thì bỏ dấu | — |
| So sánh | Khớp **một trong** các nghĩa của vocabulary | Khớp `kana` **hoặc** `expression` (sau cùng chuẩn hóa) |

- Romaji **không** được chấp nhận ở MVP.
- Chuỗi rỗng → sai.
- `normalized_answer` được lưu để audit.

---

## 4. Idempotency

| Endpoint | Cơ chế | Lặp lại trả về |
|---|---|---|
| `POST /lessons/{id}/start` | Kiểm tra bản ghi progress | 200 với trạng thái hiện tại |
| `POST /lessons/{id}/study-progress` | Upsert, `viewed_at` chỉ ghi lần đầu | 200 với trạng thái hiện tại |
| `POST /lessons/{id}/attempts` | `(user, clientAttemptId)` unique | 200 `replayed: true`, cùng body |
| `PUT /vocabularies/{id}/favorite` | Upsert | 200 |

---

## 5. Test scenarios API

| ID | Endpoint | Kịch bản | Kết quả mong đợi |
|---|---|---|---|
| A-01 | tất cả | Không có JWT | 401 |
| A-02 | `/lessons` | Thiếu `level` | 400 `VALIDATION_FAILED` |
| A-03 | `/lessons` | `level=N6` | 400 `VALIDATION_FAILED` |
| A-04 | `/lessons/{id}` | Lesson `published=false` | 404 `LESSON_NOT_FOUND` |
| A-05 | `/start` | Gọi hai lần | Lần 1: 201 `created: true`; lần 2: 200 `created: false`, `startedAt` không đổi |
| A-06 | `/study-progress` | `vocabularyIds` rỗng | 400 |
| A-07 | `/study-progress` | Có id không thuộc lesson | 400 `ANSWER_NOT_IN_LESSON` |
| A-08 | `/study-progress` | Gọi lại cùng id | 200, `newlyViewed: 0` |
| A-09 | `/quiz` | `mode=FOO` | 400 |
| A-10 | `/quiz` | scope MISTAKES không có NEED_REVIEW | 200, `questions: []` |
| A-11 | `/quiz` | Response không chứa trường đáp án | Đúng |
| A-12 | `/quiz` | Gọi hai lần | Thứ tự câu hỏi khác nhau (xác suất cao), cùng tập `vocabularyId` |
| A-13 | `/attempts` | Gửi `isCorrect: true` sai | Backend chấm lại, `isCorrect` trong kết quả đúng với đáp án |
| A-14 | `/attempts` | Cùng `clientAttemptId` hai lần | Lần 2: 200 `replayed: true`, không có bản ghi mới |
| A-15 | `/attempts` | `VI_TO_JP`, answer `ホン` cho từ `本` (kana `ほん`) | `isCorrect: true` |
| A-16 | `/attempts` | `VI_TO_JP`, answer `hon` | `isCorrect: false` |
| A-17 | `/attempts` | `JP_TO_MEANING`, answer `Trường Học.` | `isCorrect: true` |
| A-18 | `/attempts` | answer `""` | `isCorrect: false`, không lỗi |
| A-19 | `/attempts` | scope ALL, accuracy 0.8, scope ALL | `passed: true`; lesson COMPLETED nếu đã viewed hết |
| A-20 | `/attempts` | scope MISTAKES accuracy 1.0 | `passed: false` (không tính quiz_passed) |
| A-21 | `/progress/weak` | User không có answer | `items: []` |
| A-22 | `/vocabularies/{id}` | Từ không tồn tại | 404 `VOCABULARY_NOT_FOUND` |
| A-23 | `/search` | `q` chỉ có khoảng trắng | 400 |
| A-24 | `/attempts` | Hai request song song cùng `clientAttemptId` | Một bản ghi duy nhất |
