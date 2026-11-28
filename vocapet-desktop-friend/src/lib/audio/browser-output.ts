import type { AudioOutput, OutputEvents, PlayOptions, Segment } from "./engine";

export const NO_VOICE = "Thiết bị này không có giọng đọc tiếng Nhật (TTS).";
const FILE_FAILED = "Không tải được tệp âm thanh. Kiểm tra kết nối rồi thử lại.";
const TICK_MS = 100;

export const japaneseVoice = () =>
  typeof window === "undefined" || !("speechSynthesis" in window)
    ? undefined
    : window.speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith("ja"));

/** Plays files through one <audio> element and everything else through the browser's Japanese voice. */
export function browserOutput(): AudioOutput {
  let element: HTMLAudioElement | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let utterance: SpeechSynthesisUtterance | null = null;
  let current: { file: boolean; rate: number } | null = null;

  const stop = () => {
    clearInterval(timer);
    if (element) {
      element.onended = element.onerror = element.onplaying = null;
      element.pause();
    }
    // cancel() is global, so only cancel when this output started the speech.
    if (utterance) window.speechSynthesis.cancel();
    utterance = null;
    current = null;
  };

  const playFile = (s: Segment, offset: number, o: PlayOptions, events: OutputEvents) => {
    element ??= new Audio();
    const audio = element;
    audio.preload = "metadata"; // nothing is fetched until a segment is actually played
    const url = new URL(s.src!, window.location.href).href;
    if (audio.src !== url || audio.error) {
      audio.src = url;
      audio.load();
    }
    const from = s.start ?? 0;
    audio.currentTime = from + offset;
    audio.playbackRate = o.rate;
    audio.volume = o.volume;
    audio.onplaying = () => events.started();
    audio.onerror = () => events.failed(FILE_FAILED);
    audio.onended = () => events.ended();
    timer = setInterval(() => {
      const at = audio.currentTime - from;
      events.progress(at);
      if (s.end !== undefined && audio.currentTime >= s.end) events.ended();
    }, TICK_MS);
    audio.play().catch((e: unknown) => {
      if (e instanceof Error && e.name === "AbortError") return; // replaced by a newer segment
      events.failed(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Trình duyệt chặn tự phát. Hãy bấm phát lại."
          : FILE_FAILED,
      );
    });
  };

  // Synthesized speech cannot start mid-sentence: the offset is ignored and the sentence is read from its start.
  const speak = (s: Segment, o: PlayOptions, events: OutputEvents) => {
    const voice = japaneseVoice();
    if (!voice) return events.failed(NO_VOICE);
    const u = new SpeechSynthesisUtterance(s.text);
    u.lang = "ja-JP";
    u.voice = voice;
    u.rate = o.rate;
    u.volume = o.volume;
    let startedAt = 0;
    const askedAt = Date.now();
    u.onstart = () => {
      if (utterance !== u) return;
      startedAt = Date.now();
      events.started();
    };
    u.onend = () => utterance === u && events.ended();
    u.onerror = () => utterance === u && events.failed("Giọng đọc của trình duyệt gặp lỗi.");
    utterance = u;
    events.progress(0);
    window.speechSynthesis.speak(u);
    timer = setInterval(() => {
      if (startedAt) events.progress(((Date.now() - startedAt) / 1000) * o.rate);
      // Some browsers silently drop speech; without this the player would stay "loading".
      else if (Date.now() - askedAt > 5000)
        events.failed("Giọng đọc của trình duyệt không phản hồi.");
    }, TICK_MS);
  };

  return {
    play(segment, offset, options, events) {
      stop();
      current = { file: !!segment.src, rate: options.rate };
      if (segment.src) playFile(segment, offset, options, events);
      else speak(segment, options, events);
    },
    update(o) {
      if (current?.file && element) {
        element.playbackRate = o.rate;
        element.volume = o.volume;
        return true;
      }
      // Speech takes a new volume from the next sentence; a new speed needs a restart.
      return current?.rate === o.rate;
    },
    stop,
  };
}
