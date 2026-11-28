// Microphone recording: permission, start/stop, limits and clean release. The browser APIs are injected, so the same
// logic runs in Node checks with fakes. Nothing here uploads anything.

export const MAX_BYTES = 20 * 1024 * 1024;
const MIN_SECONDS = 0.5;
/** Peak input level (0..1) under which a take is reported as silent. */
const SILENCE = 0.02;

export type RecorderErrorKind =
  | "unsupported"
  | "denied"
  | "no-device"
  | "busy"
  | "empty"
  | "too-large"
  | "failed";

export const ERROR_TEXT: Record<RecorderErrorKind, string> = {
  unsupported:
    "Trình duyệt này không hỗ trợ ghi âm. Hãy dùng Chrome, Edge, Firefox hoặc Safari mới, qua https hoặc localhost.",
  denied:
    "Quyền micro đã bị từ chối. Mở cài đặt quyền của trang trong trình duyệt, cho phép micro rồi thử lại.",
  "no-device": "Không tìm thấy micro. Hãy cắm hoặc bật micro rồi thử lại.",
  busy: "Không mở được micro, có thể ứng dụng khác đang dùng.",
  empty: "Bản ghi quá ngắn hoặc trống. Hãy ghi lại.",
  "too-large": "Bản ghi quá lớn. Hãy ghi ngắn hơn.",
  failed: "Ghi âm gặp lỗi. Hãy thử lại.",
};

export interface Take {
  blob: Blob;
  url: string;
  seconds: number;
  /** The input level never rose above silence. */
  silent: boolean;
  /** The microphone went away before the learner stopped. */
  interrupted: boolean;
}

export interface MediaRecorderLike {
  state: string;
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start(timeslice?: number): void;
  stop(): void;
}

export interface StreamLike {
  getTracks(): { stop(): void; onended: ((this: never, e: never) => unknown) | null }[];
}

export interface RecorderDeps<S extends StreamLike = StreamLike> {
  supported(): boolean;
  getStream(): Promise<S>;
  createRecorder(stream: S): MediaRecorderLike;
  /** Reports the input level (0..1) until the returned function is called; null when it cannot be measured. */
  meter(stream: S, onLevel: (level: number) => void): (() => void) | null;
  createUrl(blob: Blob): string;
  now(): number;
}

export type RecorderStatus = "idle" | "requesting" | "ready" | "recording" | "stopping" | "error";

export interface RecorderState {
  status: RecorderStatus;
  error: RecorderErrorKind | null;
  seconds: number;
  level: number;
}

const kindOf = (e: unknown): RecorderErrorKind => {
  const name =
    e instanceof Error || (typeof e === "object" && e) ? (e as { name?: string }).name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-device";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "failed";
};

export class VoiceRecorder<S extends StreamLike = StreamLike> {
  private state: RecorderState = { status: "idle", error: null, seconds: 0, level: 0 };
  private listeners = new Set<() => void>();
  private stream: S | null = null;
  private recorder: MediaRecorderLike | null = null;
  private stopMeter: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private startedAt = 0;
  private interrupted = false;
  /** Bumped by cancel(), so late callbacks of a discarded session are ignored. */
  private token = 0;
  private finish: ((take: Take | null) => void) | null = null;

  constructor(private deps: RecorderDeps<S>) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getState = () => this.state;

  /** Seconds since recording started. */
  elapsed = () =>
    this.state.status === "recording" ? (this.deps.now() - this.startedAt) / 1000 : 0;

  /** Asks for the microphone. Call only from an explicit learner action. */
  async arm(): Promise<boolean> {
    if (this.state.status === "requesting" || this.state.status === "recording") return false;
    if (this.stream) return true;
    if (!this.deps.supported()) {
      this.set({ status: "error", error: "unsupported" });
      return false;
    }
    const token = ++this.token;
    this.set({ status: "requesting", error: null, seconds: 0, level: 0 });
    try {
      const stream = await this.deps.getStream();
      if (token !== this.token) {
        stream.getTracks().forEach((t) => t.stop()); // cancelled while the permission prompt was open
        return false;
      }
      this.stream = stream;
      this.set({ status: "ready" });
      return true;
    } catch (e) {
      if (token === this.token) this.set({ status: "error", error: kindOf(e) });
      return false;
    }
  }

