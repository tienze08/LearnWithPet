// Checks for Shadowing and the recorder. Run: npx tsx --tsconfig tsconfig.json tools/shadowingCheck.ts
// The microphone and recorder below are fakes used only here.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { mergeGrammar } from "../src/data/japanese/grammar/merge";
import type { SourceGrammar, ViGrammar } from "../src/data/japanese/grammar/types";
import { PlaylistPlayer, type OutputEvents } from "../src/lib/audio/engine";
import {
  MAX_BYTES,
  VoiceRecorder,
  type MediaRecorderLike,
  type RecorderDeps,
} from "../src/lib/audio/recorder";
import { buildSentences } from "../src/lib/japanese/sentences";
import { resolveLessons } from "../src/lib/listening/content";
import { contentMatch } from "../src/lib/listening/grade";
import type { ListeningFile } from "../src/lib/listening/types";
import {
  assessed,
  checksFor,
  frequency,
  grammarUnits,
  recommend,
  sentenceKey,
  soundsIn,
  tipsFor,
  topTopics,
  type Unit,
} from "../src/lib/shadowing/session";

// ---------- recorder ----------
function fake(
  options: { fail?: string; size?: number; level?: number; unsupported?: boolean } = {},
) {
  let now = 0;
  const track = {
    stopped: false,
    onended: null as null | (() => void),
    stop() {
      this.stopped = true;
    },
  };
  let urls = 0;
  const deps = {
    supported: () => !options.unsupported,
    getStream: async () => {
      if (options.fail) throw Object.assign(new Error("x"), { name: options.fail });
      track.stopped = false;
      return { getTracks: () => [track] };
    },
    createRecorder: (): MediaRecorderLike => ({
      state: "inactive",
      mimeType: "audio/webm",
      ondataavailable: null,
      onstop: null,
      onerror: null,
      start() {
        this.state = "recording";
      },
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob([new Uint8Array(options.size ?? 100)]) });
        this.onstop?.();
      },
    }),
    meter: (_: unknown, onLevel: (level: number) => void) => {
      queueMicrotask(() => onLevel(options.level ?? 0.5));
      return () => {};
    },
    createUrl: () => `blob:${++urls}`,
    now: () => now,
  };
  const voice = new VoiceRecorder(deps as unknown as RecorderDeps);
  return { voice, track, made: () => urls, advance: (s: number) => (now += s * 1000) };
}

async function record(f: ReturnType<typeof fake>, seconds: number) {
  assert.ok(await f.voice.arm());
  const done = f.voice.start(60);
  await Promise.resolve();
  f.advance(seconds);
  f.voice.stop();
  return done;
}

