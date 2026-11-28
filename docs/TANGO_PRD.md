# TANGO_PRD — Module học từ vựng tiếng Nhật (Tango)

**Trạng thái:** Draft để review. Chưa triển khai code, chưa tạo migration.
**Phạm vi:** Tango — học từ vựng tiếng Nhật theo JLPT level → Lesson → Vocabulary.
**Tài liệu liên quan:** [TANGO_SITEMAP.md](TANGO_SITEMAP.md), [TANGO_DATABASE.md](TANGO_DATABASE.md), [TANGO_API_SPEC.md](TANGO_API_SPEC.md), [TANGO_UI_UX.md](TANGO_UI_UX.md), [TANGO_ROADMAP.md](TANGO_ROADMAP.md).

> Ghi chú: [DATABASE.md](DATABASE.md) mục "JLPT Vocabulary Decks" (dòng ~235) đề xuất tái dùng `Deck` + `Vocabulary`. Thiết kế Tango này **thay thế** đề xuất đó (xem mục 6).

---

## 1. Mục tiêu

- Người học (đã đăng nhập bằng hệ thống hiện có) học từ vựng N5→N1 theo bài (Lesson) có thứ tự.
- Mỗi từ được học qua 2 bước: **xem** (Learning Mode) và **kiểm tra** (Practice Mode).
- Hệ thống theo dõi tiến độ từng từ xuyên suốt các lesson, tổng hợp điểm yếu để ôn lại.
- Tango **độc lập** với Pet, XP, Coin, Reward, Mission, Achievement. Không cộng XP, không tác động pet.

### Ngoài phạm vi (MVP)

- Kanji, ngữ pháp, JLPT mock test, Japanese → Reading quiz (để sau).
- Tags/Topic (chỉ là metadata tương lai; không dùng làm điều hướng).
- Lesson gating (khóa lesson) — **không khóa**, theo yêu cầu.
- Nhập liệu nội dung qua UI admin (content được nạp qua seed/import, xem mục 7).
- Đồng bộ với FSRS/SRS của Deck hiện có.

---

## 2. Người dùng và định nghĩa

| Thuật ngữ | Định nghĩa |
|---|---|
| JLPT Level | N5, N4, N3, N2, N1. Thêm level mới không cần đổi schema. |
| Lesson | Nhóm từ vựng có thứ tự trong một level (`lesson_number`). |
| Vocabulary | Một từ trong catalog Tango. Có thể thuộc nhiều lesson. |
| Required word | Từ bắt buộc trong lesson (mặc định tất cả). |
| Viewed | Người học đã mở từ đó ở Learning Mode ít nhất một lần. |
| Answered | Một câu trả lời đã được backend chấm (có trong một attempt). |

---

## 3. Functional Requirements

### 3.1 Cấu trúc nội dung
- FR-01: Hệ thống có danh sách level (N5–N1). Mỗi level có nhiều lesson, mỗi lesson có nhiều vocabulary theo thứ tự `position`.
- FR-02: Một vocabulary có thể nằm trong nhiều lesson (cùng hoặc khác level). Nội dung chỉ lưu một lần.
- FR-03: Một vocabulary có nhiều nghĩa tiếng Việt và nhiều ví dụ, có thứ tự hiển thị.
- FR-04: Lesson chỉ hiển thị khi `published = true`.

### 3.2 Dashboard
- FR-10: Chọn JLPT level (chip/tab). Mặc định level gần nhất có tiến độ, nếu chưa có thì N5.
- FR-11: Learning overview: số từ NEW / LEARNING / MASTERED / NEED_REVIEW của user trong level đang chọn.
- FR-12: Continue Learning: lesson có `last_studied_at` mới nhất, chưa COMPLETED. Nếu không có, hiển thị lesson đầu tiên chưa completed.
- FR-13: Lesson Library: danh sách lesson của level, mỗi card có số từ, số từ đã xem, trạng thái (NOT_STARTED / IN_PROGRESS / COMPLETED), % tiến độ.
- FR-14: Search: lọc lesson và từ theo chuỗi (kanji, kana, romaji, nghĩa tiếng Việt). Xem API ghi chú ở [TANGO_API_SPEC.md](TANGO_API_SPEC.md) mục 2.

