// Left column: scene, reference player, the sentence with its explanations, and practice tips.
import { Check, Lightbulb, Play } from "lucide-react";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { LineText } from "@/components/listening/ExerciseCards";
import { Related, type WordLink } from "@/components/listening/Results";
import { Cat, type CatPose } from "@/components/ref/Cat";
import { Landscape, type LandscapeVariant } from "@/components/ref/Landscape";
import { Button } from "@/components/ui/button";
import type { GrammarPoint } from "@/data/japanese/grammar";
import { NO_VOICE } from "@/lib/audio/browser-output";
import type { PlayerState, PlaylistPlayer, Segment } from "@/lib/audio/engine";
import { hintsFor } from "@/lib/japanese/practice";
import type { Line } from "@/lib/listening/types";
import { tipsFor, type Unit } from "@/lib/shadowing/session";
import type { Settings } from "@/lib/shadowing/settings";

// The project has no drawn scenes per situation; each topic gets one of the existing scenery and mascot pairs.
const SCENES: Record<string, [LandscapeVariant, CatPose]> = {
  "Nhà ga và đi lại": ["today", "sit"],
  "Ăn uống và mua sắm": ["library", "cheer"],
  "Bạn bè": ["progress", "cheer"],
  "Làm quen": ["welcome", "sit"],
};

const TOGGLES: [keyof Settings, string][] = [
  ["japanese", "Câu tiếng Nhật"],
  ["furigana", "Furigana"],
  ["vietnamese", "Tiếng Việt"],
  ["vocabulary", "Gợi ý từ"],
  ["grammar", "Ngữ pháp"],
];

export function Material({
  unit,
  line,
  position,
  player,
  state,
  segments,
  noAudio,
  onFallback,
  onPrevious,
  onNext,
  locked,
  settings,
  toggle,
  grammar,
  vocabulary,
}: {
  unit: Unit;
  /** The sentence shown; in continuous mode the one being played. */
  line: Line;
  position: string;
  player: PlaylistPlayer;
  state: PlayerState;
  segments: Segment[];
  noAudio: boolean;
  onFallback?: () => void;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  /** While recording, the reference player belongs to the recording flow. */
  locked: boolean;
  settings: Settings;
  toggle: (key: keyof Settings) => void;
  grammar: GrammarPoint[];
  vocabulary: WordLink[];
}) {
  const [scene, pose] = SCENES[unit.topic] ?? (["library", "read"] as [LandscapeVariant, CatPose]);
  const allFiles = segments.every((s) => s.src);
  const hints = settings.vocabulary ? hintsFor(line, vocabulary) : [];

  return (
    <section aria-label="Tài liệu luyện" className="ref-card min-w-0 space-y-4 p-4">
      <header className="space-y-1">
        <span className="ref-pill">Shadowing · {unit.level}</span>
        <h1 className="studio-head text-2xl">Nghe và đọc theo</h1>
        <p className="text-sm text-muted-foreground">
          {unit.title}: {unit.context}
        </p>
      </header>

      <div
        aria-hidden
        className="relative hidden h-48 overflow-hidden rounded-2xl bg-primary-soft sm:block"
      >
        <Landscape variant={scene} />
        <Cat pose={pose} width={140} className="absolute bottom-1 left-1/2 -translate-x-1/2" />
      </div>

      <fieldset disabled={locked} className="min-w-0 disabled:opacity-60">
        <legend className="sr-only">Âm thanh mẫu</legend>
        <AudioPlayer
          player={player}
          state={state}
          source={allFiles ? "file" : "tts"}
          unavailable={noAudio ? NO_VOICE : null}
          onFallback={onFallback}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </fieldset>
      <p className="text-center text-xs text-muted-foreground">
        {allFiles
          ? "Bản ghi âm mẫu."
          : "Giọng mẫu là giọng máy (TTS) của trình duyệt, chưa phải người bản ngữ."}
      </p>

      <div role="group" aria-label="Hiển thị" className="flex flex-wrap justify-center gap-1.5">
        {TOGGLES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="ref-chip !min-h-11 !px-3 gap-1"
            aria-pressed={settings[key]}
            onClick={() => toggle(key)}
          >
            {settings[key] && <Check aria-hidden className="h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl bg-primary-soft p-4 text-center">
        <p className="text-xs text-muted-foreground">
          {position}
          {line.speaker && ` · ${unit.speakers[line.speaker] ?? line.speaker}`} · {unit.level}
        </p>
        {settings.japanese ? (
          <p className="jp-serif break-words text-2xl !leading-[2.2]">
            <LineText line={line} furigana={settings.furigana} />
          </p>
        ) : (
          <p className="py-3 text-sm text-muted-foreground">
            Đang ẩn câu tiếng Nhật. Hãy nghe trước.
          </p>
        )}
        {settings.vietnamese && (
          <p className="font-semibold text-primary">{line.meaningVi ?? "Chưa có bản dịch"}</p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          disabled={locked || noAudio}
          onClick={() => player.play(state.index, state.index)}
        >
          <Play aria-hidden className="mr-1.5 h-4 w-4" /> Nghe riêng câu này
        </Button>
        {unit.draft && (
          <p className="text-xs text-muted-foreground">Nội dung tiếng Việt là bản nháp.</p>
        )}
      </div>

      {settings.vocabulary && (
        <div className="text-sm">
          <h2 className="font-bold">Từ trong câu</h2>
          {hints.length ? (
            <ul className="mt-1 space-y-1">
              {hints.map((h) => (
                <li key={h.word}>
                  <b lang="ja">{h.word}</b>{" "}
                  {h.reading && (
                    <span lang="ja" className="text-muted-foreground">
                      （{h.reading}）
                    </span>
                  )}{" "}
                  {h.meaning ?? "chưa có nghĩa trong kho từ"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Không có từ nào trong kho từ khớp câu này.</p>
          )}
        </div>
      )}
      {settings.grammar &&
        (line.grammarIds.length ? (
          <Related
            explain
            grammarIds={line.grammarIds}
            words={[]}
            grammar={grammar}
            vocabulary={vocabulary}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Câu này không gắn mẫu ngữ pháp nào.</p>
        ))}

      <div className="rounded-2xl bg-peach p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Lightbulb aria-hidden className="h-4 w-4 text-ochre" /> Gợi ý luyện tập
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {tipsFor(line).map((tip) => (
            <li key={tip} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
