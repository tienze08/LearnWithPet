// Accuracy harness for src/lib/japanese/kanji-map/recognize.ts. Run: npx tsx --tsconfig tsconfig.json tools/kanjiRecognizeTest.ts
// Synthetic "hand-drawn" input = KanjiVG strokes + random affine, wobble, jitter and trimmed ends. An upper bound for real users.
import { readdirSync, readFileSync } from "node:fs";
import { buildIndex, recognize, MAX_SCORE, type Pt } from "../src/lib/japanese/kanji-map/recognize";

const dir = new URL("../src/data/kanji/strokes/", import.meta.url);
const paths: Record<string, string[]> = {};
for (const f of readdirSync(dir))
  Object.assign(paths, JSON.parse(readFileSync(new URL(f, dir), "utf8")));
let t0 = performance.now();
const index = buildIndex(paths);
console.log(`index ${index.size} kanji in ${Math.round(performance.now() - t0)} ms`);

let seed = 12345;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());

/** Distort a template the way a hand would. `level` scales the noise. */
function draw(char: string, level: number, shuffle = 0): Pt[][] {
  const tpl = (index.get(char) as Pt[][]).map((s) => s.map((p) => ({ ...p })));
  const a = gauss() * 0.06 * level,
    sk = gauss() * 0.08 * level,
    sx = 1 + gauss() * 0.1 * level,
    sy = 1 + gauss() * 0.1 * level;
  const out = tpl
    .map((s) => {
      const cut0 = Math.floor(rnd() * 2 * level),
        cut1 = Math.floor(rnd() * 2 * level);
      const phase = rnd() * 6,
        amp = 1.5 * level;
      return s.slice(cut0, s.length - cut1).map((p, i) => {
        let x = (p.x - 54) * sx + (p.y - 54) * sk,
          y = (p.y - 54) * sy;
        [x, y] = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
        return {
          x: x + gauss() * 1.6 * level + Math.sin(i / 2 + phase) * amp,
          y: y + gauss() * 1.6 * level + Math.cos(i / 2 + phase) * amp,
        };
      });
    })
    .filter((s) => s.length > 1);
  for (let k = 0; k < shuffle && out.length > 1; k++) {
    const i = Math.floor(rnd() * out.length),
      j = Math.floor(rnd() * out.length);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const chars = [...index.keys()];
const sample = Array.from({ length: 400 }, () => chars[Math.floor(rnd() * chars.length)]);
const named = [..."人日木行長学国業大小中山川口目手子女男年本"].filter((c) => index.has(c));

function run(label: string, set: string[], level: number, shuffle = 0) {
  let h1 = 0,
    h5 = 0,
    h12 = 0,
    none = 0;
  t0 = performance.now();
  for (const c of set) {
    const r = recognize(draw(c, level, shuffle), index);
    const i = r.findIndex((m) => m.char === c);
    if (i === 0) h1++;
    if (i >= 0 && i < 5) h5++;
    if (i >= 0) h12++;
    if (!r.length) none++;
  }
  const n = set.length,
    pc = (x: number) => `${Math.round((100 * x) / n)}%`;
  console.log(
    `${label.padEnd(34)} top1 ${pc(h1)}  top5 ${pc(h5)}  top12 ${pc(h12)}  empty ${pc(none)}  ${Math.round((performance.now() - t0) / n)} ms/query`,
  );
}
run("random 400, clean (level 0)", sample, 0);
run("random 400, neat hand (level 1)", sample, 1);
run("random 400, sloppy hand (level 2)", sample, 2);
run("random 400, 2 strokes swapped (lvl 1)", sample, 1, 2);
run("named 24, neat hand (level 1)", named, 1);
// Rejection: scribbles must not return confident results.
let scribbleHits = 0;
for (let k = 0; k < 100; k++) {
  const strokes = Array.from({ length: 1 + Math.floor(rnd() * 5) }, () =>
    Array.from({ length: 20 }, () => ({ x: rnd() * 109, y: rnd() * 109 })),
  );
  if (recognize(strokes, index).length) scribbleHits++;
}
console.log(`random scribbles returning results: ${scribbleHits}/100 (MAX_SCORE ${MAX_SCORE})`);
for (const c of ["人", "行", "業", "学", "国"])
  console.log(
    c,
    recognize(draw(c, 1), index, 5)
      .map((m) => `${m.char}${m.confidence}`)
      .join(" "),
  );

// Stroke-count mistakes: one stroke missing, or two adjacent strokes drawn as one.
function runBroken(label: string, mutate: (s: Pt[][]) => Pt[][]) {
  let h1 = 0,
    h12 = 0;
  const set = sample.filter((c) => (index.get(c)?.length ?? 0) >= 4);
  for (const c of set) {
    const r = recognize(mutate(draw(c, 1)), index);
    const i = r.findIndex((m) => m.char === c);
    if (i === 0) h1++;
    if (i >= 0) h12++;
  }
  console.log(
    `${label.padEnd(34)} top1 ${Math.round((100 * h1) / set.length)}%  top12 ${Math.round((100 * h12) / set.length)}%  (${set.length} kanji, >=4 strokes)`,
  );
}
runBroken("one stroke missing", (s) => s.filter((_, i) => i !== Math.floor(s.length / 2)));
runBroken("two strokes merged into one", (s) => {
  const k = Math.floor(s.length / 2);
  return [...s.slice(0, k), [...s[k], ...s[k + 1]], ...s.slice(k + 2)];
});
