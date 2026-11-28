// Playlist player over sentence-sized segments. Framework- and browser-free (the output is injected), so it also runs
// in Node checks. Shared by every screen that plays Japanese audio (Listening now, Shadowing later).

export interface Segment {
  /** Text spoken by TTS when there is no file. */
  text: string;
  /** Audio file; absent = synthesized speech. */
  src?: string;
  /** Slice of `src` in seconds, for one file holding a whole dialogue. */
  start?: number;
  end?: number;
  /** Seconds at 1x. An estimate for synthesized speech. */
  duration: number;
}

export interface PlayOptions {
  rate: number;
  volume: number;
}

export interface OutputEvents {
  /** Sound is actually coming out. */
  started(): void;
  /** Seconds from the start of the segment, at 1x. */
  progress(offset: number): void;
  ended(): void;
  failed(message: string): void;
}

export interface AudioOutput {
  /** Starts a segment, replacing whatever was playing. */
  play(segment: Segment, offset: number, options: PlayOptions, events: OutputEvents): void;
  /** Applies new options to the running segment; false when it has to be restarted for that. */
  update(options: PlayOptions): boolean;
  stop(): void;
}

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export interface PlayerState {
  status: PlayerStatus;
  /** Current segment and the position inside it. */
  index: number;
  offset: number;
  /** Position and length on the whole playlist's timeline. */
  time: number;
  duration: number;
  rate: number;
  volume: number;
  error: string | null;
}

export const RATES = [0.75, 1, 1.25, 1.5] as const;

export class PlaylistPlayer {
  private segments: Segment[] = [];
  private state: PlayerState = {
    status: "idle",
    index: 0,
    offset: 0,
    time: 0,
    duration: 0,
    rate: 1,
    volume: 1,
    error: null,
  };
  /** Last segment of the current run. */
  private to = 0;
  /** Events of a stopped segment must not move the player. */
  private token = 0;
  private listeners = new Set<() => void>();
  /** Called when playback begins anew (not on resume or an internal restart), for replay counting. */
  onStart: (() => void) | null = null;

  constructor(private output: AudioOutput) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getState = () => this.state;

  load(segments: Segment[]) {
    this.halt();
    this.segments = segments;
    this.to = segments.length - 1;
    this.set({ status: "idle", index: 0, offset: 0, error: null });
  }

  /** Plays segments `from`..`to` inclusive from the beginning of `from`. */
  play(from = 0, to = this.segments.length - 1) {
    if (!this.segments[from]) return;
    this.to = Math.max(from, Math.min(to, this.segments.length - 1));
    this.onStart?.();
    this.start(from, 0);
  }

  /** play() that resolves true once the run finished, false when it was paused, stopped or failed. */
  playToEnd(from?: number, to?: number): Promise<boolean> {
    this.play(from, to);
    return new Promise((resolve) => {
      const check = () => {
        const { status } = this.state;
        if (status === "loading" || status === "playing") return;
        unsubscribe();
        resolve(status === "ended");
      };
      const unsubscribe = this.subscribe(check);
      check();
    });
  }

  pause() {
    if (this.state.status !== "playing" && this.state.status !== "loading") return;
    this.halt();
    this.set({ status: "paused" });
  }

  /** Play / pause button: resumes where it stopped, or starts over after the end. */
  toggle() {
    const { status, index, offset } = this.state;
    if (status === "playing" || status === "loading") return this.pause();
    if (status === "paused" || status === "error") return this.start(index, offset);
    this.play();
  }

  /** Moves on the whole timeline; keeps playing if it was, and always continues to the last segment. */
  seek(time: number) {
    if (!this.segments.length) return;
    let left = Math.max(0, Math.min(time, this.state.duration));
    let index = 0;
    while (index < this.segments.length - 1 && left >= this.segments[index].duration) {
      left -= this.segments[index].duration;
      index++;
    }
    this.jump(index, Math.min(left, this.segments[index].duration));
  }

  skip(seconds: number) {
    this.seek(this.state.time + seconds);
  }

  /** Moves to the start of one segment. */
  seekSegment(index: number) {
    if (this.segments[index]) this.jump(index, 0);
  }

  setRate(rate: number) {
    this.setOptions({ rate });
  }

  setVolume(volume: number) {
    this.setOptions({ volume: Math.max(0, Math.min(1, volume)) });
  }

  stop() {
    this.halt();
    this.set({ status: "idle", index: 0, offset: 0, error: null });
  }

  private jump(index: number, offset: number) {
    this.to = this.segments.length - 1;
    const running = this.state.status === "playing" || this.state.status === "loading";
    if (running) this.start(index, offset);
    else this.set({ status: "paused", index, offset, error: null });
  }

  private setOptions(change: Partial<PlayOptions>) {
    this.set(change);
    const { status, index, offset, rate, volume } = this.state;
    if ((status === "playing" || status === "loading") && !this.output.update({ rate, volume }))
      this.start(index, offset);
  }

  private start(index: number, offset: number) {
    const segment = this.segments[index];
    if (!segment) return;
    const token = ++this.token;
    const live = () => token === this.token;
    this.set({ status: "loading", index, offset, error: null });
    const { rate, volume } = this.state;
    this.output.play(
      segment,
      offset,
      { rate, volume },
      {
        started: () => live() && this.set({ status: "playing" }),
        progress: (at) =>
          live() && this.set({ offset: Math.max(0, Math.min(at, segment.duration)) }),
        ended: () => {
          if (!live()) return;
          if (index < this.to) return this.start(index + 1, 0);
          this.halt();
          this.set({ status: "ended", offset: segment.duration });
        },
        failed: (message) => {
          if (!live()) return;
          this.halt();
          this.set({ status: "error", error: message });
        },
      },
    );
  }

  private halt() {
    this.token++;
    this.output.stop();
  }

  private set(change: Partial<PlayerState>) {
    const next = { ...this.state, ...change };
    const before = this.segments.slice(0, next.index).reduce((sum, s) => sum + s.duration, 0);
    next.time = before + next.offset;
    next.duration = this.segments.reduce((sum, s) => sum + s.duration, 0);
    this.state = next;
    this.listeners.forEach((l) => l());
  }
}
