# TANGO_DATABASE — Thiết kế dữ liệu Tango

**Liên quan:** [TANGO_PRD.md](TANGO_PRD.md) mục 4 và 6, [TANGO_API_SPEC.md](TANGO_API_SPEC.md).
**Trạng thái:** Thiết kế. **Chưa tạo entity, repository hay migration.**

## 1. Đánh giá hiện trạng

| Thành phần hiện có | Dùng cho Tango? | Lý do |
|---|---|---|
| `User` (`entity/User.java`) | **Có** | Định danh chung. Không tạo User mới. |
| `CurrentUserService` | **Có** | Lấy user từ JWT. |
| `KanaAttempt` (`clientAttemptId` unique) | **Mẫu** | Áp dụng cùng pattern idempotency. |
| `GlobalExceptionHandler` + `ErrorResponse` | **Có** | Thêm handler cho lỗi Tango nếu cần. |
| `Vocabulary` | **Không** | Bắt buộc `deck_id NOT NULL`, mỗi user một bản. |
| `UserVocabularyProgress` | **Không** | Trạng thái FSRS (stability, difficulty, nextReviewTime), không đúng với accuracy-based. |
| `Status` enum | **Không** | Thiếu `NEED_REVIEW`; dùng chung với FSRS. |
| `PartOfSpeech` enum | **Không** | Thiếu các loại tiếng Nhật. |
| `Pet`, `UserReward`, `UserMission`, `UserAchievement` | **Không** | Ngoài phạm vi (yêu cầu). |
| `spring.jpa.hibernate.ddl-auto: update` | Ghi nhận | Không có Flyway/Liquibase. Xem rủi ro trong PRD mục 8. |

## 2. Sơ đồ quan hệ

```
users (có sẵn)
  │
  ├─< user_tango_lesson_progress >─┐
  ├─< user_tango_vocabulary_progress >─┐
  ├─< user_tango_favorites >──────────┐│
  └─< tango_quiz_attempts >──┐        ││
                             │        ││
tango_lessons ─< tango_lesson_vocabularies >─ tango_vocabularies ─< tango_vocabulary_meanings
     │   (level, number)     (position, required)   │
     │                                              ├─< tango_vocabulary_examples
     └─────────────── (lesson_id) ── user_tango_lesson_progress
                                     tango_quiz_answers >─ tango_quiz_attempts
                                     tango_quiz_answers >─ tango_vocabularies
```

Quan hệ chính:
- `tango_lessons` 1—N `tango_lesson_vocabularies` N—1 `tango_vocabularies` → **N-N** giữa lesson và từ.
- `tango_vocabularies` 1—N meanings, 1—N examples.
- Tiến độ theo user: một bản ghi cho mỗi `(user, vocabulary)` và mỗi `(user, lesson)`.

## 3. Bảng

### 3.1 `tango_lessons`

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| id | BIGINT PK AI | no | |
| jlpt_level | VARCHAR(2) | no | `N5`…`N1` (enum `JlptLevel`) |
| lesson_number | INT | no | ≥ 1 |
| title | VARCHAR(120) | no | |
| description | TEXT | yes | |
| sort_order | INT | no | mặc định = lesson_number |
| published | BOOLEAN | no | mặc định `true` |
| created_at / updated_at | DATETIME | no | |

- UNIQUE `(jlpt_level, lesson_number)`
- INDEX `(jlpt_level, sort_order)`

### 3.2 `tango_vocabularies`

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| id | BIGINT PK AI | no | |
| expression | VARCHAR(64) | yes | dạng kanji, ví dụ `本` |
| expression_key | VARCHAR(64) | no | `COALESCE(expression, '')`, dùng để unique |
| kana | VARCHAR(64) | no | hiragana chuẩn, ví dụ `ほん` |
| romaji | VARCHAR(64) | no | hiển thị, không dùng để chấm |
| part_of_speech | VARCHAR(32) | no | enum `TangoPartOfSpeech` |
| audio_url | VARCHAR(255) | yes | để dành |
| created_at / updated_at | DATETIME | no | |

- UNIQUE `(kana, expression_key)`. Lý do dùng `expression_key`: MySQL cho phép nhiều NULL trong unique index, nên không dùng trực tiếp cột `expression`.
- `TangoPartOfSpeech`: `NOUN`, `VERB_GODAN`, `VERB_ICHIDAN`, `VERB_IRREGULAR`, `I_ADJECTIVE`, `NA_ADJECTIVE`, `ADVERB`, `PARTICLE`, `COUNTER`, `EXPRESSION`, `OTHER`.

