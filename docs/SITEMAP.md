# SITEMAP — VocaPet Japanese Learning Platform

## 1. Route Tree

```
/ (Public homepage)
├── /login
├── /register
└── /welcome

/app (Auth guard — redirects to /login if unauthenticated)
├── /app                    → Dashboard
├── /app/achievements       → Achievements / Awards
├── /app/pets               → Pet selection & unlock
├── /app/profile            → User profile
├── /app/reader             → PDF Reader + AI flashcard gen
├── /app/tasks              → Daily missions
├── /app/welcome            → Onboarding flow (first login)
│
├── /app/decks              → Deck list (general vocabulary)
│   └── /app/decks/:deckId  → Deck detail + 5 study modes
│
└── /app/japanese           → Japanese Learning Hub
    ├── /app/japanese/kana       → Alphabet (Hiragana + Katakana + Dakuten + Yoon)
    ├── /app/japanese/tango      → Vocabulary by JLPT level [NEW]
    │   └── /app/japanese/tango/:level  → N5/N4/N3/N2/N1 word list + study
    ├── /app/japanese/kanji      → Kanji browser + flashcard [NEW]
    │   └── /app/japanese/kanji/:id     → Kanji detail (readings, radicals, examples)
    ├── /app/japanese/bunpo      → Grammar rules [NEW]
    │   └── /app/japanese/bunpo/:id     → Grammar detail + exercises
    └── /app/japanese/jlpt       → JLPT practice [NEW]
        └── /app/japanese/jlpt/:level   → N5/N4/N3 practice test
```

## 2. Navigation Structure

### Sidebar (AppShell)
```
VocaPet
│
├── Dashboard          /app
│
├── [JAPANESE]
│   ├── Alphabet       /app/japanese/kana
│   ├── Tango          /app/japanese/tango
│   ├── Kanji          /app/japanese/kanji
│   ├── Bunpo          /app/japanese/bunpo
│   └── JLPT           /app/japanese/jlpt
│
├── [TOOLS]
│   ├── Decks          /app/decks
│   └── Reader         /app/reader
│
└── [PROFILE]
    ├── My Pet         /app/pets
    ├── Tasks          /app/tasks
    ├── Achievements   /app/achievements
    └── Profile        /app/profile
```

### Top Bar (AppShell)
- Streak counter (flame icon)
- Coin balance
- XP / Level
- Pet mood icon (clickable → /app/pets)

## 3. Japanese Hub Page (`/app/japanese`)

Landing page tổng hợp cho Japanese module — hiển thị:
- Progress bar mỗi module (% complete)
- Quick-access cards: Alphabet, Tango, Kanji, Bunpo, JLPT
- Pet đang học cùng (companion widget)
- Daily Japanese mission nếu có

## 4. Alphabet Page (`/app/japanese/kana`) — hiện có

**Tabs:**
- Hiragana | Katakana
- Chart View | Quiz Mode

**Sections (extend hiện tại):**
- Gojūon (5×10 grid) — đã có
- Dakuten (が/ざ/だ/ば rows)
- Handakuten (ぱ row)
- Yoon (拗音: きゃ, しゃ, ちゃ...)

## 5. Tango Page (`/app/japanese/tango`)

- Filter by JLPT level: N5 | N4 | N3 | N2 | N1
- Word list với: từ, nghĩa, furigana, loại từ
- "Start Review" → vào StudySession FSRS với deck JLPT tương ứng
- Progress: X / Y từ đã MASTERED trong level này

## 6. Kanji Page (`/app/japanese/kanji`)

- Filter by JLPT level
- Grid kanji cards (kanji + nghĩa + JLPT badge)
- Click → Kanji detail: On/Kun readings, radicals, example words
- "Start Quiz" → flashcard quiz mode

## 7. Bunpo Page (`/app/japanese/bunpo`)

- Filter by JLPT level
- Grammar pattern cards: pattern + short explanation
- Click → Grammar detail: full explanation, ví dụ × 3, bài tập
- Quiz: chọn grammar pattern đúng cho câu ví dụ

## 8. JLPT Page (`/app/japanese/jlpt`)

- Level selector: N5 | N4 | N3
- "Start Practice" → tổng hợp câu hỏi từ Tango + Kanji + Bunpo đã học
- Kết quả: điểm số + breakdown theo từng loại

## 9. File-based Route Files (TanStack Router)

Các file cần tạo trong `vocapet-desktop-friend/src/routes/`:

| File | Route |
|------|-------|
| `app.japanese.tsx` | Layout `/app/japanese` |
| `app.japanese.index.tsx` | Hub `/app/japanese` |
| `app.japanese.kana.tsx` | đã có |
| `app.japanese.tango.tsx` | `/app/japanese/tango` |
| `app.japanese.tango.$level.tsx` | `/app/japanese/tango/N5` etc. |
| `app.japanese.kanji.tsx` | `/app/japanese/kanji` |
| `app.japanese.kanji.$id.tsx` | `/app/japanese/kanji/:id` |
| `app.japanese.bunpo.tsx` | `/app/japanese/bunpo` |
| `app.japanese.bunpo.$id.tsx` | `/app/japanese/bunpo/:id` |
| `app.japanese.jlpt.tsx` | `/app/japanese/jlpt` |
| `app.japanese.jlpt.$level.tsx` | `/app/japanese/jlpt/N5` etc. |
