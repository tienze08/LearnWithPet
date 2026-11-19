# Vocabulary (Tango) — page specs (override MASTER)

Routes: `app.japanese.tango.index.tsx` (library) · `…lessons.$lessonId.tsx` (lesson + word list) · `…learn.$lessonId.tsx` (study) · `…vocabularies.$vocabularyId.tsx` (word detail). Business logic, hooks, API calls unchanged; markup/class changes only.

## Problems in the current screens
- Word list = one big bordered `ul`, every row identical, headword 18px bold sans — the Japanese is not the hero; 32px icon buttons.
- Lesson library = uniform bordered cards, nothing distinguishes a started vs untouched lesson but a small badge.
- Study card = good structure, but `text-5xl` sans headword, 800 weight, border + hard shadow; Japanese font not controlled.

## A. Lesson library (`tango.index`)

- Header: title + `LevelStamp` + level tabs (N5…) as pills; search stays right. Remove the eyebrow label "Tango".
- **Continue band** (tonal `--primary-soft`, not a bordered card): lesson number, title, ring %, button.
- **Lesson tile** (grid 1/2/3 cols): 
  - Big lesson numeral (serif, 48px, 12% ink) as background anchor, title 16/700, word count, `ProgressRing` 44px or "New" mark.
  - State by treatment, not just badge: *Completed* = primary-soft fill + check; *In progress* = white `--card` + ring; *Not started* = `--surface-2`, no ring.
  - Whole tile is one link (focus ring on tile). No border.
- Filter chips unchanged in behaviour; add counts.

## B. Lesson page word list (`lessons.$lessonId`)

Two views via a segmented control (`ToggleGroup`): **Rows** (default) and **Tiles**. Choice remembered in `localStorage` (per-viewer convenience).

**Row** (min 64px, two lines, no per-row border; hairline divider only):
```
 01  食べる   たべる · taberu        ◔ Learning    ♡  🔊
     to eat
```
- Headword `.jp-serif` 22px; kana in `--muted-foreground` 14px beside it; romaji hidden < 640px.
- Meaning 15px, wraps (no truncation; `truncate` removed).
- Position numeral muted tabular.
- **StatusMark** (icon + text) replaces the colour-only pill: New ○ · Learning ◔ · Needs review ! (amber) · Mastered ✓. 
- Heart and speaker become 44×44 targets (visually 32px icon centred).
- Optional left 3px status tick on the row (decorative; text carries meaning).
- Group headers when filter = All and sorted by status? **No** — keep lesson order; grouping only in Tiles view by status.

**Tile** (grid 2/3/4 cols, ≥ 140px): headword 28px serif centred, kana under, meaning 13px, status mark bottom-left, speaker bottom-right. Tonal `--card` on `--surface-2` shelf; hover lifts 2px (transform, 200ms).

Sticky action bar on mobile for "Continue / Quiz" so primary action isn't scrolled away.

## C. Study card (`learn.$lessonId`)

Width 720. Progress bar + "12 / 30" at top.
- Card: `--card`, radius 24, `lift`, **no border**. Padding 32 (24 mobile).
- Headword: `.jp-serif` **72px** (48 mobile), weight 600, `lang="ja"`; kana 20px above meaning reveal; romaji 14px.
- Enso behind headword at 5%.
- Speaker button: icon + "Nghe", 44px.
- Reveal: button `Hiện nghĩa` with `Space` key hint `kbd`. On reveal: meaning fades in (180ms + 4px rise), examples below on `--surface-2` band; example Japanese in `.jp-sans` 18px with the vocabulary word emphasised (`<mark>` styled bold primary-ink, not yellow).
- Rating buttons: two equal 48px buttons, "Chưa biết (1)" secondary / "Đã biết (2)" primary, key hints visible. `aria-live="polite"` announces saved state.
- Correct (known) → single ring pulse on the card edge; unknown → no shake (avoid punishing feel), amber outline 1×.
- Mode toggle (guided/flashcard) → `ToggleGroup`.

## D. Word detail (`vocabularies.$vocabularyId`)
Hero headword 72px serif + kana + romaji + speaker; status mark; meanings list; examples as stacked sentence blocks (JP 18px / VI 14px muted) on `--surface-2`; mastery stats as a small ring + "answered / accuracy".

## States
Loading: skeleton rows matching row height (no layout shift). Empty filter: message + "Clear filter" button. Error: `ErrorBlock`.

## Accessibility
`lang="ja"` on every headword/kana/example; speaker `aria-label="Phát âm {kana}"`; heart `aria-pressed`; status has text; view toggle is a labelled group; tiles/rows keyboard focus ring 2px; reduced-motion removes the rise/lift.