async function main() {
  {
    const f = fake();
    const take = await record(f, 2);
    assert.deepEqual(
      [take?.seconds, take?.silent, take?.interrupted, take?.url],
      [2, false, false, "blob:1"],
    );
    assert.ok(f.track.stopped, "microphone is released after a take");
    assert.equal(f.voice.getState().status, "idle");
    assert.ok(await record(f, 1), "can record again");
  }
  const failures = [
    ["NotAllowedError", "denied"],
    ["NotFoundError", "no-device"],
    ["NotReadableError", "busy"],
    ["Weird", "failed"],
  ] as const;
  for (const [name, kind] of failures) {
    const f = fake({ fail: name });
    assert.equal(await f.voice.arm(), false);
    assert.deepEqual([f.voice.getState().status, f.voice.getState().error], ["error", kind]);
  }
  {
    const f = fake({ unsupported: true });
    assert.equal(await f.voice.start(5), null);
    assert.equal(f.voice.getState().error, "unsupported");
  }
  const rejected = [
    [{}, 0.2, "empty"],
    [{ size: 0 }, 3, "empty"],
    [{ size: MAX_BYTES + 1 }, 3, "too-large"],
  ] as const;
  for (const [options, seconds, error] of rejected) {
    const f = fake(options);
    assert.equal(await record(f, seconds), null);
    assert.equal(f.voice.getState().error, error);
    assert.ok(f.track.stopped);
    assert.equal(f.made(), 0, "a rejected take gets no URL");
  }
  {
    const f = fake({ level: 0 });
    assert.equal((await record(f, 1))?.silent, true);
  }
  {
    const f = fake();
    await f.voice.arm();
    const done = f.voice.start(60);
    f.advance(3);
    f.track.onended!();
    assert.equal((await done)?.interrupted, true);
  }
  {
    const f = fake();
    await f.voice.arm();
    const done = f.voice.start(1);
    f.advance(5); // the limit timer stops it
    assert.equal((await done)?.seconds, 1);
  }
  {
    const f = fake();
    await f.voice.arm();
    const done = f.voice.start(60);
    f.advance(3);
    f.voice.cancel();
    assert.equal(await done, null);
    assert.ok(f.track.stopped);
    assert.equal(f.made(), 0, "a cancelled recording is discarded");
  }
  {
    // Cancelled while the permission prompt is open: the late stream is released.
    const f = fake();
    const armed = f.voice.arm();
    f.voice.cancel();
    assert.equal(await armed, false);
    assert.ok(f.track.stopped);
    assert.equal(f.voice.getState().status, "idle");
  }

  // ---------- playToEnd ----------
  {
    let events!: OutputEvents;
    const player = new PlaylistPlayer({
      play: (_s, _o, _p, e) => void (events = e),
      update: () => true,
      stop: () => {},
    });
    player.load([{ text: "a", duration: 1 }]);
    const ended = player.playToEnd();
    events.started();
    events.ended();
    assert.equal(await ended, true);
    const paused = player.playToEnd();
    player.pause();
    assert.equal(await paused, false);
  }

  // ---------- content and session ----------
  const read = <T>(f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8")) as T;
  const vi = read<Record<string, ViGrammar>>("../src/data/japanese/grammar/vi/n5.json");
  const grammar = read<SourceGrammar[]>("../src/data/japanese/grammar/source/n5.json").map((s) =>
    mergeGrammar(s, vi[s.id]),
  );
  const bank = buildSentences(grammar);
  const lessons = resolveLessons(
    read<ListeningFile>("../src/data/japanese/listening/n5.json"),
    bank,
  );
  const dialogues: Unit[] = lessons.map((l) => ({ ...l, dialogue: true }));
  const sets = grammarUnits(grammar, bank);
  const units = [...dialogues, ...sets];
  assert.equal(new Set(units.map((u) => u.id)).size, units.length);
  assert.equal(
    new Set(sets.flatMap((u) => u.lines.map((l) => l.sentenceId))).size,
    bank.length,
    "every bank sentence can be shadowed",
  );
  // Ids and keys must pass the backend validation.
  for (const u of units) {
    assert.match(u.id, /^n[1-5]-[a-z0-9-]{1,60}$/);
    assert.ok(u.lines.length >= 1 && u.lines.length <= 100);
    const keys = u.lines.map((l) => sentenceKey(u, l));
    assert.equal(new Set(keys).size, keys.length, `${u.id} sentence keys`);
    for (const k of keys) assert.match(k, /^[a-z0-9:-]{1,100}$/);
  }
  const station = dialogues[0];
  assert.equal(sentenceKey(station, station.lines[0]), "koko-soko-asoko-doko:2");
  assert.equal(sentenceKey(station, station.lines[1]), "n5-station:1");

  const line = (japanese: string, grammarIds: string[] = []) => ({
    japanese,
    furigana: null,
    grammarIds,
  });
  assert.deepEqual(soundsIn(line("がっこうへいきます")), {
    longVowel: true,
    smallTsu: true,
    contracted: false,
  });
  assert.deepEqual(soundsIn(line("これはほんです")), {
    longVowel: false,
    smallTsu: false,
    contracted: false,
  });
  assert.ok(tipsFor(line("これはほんですか。", ["wa"])).some((t) => t.includes("wa")));
  assert.deepEqual(
    checksFor([line("これはほんです")]).map(([id]) => id),
    ["WORDS", "RHYTHM", "CLEAR"],
  );
  assert.equal(checksFor([line("これはほんです"), line("がっこう")]).length, 5);
  assert.deepEqual(assessed({ CLEAR: false, WORDS: true }), {
    passed: ["WORDS"],
    missed: ["CLEAR"],
  });

  const meet = dialogues[2].lines[4]; // 駅の前で会いましょう。
  assert.equal(contentMatch(meet, "駅の前で会いましょう").percent, 100);
  const partly = contentMatch(meet, "前で会いましょう");
  assert.ok(partly.percent < 100 && partly.percent > 50);
  assert.ok(partly.parts.some((p) => p.text === "駅" && p.status === "missing"));
  assert.equal(contentMatch(meet, "").percent, 0);

  assert.equal(recommend(units, [], [])?.unit.id, "n5-station");
  assert.equal(recommend(units, [{ unitId: "n5-cafe" }], [])?.unit.id, "n5-cafe");
  assert.equal(recommend(units, [], ["n5-station"], "n5-cafe")?.unit.id, "n5-weekend");
  const at = (hour: number) => new Date(2026, 0, 5, hour).toISOString();
  assert.deepEqual(
    frequency([at(9), at(20)], new Date(2026, 0, 6), 3).map((d) => d.count),
    [0, 2, 0],
  );
  const practised = [
    { unitId: "n5-cafe", sentences: 3 },
    { unitId: "gone", sentences: 9 },
  ];
  assert.deepEqual(topTopics(units, practised), [["Ăn uống và mua sắm", 3]]);

  console.log(
    `shadowing ok: ${dialogues.length} dialogues, ${sets.length} grammar sets, ${bank.length} bank sentences`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
