// Turns listening content into playable lessons. Pure, so it also runs in Node checks.
import type { Segment } from "@/lib/audio/engine";
import { readingOf } from "@/lib/japanese/grammar/furigana";
import type { Sentence } from "@/lib/japanese/sentences";
import type { AudioManifest, Lesson, Line, ListeningFile, SourceLine } from "./types";

const kanjiOf = (text: string) => [...new Set(text.match(/\p{Script=Han}/gu) ?? [])];

export function resolveLessons(file: ListeningFile, bank: Sentence[]): Lesson[] {
  const byId = new Map(bank.map((s) => [s.id, s]));
  const line = (l: SourceLine, index: number, lesson: string): Line => {
    if (l.ref) {
      const s = byId.get(l.ref);
      if (!s) throw new Error(`${lesson}: câu ${l.ref} không có trong Sentence Bank`);
      return {
        index,
        speaker: l.speaker,
        japanese: s.japanese,
        furigana: s.furigana,
        meaningVi: s.meaningVi,
        grammarIds: s.grammarIds,
        kanji: s.kanji,
        sentenceId: s.id,
      };
    }
    if (!l.ja) throw new Error(`${lesson}: dòng ${index} thiếu nội dung`);
    return {
      index,
      speaker: l.speaker,
      japanese: l.ja,
      furigana: l.furigana ?? null,
      meaningVi: l.vi ?? null,
      grammarIds: l.grammar ?? [],
      kanji: kanjiOf(l.ja),
      sentenceId: null,
    };
  };
  return file.lessons.map((lesson) => ({
    ...lesson,
    level: file.level,
    draft: file.status === "draft",
    lines: lesson.lines.map((l, i) => line(l, i, lesson.id)),
  }));
}

/** Rough length of synthesized speech at 1x, for the timeline only. */
export const estimateSeconds = (l: Pick<Line, "japanese" | "furigana">) =>
  Math.round((0.6 + (l.furigana ? readingOf(l.furigana) : l.japanese).length * 0.17) * 10) / 10;

/** One segment per line: the dialogue recording, else the line's own recording, else synthesized speech. */
export function segmentsFor(
  lesson: Pick<Lesson, "id" | "lines">,
  audio: AudioManifest,
  forceTts = false,
): Segment[] {
  const dialogue = audio.dialogues[lesson.id];
  return lesson.lines.map((l) => {
    const text = l.japanese;
    if (!forceTts) {
      const cue = dialogue?.cues[l.index];
      if (cue)
        return { text, src: dialogue.src, start: cue[0], end: cue[1], duration: cue[1] - cue[0] };
      const own = audio.sentences[l.sentenceId ?? `${lesson.id}:${l.index}`];
      if (own) return { text, src: own.src, duration: own.durationSeconds };
    }
    return { text, duration: estimateSeconds(l) };
  });
}