### 3.3 Lesson Detail
- FR-20: Hiển thị thông tin lesson (tên, mô tả, số từ, số từ bắt buộc đã xem).
- FR-21: Danh sách vocabulary theo thứ tự: kanji (nếu có), kana, romaji, nghĩa tiếng Việt (nghĩa chính trước), part of speech, trạng thái cá nhân.
- FR-22: Nút Audio phát âm (xem mục 5).
- FR-23: Nút Favorite cho từng từ.
- FR-24: Nút Start Learning. Gọi `start` (idempotent) rồi chuyển sang Learning Mode.

### 3.4 Learning Mode
- FR-30: Mỗi lần hiển thị một từ: Japanese, kana, romaji, nghĩa tiếng Việt, part of speech, ví dụ, audio.
- FR-31: Previous / Next. Chuyển từ tự động đánh dấu "viewed" (gọi `study-progress`).
- FR-32: Thanh tiến độ: đã xem / tổng từ bắt buộc.
- FR-33: Có thể thoát giữa chừng; lần sau mở lại từ vị trí đã xem gần nhất (lưu trong `user_tango_lesson_progress.last_position`, xem TANGO_DATABASE mục 3.6).

### 3.5 Practice Mode
- FR-40: Hai dạng: `JP_TO_MEANING` (thấy tiếng Nhật → gõ nghĩa tiếng Việt) và `VI_TO_JP` (thấy nghĩa → gõ tiếng Nhật bằng kana hoặc kanji).
- FR-41: Dạng `MIXED` = mỗi từ chọn ngẫu nhiên một trong hai dạng (mặc định).
- FR-42: Câu hỏi được xáo thứ tự ngẫu nhiên mỗi lần làm.
- FR-43: Người học gõ đáp án và Submit. Toàn bộ bài được gửi một lần khi kết thúc (xem quyết định Q1 ở mục 9).
- FR-44: Trong lúc làm: hiển thị Current question / Total, Correct, Incorrect, Remaining, Accuracy (tính trên các câu đã nộp cục bộ chỉ để hiển thị; điểm chính thức do backend trả về).
- FR-45: Result screen: điểm, accuracy, số đúng/sai, danh sách câu sai với đáp án đúng; nút **Practice Mistakes** và **Practice Again**.
- FR-46: **Practice Mistakes** = quiz chỉ gồm từ của lesson đó có trạng thái NEED_REVIEW (scope `MISTAKES`).
- FR-47: Không có đáp án trong payload quiz trả về frontend.

### 3.6 Tiến độ và Mistakes
- FR-50: Trạng thái từ (mục 4.1) được cập nhật ngay sau mỗi câu được chấm.
- FR-51: Trang Mistakes/Weak liệt kê từ cần ôn, sắp theo mức độ yếu (mục 4.3).
- FR-52: Favorite có thể bật/tắt; danh sách favorite là bộ lọc ở dashboard (phase sau).

---

## 4. Quy tắc học tập (Learning Rules)

Ngưỡng nằm trong cấu hình (`app.tango.*`, xem [TANGO_DATABASE.md](TANGO_DATABASE.md) mục 6), không hardcode.

### 4.1 Trạng thái từ vựng (per user, per vocabulary)

| Trạng thái | Điều kiện (xét theo tổng câu đã chấm `answered_count` và `accuracy`) |
|---|---|
| `NEW` | `answered_count = 0` |
| `LEARNING` | `answered_count > 0`, không thuộc hai trạng thái dưới |
| `NEED_REVIEW` | `answered_count > 0` và `accuracy < need-review.max-accuracy` (mặc định 0.60) |
| `MASTERED` | `answered_count >= mastery.min-answered` (mặc định 5) **và** `accuracy >= mastery.min-accuracy` (mặc định 0.80) |

- Thứ tự ưu tiên: MASTERED → NEED_REVIEW → LEARNING → NEW.
- Trạng thái được **tính lại** mỗi khi có câu trả lời mới và lưu vào DB (để truy vấn nhanh). Đề xuất: MASTERED không bị khóa vĩnh viễn; nếu accuracy tụt dưới 0.80 thì không còn MASTERED (xem Q3 mục 9).
- "Viewed" là cờ riêng, **không** thay đổi trạng thái học.

### 4.2 Lesson Completed
Lesson `COMPLETED` khi **đồng thời**:
1. Mọi từ `required = true` trong lesson đã có `viewed_at` (đã xem).
2. Có ít nhất một attempt scope `ALL` của lesson đó với `accuracy >= lesson.quiz-pass-accuracy` (mặc định 0.80).

Attempt scope `MISTAKES` không tính vào điều kiện hoàn thành.

