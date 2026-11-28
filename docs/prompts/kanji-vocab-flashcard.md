# Prompt: Kết hợp Từ vựng (Tango) + Kanji vào Flashcard / SRS

> Dán toàn bộ khối dưới đây vào Claude Code (chạy ở root repo `learnwithpet`).

---

Bạn đang làm trên repo VocaPet, nhánh `feature/japanese-mode`. Mục tiêu: **kết hợp học Từ vựng (Tango) và Kanji vào cùng một hệ Flashcard/SRS**, để khi học một từ thì thấy các kanji cấu thành nó, và khi học một kanji thì thấy các từ Tango dùng nó, và cả hai cùng được ôn trong một hàng đợi ôn tập.

## Bước 0 — Đọc trước, không viết code

Đọc và tóm tắt lại (ngắn) cho tôi trước khi sửa gì:

- Kanji (hiện **chỉ có ở frontend**, dữ liệu tĩnh, không có tiến độ):
  - `vocapet-desktop-friend/src/lib/japanese/kanji.ts` — `KanjiEntry { char, level, strokes, hanViet, meaning, on[], kun[], examples[] }`, `KANJI_N5`, `searchKanji()`.
  - `vocapet-desktop-friend/src/routes/app.japanese.kanji.tsx` — trang tra cứu kanji.
- Tango (backend, có bài học + tiến độ):
  - Entity `TangoVocabulary` (`expression`, `kana`, `romaji`, `meanings`, `examples`), `TangoLesson`, `UserTangoVocabularyProgress`.
  - `TangoController`, `TangoLearningService`, `TangoProgressService`, `TangoReadService`.
  - Frontend: `src/api/tango.api.ts`, `src/routes/app.japanese.tango.*.tsx`, `src/components/tango/shared.tsx`.
- Flashcard / SRS:
  - Entity `Deck`, `Vocabulary` (có FK nullable `tangoVocabulary`), `UserVocabularyProgress` (FSRS: `stability`, `difficulty`, `nextReviewTime`, `lastSource`, FK `vocabulary` và `tangoVocabulary`).
  - `FsrsService`, `StudySessionController/Service`, `LearningController` (`GET /api/learning/review/queue`, `POST /api/learning/attempts`), `LearningEngineService`, `LearningReviewService`, `VocabularyLinkService`.
  - Frontend: `src/components/deck/*` (`SrsFlashCard`, `Flashcard`, `QuizGame`, `TypeMode`), `src/routes/app.review.tsx`, `src/routes/app.decks.*`.
- Design: `vocapet-desktop-friend/design-system/vocapet/MASTER.md`, `pages/vocabulary.md`, `tokens.css`. Component dùng chung: `JpText`, `ProgressRing`, `WordStatusBadge`, `Enso`, `LevelStamp` trong `tango/shared.tsx`.
- Ghi chú nợ kỹ thuật đã biết: Tango đang ghi tiến độ vào **cả** `UserTangoVocabularyProgress` và `UserVocabularyProgress`. Không làm tệ hơn; nếu có thể, để `UserVocabularyProgress` là nguồn SRS duy nhất cho phần mới.

Sau khi đọc, trả lời: SRS thật sự đang chạy ở đâu (bảng nào, service nào quyết định `nextReviewTime`), và review queue hiện trả về những loại item nào.

## Bước 1 — Đề xuất thiết kế, chờ tôi duyệt

Đề xuất phương án **nhỏ nhất mà đủ**, theo hướng sau (được phép chỉnh nếu code thực tế khác):

1. **Liên kết Kanji ↔ Từ vựng không cần bảng nối**: một từ chứa kanji `X` khi `expression` có ký tự `X`. Tính lúc đọc (backend hoặc frontend), không lưu.
2. **Đưa Kanji lên backend** để có tiến độ SRS:
   - Entity `Kanji` (seed từ dữ liệu trong `kanji.ts`, chuyển sang JSON resource giống `resources/tango/minna-n5-bai-1-5.json` + seeder giống `TangoContentSeeder`).
   - Tiến độ SRS dùng lại `UserVocabularyProgress` bằng một FK nullable `kanji` (giống cách đã làm với `tangoVocabulary`), dùng lại `FsrsService`. **Không** tạo bảng tiến độ thứ hai.
   - `LearningSource` thêm giá trị cho kanji nếu cần.
