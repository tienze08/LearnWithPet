# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Vietnamese-speaking self-learners taking Japanese from zero to JLPT N3 without a teacher, in short daily sessions. Secondary groups named in docs/PRD.md (JLPT test-prep, manga/anime readers using the Reader) are not the design priority.

## Product Purpose
VocaPet is a structured Japanese learning platform: Alphabet (kana), Tango (vocabulary), Kanji, Bunpo (grammar) and JLPT modules, with precise per-item progress tracking (which character or word is learned, which needs practice). Success: learners finish the kana module early (target 40% in two weeks), study 15+ minutes per session, and reach 75%+ accuracy on repeated quizzes (docs/PRD.md).

## Positioning
Companion-driven learning: a desktop pet that reacts to study, combined with a personalised Learning Path and exact mastery tracking. Per the PRD, the Learning System comes first and deeper Pet integration lands in Phase 7+.

## Operating Context
React web app (TanStack Router/Query) with a Spring Boot API; a PixiJS pet renders on the desktop. Study uses spaced repetition (FSRS and a Leitner-based Learning Path), streaks, daily missions, XP, coins and achievements. A Reader accepts pasted text and PDFs and builds a vocabulary basket.

## Capabilities and Constraints
- UI copy is Vietnamese. Japanese text must render cleanly (kana, kanji, furigana where used).
- Light and dark themes are both supported (docs/DESIGN.md).
- Some systems are still stubs (pet XP/level on the backend, several achievement types); see docs/ROADMAP.md before designing around them.
- Not decided: WCAG level and reduced-motion policy.

## Brand Commitments
Name: VocaPet. Existing stated personality in docs/DESIGN.md ("Kawaii Study Companion": warm, gentle, low-pressure, deliberately unlike Duolingo). Recorded as incumbent truth, not re-approved here.

## Evidence on Hand
Docs: docs/PRD.md, docs/DESIGN.md, docs/SITEMAP.md, docs/ROADMAP.md, Tango and Kanji specs. No real testimonials, user counts or benchmarks exist; do not fabricate them.

## Product Principles
- Learning quality and accurate progress come before pet novelty.
- The companion supports study and never gets in its way.
- Progress is precise and honest: show exactly what is mastered and what is weak.
- Low-pressure, long-term study over streak anxiety.
- Vietnamese-first copy for Vietnamese learners.
