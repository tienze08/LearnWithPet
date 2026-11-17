# TANGO_UI_UX — Thiết kế giao diện Tango

**Liên quan:** [TANGO_SITEMAP.md](TANGO_SITEMAP.md), [TANGO_PRD.md](TANGO_PRD.md), [TANGO_API_SPEC.md](TANGO_API_SPEC.md).
**Nền tảng:** React 19 + TanStack Router + Tailwind v4 + shadcn/ui (`src/components/ui/*`), React Query, Lucide icons. Phong cách sẵn có của VocaPet (card bo tròn, `card-pop`, `btn-pop`, màu sage).

---

## 1. Nguyên tắc

- Dùng lại component và class có sẵn trước khi viết mới (`Button`, `Card`, `Input`, `Dialog`, `Progress`, `Badge`, `Tabs`, `Skeleton`).
- Mobile trước (16px gutter, không scroll ngang). Bảng từ đổi thành list card ở màn hình hẹp.
- Trạng thái học bằng màu **và** chữ (không chỉ màu).
- Tiếng Nhật hiển thị bằng font hỗ trợ CJK (fallback `"Noto Sans JP"` nếu cần; thêm vào `__root.tsx` khi triển khai).

---

## 2. Màn hình 1 — Tango Dashboard (`/app/japanese/tango`)

### Bố cục (desktop)
```
┌──────────────────────────────────────────────────────────────┐
│ Tango                                    [Search ____]      │
│ [ N5 ] [ N4 ] [ N3 ] [ N2 ] [ N1 ]        (level selector)   │
├──────────────────────────────────────────────────────────────┤
│ ┌ Learning overview ─────────────┐  ┌ Continue Learning ─┐   │
│ │ NEW 600 · LEARNING 120 ·       │  │ Lesson 01 Greetings│   │
│ │ MASTERED 60 · NEED REVIEW 20   │  │ ███████░░ 60%      │   │
│ │ [donut / stacked bar]          │  │ [ Tiếp tục ]       │   │
│ └────────────────────────────────┘  └────────────────────┘   │
│ Lesson Library                                              │
│ ┌ L01 ┐ ┌ L02 ┐ ┌ L03 ┐ ┌ L04 ┐                              │
│ └─────┘ └─────┘ └─────┘ └─────┘                              │
│ [ Weak words → Mistakes ]                                    │
└──────────────────────────────────────────────────────────────┘
```

### Thành phần
| Component | Vai trò | Nguồn dữ liệu |
|---|---|---|
| `TangoLevelTabs` | Chọn N5–N1, cập nhật `?level=` | `GET /levels` |
| `TangoOverviewCard` | Bốn số trạng thái + thanh stacked | `GET /progress?level=` |
| `ContinueLearningCard` | Lesson đề xuất + nút | `GET /progress` (`continueLearning`) |
| `LessonCard` | Số từ, % tiến độ, badge trạng thái | `GET /lessons?level=` |
| `LessonLibrary` | Lưới `LessonCard`, search lọc client-side theo title | `GET /lessons?level=` |
| `TangoSearch` | Input debounce 300 ms; khi có `q` thì gọi `GET /search` | `GET /search` (nếu có) |
| `WeakWordsLink` | Đi tới Mistakes, hiển thị số `needReview` | `GET /progress` |

### Trạng thái
| Trạng thái | Hiển thị |
|---|---|
| Loading | Skeleton: 3 thẻ overview + 6 thẻ lesson |
| Empty (level chưa có lesson) | "Chưa có bài học cho N2. Quay lại sau nhé." + nút chọn level khác |
| Empty (chưa học gì) | Continue Learning ẩn; overview toàn `NEW`; CTA "Bắt đầu với Lesson 01" |
| Error | Thẻ lỗi với nút "Thử lại" (`refetch`); giữ level đã chọn |
| Search không có kết quả | "Không tìm thấy \"{q}\"" + nút xóa tìm kiếm |