3. **Hàng đợi ôn chung**: `GET /api/learning/review/queue` trả cả item từ vựng và kanji, mỗi item có `type: "WORD" | "KANJI"`. Giữ tương thích response cũ (thêm field, không đổi/xoá field).
4. **Flashcard kanji** (mặt trước / mặt sau):
   - Trước: chữ kanji (serif, lớn).
   - Sau: Hán Việt, nghĩa tiếng Việt, on'yomi (katakana), kun'yomi (hiragana), số nét, và **2–4 từ Tango chứa kanji đó** (bấm được, có phát âm).
   - Chấm điểm dùng đúng các nút/phím đang có trong `SrsFlashCard` (Again/Hard/Good/Easy hoặc 1/2…), không phát minh thang mới.
5. **Flashcard từ vựng**: mặt sau thêm dải "Kanji trong từ này": mỗi kanji hiện chữ + Hán Việt + nghĩa, bấm để mở chi tiết kanji.
6. **Thêm vào flashcard**:
   - Trang Kanji: nút "Thêm vào ôn tập" cho từng kanji, và "Thêm cả bài" theo nhóm.
   - Trang bài học Tango: tuỳ chọn "Thêm cả kanji của bài này" (lấy tập kanji xuất hiện trong các từ của bài, chỉ những kanji có trong dữ liệu).
7. **Thứ tự học gợi ý** (không bắt buộc): khi bắt đầu một bài Tango, kanji của bài được đưa vào queue sau khi người dùng đã xem từ chứa nó.

Trong đề xuất, ghi rõ: các file sẽ sửa/tạo, thay đổi schema (cột/bảng mới, nullable, có ảnh hưởng dữ liệu cũ không), endpoint mới/đổi, và những gì cố ý **không** làm.

**Dừng lại và chờ tôi duyệt trước khi viết code.**

## Bước 2 — Implement (sau khi tôi duyệt)

Ràng buộc:
- Giữ nguyên business logic, API hiện có và tích hợp backend. Chỉ **thêm** field/endpoint; không đổi hành vi flashcard/deck cũ.
- Không nhân đôi component: mở rộng `SrsFlashCard`/`FlashSide` hoặc thêm một mặt thẻ kanji nhỏ, dùng `JpText`, `WordStatusBadge`, token trong `styles.css`. Theo `design-system/vocapet/MASTER.md` (chữ Nhật có `lang="ja"`, Noto Serif JP cho chữ lớn, target ≥ 44px, trạng thái có icon + chữ, tôn trọng reduced-motion).
- Schema: làm theo cách repo đang dùng (`ddl-auto` hiện tại), cột mới phải nullable; không xoá/đổi cột cũ.
- Pet/Companion đang ẩn: không gọi thêm, không xoá.
- Dữ liệu kanji: giữ nguyên nội dung hiện có trong `kanji.ts`; frontend có thể tiếp tục import file này cho trang tra cứu cho đến khi API kanji sẵn sàng, nhưng **chỉ một nguồn sự thật** sau khi xong (ghi rõ nguồn nào).

Test tối thiểu:
- Backend: seeder kanji (idempotent, chạy 2 lần không nhân đôi); queue trả cả WORD và KANJI; chấm một thẻ kanji cập nhật `UserVocabularyProgress` qua `FsrsService`; hàm tìm từ chứa kanji.
- Frontend: không có test runner riêng thì ít nhất `tsc` không có lỗi mới và `vite build` pass.

## Bước 3 — Báo cáo

- Đã làm gì (file, endpoint, schema).
- Cách tôi tự kiểm tra trên app (các bước bấm cụ thể).
- Chưa làm / chưa kiểm tra / rủi ro (ví dụ: kanji không có trong dữ liệu N5 sẽ không được liên kết; dữ liệu cũ cần chạy lại seeder).
- Không commit cho đến khi tôi bảo.
