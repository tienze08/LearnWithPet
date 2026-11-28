# VocaPet — Design System: "Japanese Studio Playground"

> Status: **Đã triển khai — Proposal v3** (2026-11-22). Thay thế v2 "Modern Japanese Studio" và `design-system/vocapet/MASTER.md`.
> Ảnh: `design-system/vocapet/audit/before/`, `audit/after/`.
> Phạm vi: chỉ UI. Không đổi backend, schema, API contract, engine lộ trình, SRS/FSRS, chấm điểm, routing,
> query hook/store (trừ lỗi đã xác minh và được duyệt riêng). Mọi số liệu lấy từ dữ liệu thật; thiếu thì empty state.

Modern Japanese Studio là nền. Japanese Editorial là điểm nhấn (tiêu đề Playfair lớn, lệch trái, số lớn, kẻ mảnh).
Modern Playful có kiểm soát (một highlight bơ mỗi màn, thú cưng phản hồi theo ngữ cảnh, dấu hanko khi xong việc).

## 0. Quyết định đã chốt

- **Sáu màn:** Today `/app`, Ôn tập `/app/review`, Thư viện `/app/library`, Flashcards `/app/decks` + `/app/decks/$deckId`,
  Tiến độ `/app/progress`, Cài đặt `/app/profile`. Roadmap và Lesson giữ bố cục v2, ăn token v3.
- **Điều hướng desktop:** Hôm nay · Ôn tập · Thư viện · Flashcards · Tiến độ · Cài đặt; streak (dấu hanko) ở chân sidebar.
- **Mobile:** 4 mục dưới đáy (Hôm nay · Ôn tập · Thư viện · Tiến độ); Flashcards, Thú cưng, Cài đặt trong menu tài khoản.
- **Focus mode** cho `/app/path/study`.
- Coin và level chỉ hiện ở Cài đặt → Thú cưng.
- **Dark mode chưa triển khai.** Token tổ chức 2 lớp (§2) để thêm sau bằng cách remap lớp semantic.
- Không có API cài đặt thông báo và đổi tên → không hiện các mục đó.
- Lesson từng chậm do N+1, đã sửa bằng `hibernate.default_batch_fetch_size: 100` (backend `application.yaml`).

## 1. Ba motif, mỗi cái mang dữ liệu thật

| Motif | Nghĩa | Dùng ở |
|---|---|---|
| **Ô genkō** 原稿用紙 | Một ô = một chữ; điền forest = đã thuộc, viền sage = đang học, viền đất nung = cần ôn, trống = chưa học | Tiến độ (bản đồ chữ), Lesson (kana/kanji) |
| **Dấu hanko** 判子 | 済 xong, 試 kiểm tra, ô nét đứt = chưa tới | Today (tuần), Roadmap, Tiến độ (bài đã xong), hoàn thành phiên, streak |
| **Ruby** | Cách đọc trên chữ | Thẻ ôn, Flashcards, từ vựng trong Lesson |

## 2. Token (`src/styles.css`)

**Lớp 1 · primitives** (`--p-*`, không dùng trực tiếp trong component) → **lớp 2 · semantic** (`--background`, `--primary`…, Tailwind dùng lớp này).

| Primitive | Hex | Semantic chính | Tương phản trên ivory |
|---|---|---|---|
| `--p-ivory` | `#F5F2E9` | `--background` | — |
| `--p-paper` | `#FBF9F3` | `--card`, `--sheet` | — |
| `--p-paper-deep` | `#ECE7DA` | `--muted`, `--surface-2`, sidebar | — |
| `--p-ink` | `#252922` | `--foreground` | 13.2 : 1 |
| `--p-forest` | `#285C47` | `--primary`, `--ring` | 6.9 : 1; chữ trắng trên nó 7.7 : 1 |
| `--p-forest-soft` | `#DFE5D8` | `--accent`, `--primary-soft` | ink trên nó > 10 : 1 |
| `--p-sage` | `#A8B5A0` | `--sage` (mảng: đang học, biểu đồ) | 1.9 : 1, không làm chữ |
| `--p-butter` | `#E9D49B` | `--butter` (highlight, "cần ôn") | ink trên nó 10.1 : 1 |
| `--p-terracotta` | `#C98568` | `--seal` (dấu, viền lỗi) | 2.7 : 1, không làm chữ nhỏ |
| `--p-terracotta-dark` | `#9A4F33` | `--seal-ink`, `--destructive`, `--ochre` | 5.3 : 1 |
| `--p-warm-gray` | `#85877D` | `--subtle-foreground` (chữ ≥ 18px, disabled) | 3.3 : 1 |
| `--p-warm-gray-dark` | `#6E7066` | `--muted-foreground` | 4.5 : 1 |
| `--p-rule` | `#DAD3C2` | `--border` | trang trí |