### React Query (theo pattern `japanese.queries.ts`)
- `useTangoLevelsQuery()` → key `["tango", "levels"]`
- `useTangoLessonsQuery(level)` → key `["tango", "lessons", level]`
- `useTangoProgressQuery(level?)` → key `["tango", "progress", level ?? "all"]`
- Mutations invalidate `["tango", "progress"]`, `["tango", "lessons"]`, `["tango", "levels"]`.

---

## 3. Màn hình 2 — Lesson Detail (`/app/japanese/tango/lessons/$lessonId`)

### Bố cục
```
┌──────────────────────────────────────────────────────────────┐
│ ‹ N5 · Lesson 01 — Greetings                    [Start Learning] │
│ Chào hỏi cơ bản · 20 từ · 12 đã xem · 60%                       │
│ [ Làm bài kiểm tra ]  [ Practice Mistakes ]                     │
├──────────────────────────────────────────────────────────────┤
│ #  Từ                  Nghĩa tiếng Việt      Loại   Trạng thái ♡ 🔊 │
│ 1  こんにちは            xin chào              Cụm từ  Đang học   ♡ 🔊 │
│ 2  学校 (がっこう)       trường học            N        Cần ôn    ♡ 🔊 │
└──────────────────────────────────────────────────────────────┘
```

### Thành phần
| Component | Vai trò |
|---|---|
| `LessonHeader` | Tên, mô tả, progress bar, nút Start Learning / Tiếp tục |
| `LessonVocabularyList` | Danh sách theo `position` |
| `VocabularyRow` | Kanji/kana/romaji, nghĩa chính, POS, badge trạng thái, nút favorite, nút audio |
| `FavoriteButton` | Optimistic update, rollback khi lỗi |
| `AudioButton` | `speak.ts`; ẩn nếu không có voice `ja-JP` |
| `VocabularyDetailSheet` | Mở khi bấm từ: nghĩa đầy đủ, ví dụ, lesson khác chứa từ |

### Quy tắc hiển thị
- Kanji hiển thị đầu tiên nếu có; kana và romaji ở dòng phụ (`text-muted-foreground`).
- Nghĩa chính hiển thị; các nghĩa khác trong sheet.
- Romaji ẩn mặc định trên mobile, bật bằng toggle (đề xuất).
- Badge trạng thái: NEW (xám), LEARNING (xanh dương), NEED_REVIEW (cam), MASTERED (xanh lá).

### Trạng thái
| Trạng thái | Hiển thị |
|---|---|
| Loading | Skeleton header + 8 dòng |
| Empty (lesson rỗng) | "Bài học này chưa có từ nào." — ẩn nút Start |
| Error 404 | "Không tìm thấy bài học" + link về dashboard |
| Error khác | Thẻ lỗi + "Thử lại" |
| Favorite lỗi | Toast "Không lưu được. Thử lại." và rollback |

---

## 4. Màn hình 3 — Learning Mode (`/app/japanese/tango/lessons/$lessonId/learn`)

### Bố cục (desktop)
```
┌──────────────────────────────────────────────────────────────┐
│ ✕  Lesson 01 · 5 / 20                          ████░░░░ 25%  │
├──────────────────────────────────────────────────────────────┤
│                       学校                            🔊     │
│                    がっこう · gakkou                           │
│                    [Danh từ]                                   │
│                    trường học                                  │
│  ─────────────────────────────────────────────────────         │
│  Ví dụ: 学校に行きます。 — Tôi đi học.   🔊                    │
├──────────────────────────────────────────────────────────────┤
│   [ ‹ Trước ]                                  [ Tiếp › ]       │
└──────────────────────────────────────────────────────────────┘
```

### Hành vi
- Chỉ một từ mỗi lần. Phím ← → trên desktop.
- Khi chuyển sang từ mới, gọi `POST /study-progress` với `vocabularyIds: [id]` và `lastPosition`. Gửi theo lô khi rời trang hoặc mỗi 5 từ để giảm request (đề xuất).
- Từ đã viewed hiển thị chấm xanh nhỏ trên thanh tiến độ.
- Nút "Làm bài kiểm tra" xuất hiện ở từ cuối và khi `viewedCount === requiredCount`.
- Thoát giữa chừng: không cần xác nhận vì tiến độ đã lưu theo từng bước.

