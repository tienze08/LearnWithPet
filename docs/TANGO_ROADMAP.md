# TANGO_ROADMAP — Lộ trình triển khai Tango

**Liên quan:** tất cả tài liệu `TANGO_*.md`.
**Trạng thái:** Chờ review và approve. Chưa bắt đầu implementation.

---

## 0. Điều kiện trước khi bắt đầu

| # | Việc | Ai quyết định |
|---|---|---|
| G1 | Chốt Q1–Q6 trong [TANGO_PRD.md](TANGO_PRD.md) mục 9 | Bạn |
| G2 | Chọn nguồn và license nội dung N5 Lesson 01–02 (~40 từ để test) | Bạn |
| G3 | Quyết định có thêm Flyway trước khi lên production không | Bạn |
| G4 | Quyết định có sửa Kana API (chấm phía backend) trong cùng đợt không | Bạn (đề xuất: đợt riêng) |

---

## 1. Các phase

### Phase 0 — Tài liệu và đồng thuận (hiện tại)
- Đầu ra: sáu file `TANGO_*.md`.
- Tiêu chí hoàn thành: bạn approve, các câu hỏi Q1–Q6 có câu trả lời.

### Phase 1 — Nền tảng dữ liệu backend
**Việc:**
- Entity: `TangoLesson`, `TangoVocabulary`, `TangoVocabularyMeaning`, `TangoVocabularyExample`, `TangoLessonVocabulary`.
- Enum: `JlptLevel`, `TangoPartOfSpeech`, `TangoVocabularyStatus`, `TangoQuizMode`, `TangoQuizScope`.
- Repository cho từng entity (theo mẫu `KanaAttemptRepository`).
- `TangoProperties` (`app.tango.*`) và cấu hình trong `application.yaml`.
- Seeder idempotent đọc JSON từ `backend/src/main/resources/tango/`.
- Nội dung mẫu: N5 Lesson 01–02.

**Tiêu chí hoàn thành:**
- Khởi động backend, bảng được tạo đúng constraint (kiểm tra UNIQUE trong MySQL).
- Seeder chạy hai lần không tạo bản ghi trùng.
- Test: `expression_key` unique với từ không có kanji.

**Rủi ro:** `ddl-auto: update` không xóa cột cũ; ghi nhận khi đổi schema sau này.

### Phase 2 — Read APIs
**Việc:** `GET /levels`, `GET /lessons`, `GET /lessons/{id}`, `GET /lessons/{id}/vocabularies`, `GET /vocabularies/{id}`.
**Tiêu chí:** A-01 đến A-04, A-22; đúng mục 1.1–1.4, 1.11 của API spec.
**Test:** `@WebMvcTest` cho controller, `@DataJpaTest` cho repository (truy vấn progress).

### Phase 3 — Progress ghi nhận: start và study-progress
**Việc:** `POST /start`, `POST /study-progress`, `TangoProgressService` (nơi duy nhất ghi `viewed_at`, `last_position`).
**Tiêu chí:** A-05 đến A-08. Lesson chuyển IN_PROGRESS đúng.
**Test:** unit test cho `start` idempotent; test song song cho study-progress.

### Phase 4 — Quiz và chấm điểm (phần khó nhất)
**Việc:**
- `TangoQuizService.buildQuiz(lessonId, mode, scope)` — xáo và không lộ đáp án.
- `TangoAnswerNormalizer` — hàm thuần, có test bảng đầy đủ.
- `TangoAttemptService.submit(...)` — transaction, idempotency, cập nhật status từ, lesson completed.
- `POST /attempts`, `GET /quiz`.

**Tiêu chí:** A-09 đến A-20, A-24.
**Test bắt buộc:**
- Table-driven test cho normalizer: kana/kanji/katakana, full-width, khoảng trắng, dấu câu, Vietnamese case và diacritics.
- Test trạng thái: 5 câu đúng → MASTERED; thêm 1 câu sai khiến accuracy < 0.8 → không MASTERED (TS-08).
- Test idempotency song song (TS-05, A-24).
- Test rằng backend bỏ qua `isCorrect` từ client (A-13).

**Lưu ý:** Đây là phase rủi ro cao nhất; không gộp với phase khác.

### Phase 5 — Progress tổng hợp và Weak words
**Việc:** `GET /progress`, `GET /progress/weak`.
**Tiêu chí:** A-21; sắp xếp đúng PRD 5.3.
**Test:** dữ liệu mẫu 10 từ với accuracy khác nhau, kiểm thứ tự.

