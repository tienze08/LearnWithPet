# DESIGN — VocaPet Japanese Learning Platform

## 1. Visual Identity

**Concept:** "Kawaii Study Companion" — ấm áp, dễ gần, không gây áp lực, phù hợp cho học tập dài hạn.

**Personality:**
- Thân thiện như thú cưng ảo, không khô khan như ứng dụng học thuần túy
- Nhẹ nhàng, pastel-inspired, không lòe loẹt
- Cảm giác "giấy và mực" (warm paper background) kết hợp với màu xanh lá sage

**Phân biệt với Duolingo:** Không dùng mascot xanh lá hoặc gradient neon. VocaPet dùng palette warm sage-green, tông ấm, typography tròn (Nunito).

---

## 2. Color Tokens (từ `styles.css` hiện tại)

### Light Mode
| Token | OKLCH | Mô tả |
|-------|-------|-------|
| `--background` | `oklch(0.982 0.008 95)` | Nền trang — warm off-white |
| `--foreground` | `oklch(0.28 0.022 155)` | Text chính — dark sage-green |
| `--card` | `oklch(1 0.004 100 / 92%)` | Nền card — trắng ngà nhẹ |
| `--primary` | `oklch(0.58 0.13 154)` | Sage green — CTA chính |
| `--primary-foreground` | `oklch(0.99 0.004 100)` | Text trên primary |
| `--secondary` | `oklch(0.94 0.025 152)` | Nền tag, badge nhẹ |
| `--muted` | `oklch(0.95 0.012 105)` | Nền muted, disabled |
| `--muted-foreground` | `oklch(0.53 0.018 155)` | Text phụ |
| `--accent` | `oklch(0.92 0.045 150)` | Hover, highlight nhẹ |
| `--destructive` | `oklch(0.65 0.22 25)` | Lỗi, xóa — coral red |
| `--success` | `oklch(0.58 0.13 154)` | Đúng — same as primary |
| `--warning` | `oklch(0.82 0.17 75)` | Cảnh báo — golden |
| `--coin` | `oklch(0.82 0.17 80)` | Coin — golden yellow |
| `--streak` | `oklch(0.7 0.21 40)` | Streak — orange |
| `--xp` | `oklch(0.75 0.18 200)` | XP — sky blue |

### Dark Mode
| Token | OKLCH |
|-------|-------|
| `--background` | `oklch(0.18 0.02 160)` — deep forest |
| `--foreground` | `oklch(0.97 0.01 145)` — almost white |
| `--primary` | `oklch(0.75 0.21 145)` — bright sage |

### Module Color Coding (đề xuất)
| Module | Màu accent | Lý do |
|--------|-----------|-------|
| Alphabet (Kana) | `oklch(0.72 0.15 230)` — sky blue | Nhẹ, dễ bắt đầu |
| Tango | `oklch(0.72 0.21 145)` — sage green | Consistency với brand |
| Kanji | `oklch(0.65 0.2 300)` — purple | Phức tạp hơn, visual weight |
| Bunpo | `oklch(0.82 0.17 75)` — golden | Grammar = cấu trúc |
| JLPT | `oklch(0.7 0.21 40)` — orange | Urgency, thi cử |

---

## 3. Typography

**Primary Font:** `Nunito` (Google Fonts) — round, friendly, Latin + Japanese OK
```css
font-family: "Nunito", "ui-rounded", system-ui, sans-serif;
```

**Japanese Text:**
- Fallback tự nhiên: hệ thống font CJK (Hiragino, Meiryo, Yu Gothic)
- Cho headings tiếng Nhật lớn: `font-size: 3rem+`, `font-weight: 700`
- Furigana: `<ruby>` HTML element với `font-size: 0.6em`