### Thành phần
`LearnCard`, `LearnProgressBar`, `LearnNavigation`, `ExampleList`, `AudioButton`.

### Trạng thái
| Trạng thái | Hiển thị |
|---|---|
| Loading | Skeleton thẻ giữa màn hình |
| Lỗi study-progress | Toast nhỏ "Chưa lưu được tiến độ"; từ vẫn hiển thị; thử lại khi chuyển từ |
| Lesson không có ví dụ | Ẩn mục ví dụ, không hiển thị "Không có ví dụ" |

---

## 5. Màn hình 4 — Practice Mode (`/app/japanese/tango/lessons/$lessonId/practice`)

### Bố cục (đang làm)
```
┌──────────────────────────────────────────────────────────────┐
│ Câu 3 / 20      Đúng 2 · Sai 0 · Còn lại 17 · Accuracy 100%    │
│ ████████░░░░░░░░░░░░░                                          │
├──────────────────────────────────────────────────────────────┤
│                   Nghĩa: "trường học"                           │
│   Viết bằng tiếng Nhật (kana hoặc kanji)                        │
│   [ ________________ ]                                          │
│                              [ Nộp câu trả lời ]                 │
└──────────────────────────────────────────────────────────────┘
```

### Quy tắc
- Mỗi câu một ô nhập, Enter để nộp câu hiện tại (lưu cục bộ, chưa gọi API).
- Nút "Nộp bài" (sau câu cuối) gọi `POST /attempts` với `clientAttemptId` sinh một lần khi bắt đầu quiz (`crypto.randomUUID()`), giữ nguyên khi retry.
- Chỉ số Correct, Incorrect, Accuracy trên thanh hiển thị là **ước tính cục bộ** chỉ để người dùng theo dõi; không hiển thị là điểm chính thức. Điểm chính thức lấy từ response.
- Có thể đổi `mode` hoặc `scope` chỉ ở màn hình khởi tạo, không giữa chừng.

### Màn hình kết quả (`status = result`)
```
┌──────────────────────────────────────────────────────────────┐
│                    Accuracy 75%   ✓ Đạt (≥ 80%)               │
│        Đúng 15 · Sai 5 · Tổng 20 · 04:12                       │
├──────────────────────────────────────────────────────────────┤
│ Các câu sai                                                   │
│  ✗ 学校 — bạn: "trường"  · đáp án: "trường học", "trường"     │
│  ✗ こんにちは — bạn: "hello" · đáp án: "こんにちは"              │
├──────────────────────────────────────────────────────────────┤
│ [ Practice Mistakes ]   [ Practice Again ]   [ Về lesson ]     │
└──────────────────────────────────────────────────────────────┘
```
- Nhãn "Đạt" khi `passed = true`; nếu scope MISTAKES thì ghi chú "Không tính vào hoàn thành bài".
- `Practice Mistakes` → `scope=MISTAKES`, tạo `clientAttemptId` mới.
- `Practice Again` → `scope` giữ nguyên, lấy quiz mới.
- Nếu `lessonStatus` vừa chuyển sang `COMPLETED`: hiển thị banner "Hoàn thành bài học".

### Trạng thái
| Trạng thái | Hiển thị |
|---|---|
| Loading quiz | Skeleton câu hỏi |
| Empty quiz (MISTAKES không có từ) | "Bạn không có từ nào cần ôn trong bài này." + nút "Làm bài đầy đủ" |
| Lesson không có required word (409) | "Bài học chưa đủ từ để kiểm tra." |
| Nộp lỗi mạng | Giữ đáp án trong state, nút "Thử nộp lại" dùng cùng `clientAttemptId` |
| Nộp lỗi 400 `ANSWER_NOT_IN_LESSON` | Thông báo lỗi chung và đề nghị bắt đầu bài mới |
| Đã nộp rồi (`replayed`) | Hiển thị kết quả, không hiển thị lỗi |

