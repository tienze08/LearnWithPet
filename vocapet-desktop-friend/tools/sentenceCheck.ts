// Checks for the Sentence Bank. Run: npx tsx --tsconfig tsconfig.json tools/sentenceCheck.ts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { mergeGrammar } from "../src/data/japanese/grammar/merge";
import type { SourceGrammar, ViGrammar } from "../src/data/japanese/grammar/types";
import { buildSentences, usesWord, type BankWord } from "../src/lib/japanese/sentences";

const read = <T>(f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8")) as T;
const src = read<SourceGrammar[]>("../src/data/japanese/grammar/source/n5.json");
const vi = read<Record<string, ViGrammar>>("../src/data/japanese/grammar/vi/n5.json");
const grammar = src.map((s) => mergeGrammar(s, vi[s.id]));
const bank = buildSentences(grammar);

assert.equal(new Set(bank.map((s) => s.id)).size, bank.length, "duplicate sentence ids");
assert.equal(new Set(bank.map((s) => s.japanese)).size, bank.length, "duplicate sentences");
const twice = buildSentences([grammar[0], { ...grammar[0], id: "other" }]);
assert.equal(twice.length, grammar[0].examples.length);
assert.deepEqual(twice[0].grammarIds, [grammar[0].id, "other"]);

const uses = (furigana: string, expression: string | null, kana: string) =>
  usesWord({ furigana, japanese: furigana.replace(/\{([^|}]+)\|[^}]+\}/g, "$1") }, { expression, kana });
const cases: [boolean, string, string | null, string][] = [
  [true, "この{本|ほん}です。", "本", "ほん"],
  [false, "{日本|にほん}です。", "本", "ほん"],
  [false, "{日本語|にほんご}です。", "日本", "にほん"],
  [false, "{家|いえ}です。", "家", "うち"],
  [true, "{誕生|たんじょう}{日|び}です。", "誕生日", "たんじょうび"],
  [true, "あの{人|ひと}は{兄|あに}だ。", "あの人", "あのひと"],
  [true, "7{時|じ}に{起|お}きました。", "起きます", "おきます"],
  [true, "{毎日|まいにち}{勉強|べんきょう}しています。", "勉強します", "べんきょうします"],
  [false, "{父|ちち}はいつも{読|よ}みます。", null, "いつ"],
  [false, "そうじをします。", null, "そう"],
  [false, "{話|はな}してはいけません。", null, "はい"],
  [false, "トイレはあそこです。", null, "そこ"],
  [true, "ここでたばこを{吸|す}ってはいけません。", null, "ここ"],
  [true, "これは{私|わたし}のかさです。", null, "これ"],
  [false, "スーパーマーケットです。", null, "スーパー"],
];
for (const [expected, furigana, expression, kana] of cases) assert.equal(uses(furigana, expression, kana), expected, `${expression ?? kana} in ${furigana}`);

type Seed = { lessons: { words: (Partial<BankWord> & { kana: string })[] }[] };
const words = read<Seed>("../../backend/src/main/resources/tango/minna-n5-bai-1-5.json").lessons.flatMap((l) => l.words);
const linked = words.filter((w) => bank.some((s) => usesWord(s, { expression: w.expression ?? null, kana: w.kana })));
console.log(`sentences ${bank.length}, linked to a Tango word ${bank.filter((s) => words.some((w) => usesWord(s, { expression: w.expression ?? null, kana: w.kana }))).length}, Tango words with a sentence ${linked.length}/${words.length}`);
if (process.argv.includes("--list"))
  for (const w of linked) console.log(w.expression ?? w.kana, "=>", bank.filter((s) => usesWord(s, { expression: w.expression ?? null, kana: w.kana })).map((s) => s.japanese).join(" / "));