  /** Records until stop(), `maxSeconds`, or an interruption. Resolves null when there is no usable take. */
  async start(maxSeconds: number): Promise<Take | null> {
    if (!this.stream && !(await this.arm())) return null;
    if (this.state.status !== "ready") return null;
    const token = this.token;
    const stream = this.stream!;
    const chunks: Blob[] = [];
    let peak: number | null = null;
    this.interrupted = false;

    return new Promise<Take | null>((resolve) => {
      this.finish = resolve;
      const fail = (error: RecorderErrorKind) => {
        this.release();
        this.set({ status: "error", error, level: 0 });
        this.settle(null);
      };
      try {
        const recorder = this.deps.createRecorder(stream);
        this.recorder = recorder;
        recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
        recorder.onerror = () => token === this.token && fail("failed");
        recorder.onstop = () => {
          if (token !== this.token) return;
          const seconds = (this.deps.now() - this.startedAt) / 1000;
          const blob = new Blob(chunks, {
            type: recorder.mimeType || chunks[0]?.type || "audio/webm",
          });
          if (!blob.size || seconds < MIN_SECONDS) return fail("empty");
          if (blob.size > MAX_BYTES) return fail("too-large");
          const take: Take = {
            blob,
            url: this.deps.createUrl(blob),
            seconds: Math.min(seconds, maxSeconds),
            silent: peak !== null && peak < SILENCE,
            interrupted: this.interrupted,
          };
          this.release();
          this.set({ status: "idle", seconds: take.seconds, level: 0 });
          this.settle(take);
        };
        for (const track of stream.getTracks())
          track.onended = () => {
            this.interrupted = true;
            this.stop();
          };
        this.stopMeter = this.deps.meter(stream, (level) => {
          if (token !== this.token) return;
          peak = Math.max(peak ?? 0, level);
          this.set({ level });
        });
        recorder.start(250);
        this.startedAt = this.deps.now();
        this.set({ status: "recording", seconds: 0 });
        this.timer = setInterval(() => {
          const seconds = this.elapsed();
          this.set({ seconds: Math.min(seconds, maxSeconds) });
          if (seconds >= maxSeconds) this.stop();
        }, 100);
      } catch (e) {
        fail(kindOf(e));
      }
    });
  }

  stop() {
    if (this.state.status !== "recording" || !this.recorder) return;
    clearInterval(this.timer);
    this.set({ status: "stopping" });
    if (this.recorder.state !== "inactive") this.recorder.stop();
    // A recorder that stopped by itself (all tracks ended) has already queued onstop.
  }

  /** Drops whatever is going on and releases the microphone. */
  cancel() {
    this.token++;
    if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    this.release();
    this.set({ status: "idle", error: null, seconds: 0, level: 0 });
    this.settle(null);
  }

  private settle(take: Take | null) {
    const finish = this.finish;
    this.finish = null;
    finish?.(take);
  }

  private release() {
    clearInterval(this.timer);
    this.stopMeter?.();
    this.stopMeter = null;
    this.stream?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    this.stream = null;
    this.recorder = null;
  }

  private set(change: Partial<RecorderState>) {
    this.state = { ...this.state, ...change };
    this.listeners.forEach((l) => l());
  }
}

const MIME = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export function browserRecorderDeps(): RecorderDeps<MediaStream> {
  return {
    supported: () =>
      typeof window !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      "MediaRecorder" in window,
    getStream: () => navigator.mediaDevices.getUserMedia({ audio: true }),
    createRecorder: (stream) => {
      const mimeType = MIME.find((m) => MediaRecorder.isTypeSupported(m));
      return new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      ) as unknown as MediaRecorderLike;
    },
    meter: (stream, onLevel) => {
      try {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        const timer = setInterval(() => {
          if (context.state !== "running") return void context.resume();
          analyser.getByteTimeDomainData(samples);
          onLevel(samples.reduce((max, v) => Math.max(max, Math.abs(v - 128)), 0) / 128);
        }, 100);
        return () => {
          clearInterval(timer);
          void context.close();
        };
      } catch {
        return null;
      }
    },
    createUrl: (blob) => URL.createObjectURL(blob),
    now: () => performance.now(),
  };
}