### Phase 6 — Frontend: API, hooks và Dashboard + Lesson Detail
**Việc:**
- `src/api/tango.api.ts`, `src/hooks/queries/tango.queries.ts` (theo mẫu `japanese.api.ts` và `japanese.queries.ts`).
- Types trong `src/lib/japanese/tango-types.ts` hoặc `src/types/tango.ts` (không hardcode nội dung từ vựng).
- Route: `app.japanese.tango.index.tsx`, `app.japanese.tango.lessons.$lessonId.tsx`.
- Thêm mục "Tango" vào nhóm "Tiếng Nhật" trong `AppShell.tsx`.
- Thêm card Tango vào `app.index.tsx` (tùy chọn).

**Tiêu chí:** U-01 đến U-04, U-10 (phần favorite nếu đã có API).

### Phase 7 — Frontend: Learning Mode
**Việc:** route `learn`, `LearnCard`, batch study-progress, resume.
**Tiêu chí:** U-05, U-06, U-11, U-12.

### Phase 8 — Frontend: Practice Mode và Result
**Việc:** route `practice`, nhập liệu, submit một lần, result screen, Practice Mistakes, Practice Again.
**Tiêu chí:** U-07, U-08, U-09, U-13, U-14.
**Test:** test component cho trạng thái nút submit; test lỗi mạng với `clientAttemptId` cố định.

### Phase 9 — Bổ sung
- Favorite API và UI (`PUT/DELETE /favorite`, `GET /favorites`).
- Search (`GET /search`).
- Trang Mistakes và trang chi tiết từ.
- Audio: kiểm tra voice `ja-JP` và ẩn nút khi thiếu.

### Phase 10 — Hoàn thiện và kiểm thử
- Nội dung N5 đầy đủ (theo G2).
- Kiểm thử thủ công trên 375 px và desktop.
- Kiểm thử hiệu năng: mục PRD 10.
- Review bảo mật: không lộ đáp án, không trả progress của user khác (test với hai user).

---

## 2. Thứ tự và phụ thuộc

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5
                                                  │
                                                  ▼
                                   Phase 6 ──► Phase 7 ──► Phase 8 ──► Phase 9 ──► Phase 10
```
- Phase 6 có thể bắt đầu khi Phase 2 xong (dùng API đọc); Phase 7–8 cần Phase 3–4.
- Phase 4 là điểm chặn lớn nhất. Không bắt đầu frontend Practice trước khi backend chấm điểm đã có test.

---

## 3. Ước lượng tương đối

| Phase | Mức độ |
|---|---|
| 1 | Vừa |
| 2 | Nhỏ |
| 3 | Nhỏ |
| 4 | Lớn |
| 5 | Nhỏ |
| 6 | Vừa |
| 7 | Vừa |
| 8 | Lớn |
| 9 | Vừa |
| 10 | Vừa (chủ yếu là nội dung) |

---

## 4. Test plan tổng hợp

| Lớp | Công cụ | Phạm vi |
|---|---|---|
| Unit backend | JUnit 5, Mockito | normalizer, status calculator, lesson completion |
| Repository | `@DataJpaTest` | unique constraint, truy vấn progress |
| API | `@WebMvcTest` / MockMvc | status code, validation, auth 401 |
| Integration | `@SpringBootTest` + DB test | luồng: start → study → quiz → attempt → progress |
| Concurrency | Test nhiều thread | idempotency attempt, cập nhật progress |
| Frontend unit | Vitest (nếu có) hoặc test thủ công | hàm format, normalize hiển thị |
| E2E thủ công | Trình duyệt | mục 10 của UI spec (U-01 đến U-14) |

Ghi chú: hiện chưa thấy cấu hình test trong `vocapet-desktop-friend/package.json`. Phần frontend cần quyết định công cụ test trước Phase 6.

---

## 5. Tiêu chí "xong" cho toàn module

- Tất cả test scenario A-01 đến A-24 và U-01 đến U-14 đạt hoặc có ghi chú lý do không áp dụng.
- Không có đáp án trong payload trước khi nộp (kiểm bằng test tự động).
- Không sửa `Vocabulary`, `UserVocabularyProgress`, `Pet*`, `Reward*`, `Mission*`, `Achievement*`.
- Ngưỡng cấu hình được qua `application.yaml`, đổi không cần sửa code.
- Tài liệu `TANGO_*.md` khớp với code (cập nhật khi có thay đổi).

---

## 6. Ngoài phạm vi các phase này

- Japanese → Reading quiz.
- Kanji, ngữ pháp, JLPT mock test.
- Tags/topics.
- Admin UI để nhập nội dung.
- Gắn Tango với Pet/XP (không làm; theo yêu cầu).
