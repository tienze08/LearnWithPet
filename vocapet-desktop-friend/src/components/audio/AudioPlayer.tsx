import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Turtle,
  Volume2,
  VolumeX,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatTime, RATES, type PlayerState, type PlaylistPlayer } from "@/lib/audio/engine";

const SLOW = 0.75;

function Round({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-11 w-11 rounded-full"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

/**
 * Media controls for a PlaylistPlayer. `source` says where the sound comes from; `unavailable` replaces playback with an
 * explanation when nothing can be played.
 */
export function AudioPlayer({
  player,
  state,
  source,
  unavailable,
  onFallback,
  onPrevious,
  onNext,
}: {
  player: PlaylistPlayer;
  state: PlayerState;
  source: "file" | "tts";
  unavailable?: string | null;
  /** Given when the failed audio is a file: switches to synthesized speech. */
  onFallback?: () => void;
  /** Sentence navigation; omit to hide the button, pass null at either end. */
  onPrevious?: (() => void) | null;
  onNext?: (() => void) | null;
}) {
  const { status, time, duration, rate, volume, error } = state;
  const off = !!unavailable;
  const playing = status === "playing" || status === "loading";
  const approx = source === "tts" ? "≈" : "";

  return (
    <div className="space-y-3" aria-label="Trình phát âm thanh" role="group">
      {unavailable && (
        <p role="status" className="studio-note text-sm">
          <b>Chưa có âm thanh.</b> {unavailable} Bạn vẫn có thể bật transcript để đọc bài.
        </p>
      )}
      <div className="flex items-center justify-center gap-1.5 sm:gap-3">
        {onPrevious !== undefined && (
          <Round label="Câu trước" onClick={() => onPrevious?.()} disabled={!onPrevious}>
            <SkipBack className="h-5 w-5" />
          </Round>
        )}
        <Round label="Lùi 10 giây" onClick={() => player.skip(-10)} disabled={off}>
          <RotateCcw className="h-5 w-5" />
        </Round>
        <button
          type="button"
          onClick={() => player.toggle()}
          disabled={off}
          aria-label={playing ? "Tạm dừng" : "Phát"}
          className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-pop transition-transform hover:scale-105 disabled:opacity-50"
        >
          {status === "loading" ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : playing ? (
            <Pause className="h-7 w-7 fill-current" />
          ) : (
            <Play className="ml-1 h-7 w-7 fill-current" />
          )}
        </button>
        <Round label="Tới 10 giây" onClick={() => player.skip(10)} disabled={off}>
          <RotateCw className="h-5 w-5" />
        </Round>
        {onNext !== undefined && (
          <Round label="Câu sau" onClick={() => onNext?.()} disabled={!onNext}>
            <SkipForward className="h-5 w-5" />
          </Round>
        )}
      </div>

      <div className="space-y-1">
        <Slider
          aria-label="Vị trí phát"
          className="py-2"
          min={0}
          max={Math.max(duration, 0.1)}
          step={0.1}
          value={[time]}
          disabled={off}
          onValueChange={([v]) => player.seek(v)}
        />
        <div className="flex items-center justify-between gap-3 text-xs tabular-nums text-muted-foreground">
          <span>
            {formatTime(time)} / {approx}
            {formatTime(duration)}
          </span>
          <span className="flex w-32 items-center gap-2">
            <button
              type="button"
              className="grid h-11 w-8 shrink-0 place-items-center"
              aria-label={volume === 0 ? "Bật tiếng" : "Tắt tiếng"}
              onClick={() => player.setVolume(volume === 0 ? 1 : 0)}
            >
              {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <Slider
              aria-label="Âm lượng"
              min={0}
              max={1}
              step={0.05}
              value={[volume]}
              onValueChange={([v]) => player.setVolume(v)}
            />
          </span>
        </div>
      </div>

      <p role="status" className="sr-only">
        {status === "playing"
          ? "Đang phát"
          : status === "paused"
            ? "Đã tạm dừng"
            : status === "ended"
              ? "Đã phát xong"
              : ""}
      </p>
      {status === "error" && (
        <div role="alert" className="border-l-2 border-seal py-1 pl-3 text-sm">
          <p className="font-semibold">Lỗi phát âm thanh</p>
          <p className="text-muted-foreground">{error}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => player.toggle()}>
              Thử lại
            </Button>
            {onFallback && (
              <Button type="button" size="sm" variant="ghost" onClick={onFallback}>
                Dùng giọng máy
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        role="group"
        aria-label="Tốc độ phát"
        className="flex flex-wrap items-center justify-center gap-1.5"
      >
        {RATES.map((r) => (
          <button
            key={r}
            type="button"
            className="ref-chip !min-h-11 !px-3"
            aria-pressed={rate === r}
            onClick={() => player.setRate(r)}
          >
            {r}x
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full"
          disabled={off}
          onClick={() => player.play()}
        >
          <Repeat className="mr-2 h-4 w-4" /> Nghe lại
        </Button>
        <Button
          type="button"
          variant={rate === SLOW ? "default" : "outline"}
          className="h-11 rounded-full"
          aria-pressed={rate === SLOW}
          disabled={off}
          onClick={() => player.setRate(rate === SLOW ? 1 : SLOW)}
        >
          <Turtle className="mr-2 h-4 w-4" /> Nghe chậm
        </Button>
      </div>
    </div>
  );
}