**Scale:**
| Tên | Size | Weight | Dùng cho |
|-----|------|--------|---------|
| `display` | 2.25rem (36px) | 700 | Kana lớn trong chart |
| `heading-1` | 1.5rem (24px) | 700 | Page title |
| `heading-2` | 1.25rem (20px) | 600 | Section header |
| `body` | 1rem (16px) | 400 | Nội dung thường |
| `small` | 0.875rem (14px) | 400 | Caption, label |
| `xs` | 0.75rem (12px) | 400 | Badge, metadata |

---

## 4. Spacing & Layout

**Grid:** Tailwind defaults (4px base)
- `--radius: 1rem` — border-radius base
- Radius variants: `sm` (0.75rem), `md` (0.875rem), `lg` (1rem), `xl` (1.25rem), `2xl` (1.5rem)

**Shadow Pop:** `0 4px 0 0 var(--shadow-pop-color)` — đặc trưng của VocaPet, tạo cảm giác chiều sâu

**Responsive Breakpoints:**
| Breakpoint | Width | Layout |
|-----------|-------|--------|
| `sm` | 640px | 1 column, stacked |
| `md` | 768px | Sidebar collapses |
| `lg` | 1024px | Full sidebar + content |
| `xl` | 1280px | Wider content area |

---

## 5. Component Inventory

### Existing (shadcn/ui — tái sử dụng)
- `Button` — primary, secondary, ghost, destructive variants
- `Card`, `CardHeader`, `CardContent`, `CardFooter`
- `Dialog`, `AlertDialog` — modals
- `Select`, `Input`, `Textarea`, `Label` — forms
- `Badge` — tags và labels
- `Progress` — progress bars
- `Tabs` — tab navigation (dùng cho Hiragana/Katakana switch)
- `Tooltip` — hover hints
- `ScrollArea` — scrollable containers
- `Separator` — visual dividers
- `Skeleton` — loading state

### Existing Custom Components (tái sử dụng)
- `AppShell` — layout chính với sidebar
- `PetCompanion` — companion widget ở góc màn hình
- `SubmitButton` — loading state button
- `AuthInput` — form input với label
- Quiz components (QuizGame, TypeGame, FlashSide)

### New Components (cần tạo)

#### KanaGrid
```
Grid 5 cột × N hàng hiển thị kana chart
Mỗi cell: kana lớn + romaji nhỏ + click to hear
Null cells: styled khác (empty slot trong gojūon)
```

#### KanjiCard
```
Card hiển thị 1 kanji:
- Kanji lớn (font-size: 4rem)
- On/Kun readings
- Nghĩa (Vietnamese)
- Radical chip
- JLPT badge
- Stroke count
```

#### JLPTBadge
```
Badge nhỏ hiển thị N5/N4/N3/N2/N1
Màu khác nhau theo level (N5=green, N4=blue, N3=purple, N2=orange, N1=red)
```

#### GrammarCard
```
Card ngữ pháp:
- Pattern lớn (e.g. "〜てください")
- Structure nhỏ hơn
- Explanation text
- Example accordion (3 ví dụ)
```

#### ModuleProgressCard
```
Card tổng quan 1 module trên Japanese Hub:
- Icon module
- Tên module
- Progress bar: X/Y items
- CTA button "Continue" / "Start"
```

#### FuriganaText
```
Component render <ruby> HTML tự động
Input: "日本語[にほんご]" → <ruby>日本語<rt>にほんご</rt></ruby>
```

#### AlphabetPage (route: /app/japanese/alphabet)
```
Single scrollable page. No tabs between sections.
Layout: Header → Script selector → Progress summary → CTA → 4 chart sections → (quiz panel when active)
Max-width: 4xl (896px), p-4 sm:p-6
```

#### KanaCard (new, replaces simple KanaCell)
```
Props: { kana, romaji, status: "unseen"|"learning"|"mastered" }
Size: varies by section (basic: ~72px, yoon: ~80px)
Content: character (text-3xl sm:text-4xl) + romaji (text-xs muted)
Status indicator: colored dot or border
  - unseen:   border-border (default)
  - learning: border-amber-400, yellow dot
  - mastered: border-green-500 bg-green-50/30, green dot
Interaction: click → speakKana(), hover shows outline
Responsive: grid-cols-5 → grid-cols-5 (basic), grid-cols-3 (yoon)
```