### 4.3 Sắp xếp Weak words
Chỉ xét từ có `answered_count > 0`. Sắp xếp:
1. `accuracy` tăng dần (yếu nhất trước).
2. `incorrect_count` giảm dần.
3. `last_answered_at` cũ nhất trước.

### 4.4 Mở khóa lesson
Không khóa. Mọi lesson mở ngay, kể cả khi lesson trước chưa completed. Lesson completion chỉ là trạng thái hiển thị.

---

## 5. Audio

- MVP: dùng Web Speech API qua `src/components/deck/speak.ts` đã có trong frontend (không gọi backend).
- `audio_url` (nullable) trong `tango_vocabularies` để dành cho file audio sau này. Nếu có giá trị thì ưu tiên phát file, nếu không thì dùng TTS.
- Rủi ro: máy Windows có thể thiếu giọng Japanese (xem mục 8).

---

## 6. Quyết định kiến trúc chính

| # | Quyết định | Lý do |
|---|---|---|
| D1 | Tạo catalog riêng `tango_vocabularies` (entity Java `TangoVocabulary`), **không** dùng `vocabularies` hiện có | `Vocabulary` bắt buộc thuộc `Deck` (`deck_id NOT NULL`) và mỗi user một bản (gắn `UserVocabularyProgress` FSRS). Tango cần một từ dùng chung nhiều lesson. |
| D2 | Tiến độ Tango tách khỏi `UserVocabularyProgress` (FSRS) | FSRS là lịch ôn SRS; Tango dùng accuracy và ngưỡng riêng. Trộn sẽ làm sai cả hai. |
| D3 | Enum mới `TangoVocabularyStatus` (NEW, LEARNING, MASTERED, NEED_REVIEW) | Enum `Status` hiện có (NEW, LEARNING, MASTERED) dùng chung với FSRS; không sửa để tránh ảnh hưởng module cũ. |
| D4 | Enum mới `TangoPartOfSpeech` | `PartOfSpeech` hiện có không có các loại tiếng Nhật (động từ godan/ichidan, tính từ i/na, trợ từ, ...). |
| D5 | Dùng `User` và `CurrentUserService` hiện có; không tạo auth/User mới | Yêu cầu. `SecurityConfig` đã yêu cầu xác thực cho mọi `/api/**` không nằm trong `/api/auth/**`. |
| D6 | Idempotency bằng `client_attempt_id` (UUID do frontend sinh) có unique theo user | Đã có mẫu trong `KanaAttempt` (`clientAttemptId`). |
| D7 | Ngưỡng cấu hình qua `application.yaml` (`app.tango.*`) | Yêu cầu "dễ cấu hình". Kana hiện hardcode `MIN_TOTAL_SEEN`/`MIN_ACCURACY` trong `KanaProgressServiceImpl`; Tango không lặp lại cách đó. |
| D8 | Backend chấm điểm; frontend không gửi `isCorrect` | Yêu cầu. Gửi lên `answer` thô; backend normalize và so sánh. |

---

## 7. Nguồn dữ liệu nội dung

- Nội dung là dữ liệu DB, không nằm trong frontend (`src/lib/vocab-seed.ts` chỉ là dữ liệu demo cho deck, không dùng cho Tango).
- Nạp nội dung bằng **seeder/import** phía backend từ file JSON trong repo (ví dụ `backend/src/main/resources/tango/n5.json`), idempotent theo `(jlpt_level, lesson_number)` và `(kana, expression_key)`.
- **Quyết định cần bạn chọn (Q4):** nguồn từ vựng JLPT và bản quyền. Đề xuất: tự biên soạn hoặc dùng danh sách công khai đã kiểm tra license; không sao chép nguyên văn từ sách luyện thi.

---

