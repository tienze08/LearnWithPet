// Data checks for the grammar module. Run: npx tsx --tsconfig tsconfig.json tools/grammarCheck.ts
import { readFileSync } from "node:fs";
import { mergeGrammar } from "../src/data/japanese/grammar/merge";
import { GROUP_LABEL } from "../src/data/japanese/grammar/tags";
import type { SourceGrammar, ViGrammar } from "../src/data/japanese/grammar/types";
import { parseFurigana } from "../src/lib/japanese/grammar/furigana";
import { sameForm, sameTopic, searchGrammar } from "../src/lib/japanese/grammar/search";

const dir = new URL("../src/data/japanese/grammar/", import.meta.url);
const read = <T>(f: string) => JSON.parse(readFileSync(new URL(f, dir), "utf8")) as T;
const src = read<SourceGrammar[]>("source/n5.json"),
  vi = read<Record<string, ViGrammar>>("vi/n5.json");
const all = src.map((s) => mergeGrammar(s, vi[s.id]));
const AVAILABLE_LEVELS = ["N5"];
const fail = (m: string) => {
  console.error("FAIL", m);
  process.exitCode = 1;
};
console.log("levels", AVAILABLE_LEVELS.join(","), "points", all.length);
if (new Set(all.map((g) => g.id)).size !== all.length) fail("duplicate ids");
for (const g of all) {
  if (!g.meaningVi || !g.explanationVi || !g.notesVi) fail(`${g.id}: missing Vietnamese`);
  if (g.examples.some((e) => !e.meaningVi)) fail(`${g.id}: example without Vietnamese`);
  if (/Noun|Verb|Adj|Sentence/.test(g.formationVi))
    fail(`${g.id}: untranslated formation token: ${g.formationVi}`);
  for (const e of g.examples)
    if (
      e.furigana &&
      parseFurigana(e.furigana)
        .map((s) => s.t)
        .join("") !== e.japanese
    )
      fail(`${g.id}: furigana text differs from sentence`);
  if (/[a-z]{4,}/i.test(g.meaningVi ?? "") && !/^[\p{L}\s,;()/“”.:-]+$/u.test(g.meaningVi ?? ""))
    fail(`${g.id}: odd meaningVi`);
}
const groups: Record<string, number> = {};
for (const g of all)
  for (const x of g.groups) groups[GROUP_LABEL[x]] = (groups[GROUP_LABEL[x]] ?? 0) + 1;
console.log("groups", groups);
const q = (s: string) =>
  searchGrammar(all, s)
    .map((g) => g.id)
    .slice(0, 4)
    .join(" ");
console.log(
  "search て:",
  q("て"),
  "| 'nguyên nhân':",
  q("vì"),
  "| romaji 'te iru':",
  q("te iru"),
  "| kana 'まえに':",
  q("まえに"),
  "| 'ma' no match:",
  q("zzzz") === "",
);
console.log(
  "sameForm ni-time:",
  sameForm(all.find((g) => g.id === "ni-time")!, all)
    .map((g) => g.id)
    .join(","),
);
console.log(
  "sameTopic masu:",
  sameTopic(all.find((g) => g.id === "tai")!, all)
    .map((g) => g.id)
    .join(","),
);
console.log("sample", all.find((g) => g.id === "te-mo-ii")!.formationVi);

// Search quality: short or vague queries must stay narrow; Vietnamese with and without marks must agree.
const ids = (s: string) => searchGrammar(all, s).map((g) => g.id);
const same = (a: string, b: string) => JSON.stringify(ids(a)) === JSON.stringify(ids(b));
const check = (ok: boolean, m: string) => {
  if (!ok) fail(m);
};
check(same("lý do", "ly do") && ids("lý do").includes("kara-reason"), "diacritics: lý do / ly do");
check(same("so sánh", "so sanh") && ids("so sánh").includes("yori"), "diacritics: so sánh");
check(
  ["kara-from", "kara-reason"].every((i) => ids("kara").includes(i)),
  "romaji kara finds kara-*",
);
check(
  ids("business").length === 0 && ids("topic").includes("wa"),
  "English searchable (topic -> wa) and no noise",
);
check(ids("a").length === 0 && ids("i").length === 0, "single Latin letter returns nothing");
check(ids("zzzz").length === 0, "no match");
check(
  ids("〜ている").includes("te-iru") && ids("ている").includes("te-iru"),
  "kana pattern with and without 〜",
);
check(ids("たい").includes("tai") && ids("まえに").includes("mae-ni"), "kana search");
check(ids("ni").length < all.length / 2, `"ni" too broad: ${ids("ni").length}`);
console.log(
  "search checks done; 'ni' ->",
  ids("ni").length,
  "| 'て' ->",
  ids("て").length,
  "| 'wa' ->",
  ids("wa").length,
);
// Display: no English qualifier left in titles.
const eng = all.filter((g) => /[（(]/.test(g.pattern) && g.displayPattern === g.pattern);
check(eng.length === 0, `qualifier not translated: ${eng.map((g) => g.pattern).join(" ")}`);
check(
  all.every((g) => g.relatedGrammar.every((id) => all.some((x) => x.id === id))),
  "related ids exist",
);
console.log(
  "titles ok; related links",
  all.reduce((n, g) => n + g.relatedGrammar.length, 0),
);