### 3.3 `tango_vocabulary_meanings`

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| id | BIGINT PK AI | no | |
| vocabulary_id | BIGINT FK → tango_vocabularies | no | ON DELETE CASCADE |
| language | CHAR(2) | no | mặc định `vi` |
| meaning | VARCHAR(255) | no | |
| is_primary | BOOLEAN | no | đúng một nghĩa chính cho mỗi từ |
| sort_order | INT | no | |
| note | VARCHAR(255) | yes | |

- UNIQUE `(vocabulary_id, language, meaning)`
- Mọi nghĩa đều là **đáp án được chấp nhận** khi chấm `JP_TO_MEANING`.

### 3.4 `tango_vocabulary_examples`

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| id | BIGINT PK AI | no | |
| vocabulary_id | BIGINT FK | no | ON DELETE CASCADE |
| japanese | TEXT | no | |
| reading | TEXT | yes | cách đọc kana cho câu |
| vietnamese | TEXT | no | |
| sort_order | INT | no | |

- UNIQUE `(vocabulary_id, sort_order)`

### 3.5 `tango_lesson_vocabularies`

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| id | BIGINT PK AI | no | |
| lesson_id | BIGINT FK → tango_lessons | no | |
| vocabulary_id | BIGINT FK → tango_vocabularies | no | |
| position | INT | no | ≥ 1, thứ tự trong lesson |
| required | BOOLEAN | no | mặc định `true` |

- UNIQUE `(lesson_id, vocabulary_id)` — một từ không lặp trong cùng lesson
- UNIQUE `(lesson_id, position)`
- INDEX `(vocabulary_id)` — để tìm các lesson chứa một từ

### 3.6 `user_tango_lesson_progress`

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| id | BIGINT PK AI | no | |
| user_id | BIGINT FK → users | no | |
| lesson_id | BIGINT FK → tango_lessons | no | |
| status | VARCHAR(16) | no | `IN_PROGRESS`, `COMPLETED`. Không có bản ghi = NOT_STARTED |
| started_at | DATETIME | no | |
| last_studied_at | DATETIME | yes | |
| last_position | INT | yes | vị trí `position` đã xem gần nhất (để resume) |
| quiz_passed | BOOLEAN | no | có attempt scope ALL đạt ngưỡng |
| best_quiz_accuracy | DECIMAL(5,4) | yes | |
| completed_at | DATETIME | yes | |

- UNIQUE `(user_id, lesson_id)`
- INDEX `(user_id, status)`

Phần đã xem (viewed) được **tính từ** `user_tango_vocabulary_progress.viewed_at` và `tango_lesson_vocabularies.required`, không lưu số đếm để tránh lệch.

### 3.7 `user_tango_vocabulary_progress`

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| id | BIGINT PK AI | no | |
| user_id | BIGINT FK → users | no | |
| vocabulary_id | BIGINT FK → tango_vocabularies | no | |
| status | VARCHAR(16) | no | `NEW`, `LEARNING`, `MASTERED`, `NEED_REVIEW` (mặc định NEW) |
| viewed_at | DATETIME | yes | lần đầu mở ở Learning Mode |
| answered_count | INT | no | mặc định 0 |
| correct_count | INT | no | mặc định 0 |
| incorrect_count | INT | no | mặc định 0 |
| last_answered_at | DATETIME | yes | |
| mastered_at | DATETIME | yes | lần gần nhất chuyển sang MASTERED |
| version | BIGINT | no | `@Version`, chống ghi đè khi cập nhật song song |

- UNIQUE `(user_id, vocabulary_id)` — **tiến độ theo từ, xuyên suốt các lesson**
- INDEX `(user_id, status)`
- INDEX `(user_id, last_answered_at)`
- Không có cột `accuracy`: tính `correct_count / answered_count`. Có thể thêm cột nếu cần sort ở DB.

### 3.8 `user_tango_favorites`

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| id | BIGINT PK AI | no | |
| user_id | BIGINT FK | no | |
| vocabulary_id | BIGINT FK | no | |
| created_at | DATETIME | no | |

- UNIQUE `(user_id, vocabulary_id)`

