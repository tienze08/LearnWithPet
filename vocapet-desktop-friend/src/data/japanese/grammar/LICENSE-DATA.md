# Grammar data: sources and licence

| Path | What it is | Licence |
|---|---|---|
| `source/*.json` | **Verbatim** copy of OpenJLPT `data/json/grammar/*.json` (commit in `meta.json`). Never edited by hand. | CC BY-SA 4.0 |
| `vi/*.json` | VocaPet **editorial** Vietnamese (meaning, explanation, notes, example translations), keyed by grammar `id`. Each entry has `status`: `draft` (not reviewed) or `reviewed`. | CC BY-SA 4.0 (adaptation of the source) |
| `tags.ts`, `formation.ts` | Fixed tables: source tag -> group, formation token -> Vietnamese. Not machine translation. | VocaPet |

**Attribution:** Contains data from [OpenJLPT](https://github.com/evanclan/OpenJLPT) (CC BY-SA 4.0), which uses JMdict and
KANJIDIC2 (EDRDG), Jonathan Waller's JLPT lists and Tatoeba. Grammar explanations and examples in OpenJLPT are original
content by its contributors. Licence: https://creativecommons.org/licenses/by-sa/4.0/

**Share-alike:** these files and any adaptation of them are distributed under CC BY-SA 4.0. Whether this reaches the app code
is a legal question; keeping the data in this folder keeps it small. Needs a lawyer's confirmation before a commercial release.

**JLPT levels** are community approximations, not official lists (the JLPT publishes none).

**Update / add a level:** `python -X utf8 -I tools/importGrammar.py N4` copies the level verbatim and refreshes `meta.json`.
A level without `source/<level>.json` shows "chưa có dữ liệu". Add `vi/<level>.json` for Vietnamese; entries missing there
show "Chưa có bản dịch tiếng Việt". Data checks: `npx tsx --tsconfig tsconfig.json tools/grammarCheck.ts`.
