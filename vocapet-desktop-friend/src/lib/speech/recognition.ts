// Optional speech-to-text through the browser's Web Speech API. It listens to the live microphone (not the saved
// recording) and in most browsers sends that audio to the browser vendor's servers, so it is off until the learner
// switches it on.

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

const Ctor = (): (new () => Recognition) | undefined => {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, (new () => Recognition) | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const recognitionSupported = () => !!Ctor();

export type Heard = { text: string } | { error: string };

const REASONS: Record<string, string> = {
  "not-allowed": "Trình duyệt không cho phép nhận dạng giọng nói.",
  "service-not-allowed": "Dịch vụ nhận dạng giọng nói bị chặn.",
  network: "Không kết nối được dịch vụ nhận dạng giọng nói của trình duyệt.",
  "language-not-supported": "Dịch vụ không hỗ trợ tiếng Nhật.",
  "no-speech": "Dịch vụ không nghe thấy giọng nói.",
};

/** Starts listening; `stop()` resolves with the recognised text or why there is none. */
export function listen(): { stop: () => Promise<Heard>; abort: () => void } {
  const Recognizer = Ctor();
  if (!Recognizer) {
    return {
      stop: async () => ({ error: "Trình duyệt này không có nhận dạng giọng nói." }),
      abort: () => {},
    };
  }
  const r = new Recognizer();
  let text = "";
  let failure = "";
  let ended = false;
  let done: (() => void) | null = null;
  r.lang = "ja-JP";
  r.continuous = true;
  r.interimResults = false;
  r.onresult = (e) => {
    text = Array.from(e.results, (alternatives) => alternatives[0].transcript).join("");
  };
  r.onerror = (e) => {
    failure = REASONS[e.error] ?? "Nhận dạng giọng nói gặp lỗi.";
  };
  r.onend = () => {
    ended = true;
    done?.();
  };
  try {
    r.start();
  } catch {
    ended = true;
    failure = "Không khởi động được nhận dạng giọng nói.";
  }
  return {
    stop: () =>
      new Promise<Heard>((resolve) => {
        const answer = () => resolve(text ? { text } : { error: failure || REASONS["no-speech"] });
        if (ended) return answer();
        const timer = setTimeout(answer, 4000); // some browsers never fire onend
        done = () => {
          clearTimeout(timer);
          answer();
        };
        r.stop();
      }),
    abort: () => r.abort(),
  };
}
