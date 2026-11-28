# Dashboard — page spec (overrides MASTER)

Route `/app/` · file `src/routes/app.index.tsx` · max-width 1120.

## Goal
Answer in 3 seconds: *what do I do now, how am I doing today, where am I on the path.*

## Data available today (no backend change)
`useMeQuery` (name, streak) · `useGame` (dailyGoal, dailyProgress) · `useStudyDashboardStatsQuery` (`learningWords`) · `useRecentReviewsQuery` · `useTangoProgressQuery` (`words.total/new/mastered/needReview`, `continueLearning`) · `useTangoLessonsQuery` (per-lesson `status`, `progressPercent`).
Not available: due-today count, per-day history, user JLPT level (hard-coded N5). Spec marks these **[future]** and ships a fallback.

## Problems in the current page
- Four stacked sections that all look alike (white bordered rounded boxes) → no focal point.
- Six equal module tiles, four of them "Coming soon" at the same visual weight as live ones.
- "Vocabulary progress" is four bare numbers in a box; no sense of proportion.
- Greeting row is mostly empty width.

## Layout (≥ 1024)

```
┌ Greeting line ─────────────────────────────── [🔥 12 · LevelStamp N5] ┐
├ HERO (2/3) ────────────────────────┬ TODAY (1/3) ──────────────────────┤
│ enso + big 日 headword of lesson   │ ProgressRing daily goal 7/10      │
│ "Lesson 3 · Shopping"              │ "Words in learning  24 →"         │
│ [Continue lesson]  Flashcards      │ [future] "12 due now" primary     │
├ PATH: Alphabet ─ Vocabulary ─ Kanji ─ Grammar ─ Listening ─ JLPT ──────┤
│ live ones: progress ring + %, upcoming: muted "Soon" (one row, not tiles)│
├ IN PROGRESS (7/12) ───────────────┬ WORD MIX (5/12) ───────────────────┤
│ lesson rows w/ ring + title       │ stacked bar: New/Learning/Needs    │
│ (max 3, tonal shelf, no borders)  │ review/Mastered + legend with counts│
│                                   │ Recently studied: word · ✓/✗ (+text)│
└───────────────────────────────────┴────────────────────────────────────┘
```
Tablet (768): hero full width, Today under it as a horizontal band; Path scrolls as a snap row **with visible next-arrow** (no hidden gesture-only); two columns below collapse to one.
Mobile (375): order = Hero → Today band → Path (2-col grid) → In progress → Word mix. Bottom nav stays (existing).

## Components
- **Hero** (`lift`, the only elevated card): `--primary-soft` panel, headword in `.jp-serif` 72px over a 160px enso (SVG stroke, 6% opacity). If no `continueLearning`: headword `はじめ` + "Start your first lesson". Title `h1`-adjacent `h2`. One primary button.
- **Today**: `ProgressRing` 96px, centre text `7/10`. Below: due/learning link. `aria-label="Daily goal 7 of 10 words"`.
- **Path**: single horizontal list (`ol`), each node = icon + label + status. Live nodes link; "Soon" nodes `aria-disabled`, muted, no hover. Replaces the 6-tile grid.
- **Lesson rows**: `--surface-2` shelf, row = ring 40px · title · status mark · chevron; hover = background tint, whole row is the link.
- **Word mix**: one 12px segmented bar (green/amber/blue/neutral) + legend rows with count **and** label (no colour-only). Replaces the four-number box.
- **Recently studied**: keep list; ✓/✗ get `sr-only` text and an icon (Check / X), not glyph characters.

## Behaviour / motion
- Rings/bars animate from 0 once on mount (320ms ease-out). Streak number ticks on change.
- Hero button press scale .98.
- Skeletons per region while loading; regions load independently.

## Empty / error
- No lessons started: In-progress shelf shows "Pick your first lesson →" link, not a dashed box.
- Query error: `ErrorBlock` inline in that region only.

## Accessibility notes
One `h1`; each region `section aria-label`; ring + bar always carry numeric text; Path nodes are a list with `aria-current` on the active module.