#### QuizConfigPanel
```
Inline panel (not modal) below "Start Quiz" button.
Fields:
  - Script: segmented control [Hiragana | Katakana]
  - Section: pill toggles [All | Basic | Dakuten | Handakuten | Yōon]
  - Count: segmented control [10 | 20 | All]
  - Weak mode: toggle "Practice weak kana only"
Actions: [Cancel] [▶ Start]
```

#### QuizStatsBar
```
Sticky top bar during quiz (below AppShell header).
3 stats: Accuracy (%) | Remaining (n) | Incorrect (n/total)
Background: bg-background/95 backdrop-blur, border-b
```

#### FlashcardQuiz
```
Main quiz view (replaces chart when quiz is active).
Layout: Back button (top-left) + StatsBar + flashcard centered
Flashcard:
  - kana display: text-8xl sm:text-9xl, centered
  - Romaji input: text-center, text-lg, autofocus
  - Keyboard: Enter = submit, Space (when input not focused) = reveal
  - "Reveal Answer" button (ghost variant, below input)
After answer reveal:
  - Show correct romaji
  - [✓ Got it] primary + [✗ Need more practice] outline
After correct input:
  - Green flash on input border
  - Auto-advance after 800ms (or manual Next button)
```

#### QuizResultScreen
```
Shown when queue is empty (all answered correctly).
Layout: centered, max-w-md
Stats: Score card with 4 metrics (Total / Correct / Incorrect / Accuracy)
Weak kana: grid of KanaCard (learning status) with accuracy %
Actions: [Practice Mistakes] [Practice Again] [← Back to Chart]
```

---

## 6. Interaction Patterns

### Alphabet Page — Chart View
```
1. User switches script (Hiragana/Katakana) → chart re-renders, same scroll position
2. Click kana card → speakKana() fires TTS, brief active state
3. Mastery dots update after quiz completion (from backend data)
4. "Start Quiz" → QuizConfigPanel appears inline below CTA
```

### Active Recall Quiz Flow
```
1. Config: select options → Start
2. Queue built from selected kana (shuffled)
3. For each kana in queue:
   a. Display kana large, focus input
   b. User types romaji → Enter:
      - Normalize input (lowercase, trim)
      - Check against canonical + ROMAJI_VARIANTS
      - Correct → green flash, remove from queue, advance
      - Wrong → red flash, show correct answer, re-queue
   c. OR: Space/Reveal → show answer
      - [Got it] → remove from queue
      - [Need more] → re-queue
4. When queue empty → show Results screen
5. Submit to backend: POST /api/japanese/kana/attempts
   (each kana: isCorrect = answered correctly on FIRST try without reveal)
```

### Kanji Flashcard Flow (Phase 3)
```
1. Card front: chỉ hiển thị kanji
2. Click → flip → show readings + meaning
3. Rating buttons: AGAIN | HARD | GOOD | EASY
4. Same as existing SRS flow
```

---

## 7. Accessibility

- Tất cả interactive elements có `aria-label`
- Kana chart: keyboard navigable (Tab + Enter)
- Color contrast ratio ≥ 4.5:1 (WCAG AA)
- Không dùng màu duy nhất để convey thông tin (luôn có icon hoặc text kèm)
- `prefers-reduced-motion`: disable flip animation, dùng instant show/hide

---

## 8. File Structure (frontend)

```
src/components/
├── japanese/              [NEW folder]
│   ├── KanaGrid.tsx
│   ├── KanjiCard.tsx
│   ├── JLPTBadge.tsx
│   ├── GrammarCard.tsx
│   ├── ModuleProgressCard.tsx
│   └── FuriganaText.tsx
│
└── ui/                    [existing shadcn — không thay đổi]
```
