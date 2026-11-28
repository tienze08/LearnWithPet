// Right column: stepper, recording, comparison and self-assessment.
import { useEffect, useMemo } from "react";
import { AlertTriangle, Check, Loader2, Mic, Pause, Play, Square, Trash2 } from "lucide-react";
import { formatTime } from "@/components/audio/AudioPlayer";
import { LineText } from "@/components/listening/ExerciseCards";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import type { MicPermission } from "@/hooks/use-recorder";
import type { PlayerState, PlaylistPlayer, Segment } from "@/lib/audio/engine";
import { ERROR_TEXT, type RecorderState, type Take } from "@/lib/audio/recorder";
import { contentMatch } from "@/lib/listening/grade";
import type { Line } from "@/lib/listening/types";
import type { Heard } from "@/lib/speech/recognition";
import type { Check as CheckId } from "@/lib/shadowing/session";

export interface TakeEntry extends Take {
  id: number;
  /** Continuous mode: seconds into the recording where each reference line started. */
  marks?: number[];
  heard?: Heard | "waiting";
}

export const STEPS = ["Nghe", "Nói theo", "Ghi âm", "So sánh", "Đánh giá"] as const;
export type Step = 1 | 2 | 3 | 4 | 5;

export function Stepper({
  step,
  onStep,
  can,
}: {
  step: Step;
  onStep: (s: Step) => void;
  can: (s: Step) => boolean;
}) {
  return (
    <ol aria-label="Các bước luyện" className="ref-card flex justify-between gap-1 p-3">
      {STEPS.map((label, i) => {
        const n = (i + 1) as Step;
        const current = n === step;
        return (
          <li key={label} className="flex-1">
            <button
              type="button"
              aria-current={current ? "step" : undefined}
              disabled={!current && !can(n)}
              onClick={() => onStep(n)}
              className="flex min-h-14 w-full flex-col items-center gap-1 text-xs disabled:opacity-45"
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full border font-bold ${current ? "border-primary bg-primary text-primary-foreground" : n < step ? "border-primary bg-primary-soft text-primary" : "border-border bg-sheet"}`}
              >
                {n < step ? <Check aria-hidden className="h-4 w-4" /> : n}
              </span>
              <span className={current ? "font-bold text-primary" : ""}>{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

const PERMISSION: Record<MicPermission, string> = {
  granted: "Micro: đã cho phép",
  denied: "Micro: đang bị chặn",
  prompt: "Micro: sẽ hỏi quyền khi bạn bắt đầu ghi",
  unknown: "Micro: chỉ hỏi quyền khi bạn bắt đầu ghi",
};

export const PRIVACY =
  "Bản ghi chỉ nằm trong trình duyệt này, không được tải lên máy chủ. Nó bị xoá khi bạn bấm xoá, hoàn thành bài hoặc rời trang.";

/** Live input level as bars. Shows that the microphone hears something; it says nothing about pronunciation. */
function Level({ level, mirrored }: { level: number; mirrored?: boolean }) {
  const shape = [0.3, 0.55, 0.8, 0.45, 1, 0.65, 0.35];
  return (
    <span
      aria-hidden
      className={`flex h-16 items-center gap-1 ${mirrored ? "flex-row-reverse" : ""}`}
    >
      {shape.map((s, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-sage transition-[height] duration-100"
          style={{ height: `${6 + Math.min(1, level * 3) * s * 56}px` }}
        />
      ))}
    </span>
  );
}

export function RecordPanel({
  state,
  permission,
  leading,
  startLabel,
  maxSeconds,
  onStart,
  onStop,
  onCancel,
}: {
  state: RecorderState;
  permission: MicPermission;
  /** The reference is playing before the recording starts. */
  leading: boolean;
  startLabel: string;
  maxSeconds: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}) {
  const recording = state.status === "recording";
  const waiting =
    state.status === "requesting" || state.status === "stopping" || (leading && !recording);
  const message = recording
    ? "Đang ghi âm. Bấm để dừng."
    : state.status === "requesting"
      ? "Đang chờ bạn cho phép dùng micro…"
      : state.status === "stopping"
        ? "Đang hoàn tất bản ghi…"
        : leading
          ? "Đang phát mẫu. Ghi âm sẽ bắt đầu khi mẫu dừng."
          : startLabel;
  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-4">
        <Level level={recording ? state.level : 0} mirrored />
        <button
          type="button"
          onClick={recording ? onStop : onStart}
          disabled={waiting || state.error === "unsupported"}
          aria-label={recording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
          className={`grid h-24 w-24 shrink-0 place-items-center rounded-full border-8 text-primary-foreground transition-transform enabled:hover:scale-105 disabled:opacity-50 ${recording ? "border-peach bg-destructive" : "border-primary-soft bg-primary"}`}
        >
          {waiting ? (
            <Loader2 className="h-9 w-9 animate-spin" />
          ) : recording ? (
            <Square className="h-8 w-8 fill-current" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </button>
        <Level level={recording ? state.level : 0} />
      </div>
      <p role="status" className="font-semibold">
        {recording && (
          <span
            aria-hidden
            className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-destructive"
          />
        )}
        {message}
      </p>
      {recording && (
        <p className="studio-head text-2xl tabular-nums">
          {formatTime(state.seconds)}{" "}
          <span className="text-sm text-muted-foreground">/ tối đa {formatTime(maxSeconds)}</span>
        </p>
      )}
      {(leading || recording || state.status === "requesting") && (
        <Button type="button" variant="ghost" className="min-h-11" onClick={onCancel}>
          Huỷ, không giữ bản ghi
        </Button>
      )}
      {state.status === "error" && state.error && (
        <div role="alert" className="border-l-2 border-seal py-1 pl-3 text-left text-sm">
          <p className="font-semibold">
            {state.error === "denied" ? "Không có quyền micro" : "Chưa ghi được âm"}
          </p>
          <p className="text-muted-foreground">{ERROR_TEXT[state.error]}</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {PERMISSION[permission]}. {PRIVACY}
      </p>
    </div>
  );
}

export function ComparePanel({
  lines,
  take,
  takes,
  onSelect,
  onDelete,
  onAgain,
  native,
  nativeState,
  nativeOff,
  furigana,
}: {
  /** The sentence(s) that were recorded. */
  lines: Line[];
  take: TakeEntry;
  takes: TakeEntry[];
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onAgain: () => void;
  native: PlaylistPlayer;
  nativeState: PlayerState;
  nativeOff: boolean;
  furigana: boolean;
}) {
  // With marks, the recording is cut where each reference line started; otherwise it is one piece.
  const segments = useMemo<Segment[]>(() => {
    const marks = take.marks?.length ? take.marks : [0];
    return marks.map((from, i) => {
      const to = Math.max(from + 0.1, marks[i + 1] ?? take.seconds);
      return {
        text: "",
        src: take.url,
        start: from,
        end: i < marks.length - 1 ? to : undefined,
        duration: to - from,
      };
    });
  }, [take]);
  const { player, state } = useAudioPlayer(segments);
  const playing = state.status === "playing" || state.status === "loading";
  const nativePlaying = nativeState.status === "playing" || nativeState.status === "loading";

  useEffect(() => () => native.stop(), [native]);

  const own = (from?: number, to?: number) => {
    native.stop();
    player.play(from, to);
  };
  const reference = (from?: number, to?: number) => {
    player.stop();
    native.play(from, to);
  };
  /** The main buttons continue from where the learner paused or sought to. */
  const resume = (which: PlaylistPlayer, other: PlaylistPlayer) => {
    other.stop();
    which.toggle();
  };
  const inTurn = async () => {
    player.stop();
    if (await native.playToEnd()) player.play();
  };
  const together = () => {
    native.play();
    player.play();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Nghe mẫu và bản ghi của bạn rồi tự so sánh. Ứng dụng không chấm điểm phát âm.
      </p>

      {takes.length > 1 && (
        <div role="group" aria-label="Chọn lần ghi" className="flex flex-wrap gap-1.5">
          {takes.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className="ref-chip !min-h-11"
              aria-pressed={t.id === take.id}
              onClick={() => onSelect(t.id)}
            >
              Lần {i + 1} · {formatTime(t.seconds)}
            </button>
          ))}
        </div>
      )}
      {(take.silent || take.interrupted) && (
        <p role="alert" className="studio-note flex gap-2 text-sm">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ochre" />
          {take.interrupted
            ? "Micro bị ngắt giữa chừng, bản ghi có thể thiếu."
            : "Hầu như không nghe thấy tiếng trong bản ghi. Kiểm tra micro rồi ghi lại."}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <section
          aria-label="Bản mẫu"
          className="space-y-2 rounded-2xl bg-primary-soft p-3 text-center"
        >
          <h3 className="text-sm font-bold">Bản mẫu</h3>
          <Button
            type="button"
            className="h-11 w-full rounded-full"
            disabled={nativeOff}
            onClick={() => (nativePlaying ? native.pause() : resume(native, player))}
          >
            {nativePlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {nativePlaying ? "Dừng mẫu" : "Nghe mẫu"}
          </Button>
        </section>
        <section
          aria-label="Bản ghi của bạn"
          className="space-y-2 rounded-2xl bg-peach p-3 text-center"
        >
          <h3 className="text-sm font-bold">Bản ghi của bạn</h3>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-full"
            onClick={() => (playing ? player.pause() : resume(player, native))}
          >
            {playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {playing ? "Dừng bản ghi" : "Nghe bản ghi"}
          </Button>
          <Slider
            aria-label="Vị trí trong bản ghi"
            className="py-2"
            min={0}
            max={Math.max(state.duration, 0.1)}
            step={0.1}
            value={[state.time]}
            onValueChange={([v]) => player.seek(v)}
          />
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatTime(state.time)} / {formatTime(take.seconds)}
          </p>
          {state.status === "error" && (
            <p role="alert" className="text-xs text-seal-ink">
              Không phát được bản ghi. Hãy ghi lại.
            </p>
          )}
        </section>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full"
          disabled={nativeOff}
          onClick={inTurn}
        >
          Phát lần lượt: mẫu rồi bạn
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full"
          disabled={nativeOff}
          onClick={together}
        >
          Phát cùng lúc
        </Button>
      </div>

      {lines.length === 1 ? (
        <p className="jp-serif text-center text-xl !leading-[2.2]">
          <LineText line={lines[0]} furigana={furigana} />
        </p>
      ) : (
        <ol aria-label="Xem lại từng câu" className="divide-y divide-border">
          {lines.map((line, i) => (
            <li key={i} className="space-y-1 py-2">
              <p className="text-lg leading-loose">
                {i + 1}. <LineText line={line} furigana={furigana} />
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11"
                  disabled={nativeOff}
                  aria-label={`Nghe mẫu câu ${i + 1}`}
                  onClick={() => reference(i, i)}
                >
                  <Play className="mr-1.5 h-4 w-4" /> Mẫu
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11"
                  disabled={i >= segments.length}
                  aria-label={`Nghe bạn đọc câu ${i + 1}`}
                  onClick={() => own(i, i)}
                >
                  <Play className="mr-1.5 h-4 w-4" />{" "}
                  {i >= segments.length ? "Chưa ghi tới" : "Bạn"}
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap justify-center gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={onAgain}>
          <Mic className="mr-2 h-4 w-4" /> Ghi lại
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-full text-destructive"
          onClick={() => onDelete(take.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Xoá bản ghi này
        </Button>
      </div>
    </div>
  );
}

/** Speech-to-text result. It only says which words the recognizer heard. */
export function Transcription({ line, heard }: { line: Line; heard: Heard | "waiting" }) {
  if (heard === "waiting")
    return (
      <p role="status" className="text-sm">
        Đang chờ kết quả nhận dạng giọng nói…
      </p>
    );
  if ("error" in heard)
    return (
      <p role="status" className="studio-note text-sm">
        Không có bản chép lời: {heard.error}
      </p>
    );
  const match = contentMatch(line, heard.text);
  return (
    <section aria-label="Khớp nội dung" className="space-y-2 rounded-2xl bg-surface-2 p-3 text-sm">
      <p className="font-bold">Độ khớp nội dung: {match.percent}%</p>
      <p>
        Máy nghe được: <span lang="ja">{heard.text}</span>
      </p>
      <p lang="ja" className="flex flex-wrap gap-1 text-lg">
        {match.parts.map((p, i) => (
          <span
            key={i}
            className={p.status === "ok" ? "" : "rounded bg-butter px-1 underline decoration-wavy"}
          >
            {p.text}
          </span>
        ))}
      </p>
      <p className="text-xs text-muted-foreground">
        Từ được đánh dấu là từ máy không nhận ra giống câu mẫu; máy có thể nghe nhầm. Đây không phải
        điểm phát âm.
      </p>
    </section>
  );
}

export function Checklist({
  items,
  answers,
  onAnswer,
}: {
  items: [CheckId, string][];
  answers: Partial<Record<CheckId, boolean>>;
  onAnswer: (id: CheckId, ok: boolean) => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map(([id, label]) => (
        <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span id={`check-${id}`} className="text-sm">
            {label}
          </span>
          <span role="group" aria-labelledby={`check-${id}`} className="flex gap-1.5">
            {(
              [
                [true, "Được"],
                [false, "Chưa"],
              ] as const
            ).map(([ok, text]) => (
              <button
                key={text}
                type="button"
                className="ref-chip !min-h-11"
                aria-pressed={answers[id] === ok}
                onClick={() => onAnswer(id, ok)}
              >
                {text}
              </button>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
