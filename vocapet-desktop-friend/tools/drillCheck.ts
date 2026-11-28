// Checks for the grammar exercise sets. Run: npx tsx --tsconfig tsconfig.json tools/drillCheck.ts [--list]
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { mergeGrammar } from "../src/data/japanese/grammar/merge";
import type { SourceGrammar, ViGrammar } from "../src/data/japanese/grammar/types";
import { grammarDrill, verbSlot } from "../src/lib/learning-path/questions";

const read = <T>(f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8")) as T;
const src = read<SourceGrammar[]>("../src/data/japanese/grammar/source/n5.json");
const vi = read<Record<string, ViGrammar>>("../src/data/japanese/grammar/vi/n5.json");
const all = src.map((s) => mergeGrammar(s, vi[s.id]));
const kinds: Record<string, number> = {};
let smallest = Infinity;

for (const g of all) {
  const drill = grammarDrill(g, all);
  smallest = Math.min(smallest, drill.length);
  for (const q of drill) {
    kinds[q.kind] = (kinds[q.kind] ?? 0) + 1;
    if ("type" in q) {
      assert.notEqual(q.chunks.join(""), q.answer.join(""), `${g.id}: order already solved`);
    } else {
      assert.equal(new Set(q.options).size, 4, `${g.id} ${q.kind}: options`);
      assert.ok(q.options.includes(q.answer), `${g.id} ${q.kind}: answer missing`);
      if (process.argv.includes("--list") && q.kind === "grammar-verb")
        console.log(g.id, q.stem, "=", q.answer, "|", q.options.join(","));
    }
  }
}
const slot = (id: string) => verbSlot(all.find((g) => g.id === id)!);
assert.deepEqual(slot("tai"), { form: "stem", suffix: "たい" });
assert.deepEqual(slot("te-mo-ii"), { form: "te", suffix: "もいい" });
assert.deepEqual(slot("nakute-mo-ii"), { form: "nai stem", suffix: "なくてもいい" });
assert.deepEqual(slot("tari-tari-suru"), { form: "ta", suffix: "り" });
for (const id of ["te", "dake", "wa"]) assert.equal(slot(id), null, id);
const stems = (id: string) =>
  grammarDrill(all.find((g) => g.id === id)!, all).flatMap((q) => ("type" in q ? [] : [q]));
assert.ok(!stems("tai").some((q) => q.stem.startsWith("冷＿＿")), "blank inside another word");
for (const q of stems("kurai-gurai").filter((x) => x.kind === "grammar-cloze"))
  assert.ok(!q.options.includes(q.answer === "くらい" ? "ぐらい" : "くらい"), "two right answers");
// Every kanji a beginner sees must have its reading.
const bare = (t: string) => /\p{Script=Han}/u.test(t.replace(/\{[^|}]+\|[^}]*\}/g, ""));
const unread = all.flatMap((g) =>
  grammarDrill(g, all).flatMap((q) => {
    const texts = "type" in q ? q.chunks : [q.prompt, q.stem, q.hint ?? "", ...q.options];
    return texts.filter((t) => bare(q.ruby?.[t] ?? t)).map((t) => `${g.id}: ${t}`);
  }),
);
assert.deepEqual(unread, []);
assert.ok(smallest >= 3, `a pattern has only ${smallest} exercises`);
console.log("points", all.length, "smallest set", smallest, kinds);
console.log(
  "verb patterns:",
  all
    .filter(verbSlot)
    .map((g) => g.id)
    .join(" "),
);
