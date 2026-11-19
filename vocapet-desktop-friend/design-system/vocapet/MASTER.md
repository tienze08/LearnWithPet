# VocaPet Design System — MASTER

> Page overrides live in `pages/*.md` and win over this file. Tokens: `tokens.css`. Preview: `preview.html`.
> Status: **proposal, not implemented.** No file under `src/` has been changed.

## 0. How this was produced

- Ran UI UX Pro Max `--design-system` for "japanese language learning flashcards spaced repetition natural green warm cream", plus `style`, `typography`, `ux` domain searches.
- Inspected `src/styles.css`, `__root.tsx`, `AppShell.tsx`, `app.index.tsx`, `components/tango/shared.tsx`, and the Tango routes.
- **Where I overrode the tool, and why.** The tool returned *Claymorphism + Baloo 2/Comic Neue + purple* (its "kids education" profile). That conflicts with the brief (natural green, cream, modern, not playful-childish) and cannot render Japanese. I kept its rules for accessibility, touch, motion and checklist, and replaced its style/palette/type.

## 1. Product category

Self-study language-learning platform for adults/teens (EdTech, SRS + curriculum). Reference class: Duolingo (momentum), Anki/WaniKani (SRS discipline), Bunpo/Benkyo-style structured JLPT courses (lesson path). Primary job: *"Tell me the one thing to do now, and let me see I'm getting somewhere."*

## 2. UI style: "Washi Study"

Warm paper + ink, flat with tonal depth. **Not** claymorphism, not glass, not generic SaaS.

| Principle | Rule |
|---|---|
| Surfaces | Separate regions by **tone** (`bg` → `surface` → `surface-2`), not by a border on every card. Hairline dividers only inside a surface. |
| Elevation | Two levels only: `flat` (default) and `lift` (one hero card per screen + hover). No hard `0 4px 0` "pop" shadows. |
| Emphasis | Japanese headwords are the visual hero: large, serif, ink-coloured. UI chrome stays quiet. |
| Colour | Green = progress/action. Hanko red (`seal`) = JLPT level stamp & mistakes, used in tiny doses. Amber = needs review. |
| Gradients | None for fills. Existing page radial wash stays at ≤ 30% (already in `styles.css`). |
| Decoration | One motif only: a faint, plain **ink-wash circle (enso)** behind the hero headword. No mascots, no stickers (Pet is hidden). |
| Icons | Lucide only (already installed). No emoji as icons. |

Dials used: variance 5, motion 4, density 6.

## 3. Colour

Keep the existing semantic token names (`--background`, `--primary`, `--muted` …). Only values change/add. Contrast verified (WCAG, computed from the oklch values).

| Token | oklch | ≈ Hex | Use | Contrast |
|---|---|---|---|---|
| `--background` | .982 .008 95 | #FBF9F3 | page (kept) | — |
| `--surface-2` **new** | .965 .014 100 | #F5F4E9 | recessed bands, list shelves | — |
| `--foreground` | .28 .022 155 | #202C24 | text (kept) | 13.8 : 1 on bg |
| `--muted-foreground` | **.48** .02 155 | #556159 | secondary text | 6.2 : 1 (was .53 → 4.97, passing but thin on surface-2) |
| `--primary` | **.50 .12 155** | #0B7643 | buttons, links, progress | white on it **5.7 : 1** |
| `--primary-soft` **new** | .95 .03 150 | #E1F5E4 | tinted chips/bands | ink `.40 .09 155` on it 7.8 : 1 |
| `--seal` **new** | .52 .17 28 | #B6322B | JLPT stamp, mistake mark | 5.7 : 1 on bg |
| `--warning-ink` **new** | .45 .10 70 | #784900 | text on amber chips | 7.3 : 1 |
| `--border` | .88 .014 115 | #D7D9CE | hairlines only (1.4 : 1 — decorative, never the only boundary of a control) | |
| `--ring` | = primary | | focus ring 2px + 2px offset | |

