# Kanji data: licences and attribution

Checked 2026-11-18 against edrdg.org/edrdg/licence.html and github.com/KanjiVG/kanjivg (README, COPYING). Not legal advice.

| Source | Licence | Holder | Status |
|---|---|---|---|
| KANJIDIC2 | CC BY-SA 4.0 (EDRDG General Dictionary Licence) | J. W. Breen, EDRDG | in use (P5, imported 2026-11-18) |
| KRADFILE | CC BY-SA 4.0 (same statement, no special conditions) | EDRDG | in use (P5, imported 2026-11-18) |
| KanjiVG | CC BY-SA 3.0 | Ulrich Apel | in use (P5, imported 2026-11-18) |

## What the product must do once a source is used

1. **App screen:** keep `/app/japanese/kanji-sources` reachable from the Kanji page (and from the app menu before release). EDRDG requires apps to show the acknowledgement on a separate screen, not only on launch.
2. **On-screen footer** on pages that display the data: short acknowledgement + link to the sources page.
3. **Licence text/links:** link to the EDRDG licence page, the KANJIDIC project page, and the CC BY-SA 3.0/4.0 deeds.
4. **Mark changes:** say the data was extracted and reformatted.
5. **Share-alike:** keep imported data in its own folder (`src/data/kanji/source*`, `strokes/`) with this notice, label it CC BY-SA, do not merge it into VocaPet's own content files. Legal review is needed to decide whether the share-alike reaches the app code.
6. **No endorsement:** do not imply the authors back VocaPet.
7. **Freshness:** EDRDG asks users to follow updates; the import script must record the source file date and be re-run on a schedule.

`src/lib/japanese/kanji-sources.ts` is the single list the sources page renders. Flip `inUse` to `true` only in the same change that imports a source.

