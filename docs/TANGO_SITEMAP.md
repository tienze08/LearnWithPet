# TANGO_SITEMAP — Cấu trúc điều hướng Tango

**Liên quan:** [TANGO_PRD.md](TANGO_PRD.md), [TANGO_UI_UX.md](TANGO_UI_UX.md).

Tango nằm trong nhóm **Tiếng Nhật** của sidebar `AppShell` (hiện đã có mục "Alphabet"). Điều hướng đi theo JLPT level → Lesson → Vocabulary. Không dùng Topic.

## 1. Cây route (frontend, TanStack Router)

Theo quy ước file-based route hiện có (`src/routes/app.japanese.alphabet.tsx`, `app.japanese.kana.tsx`).

```
/app/japanese/tango                                  Dashboard (4 màn chính: #1)
/app/japanese/tango/lessons/$lessonId                Lesson Detail (#2)
/app/japanese/tango/lessons/$lessonId/learn          Learning Mode (#3)
/app/japanese/tango/lessons/$lessonId/practice       Practice Mode + Result screen (#4)
/app/japanese/tango/vocabularies/$vocabularyId       Chi tiết từ (bổ sung)
/app/japanese/tango/mistakes                         Weak words (bổ sung)
```

Ghi chú:
- Result screen không có route riêng. Kết quả trả về từ `POST /attempts` và hiển thị trong cùng trang `practice` ở trạng thái `result`. Route `attempts/$attemptId` chỉ thêm khi có nhu cầu xem lịch sử.
- `vocabularies/$vocabularyId` và `mistakes` là bổ sung ngoài 4 màn hình yêu cầu, để có chỗ xem ví dụ đầy đủ và danh sách điểm yếu.
- Level không có route riêng: được chọn bằng query `?level=N5` trên dashboard.

## 2. Sơ đồ điều hướng

```
Sidebar "Tiếng Nhật"
 └─ Alphabet (có sẵn)
 └─ Tango ──────────────► Dashboard (?level=N5)
                              ├─ Continue Learning ──► Learning Mode (lesson đề xuất)
                              ├─ Lesson card ─────────► Lesson Detail
                              │                           ├─ Start Learning ─► Learning Mode
                              │                           ├─ Practice ───────► Practice Mode
                              │                           └─ Từ (row) ───────► Chi tiết từ
                              ├─ Search ──────────────► kết quả trong dashboard
                              └─ Weak words ──────────► Mistakes
                                                          └─ Practice Mistakes ► Practice Mode (scope=MISTAKES)
Learning Mode ──► Practice Mode (nút "Làm bài kiểm tra")
Practice Mode (result) ──► Practice Mistakes | Practice Again | Về lesson
```

## 3. Mobile

- Dùng `MobileNav` hiện có (5 mục): Home, Alphabet, Decks, Pets, Profile. Tango truy cập qua dashboard Home (thêm card "Tango" ở `app.index.tsx`) để không làm bảng nav quá tải.
- Learning Mode và Practice Mode ở mobile: toàn màn hình, nút quay lại ở header.

## 4. Breadcrumb

`Tango › N5 › Lesson 01 › Learning`. Ẩn trên mobile, thay bằng nút quay lại.

## 5. Query params

| Trang | Param | Mặc định |
|---|---|---|
| Dashboard | `level` (N5–N1) | level có tiến độ gần nhất, nếu không thì N5 |
| Practice | `mode` (`JP_TO_MEANING`, `VI_TO_JP`, `MIXED`) | `MIXED` |
| Practice | `scope` (`ALL`, `MISTAKES`) | `ALL` |
| Dashboard | `q` (tìm kiếm) | rỗng |