**Finding:** the current `--primary` (#279055) gives white text only **4.0 : 1**, which fails AA for the 14px bold button/badge text used today. One value change (to .50) fixes every button app-wide.

Word-status colours (never colour-only: each has an icon + label):
`NEW` neutral · `LEARNING` info-blue · `NEED_REVIEW` amber (+`warning-ink` text) · `MASTERED` primary green. Already mapped in `components/tango/shared.tsx`; reuse, restyle only.

Dark mode: keep the existing `.dark` block; re-derive `--primary` lighter (.72) and verify 4.5 : 1 after the change. Not designed in detail in this pass.

## 4. Typography

| Role | Font | Why |
|---|---|---|
| Japanese headword / lesson title / display | **Noto Serif JP** 600–700 | Tool's top pairing ("Japanese Elegant"); stroke detail of kanji stays legible at 48–96px; gives the "textbook" warmth. |
| Japanese body (kana lines, examples) | **Noto Sans JP** 400–500 | Clean at 14–18px. |
| Latin / Vietnamese UI | **Geist** (existing) | Keep. **Risk:** confirm Geist's Vietnamese subset on Google Fonts; if absent, Vietnamese diacritics fall back to system font. Fallback candidate: *Be Vietnam Pro*. Check before implementing. |
| Numerals | Geist, `font-variant-numeric: tabular-nums` | Counters/timers don't jitter. |

Today the app loads only Geist → Japanese falls back to whatever the OS has (Yu Gothic / Meiryo / none on Linux). That is the main Japanese-rendering bug to fix.

Rules:
- Every Japanese text node gets `lang="ja"` (selects correct Han glyph variants vs Chinese; also helps screen readers).
- Stack: `"Noto Serif JP","Hiragino Mincho ProN","Yu Mincho",serif` / `"Noto Sans JP","Hiragino Sans","Yu Gothic",sans-serif`.
- Japanese line-height 1.7 (body) / 1.25 (display). No negative letter-spacing on Japanese (the global `h1..h5 { letter-spacing:-0.01em }` must not apply to `[lang=ja]`).
- Load `Noto Sans JP` 400/500/700 and `Noto Serif JP` 600/700 with `display=swap`; use the `text=` or unicode-range subsets Google serves by default (don't self-host the full CJK files).
- Scale (px): 12 · 14 · 16 · 18 · 24 · 32 · 48 · 72 · 96. Body 16. Minimum 12 for captions only.
- Headings weight 700 (not the current 800 everywhere — 800 flattens hierarchy).

## 5. Layout

- App shell: keep `AppShell` (sidebar ≥ md, bottom nav on mobile). Content max-width **1120px** (dashboard) / **720px** (study screens), 24px gutter desktop, 16px mobile.
- Spacing 4-pt scale: 4 8 12 16 24 32 48 64. Section gap 32, intra-section 12–16.
- Breakpoints 375 / 768 / 1024 / 1440 (Tailwind `sm md lg 2xl` already match).
- **Anti-emptiness rule:** a screen's first viewport must contain the primary action, today's status, and at least one data-bearing element. No full-width card holding one sentence.
- **Anti-repetition rule:** no screen may show > 2 consecutive identical bordered boxes. Mix: hero band, tinted shelf, list, tile grid.

## 6. Components (reuse first)

Reuse as-is (restyle via tokens): `Button`, `Card`, `Progress`, `Tabs`, `Badge`, `Skeleton`, `Dialog`, `Sheet`, `Tooltip`, `LoadingBlock/ErrorBlock/EmptyBlock/ProgressBar/WordStatusBadge/LessonStatusBadge` in `tango/shared.tsx`.

New (small, only these):
| Component | Purpose | Notes |
|---|---|---|
| `JpText` | Wraps text with `lang="ja"` + font role (`serif`/`sans`) | Single source for the Japanese font rule. |
| `ProgressRing` | Circular % for lesson/daily goal | SVG, `role="progressbar"`, text label inside. |
| `StatusMark` | Icon + label for word status | Replaces colour-only dots; extends `WordStatusBadge`, not a duplicate. |
| `LevelStamp` | N5/N4… in a hanko-style rounded square | Uses `--seal`. |

Do **not** add: new button variants, a second card component, a chart library (SVG + existing `ui/chart.tsx` is enough).

Component specs:
- **Button**: primary = solid `--primary`; secondary = `--primary-soft` fill (no border); tertiary = text. One primary per screen region. Min height 44px; radius 12.
- **Card**: radius 16, `--card` on `--background` with **no border** and `flat`; `lift` only for the hero. Border appears only on keyboard focus-within.
- **Chip/Tab**: pill, 36px high min target 44 via padding, selected = filled primary-soft + ink text + check/underline (not colour alone).
- **Vocabulary card / lesson card**: see `pages/vocabulary.md`.
- **Progress**: bar 8px (existing) for lists; ring for hero metrics; always a numeric label.

## 7. Motion

Tokens: `--dur-fast 120ms` (press), `--dur-base 200ms` (hover/colour), `--dur-slow 320ms` (reveal/flip), easing `cubic-bezier(.2,.8,.2,1)` out, in-out for flips. Transform/opacity only.
Meaningful micro-interactions only: press scale .98; progress fills animate once on mount; card reveal = 180ms fade + 4px rise; correct answer = ring pulse once; streak increment = number tick. Max 1–2 animated elements per view. `@media (prefers-reduced-motion: reduce)` → durations 0, no stagger. Existing `bob/wiggle/blink` keyframes are Pet-only; leave them.

## 8. UX guidelines (from the tool's rules, applied)

1. One primary CTA per screen ("Continue lesson" / "Review N due").
2. Every async action: disabled + spinner on button; skeletons (not spinners) for lists > 1s (already `LoadingBlock`).
3. Errors beside the field/block with retry (already `ErrorBlock`).
4. Study screens: keyboard parity — Space reveal, 1/2 rate (already present); add visible key hints.
5. Progress is always shown as number + visual (e.g. "12 / 30" + bar).
6. Don't gate: locked/"Coming soon" modules render as muted, non-focusable, with text "Soon" (not hover-only tooltip).
7. Touch: targets ≥ 44px, ≥ 8px apart (heart & speaker buttons in word rows are currently 32px — fix).
8. Empty states give the next action, not an apology.

## 9. Accessibility checklist (WCAG 2.2 AA)

- Text contrast ≥ 4.5 : 1, large ≥ 3 : 1, non-text UI ≥ 3 : 1 (progress fill vs track: primary on `muted` = ok; verify after change).
- `:focus-visible` ring 2px primary + 2px offset on every interactive element; never `outline:none` without replacement.
- Status never by colour alone (icon + text). ✓/✗ in "Recently studied" must keep text for SR (`sr-only` "Correct"/"Wrong").
- Heading order h1→h2→h3; one h1 per route.
- `lang="ja"` on Japanese; `lang="vi"` on `<html>`.
- Icon-only buttons have `aria-label` (existing pattern ok). Speaker button label includes the word.
- Progress uses `role="progressbar"` + `aria-valuenow` (existing `ProgressBar` ok; `ProgressRing` must match).
- Live region (`aria-live="polite"`) for answer feedback and streak updates.
- `prefers-reduced-motion` and `prefers-color-scheme` honoured.
- Flashcards: reveal operable by keyboard and button, not by tap-on-card only.

## 10. Avoid list (from brief) → how it is prevented

| Avoid | Prevention |
|---|---|
| Generic SaaS dashboard | Ink/paper type-led hero; Japanese headword as focal point; no KPI-tile row of four equal boxes. |
| Excessive empty space | §5 anti-emptiness rule; max-width + 2-column hero. |
| Repetitive bordered cards | Tonal surfaces, borderless cards, §5 anti-repetition rule. |
| Monotonous vocab lists | Two views (rows / tiles), headword-led rows with status marks, grouped by status or position. |
| Excess gradients | None on fills. |
| Unnecessary decoration | Single enso motif, only behind hero headword. |

## 11. Open decisions for you

1. Approve **primary darkening** (.58 → .50) — affects all buttons; or keep brand green and use `--primary-strong` for text/buttons only (more code churn).
2. Approve **Noto Serif JP** for headwords (vs sans-only, more neutral).
3. Dashboard analytics: weekly chart needs a per-day study endpoint. Does one exist? (Not found in current `study-session.queries`.) Spec falls back to what exists.
4. Vietnamese font check (§4).
5. Dark mode in scope for this redesign, or later?
