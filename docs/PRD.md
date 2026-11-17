# PRD — VocaPet Japanese Learning Platform

## 1. Product Vision

VocaPet là nền tảng học tiếng Nhật có cấu trúc, tập trung vào trải nghiệm học tập chất lượng và theo dõi tiến độ rõ ràng. Người học có thể tự học từ zero đến JLPT N3 với nội dung được tổ chức theo từng module độc lập.

**Ưu tiên hiện tại (Phase 1–6):** Xây dựng Learning System hoàn chỉnh — nội dung chất lượng, trải nghiệm học tốt, theo dõi tiến độ chính xác.

**Ưu tiên Phase 7+:** Tích hợp Pet System vào Learning System đã hoàn chỉnh.

**Mục tiêu:**
- Người học có thể tự học tiếng Nhật từ zero đến JLPT N3 không cần giáo viên.
- Theo dõi tiến độ chi tiết: biết chính xác chữ nào đã học, chữ nào cần luyện thêm.
- Học mọi kỹ năng: Alphabet, từ vựng (Tango), Kanji, ngữ pháp (Bunpo), luyện thi (JLPT).

## 2. Target Users

| Nhóm | Đặc điểm |
|------|----------|
| Người mới bắt đầu | Chưa biết tiếng Nhật, học từ Hiragana |
| Người học trung cấp | Biết Kana, muốn mở rộng từ vựng và Kanji |
| Người luyện thi | Cần ôn tập có hệ thống cho JLPT N5–N3 |
| Người học tự nhiên | Muốn đọc manga/anime, dùng Reader + Vocab tool |

## 3. Success Metrics

- 40% người dùng hoàn thành Alphabet module (mastered 80%+ kana) trong 2 tuần đầu
- Trung bình 15+ phút học mỗi phiên
- Weak kana practice được sử dụng bởi ≥ 50% người dùng active
- Accuracy trung bình đạt ≥ 75% sau 3 lần quiz cùng 1 section

## 4. Module Overview

### 4.1 Alphabet (Chữ cái) — Phase 1
Học và luyện tập toàn bộ bảng chữ cái tiếng Nhật. Single-page scrollable layout, active recall quiz.

**Route:** `/app/japanese/alphabet`

**Kana Catalog (104 hiragana + 104 katakana = 208 ký tự):**

| Section | Per script | Mô tả |
|---------|-----------|-------|
| Basic | 46 | Gojūon: a~n (wa/wo included) |
| Dakuten | 20 | が、ざ、だ、ば rows |
| Handakuten | 5 | ぱ row |
| Yōon | 33 | 11 bases × 3 combos (kya/kyu/kyo pattern) |

**Page structure (single scrollable page):**
- Script selector: Hiragana / Katakana
- Progress summary: X/104 mastered, overall accuracy
- "Start Quiz" CTA
- Section 1: Basic (gojūon grid, 5 columns)
- Section 2: Dakuten (5 columns, 4 rows)
- Section 3: Handakuten (5 columns, 1 row)
- Section 4: Yōon (3 columns, 11 rows)
- Each kana card: character + romaji + mastery status

**Quiz — Active Recall (not multiple-choice):**
- Config: script / section (All/Basic/Dakuten/Handakuten/Yōon) / count (10/20/All) / weak mode
- Interface: show kana → user types romaji → Enter to submit
- "Reveal Answer" button (or Space bar when input not focused)
- After reveal: "Got it ✓" (remove from queue) / "Need more practice ✗" (re-queue)
- Live stats bar: Accuracy | Remaining | Incorrect
- Wrong answers re-queued (not just tracked) until all answered correctly
- Session persistence: sessionStorage (survive page refresh)
- Romaji normalization: case-insensitive, trim, accept variants (shi=si, chi=ti, etc.)

**Quiz Results screen:**
- Total / Correct / Incorrect / Accuracy
- Weak kana visual list
- "Practice Mistakes" button
- "Practice Again" button
- "Back to Chart" button

