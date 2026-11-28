// Checks for the Listening module. Run: npx tsx --tsconfig tsconfig.json tools/listeningCheck.ts
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { mergeGrammar } from "../src/data/japanese/grammar/merge";
import type { SourceGrammar, ViGrammar } from "../src/data/japanese/grammar/types";
import {
  PlaylistPlayer,
  type AudioOutput,
  type OutputEvents,
  type Segment,
} from "../src/lib/audio/engine";
import { parseFurigana } from "../src/lib/japanese/grammar/furigana";
import { buildSentences } from "../src/lib/japanese/sentences";
import { resolveLessons, segmentsFor } from "../src/lib/listening/content";
import { gradeBlank, gradeDictation, skeleton } from "../src/lib/listening/grade";
import {
  exercisesFor,
  linesOf,
  questionCount,
  recommend,
  summarize,
  toAnswers,
} from "../src/lib/listening/session";
import type { AudioManifest, ListeningFile } from "../src/lib/listening/types";

const read = <T>(f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8")) as T;
const src = read<SourceGrammar[]>("../src/data/japanese/grammar/source/n5.json");
const vi = read<Record<string, ViGrammar>>("../src/data/japanese/grammar/vi/n5.json");
const grammar = src.map((s) => mergeGrammar(s, vi[s.id]));
const file = read<ListeningFile>("../src/data/japanese/listening/n5.json");
const audio = read<AudioManifest>("../src/data/japanese/listening/audio.json");
const lessons = resolveLessons(file, buildSentences(grammar));

// ---------- content ----------
const unique = (ids: string[], what: string) =>
  assert.equal(new Set(ids).size, ids.length, `duplicate ${what}`);
const grammarIds = new Set(grammar.map((g) => g.id));
const bankText = new Set(buildSentences(grammar).map((s) => s.japanese));
unique(
  lessons.map((l) => l.id),
  "lesson id",
);
for (const [i, l] of lessons.entries()) {
  const at = (what: string) => `${l.id}: ${what}`;
  assert.match(l.id, /^n5-[a-z0-9-]+$/);
  unique(
    l.exercises.map((e) => e.id),
    at("exercise id"),
  );
  assert.deepEqual(
    [...new Set(l.exercises.map((e) => e.type))].sort(),
    ["choose", "dialogue", "dictation", "fill"],
    at("all four types"),
  );
  for (const [n, line] of l.lines.entries()) {
    assert.ok(l.speakers[line.speaker], at(`speaker ${line.speaker}`));
    assert.ok(line.meaningVi, at(`line ${n} has no translation`));
    for (const g of line.grammarIds) assert.ok(grammarIds.has(g), at(`grammar ${g}`));
    const own = file.lessons[i].lines[n];
    if (own.ja) assert.ok(!bankText.has(own.ja), at(`line ${n} is in the Sentence Bank: use ref`));
    if (own.furigana)
      assert.equal(
        parseFurigana(own.furigana)
          .map((s) => s.t)
          .join(""),
        own.ja,
        at(`furigana of line ${n}`),
      );
    if (/\p{Script=Han}/u.test(line.japanese))
      assert.ok(line.furigana, at(`line ${n} needs furigana`));
  }
  for (const e of l.exercises) {
    const [from, to] = linesOf(e);
    assert.ok(l.lines[from] && l.lines[to], at(`${e.id} line`));
    const questions = e.type === "choose" ? [e] : e.type === "dialogue" ? e.questions : [];
    if (e.type === "dialogue")
      unique(
        e.questions.map((q) => q.id),
        at("question id"),
      );
    for (const q of questions) {
      unique(q.options, at(`${e.id} option`));
      assert.ok(q.options.includes(q.answer), at(`${e.id} answer is not an option`));
    }
    for (const q of e.type === "dialogue" ? e.questions : [e])
      for (const g of q.grammar ?? []) assert.ok(grammarIds.has(g), at(`grammar ${g}`));
    if (e.type === "fill") {
      let rest = l.lines[e.line].japanese;
      for (const b of e.blanks) {
        const found = rest.indexOf(b.text);
        assert.ok(found >= 0, at(`blank ${b.text} must appear in order`));
        rest = rest.slice(found + b.text.length);
        assert.ok(gradeBlank(l.lines[e.line], b, b.text));
      }
    }
    if (e.type === "dictation") {
      assert.ok(
        gradeDictation(l.lines[e.line], l.lines[e.line].japanese).correct,
        at("dictation accepts itself"),
      );
      for (const a of e.accept ?? [])
        assert.ok(gradeDictation(l.lines[e.line], a, e.accept).correct);
    }
  }
}

// ---------- audio manifest: nothing may point at a file that does not exist ----------
for (const a of [...Object.values(audio.sentences), ...Object.values(audio.dialogues)]) {
  assert.ok(
    existsSync(new URL(`../public${a.src}`, import.meta.url)),
    `missing audio file ${a.src}`,
  );
  assert.ok(
    a.source && a.license && a.durationSeconds > 0,
    `${a.src} needs source, licence and duration`,
  );
}
for (const [id, d] of Object.entries(audio.dialogues))
  assert.equal(
    d.cues.length,
    lessons.find((l) => l.id === id)?.lines.length,
    `${id}: one cue per line`,
  );

// ---------- grading ----------
const station = lessons[0];
const walk = station.lines[3]; // 駅まで歩いて10分ぐらいです。
assert.ok(gradeDictation(walk, "駅まで歩いて10分ぐらいです").correct);
assert.ok(
  gradeDictation(walk, "えきまであるいて10ぷんぐらいです。", ["駅まで歩いて10分ぐらいです。"]).parts
    .length > 0,
);
assert.ok(
  gradeDictation(walk, "えきまで歩いて１０分ぐらいです。").correct,
  "mixed kana and full-width digits",
);
const meet = lessons[2].lines[4]; // 駅の前で会いましょう。
const statuses = (answer: string) =>
  gradeDictation(meet, answer)
    .parts.filter((p) => p.status !== "ok")
    .map((p) => `${p.text}:${p.status}`);
assert.deepEqual(statuses("駅の前に会いましょう"), ["で:particle"]);
assert.deepEqual(statuses("駅の前会いましょう"), ["で:missing"]);
assert.ok(
  statuses("駅の前で会いましよう").some((s) => s.endsWith(":spelling")),
  "small kana is a spelling mistake",
);
assert.ok(statuses("前で会いましょう").includes("駅:missing"));
assert.equal(gradeDictation(meet, "駅の前で会いましょうね").extra, "ね");
assert.equal(gradeDictation(meet, "").correct, false);
const front = station.lines[1];
assert.ok(gradeBlank(front, { text: "前", kind: "word" }, "まえ"));
assert.ok(!gradeBlank(front, { text: "前", kind: "word" }, "まい"));
assert.ok(!gradeBlank(front, { text: "前", kind: "word" }, "  "));
assert.ok(skeleton(meet).includes("○"));

// ---------- session ----------
const ids = ["n5-station/place", "n5-station/talk.time"];
const subset = exercisesFor(station, ids);
assert.deepEqual(
  subset.map((e) => e.id),
  ["place", "talk"],
);
assert.equal(subset[1].type === "dialogue" && subset[1].questions.length, 1);
assert.equal(questionCount(station), 6);
const talk = station.exercises[3];
const answers = toAnswers(
  station,
  talk,
  [
    { sub: "who", correct: true },
    { sub: "time", correct: false, words: ["駅"], grammar: ["made"] },
  ],
  "HARD",
  2,
);
assert.deepEqual(
  answers.map((a) => a.replays),
  [2, 0],
);
assert.deepEqual(summarize(answers), {
  total: 2,
  correct: 1,
  accuracy: 0.5,
  replays: 2,
  mistakes: ["n5-station/talk.time"],
  weakWords: ["駅"],
  weakGrammar: ["made"],
});
// A single-sentence exercise reports its own grammar, else the sentence's.
const grammarFor = (i: number) =>
  toAnswers(station, station.exercises[i], [{ correct: false }], "EASY", 0)[0].grammar;
assert.deepEqual(grammarFor(1), ["no"]);
assert.deepEqual(grammarFor(0), station.lines[0].grammarIds);
const done = (lessonId: string, lastAccuracy: number, mistakes: string[] = [], day = "01") => ({
  lessonId,
  lastAccuracy,
  mistakes,
  lastCompletedAt: `2026-01-${day}`,
});
assert.equal(recommend(lessons, [])?.lesson.id, "n5-station");
assert.equal(recommend(lessons, [done("n5-station", 0.5, ["n5-station/place"])])?.review, true);
assert.equal(recommend(lessons, [done("n5-station", 0.5, ["n5-station/removed"])])?.review, false);
assert.equal(recommend(lessons, [done("n5-station", 1)])?.lesson.id, "n5-cafe");
assert.equal(recommend(lessons, [done("n5-station", 1)], ["仕事"])?.lesson.id, "n5-weekend");
assert.equal(
  recommend(
    lessons,
    lessons.map((l, i) => done(l.id, 1, [], `1${9 - i}`)),
  )?.lesson.id,
  "n5-hello",
);

// ---------- player ----------
let events: OutputEvents;
const played: [string, number, number][] = [];
const output: AudioOutput = {
  play: (s, offset, o, e) => {
    played.push([s.text, offset, o.rate]);
    events = e;
  },
  update: () => false,
  stop: () => {},
};
const player = new PlaylistPlayer(output);
let starts = 0;
player.onStart = () => starts++;
const segs: Segment[] = [
  { text: "a", duration: 2 },
  { text: "b", duration: 3 },
  { text: "c", duration: 4 },
];
player.load(segs);
assert.equal(player.getState().duration, 9);
player.play();
assert.equal(player.getState().status, "loading");
events!.started();
events!.progress(1);
assert.equal(player.getState().time, 1);
const stale = events!;
events!.ended();
assert.equal(player.getState().index, 1);
stale.ended(); // a stopped segment must not advance the player
assert.equal(player.getState().index, 1);
player.pause();
assert.equal(player.getState().status, "paused");
player.toggle();
assert.equal(starts, 1, "resume is not a new start");
player.seek(6);
assert.deepEqual(played.at(-1), ["c", 1, 1]);
player.skip(-100);
assert.equal(player.getState().index, 0);
player.setRate(0.75);
assert.deepEqual(played.at(-1), ["a", 0, 0.75]);
player.play(1, 1);
events!.ended();
assert.equal(player.getState().status, "ended", "a single sentence does not run on");
assert.equal(starts, 2);
player.pause();
player.seekSegment(2);
assert.deepEqual([player.getState().status, player.getState().time], ["paused", 5]);
player.toggle();
events!.failed("x");
assert.deepEqual([player.getState().status, player.getState().error], ["error", "x"]);

// ---------- segments ----------
const withFiles: AudioManifest = {
  sentences: {
    "n5-station:1": { src: "/audio/x.mp3", durationSeconds: 2, source: "s", license: "l" },
  },
  dialogues: {},
};
assert.deepEqual(
  segmentsFor(station, withFiles).map((s) => !!s.src),
  [false, true, false, false, false],
);
assert.ok(segmentsFor(station, withFiles, true).every((s) => !s.src && s.duration > 0));

console.log(
  `listening ok: ${lessons.length} lessons, ${lessons.reduce((n, l) => n + questionCount(l), 0)} questions`,
);
