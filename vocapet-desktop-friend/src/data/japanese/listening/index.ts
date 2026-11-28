// Listening content loader. Each level is its own chunk; levels without a file have no lessons yet.
import { loadGrammarLevel, type GrammarLevel } from "@/data/japanese/grammar";
import { buildSentences } from "@/lib/japanese/sentences";
import { resolveLessons } from "@/lib/listening/content";
import type { AudioManifest, Lesson, ListeningFile } from "@/lib/listening/types";
import manifest from "./audio.json";

export const AUDIO = manifest as unknown as AudioManifest;

const FILES = import.meta.glob("./n*.json", { import: "default" }) as Record<
  string,
  () => Promise<ListeningFile>
>;

export async function loadListeningLevel(level: GrammarLevel): Promise<Lesson[]> {
  const load = FILES[`./${level.toLowerCase()}.json`];
  if (!load) return [];
  const [file, grammar] = await Promise.all([load(), loadGrammarLevel(level)]);
  return resolveLessons(file, buildSentences(grammar));
}
