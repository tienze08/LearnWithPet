// Checks for translation matching and the vocabulary drill. Run: npx tsx --tsconfig tsconfig.json tools/practiceCheck.ts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { mergeGrammar } from "../src/data/japanese/grammar/merge";
import type { SourceGrammar, ViGrammar } from "../src/data/japanese/grammar/types";
import { hintsFor, matchesJapanese, sample, translateItems } from "../src/lib/japanese/practice";
import { buildSentences } from "../src/lib/japanese/sentences";
import { vocabDrill, type DrillWord } from "../src/lib/learning-path/questions";

const read = <T>(f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8")) as T;
const src = read<SourceGrammar[]>("../src/data/japanese/grammar/source/n5.json");
const vi = read<Record<string, ViGrammar>>("../src/data/japanese/grammar/vi/n5.json");
const bank = buildSentences(src.map((s) => mergeGrammar(s, vi[s.id])));

const me = bank.find((s) => s.japanese === "私は学生です。")!;
for (const ok of ["私は学生です。", "わたしはがくせいです", "学生です", " がくせい です。"])
  assert.ok(matchesJapanese(ok, me), ok);
for (const wrong of ["", "。", "私は先生です", "学生"])
  assert.ok(!matchesJapanese(wrong, me), wrong);
assert.ok(
  hintsFor(me, [{ expression: "学生", kana: "がくせい", primaryMeaning: "sinh viên" }]).some(
    (h) => h.meaning,
  ),
);
assert.equal(
  translateItems(bank, ["ja-vi", "vi-ja"]).length,
  2 * bank.filter((s) => s.meaningVi).length,
);
assert.equal(sample([1, 2, 3], 2).length, 2);

type Seed = { lessons: { words: { expression?: string; kana: string; meanings: string[] }[] }[] };
const words: DrillWord[] = read<Seed>(
  "../../backend/src/main/resources/tango/minna-n5-bai-1-5.json",
)
  .lessons.flatMap((l) => l.words)
  .map((w, id) => ({
    id,
    expression: w.expression ?? null,
    kana: w.kana,
    primaryMeaning: w.meanings[0],
  }));
const bare = (t: string) => /\p{Script=Han}/u.test(t.replace(/\{[^|}]+\|[^}]*\}/g, ""));
const kinds: Record<string, number> = {};
// Every starting position, so each word is tried with several kinds.
for (let offset = 0; offset < 5; offset++) {
  const list = [...words.slice(offset), ...words.slice(0, offset)];
  const drill = vocabDrill(list, words, bank);
  assert.equal(drill.length, words.filter((w) => !/\p{Script=Han}/u.test(w.kana)).length);
  for (const q of drill) {
    kinds[q.kind] = (kinds[q.kind] ?? 0) + 1;
    assert.equal(new Set(q.options).size, 4, `${q.itemId} ${q.kind}`);
    assert.ok(q.options.includes(q.answer), `${q.itemId} ${q.kind}`);
    if (q.kind === "vocab-reading") continue;
    const unread = [q.stem, ...q.options].filter((t) => bare(q.ruby?.[t] ?? t));
    assert.deepEqual(unread, [], `${q.itemId} ${q.kind}: kanji without reading`);
  }
}
console.log("practice ok", kinds);