## 8. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Chấm đáp án tiếng Nhật: kanji/kana/katakana/full-width/nhiều cách đọc | Cao | Normalize NFKC, katakana→hiragana, bỏ khoảng trắng. Chấp nhận mọi `expression` và `kana`. Test table đầy đủ. |
| Chấm đáp án tiếng Việt: dấu, hoa thường, nhiều nghĩa đồng nghĩa | Trung bình | Lưu nhiều nghĩa là đáp án được chấp nhận; so sánh NFC + case-insensitive. Cờ cấu hình để bỏ qua dấu (mặc định tắt). |
| Hai từ cùng nghĩa tiếng Việt (VI→JP mơ hồ) | Thấp–Trung bình | Chấm theo đúng vocabulary được hỏi; chấp nhận rủi ro, ghi nhận trong content review. |
| Double submit / mạng chậm | Cao | `client_attempt_id` unique; trả lại kết quả cũ với `replayed: true`. Ghi trong một transaction. |
| Race khi cập nhật progress song song | Trung bình | Unique `(user_id, vocabulary_id)` + `@Version` hoặc khóa hàng (`PESSIMISTIC_WRITE`) khi cập nhật progress. |
| `spring.jpa.hibernate.ddl-auto: update` không có Flyway/Liquibase | Cao (khi lên production) | Đề xuất thêm Flyway trước khi triển khai Tango lên production. Việc này nằm ngoài phạm vi thiết kế hiện tại. |
| Kana API hiện nhận `isCorrect` từ frontend (`KanaAttemptRequest`) | Cao | Không thuộc Tango, nhưng cùng kiểu rủi ro. Đề xuất sửa sau, không gộp vào Tango. |
| Dữ liệu nội dung chưa có | Cao | Phase 1 chỉ cần N5 Lesson 01 (~20 từ) để test. |
| Giọng TTS tiếng Nhật không có trên một số máy | Thấp | Hiển thị nút audio ẩn nếu `speechSynthesis` không có voice `ja-JP`. |
| Quiz không có đáp án trong payload nhưng vẫn lộ nghĩa qua prompt | Không đáng kể | Prompt là đề bài, không phải đáp án. |

---

## 9. Quyết định đã chốt (approved)

Người dùng đã duyệt thiết kế. Các mục dưới đây dùng giá trị đề xuất:

- **Q1 — Cách nộp quiz:** (A) gửi toàn bộ bài một lần khi kết thúc.
- **Q2 — Phạm vi quiz:** mỗi từ bắt buộc đúng một câu; mode mặc định `MIXED`.
- **Q3 — MASTERED:** không sticky; tính lại mỗi lần chấm.
- **Q4 — Nguồn và license nội dung:** **chưa chốt.** Phase 1 dùng dữ liệu mẫu nhỏ, đánh dấu rõ là mẫu. Nội dung thật cần bạn cung cấp hoặc chọn nguồn.
- **Q5 — Bỏ qua dấu tiếng Việt:** tắt mặc định.
- **Q6 — API bổ sung (Favorite, Search):** chấp nhận.

---

## 10. Yêu cầu phi chức năng

- Hiệu năng: `GET /lessons` và `GET /progress` < 300 ms với 5 level × 50 lesson × 30 từ và 1 user (đo ở môi trường dev).
- Bảo mật: mọi endpoint Tango cần JWT; không trả đáp án trong `GET /quiz`; không trả dữ liệu progress của user khác.
- Khả năng mở rộng: thêm level/lesson/từ chỉ là thêm dữ liệu.
- Nhất quán: attempt và progress được ghi trong cùng transaction.

---

## 11. Test scenarios (tóm tắt, chi tiết ở [TANGO_ROADMAP.md](TANGO_ROADMAP.md))

- TS-01: User chưa đăng nhập gọi bất kỳ endpoint Tango → 401.
- TS-02: Lesson có `published=false` không xuất hiện trong danh sách và trả 404 khi truy cập trực tiếp.
- TS-03: Một từ thuộc hai lesson → cùng một `vocabularyId`, progress chỉ có một bản ghi.
- TS-04: Chấm đúng/sai với `ほん`, `本`, `ホン`, `hon` (romaji không được chấp nhận) cho `VI_TO_JP`.
- TS-05: Gửi cùng `clientAttemptId` hai lần → lần hai trả `replayed: true`, không tạo bản ghi thứ hai.
- TS-06: Frontend gửi `isCorrect: true` → backend bỏ qua và tự chấm.
- TS-07: Gửi `vocabularyId` không thuộc lesson → 400.
- TS-08: Sau 5 câu đúng liên tiếp cho một từ → `MASTERED`; sau 1 câu sai thêm khiến accuracy < 0.8 → không còn `MASTERED`.
- TS-09: Hoàn thành đủ điều kiện mục 4.2 → lesson `COMPLETED`; attempt `MISTAKES` không làm lesson completed.
- TS-10: Practice Mistakes khi không có từ NEED_REVIEW → 200 với `questions: []` và frontend hiển thị empty state.
- TS-11: Mất mạng khi nộp → frontend retry với cùng `clientAttemptId`, kết quả không bị ghi đôi.
- TS-12: Hai request progress song song cho cùng user và từ → không mất cập nhật `answered_count`.