---

## 6. Màn hình bổ sung

### 6.1 Chi tiết từ (`/vocabularies/$vocabularyId`)
- Dạng sheet hoặc trang: kanji lớn, kana, romaji, POS, mọi nghĩa, mọi ví dụ, danh sách lesson chứa từ, trạng thái cá nhân, favorite, audio.

### 6.2 Mistakes (`/app/japanese/tango/mistakes`)
- Danh sách từ có `answeredCount > 0` sắp theo PRD 5.3, bộ lọc level.
- Nút "Practice" mở quiz scope MISTAKES theo lesson của từ (nếu từ thuộc nhiều lesson, chọn lesson đầu tiên, hiển thị chú thích).
- Empty: "Chưa có từ nào cần ôn. Làm một bài kiểm tra để bắt đầu."

---

## 7. Trạng thái chung

| Thành phần | Loading | Empty | Error |
|---|---|---|---|
| Dashboard | skeleton thẻ | theo mục 2 | thẻ lỗi + retry |
| Lesson Detail | skeleton | "Bài học trống" | 404 hoặc retry |
| Learning | skeleton thẻ | không áp dụng (lesson rỗng đã xử lý) | toast, không chặn |
| Practice | skeleton | theo mục 5 | banner + retry |
| Mistakes | skeleton danh sách | theo mục 6 | thẻ lỗi + retry |
| Audio | — | ẩn nút nếu không có voice | toast "Không phát được âm thanh" |

---

## 8. Responsive

| Breakpoint | Thay đổi |
|---|---|
| < 768 px | Lesson list 1 cột; bảng từ thành list card; Learning card full width; nút điều hướng sticky ở đáy (trên `MobileNav`) |
| ≥ 768 px | Lesson grid 2–3 cột; bảng từ có đủ cột |
| ≥ 1024 px | Dashboard hai cột (overview + continue) |

Không scroll ngang ở bất kỳ breakpoint nào. Kiểm tra ở 375 px.

---

## 9. Accessibility

- Ô nhập có `label`, nút có `aria-label` khi chỉ có icon (audio, favorite, đóng).
- Progress bar dùng `role="progressbar"` với `aria-valuenow`.
- Thông báo kết quả quiz dùng `aria-live="polite"`.
- Phím tắt: Enter nộp câu; ← → chuyển từ trong Learning Mode.
- Tương phản màu đạt WCAG AA cho badge trạng thái.

---

## 10. Test scenarios UI

| ID | Kịch bản | Kết quả mong đợi |
|---|---|---|
| U-01 | Mở dashboard lần đầu, không có tiến độ | Overview toàn NEW, không có Continue Learning, CTA Lesson 01 |
| U-02 | Đổi level N5→N4 | URL đổi `?level=N4`, lesson list đổi, không giữ dữ liệu N5 |
| U-03 | Search "学" | Hiển thị kết quả, không gọi API khi `q` rỗng |
| U-04 | Mất mạng khi load lesson | Thẻ lỗi, nút retry hoạt động |
| U-05 | Learning Mode: đi tới từ cuối | Hiện nút làm bài kiểm tra |
| U-06 | Thoát Learning Mode giữa chừng, mở lại | Resume tại `lastPosition` |
| U-07 | Submit quiz với 20 câu | Chỉ gọi `POST /attempts` một lần |
| U-08 | Bấm "Nộp" hai lần nhanh | Chỉ một request (nút disable khi pending) |
| U-09 | Quiz MISTAKES rỗng | Empty state, không lỗi |
| U-10 | Favorite lỗi mạng | Rollback icon, toast |
| U-11 | Màn 375 px | Không scroll ngang, nút không bị che bởi MobileNav |
| U-12 | Máy không có voice ja-JP | Nút audio ẩn |
| U-13 | Result: câu sai hiển thị đáp án đúng | Đúng danh sách `correctAnswers` |
| U-14 | Hoàn thành lesson lần đầu | Banner "Hoàn thành bài học" |
