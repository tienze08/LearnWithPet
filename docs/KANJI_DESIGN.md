# VocaPet Kanji — Design & Implementation Plan

Status: approved direction (2026-11-18). Replaces the earlier prototype notes. Pet system is out of scope.

## 1. Goals

1. Kanji is a first-class learning module: **Explorer + Mind Map + Detail panel on one page**.
2. Every kanji has the **same four-branch map**: Thông tin · Cấu trúc · Từ vựng · Ứng dụng.
3. **No invented data.** Missing information is shown as "Chưa có dữ liệu".
4. Each kanji links to many words; from a word the user can open its detail and jump to any kanji it contains.
5. Data and UI are ready for progress/SRS later; no SRS backend now.
6. Keep existing map interactions: zoom, pan, fit, expand/collapse, highlight, search, mobile sheet.

## 2. Data sources and licences (checked 2026-11-18)

| Source | Gives us | Licence | Holder |
|---|---|---|---|
| KANJIDIC2 | Kangxi radical number, stroke count, grade, JLPT (old 4-level), readings, English meanings | CC BY-SA 4.0 (EDRDG General Dictionary Licence) | James W. Breen & EDRDG |
| KRADFILE | Kanji → component parts list | CC BY-SA 4.0 (EDRDG, same statement; no extra conditions) | EDRDG |
| KanjiVG | Per-kanji SVG stroke paths and stroke order | CC BY-SA 3.0 | Ulrich Apel |

Sources: edrdg.org/edrdg/licence.html, github.com/KanjiVG/kanjivg (README, COPYING).

**Obligations we accept**
- **Attribution (EDRDG):** acknowledge usage and source in documentation and in the app on a **separate screen** (a "Nguồn dữ liệu" page reachable from navigation), plus a short acknowledgement on screens that display the data (footer line on the Kanji page). Link to the EDRDG licence page and the KANJIDIC project page.
- **Attribution (KanjiVG):** credit Ulrich Apel / KanjiVG, link to the CC BY-SA 3.0 licence, state that we changed the data (we extract and reformat paths).
- **Share-alike:** the imported/derived data files (`kanji-source.json`, `strokes/*.json`) are adaptations. They stay in their own folder with a `LICENSE-DATA.md`, are labelled CC BY-SA, and are not mixed into proprietary content files. Our own Vietnamese content (Hán Việt, meanings, mnemonics) stays in a separate file we own. Whether SA reaches the app code is a legal question; this separation keeps the question small. **Needs a lawyer's confirmation before a commercial release.**
- **Freshness:** EDRDG asks users to track updates (monthly for web dictionary servers). We ship a static subset, so the import script records the source file date and we re-run it on a schedule.
- No implied endorsement. Not legal advice.

**Not taken from these sources:** Vietnamese meanings, Hán Việt, mnemonics, example sentences (authored or from Tango).

## 3. Data model

Three layers, kept in separate files so licences and ownership stay clear.

```
src/data/kanji/
  n5.content.json          (ours)   char, level, hanViet, meaning(vi), mnemonic?, related[]
  source.json              (CC BY-SA, generated) char -> { radical:{number,char}, components[], strokes, grade, jlptOld, strokesPath? }
  strokes/<hex>.json       (CC BY-SA 3.0, generated) ordered SVG path d-strings
  LICENSE-DATA.md          attribution text, source dates, import command
```

```ts
type KanjiRecord = {          // merged at load time
  char; level;                // JLPT, from our content file
  strokes; hanViet; meaning; on; kun;
  radical: { number; char; name? } | null;   // source.json, else null
  components: string[] | null;               // KRADFILE; null = no data, [] = indivisible
  strokeOrder: string[] | null;              // KanjiVG
  mnemonic: { origin; tip; draft: boolean } | null;
  vocab: KanjiVocab[]; sentences: Sentence[];
};
type KanjiProgress = {        // reserved; nothing writes it yet
  char; status: "NEW" | "LEARNING" | "MASTERED" | "NEED_REVIEW"; lastReviewedAt?; nextReviewAt?; srs?: unknown;
};
```

Rules: `null` always means "no data" and renders "Chưa có dữ liệu". Authored items carry `draft: true` until reviewed.

Vocabulary ↔ kanji is **derived, never stored**: a word links to every kanji in its `expression` that exists in the dataset. Kanji → words = dataset examples + Tango catalog words containing it.

