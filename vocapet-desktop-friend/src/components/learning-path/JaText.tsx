import { Ruby } from "@/components/kanji-map/Ruby";
import { parseFurigana } from "@/lib/japanese/grammar/furigana";

/** A question text, with furigana when the question carries markup for it. */
export function JaText({ text, ruby }: { text: string; ruby?: Record<string, string> }) {
  const markup = ruby?.[text];
  return markup ? <Ruby segments={parseFurigana(markup)} /> : <>{text}</>;
}
