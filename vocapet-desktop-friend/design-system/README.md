# VocaPet design system (reference redesign)

Source of truth: the six screens in `references/` (`01_welcome_onboarding.png` … `06_progress.png`). Everything here is derived from them.
This directory is the only home for design documentation. It supersedes the "Japanese Studio Playground" notes in
`docs/DESIGN.md` and `vocapet/MASTER.md` for the six redesigned screens; `vocapet/audit/` keeps earlier screenshots,
`vocapet/audit/redesign-v4/` holds the QA captures of this pass.

## Direction
Warm cream paper, deep forest-green actions, soft pastel washes, one gray-and-white cat. Calm, low-pressure, Vietnamese-first.
Not a SaaS dashboard: serif display headings, rounded cards with soft shadow, hand-painted hills and blossoms behind the mascot.

## Tokens (`src/styles.css`, two layers: `--p-*` primitives → semantic)
| Role | Value |
|---|---|
| Page / card / deep paper | `#f6f1e5` / `#fdfbf5` / `#efe9da` |
| Primary (forest) / soft | `#1f5a45` / `#e3ead9` |
| Pastels (category cards, blossoms) | rose `#f8dfdc`, lilac `#e6e1f4`, peach `#f9e7d2`, mint `#dfead8`, sky `#dfe6f6`, blossom `#f3d3d0` |
| Radius | controls 14px (`--radius`), cards 22px (`rounded-2xl`), pills full |
| Shadow | `--shadow-card`, `--shadow-pop`, `--shadow-pop-sm`: offset plus soft blur, tinted green |
| Display font | Noto Serif (Vietnamese-complete), 600 |
| Body font | Be Vietnam Pro; Japanese: Noto Sans JP, Shippori Mincho for large kana/kanji (`.studio-jp`) |

## Shared pieces
- `components/ref/Cat.tsx`: the mascot illustration (`sit`, `read`, `sleep`, `cheer`), cut from `src/assets/gray-study-kitten-*` into `src/assets/cat/`. Decorative only; `PetNote`/`Companion` in `learning-path/studio.tsx` now render it. Pet species, unlocks and `/app/pets` are untouched.
- `components/ref/Logo.tsx`: wordmark. `components/ref/WelcomeFlow.tsx`: onboarding.
- CSS (`@layer components`): `.ref-card`, `.ref-pill`, `.ref-chip`, `.ref-scene` (hills + blossom wash). Older `.studio-*` classes are kept and re-skinned by the tokens, so untouched pages follow the new look.
- `AppShell`: cream sidebar, pale-green active pill, Thư viện with nested Ngữ pháp / Từ vựng / Kanji / Bảng chữ cái.

## Screen map
| Reference screen | Route | File |
|---|---|---|
| 1 Welcome / Onboarding | `/welcome`, `/app/welcome` | `components/ref/WelcomeFlow.tsx` |
| 2 Today | `/app` | `components/learning-path/TodayView.tsx` |
| 3 Learning Plan | `/app/path/roadmap` | `routes/app.path.roadmap.tsx` |
| 4 Library | `/app/library` | `routes/app.library.tsx` |
| 5 Flashcards | `/app/review` (card session) | `routes/app.review.tsx` |
| 6 Progress | `/app/progress` | `routes/app.progress.tsx` |

## Gaps: reference features with no backend or data yet
- Onboarding steps Trình độ / Mục tiêu / Thời gian học / Cách học live in `/app/path/setup`, not in the welcome flow. The stepper lists the real steps; the display-name field is collected but the onboarding API has no name field (pre-existing). "Bỏ qua" is not offered because onboarding is mandatory.
- Today: no "Bài 02" textbook lessons; the card shows the Learning Path's real next phase and objective.
- Flashcards: no example sentence or previous-card arrow (ratings drive the SRS queue). Furigana toggle and speech are client-only.
- Progress: no new-vs-review series or 30-day selector; the chart shows the existing 14-day accuracy. The milestone card shows real path counts, not "12/50 bài".
- Library: Hiragana/Katakana are one "Bảng chữ cái" card; chips are the app's own groups.
- Pagoda/Fuji artwork is a drawn SVG approximation, not the reference's illustration.

## QA
`vocapet/audit/redesign-v4/`: 1536 × 1024 captures of the six screens plus a board, and a 390px mobile board (no horizontal overflow on Today, Library, Plan, Progress, Review).
Captured with Playwright against the dev server and local backend using a throwaway account; the Flashcards capture used a mocked review queue.