Quy tắc: forest = hành động/tiến lên; butter = một highlight mỗi màn + trạng thái "cần ôn"; terracotta = dấu và lỗi
(chữ luôn dùng `seal-ink`). Trạng thái luôn có chữ + hình, không chỉ màu.

## 3. Chữ

| Vai trò | Font |
|---|---|
| Tiêu đề biên tập, số lớn | **Playfair Display** 500–700 (`.studio-head`, `lining-nums`) |
| Chữ Nhật trình bày (headword, glyph, số thứ tự 一二三) | **Shippori Mincho** 600/800 (`.studio-jp`) |
| UI, thân bài tiếng Việt | **Be Vietnam Pro** 400–700 |
| Chữ Nhật thân bài, ví dụ, mẫu ngữ pháp | **Noto Sans JP** 400–700 |

Tối đa 3 cấp heading mỗi màn. Kicker 12px chữ hoa +0.14em. `<html lang="vi">`, mọi node tiếng Nhật `lang="ja"`.
Mẫu ngữ pháp có chú thích tiếng Việt xen giữa → dùng sans, không dùng Shippori (thiếu glyph tiếng Việt).

## 4. Bố cục

- Shell phẳng: sidebar `paper-deep` + đường kẻ; nội dung trên ivory. Bán kính 4px control, tối đa 8px. Không shadow.
- Mỗi màn một bố cục riêng trong cùng hệ: Today (7:4, thú cưng chào đầu tiên trên mobile), Ôn tập (hàng số lớn theo loại +
  thẻ ôn), Thư viện (mục lục 目次 ↔ kết quả tìm kiếm theo nhóm), Flashcards (danh sách dòng kẻ, phiên học cột hẹp 680px),
  Tiến độ (câu tiêu đề có số thật, dải đều đặn, bản đồ chữ), Cài đặt (mục lục trái + hàng nhãn/điều khiển).

## 5. Thú cưng theo ngữ cảnh (`PetNote`, `Companion` trong `components/learning-path/studio.tsx`)

| Khoảnh khắc | Mood | Ở đâu |
|---|---|---|
| Chào, ngày học | happy | Today |
| Ngày nghỉ / không còn gì để ôn | sleepy | Today, Ôn tập |
| Xong ngày / xong phiên thẻ | excited | Today, Flashcards |
| Trả lời đúng / sai | excited / waiting (không bao giờ sad, crying) | Lesson (sprite 36px trong thanh phản hồi) |
| Chưa có bộ thẻ / bộ thẻ trống | waiting | Flashcards |

Không hiện ở Thư viện, Tiến độ, Cài đặt (trừ khu Thú cưng).

## 6. Thành phần dùng chung

`studio.tsx`: `PetNote` (bong bóng + mood), `Companion`, `MarkedTitle` (highlight bơ cho cụm học chính), `Seal`, `GenkoGrid`
(có `onSelect`, ô trống cho bảng gojūon). `tango/shared.tsx`: `LoadingBlock` (có `label`), `ErrorBlock`, `EmptyBlock`,
`ProgressBar`. CSS: `.studio-head`, `.studio-jp`, `.studio-kicker`, `.studio-row`, `.studio-btn(-quiet)`, `.studio-bar`,
`.studio-seal`, `.studio-genko`, `.studio-mark`, `.studio-bubble`, `.studio-rise`, `.studio-shake`.

## 7. Chuyển động

Đóng dấu 320ms khi xong; phản hồi trượt lên 180ms; sai rung 2px; nút nâng 1px khi hover; thanh tiến độ chạy 400ms.
Không fade khi cuộn, không confetti, không chuyển động nền. `prefers-reduced-motion` tắt hết.

## 8. Trạng thái và tiếp cận

Loading theo hình bố cục; Error tại chỗ có Thử lại; Empty nói việc tiếp theo; Completed có dấu 済.
AA contrast; focus ring 2px forest; target ≥ 44px; phím tắt: Space lật, 1–4 chọn/đánh giá, Enter tiếp; phản hồi qua `aria-live`.