Progress and SRS: `lib/japanese/kanji-progress.ts` exposes `getKanjiStatus(char): KanjiStatus | null`. It returns `null` now (UI shows no status). Later it reads progress from the API. Planned backend shape (not built): `kanji` table + nullable FK `kanji_id` on `UserVocabularyProgress`, reusing `FsrsService`, same pattern as `tangoVocabulary`.

## 4. Mind map (identical for every kanji)

```
root: kanji
├ Thông tin   : meaning (+Hán Việt) · On'yomi · Kun'yomi · Số nét · JLPT · Thứ tự nét
├ Cấu trúc    : Bộ thủ · Thành phần (each opens that kanji if in dataset) · Mẹo nhớ · Kanji liên quan
├ Từ vựng     : word (reading · meaning) ─ Kanji trong từ (one node per kanji) · Ví dụ
└ Ứng dụng    : example sentences (authored or Tango) with translation
```

- All four branches always exist. A branch with no data holds one disabled node "Chưa có dữ liệu".
- Related grammar: not shown (no data source). Added later as a fifth item inside Ứng dụng.
- Branches start collapsed; selecting a branch opens it.

## 5. UI structure

One page `/app/japanese/kanji?k=夕` (`/app/japanese/kanji-map` redirects to it).

```
lg ≥ 1024:  [ Explorer 248px ] [ Map (flex) ] [ Detail 340px ]
< 1024:     filter + horizontal kanji strip, Map, Detail as bottom sheet
```

- **Explorer:** search (char, Hán Việt, meaning, reading), JLPT level filter, grid of compact tiles (char, short meaning), selected and hover states. Status dot and status filter appear only when `getKanjiStatus` returns data.
- **Map:** unchanged engine; node styles per kind: kanji, radical/component, vocab, sentence, tip.
- **Detail:** follows the selected node. Vocab detail lists "Kanji trong từ" as buttons that open that kanji's map.
- **Footer line** on the page: data attribution + link to `/app/japanese/kanji-sources`.

## 6. Phases (each ends with `tsc` + `vite build`)

| Phase | Work | Needs |
|---|---|---|
| P1 | Unified 4-branch builder, "Chưa có dữ liệu" nodes, sentences from Tango examples, schema types for source data | no downloads |
| P2 | Merged page: Explorer + map + detail, redirect old map route, status provider stub | no downloads |
| P3 | Vocab ↔ kanji navigation (Kanji trong từ nodes, panel buttons, component → kanji) | no downloads |
| P4 | Attribution page + footer, `LICENSE-DATA.md` | no downloads |
| P5 (done) | Import script (`tools/importKanji.py`, output in `src/data/kanji/`): KANJIDIC2 radicals, KRADFILE components, KanjiVG stroke order + stroke animation component | **download approval** |
| P6 | Progress/SRS wiring (separate task, backend) | later |

## 7. Risks

- Dataset: 71 kanji, one example each; JLPT levels are unverified (will be checked against KANJIDIC2's JLPT field in P5; note KANJIDIC2 uses the old 4-level scale).
- Tango catalog covers only Minna lessons 1-5, so few kanji get Tango words; search is capped.
- Tango examples only give a whole-sentence kana reading, not per-word furigana.
- Share-alike scope needs legal review.



## 8. Change of direction (2026-11-18): kanji network instead of 4-branch tree

Decision: replace the per-kanji mind-map tree with a **kanji network** (like The Kanji Map): the selected kanji is the
centre, its components are on the left, the kanji that contain it are on the right, arrows point part -> whole.
The four content areas (Thông tin, Cấu trúc, Từ vựng, Ứng dụng) now live in the right-hand panel as stacked sections.

- Clicking a kanji node re-centres the map (`?k=`) and refreshes the panel. Components without their own entry are shown but not clickable.
- Data: `src/data/kanji/graph.json` (2,394 kanji: taught 71 + KANJIDIC2 grade 1-8 + their direct components) and `strokes/*.json` (small buckets, loaded on demand).
- Kanji outside the 71 taught ones have English meaning, readings, radical, parts, stroke order; Vietnamese meaning, Hán Việt, mnemonic, JLPT level, sentences show "Chưa có dữ liệu".
- KanjiVG's hierarchy is shallow: many basic kanji (e.g. 食) have no sub-components, so the left side can be empty. We do not invent a deeper decomposition.
- Right side shows the 6 most frequent kanji that use the centre, with "Xem thêm" for the rest (max 40).
- Kept: zoom, pan, fit, search, expand/collapse (sub-components, "Xem thêm"), responsive (panel -> bottom sheet below 1280px).