**Phase 6+ (Learning Enhancement):**
- Luyện viết Kana (stroke order animation)
- Listening drill (nghe → chọn kana)
- Timed challenge (tốc độ nhận dạng)

### 4.2 Tango (Từ vựng)
Học từ vựng theo cấp độ JLPT với FSRS spaced repetition.

**MVP:**
- Seed data N5 (~800 từ) dưới dạng Deck trên backend
- Flashcard review dùng StudySession + FSRS hiện có
- Phân loại theo JLPT level (N5 → N1)
- Tango dashboard: tiến độ theo level

**V2:**
- Học theo chủ đề (gia đình, màu sắc, số đếm)
- Context sentences với furigana
- Audio pronunciation (TTS ja-JP đã có)

### 4.3 Kanji
Học Kanji theo cấp độ JLPT: bộ thủ, âm On/Kun, nghĩa, thứ tự nét.

**MVP:**
- Entity `KanjiItem` mới (kanji, readings, meaning, radicals, JLPT level)
- Seed N5 Kanji (103 kanji)
- Flashcard mode (kanji → nghĩa, âm đọc)
- Filter theo JLPT level

**V2:**
- Stroke order animation (SVG)
- Radical decomposition browser
- Kanji → example words link
- Writing practice (canvas)

### 4.4 Bunpo (Ngữ pháp)
Học ngữ pháp theo pattern: giải thích → ví dụ → bài tập.

**MVP:**
- Entity `GrammarRule` mới (pattern, explanation, examples, JLPT level)
- Seed N5 grammar (25 patterns cơ bản)
- Grammar card: pattern + giải thích tiếng Việt + 3 ví dụ
- Multiple-choice exercise

**V2:**
- Fill-in-the-blank exercise
- Sentence construction drag-and-drop
- Grammar search theo keyword

### 4.5 JLPT
Luyện thi với đề thi mô phỏng và kiểm tra kiến thức tổng hợp.

**MVP:**
- Quiz tổng hợp từ vocabulary + kanji đã học
- Lịch sử kết quả luyện thi

**V2:**
- Mock test đầy đủ (Vocabulary, Grammar, Reading)
- Timer per section
- Score report chi tiết

### 4.6 My Pet — Tạm hoãn (Phase 7)

Pet System hiện có trong codebase (5 species, moods, Pixi.js animations, personality engine) được **giữ nguyên** và **không tích hợp** vào Learning System trong Phase 1–6.

**Trạng thái hiện tại (backend):**
- Pet entity tồn tại nhưng `Pet.xp` = 0 và `Pet.level` = 1 (stubs)
- Pet level hiển thị ở frontend là localStorage-only (mất khi đổi thiết bị)
- Companion/learning memory đang chạy độc lập

**Kế hoạch Phase 7:** Sau khi Learning System hoàn chỉnh (Phase 1–6), sẽ tích hợp:
- Pet EXP từ Kana/Tango/Kanji activities
- Pet leveling backend (grantPetReward)
- Missions và Achievements liên quan đến learning progress
- Pet react to learning milestones

## 5. User Learning Loop (Phase 1–6, không có Pet)

```
Đăng nhập
  → Dashboard hiển thị: module progress overview
  → Chọn module (Alphabet / Tango / Kanji / Bunpo / JLPT)
  → Học nội dung (chart view, flashcard, grammar card)
  → Làm quiz / bài tập
  → Kết quả lưu vào Learning Progress backend
  → Xem tiến độ: mastered X/Y, weak items
  → Luyện thêm weak items (targeted practice)
  → Tiến độ cập nhật theo thời gian thực
```

## 6. Non-Goals (không làm)

- Lớp học trực tiếp hay live session với giáo viên
- Social features (friend list, leaderboard) — V3+
- Mobile app native — responsive web đủ cho MVP
- Offline mode
- Học tiếng Nhật kinh doanh / JLPT N1 chuyên sâu (V3+)