### 3.9 `tango_quiz_attempts`

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| id | BIGINT PK AI | no | |
| user_id | BIGINT FK | no | |
| lesson_id | BIGINT FK | no | |
| client_attempt_id | VARCHAR(64) | no | UUID do frontend sinh |
| mode | VARCHAR(20) | no | `JP_TO_MEANING`, `VI_TO_JP`, `MIXED` |
| scope | VARCHAR(16) | no | `ALL`, `MISTAKES` |
| total_questions | INT | no | |
| correct_count | INT | no | tính bởi backend |
| incorrect_count | INT | no | tính bởi backend |
| accuracy | DECIMAL(5,4) | no | |
| passed | BOOLEAN | no | `accuracy >= quiz-pass-accuracy` và scope = ALL |
| duration_seconds | INT | yes | |
| submitted_at | DATETIME | no | |

- UNIQUE `(user_id, client_attempt_id)` — idempotency
- INDEX `(user_id, lesson_id, submitted_at)`

### 3.10 `tango_quiz_answers`

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| id | BIGINT PK AI | no | |
| attempt_id | BIGINT FK → tango_quiz_attempts | no | ON DELETE CASCADE |
| vocabulary_id | BIGINT FK | no | |
| mode | VARCHAR(20) | no | `JP_TO_MEANING` hoặc `VI_TO_JP` (dạng thực tế của câu, không phải MIXED) |
| submitted_answer | VARCHAR(255) | no | nguyên văn người dùng gõ |
| normalized_answer | VARCHAR(255) | no | sau normalize (để audit) |
| is_correct | BOOLEAN | no | |

- UNIQUE `(attempt_id, vocabulary_id)` — mỗi từ một câu trong một attempt

## 4. Ràng buộc và toàn vẹn

- Mọi ghi progress (`user_tango_vocabulary_progress`, `user_tango_lesson_progress`) và attempt (`tango_quiz_attempts`, `tango_quiz_answers`) nằm trong **một transaction**.
- `@Version` trên `user_tango_vocabulary_progress`: nếu hai request đồng thời ghi cùng một dòng, request sau thất bại và được retry một lần ở service.
- Xóa `tango_vocabularies` bị chặn khi còn `tango_lesson_vocabularies` hoặc progress. Dùng soft delete hoặc `published=false` ở lesson, không xóa từ đã có tiến độ.
- Không xóa `tango_lessons` đã có progress; đặt `published = false`.

## 5. Chỉ mục và truy vấn chính

| Truy vấn | Chỉ mục |
|---|---|
| Danh sách lesson theo level | `tango_lessons(jlpt_level, sort_order)` |
| Từ trong lesson theo thứ tự | `tango_lesson_vocabularies(lesson_id, position)` |
| Progress của user cho một lesson | `user_tango_vocabulary_progress(user_id, vocabulary_id)` + join |
| Weak words | `user_tango_vocabulary_progress(user_id, status)` |
| Continue learning | `user_tango_lesson_progress(user_id, last_studied_at)` (thêm nếu cần) |

## 6. Cấu hình ngưỡng (`application.yaml`)

```yaml
app:
  tango:
    mastery:
      min-answered: 5        # số câu tối thiểu để MASTERED
      min-accuracy: 0.80     # accuracy tối thiểu để MASTERED
    need-review:
      max-accuracy: 0.60     # accuracy dưới ngưỡng này thì NEED_REVIEW
    lesson:
      quiz-pass-accuracy: 0.80
    answer:
      ignore-vietnamese-diacritics: false   # Q5
```

Class đề xuất: `TangoProperties` (`@ConfigurationProperties(prefix = "app.tango")`), đăng ký trong config. Mọi service đọc ngưỡng từ class này, không hardcode số.

## 7. Phạm vi không thay đổi

- Bảng `users`, `vocabularies`, `user_vocabulary_progress`, `pets`, `user_rewards`, `user_missions`, `user_achievements` không sửa.
- Không thêm cột vào `users`.

## 8. Thứ tự tạo bảng

1. `tango_lessons`, `tango_vocabularies`
2. `tango_vocabulary_meanings`, `tango_vocabulary_examples`, `tango_lesson_vocabularies`
3. `user_tango_vocabulary_progress`, `user_tango_lesson_progress`, `user_tango_favorites`
4. `tango_quiz_attempts`, `tango_quiz_answers`

Ghi chú: với `ddl-auto: update`, Hibernate tự tạo bảng khi chạy. Nếu có Flyway, viết migration đúng thứ tự trên.
