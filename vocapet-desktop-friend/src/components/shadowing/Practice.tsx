import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Mic, Play, Settings2 } from "lucide-react";
import type { ShadowingSessionRequest } from "@/api/shadowing.api";
import { ProgressBar } from "@/components/tango/shared";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { loadAllGrammar } from "@/data/japanese/grammar";
import { AUDIO } from "@/data/japanese/listening";
import {
  useSubmitShadowingMutation,
  useShadowingProgressQuery,
} from "@/hooks/queries/shadowing.queries";
import { useTangoLevelWordsQuery } from "@/hooks/queries/tango.queries";
import { useAudioPlayer, useJapaneseVoice } from "@/hooks/use-audio-player";
import { useMicPermission, useRecorder } from "@/hooks/use-recorder";
import { segmentsFor } from "@/lib/listening/content";
import { listen, recognitionSupported } from "@/lib/speech/recognition";
import { contentMatch } from "@/lib/listening/grade";
import {
  assessed,
  checksFor,
  MODES,
  recommend,
  sentenceKey,
  type Check,
  type Mode,
  type SentenceResult,
  type Unit,
} from "@/lib/shadowing/session";
import { useShadowingSettings } from "@/lib/shadowing/settings";
import { Completion } from "./Completion";
import { Material } from "./Material";
import {
  Checklist,
  ComparePanel,
  RecordPanel,
  Stepper,
  Transcription,
  type Step,
  type TakeEntry,
} from "./Panels";

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const SENTENCE_MAX = 60;
/** Extra seconds kept after the continuous reference ends, so the last words are not cut. */
const TAIL_MS = 2500;

interface Work {
  takes: TakeEntry[];
  selected: number | null;
  /** All attempts, including deleted ones. */
  attempts: number;
  answers: Partial<Record<Check, boolean>>;
}
const NO_WORK: Work = { takes: [], selected: null, attempts: 0, answers: {} };

/**
 * One unit in one mode, from the first sentence to the saved summary. In continuous mode the whole unit is one piece
 * of work (index 0).
 * shortcut: results are sent when the learner finishes, so leaving the page drops them together with the recordings.
 */
export function Practice({
  unit,
  units,
  mode,
  onMode,
}: {
  unit: Unit;
  units: Unit[];
  mode: Mode;
  onMode: (m: Mode) => void;
}) {
  const continuous = mode === "CONTINUOUS";
  const [settings, toggle] = useShadowingSettings();
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>(1);
  const [work, setWork] = useState<Record<number, Work>>({});
  const [results, setResults] = useState<Record<number, SentenceResult[]>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [finished, setFinished] = useState<{
    request: ShadowingSessionRequest;
    matches: number[];
  } | null>(null);
  const [forceTts, setForceTts] = useState(false);
  /** Reference audio is playing ahead of the recording. */
  const [leading, setLeading] = useState(false);
  const [yourTurn, setYourTurn] = useState(0);
  const startedAt = useRef(Date.now());
  /** Bumped to abandon a running listen-then-record or play-then-repeat sequence. */
  const flow = useRef(0);
  const nextTake = useRef(1);
  const urls = useRef(new Set<string>());
  const recognition = useRef<ReturnType<typeof listen> | null>(null);

  const all = useMemo(() => segmentsFor(unit, AUDIO, forceTts), [unit, forceTts]);
  const segments = useMemo(() => (continuous ? all : [all[index]]), [all, continuous, index]);
  const { player, state } = useAudioPlayer(segments);
  const { recorder, state: mic } = useRecorder();
  const permission = useMicPermission();
  const voice = useJapaneseVoice();
  const noAudio = voice === false && segments.every((s) => !s.src);

  const grammar =
    useQuery({ queryKey: ["grammar", "all"], queryFn: loadAllGrammar, staleTime: Infinity }).data ??
    [];
  const vocabulary = useTangoLevelWordsQuery("N5").data ?? [];
  const progress = useShadowingProgressQuery().data;
  const submit = useSubmitShadowingMutation();

  const current = work[index] ?? NO_WORK;
  const take = current.takes.find((t) => t.id === current.selected) ?? current.takes.at(-1) ?? null;
  const lines = continuous ? unit.lines : [unit.lines[index]];
  const shownLine = unit.lines[continuous ? Math.min(state.index, unit.lines.length - 1) : index];
  const busy =
    leading ||
    mic.status === "recording" ||
    mic.status === "requesting" ||
    mic.status === "stopping";
  const maxSeconds = continuous
    ? Math.min(180, Math.ceil(all.reduce((n, s) => n + s.duration, 0) * 2 + 20))
    : SENTENCE_MAX;
  // Evaluated or recorded: both count as practised, so moving on without evaluating does not lose the attempts.
  const touched = new Set([
    ...Object.keys(results).map(Number),
    ...Object.entries(work).flatMap(([i, w]) => (w.attempts ? [Number(i)] : [])),
  ]);
  const practised = touched.size;

  const update = (at: number, change: (w: Work) => Work) =>
    setWork((all) => ({ ...all, [at]: change(all[at] ?? NO_WORK) }));

  const abandon = () => {
    flow.current++;
    setLeading(false);
    setYourTurn(0);
    recognition.current?.abort();
    recognition.current = null;
    recorder.cancel();
    player.stop();
  };

  // Recordings are discarded when the learner leaves.
  useEffect(() => {
    const made = urls.current;
    const sequence = flow;
    return () => {
      sequence.current++;
      recognition.current?.abort();
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // The countdown of "your turn".
  useEffect(() => {
    if (yourTurn <= 0) return;
    const timer = setTimeout(() => setYourTurn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [yourTurn]);

  const go = (s: Step) => {
    abandon();
    setStep(s);
  };

  const goSentence = (i: number) => {
    abandon();
    setIndex(i);
    setStep(1);
  };

  /** Play, then stop and give the learner time to say it. */
  const playThenRepeat = async () => {
    abandon();
    const mine = flow.current;
    if ((await player.playToEnd()) && mine === flow.current)
      setYourTurn(Math.ceil((segments.reduce((n, s) => n + s.duration, 0) / state.rate) * 1.5) + 1);
  };

  const record = async () => {
    abandon();
    const mine = flow.current;
    const at = index;
    if (!(await recorder.arm()) || mine !== flow.current) return;

    if (mode === "IMMEDIATE" && !noAudio) {
      setLeading(true);
      const heard = await player.playToEnd();
      if (mine !== flow.current) return;
      setLeading(false);
      if (!heard) return recorder.cancel(); // paused or failed: do not record without the learner expecting it
    }

    const marks: number[] = [];
    const finishing = recorder.start(maxSeconds);
    if (recorder.getState().status !== "recording") return;
    if (!continuous && settings.recognition && recognitionSupported())
      recognition.current = listen();

    let unsubscribe = () => {};
    if (continuous) {
      unsubscribe = player.subscribe(() => {
        const p = player.getState();
        if (p.status === "playing" && p.index === marks.length) marks.push(recorder.elapsed());
      });
      void player.playToEnd().then((ended) => {
        if (ended && mine === flow.current)
          setTimeout(() => mine === flow.current && recorder.stop(), TAIL_MS);
      });
    }

    const result = await finishing;
    unsubscribe();
    const session = recognition.current;
    recognition.current = null;
    if (!result || mine !== flow.current) {
      session?.abort();
      return;
    }
    player.stop();
    urls.current.add(result.url);
    const id = nextTake.current++;
    const entry: TakeEntry = {
      ...result,
      id,
      marks: continuous ? marks : undefined,
      heard: session ? "waiting" : undefined,
    };
    update(at, (w) => ({
      ...w,
      takes: [...w.takes, entry],
      selected: id,
      attempts: w.attempts + 1,
    }));
    setStep(4);
    void session?.stop().then((heard) =>
      update(at, (w) => ({
        ...w,
        takes: w.takes.map((t) => (t.id === id ? { ...t, heard } : t)),
      })),
    );
  };

  const remove = (id: number) => {
    const gone = current.takes.find((t) => t.id === id);
    if (!gone) return;
    URL.revokeObjectURL(gone.url);
    urls.current.delete(gone.url);
    const left = current.takes.filter((t) => t.id !== id);
    update(index, (w) => ({ ...w, takes: left, selected: left.at(-1)?.id ?? null }));
    if (!left.length) setStep(3);
  };

  /** The saved result of one piece of work; one entry per sentence it covers. */
  const resultsFor = (at: number, answers: Work["answers"]): SentenceResult[] => {
    const own = assessed(answers);
    const piece = work[at] ?? NO_WORK;
    if (!continuous) {
      const line = unit.lines[at];
      const heard = (piece.takes.find((t) => t.id === piece.selected) ?? piece.takes.at(-1))?.heard;
      const match =
        heard && heard !== "waiting" && "text" in heard
          ? contentMatch(line, heard.text).percent
          : null;
      return [
        {
          sentenceKey: sentenceKey(unit, line),
          recordings: piece.attempts,
          ...own,
          contentMatch: match,
        },
      ];
    }
    // Missed items belong to the sentences the learner marked; with none marked, to the whole run.
    return unit.lines.map((line, i) => {
      const applies = new Set(checksFor([line]).map(([id]) => id));
      const struggled = !flagged.length || flagged.includes(i);
      return {
        sentenceKey: sentenceKey(unit, line),
        recordings: i === 0 ? piece.attempts : 0, // one recording covers all sentences; count it once
        passed: own.passed.filter((c) => applies.has(c)),
        missed: struggled ? own.missed.filter((c) => applies.has(c)) : [],
        contentMatch: null,
      };
    });
  };

  const finish = (saved: Record<number, SentenceResult[]>) => {
    abandon();
    const unevaluated = [...touched]
      .filter((i) => !saved[i])
      .map((i) => [i, resultsFor(i, {})] as const);
    const everything: Record<number, SentenceResult[]> = {
      ...Object.fromEntries(unevaluated),
      ...saved,
    };
    const sentences = Object.entries(everything)
      .sort(([a], [b]) => Number(a) - Number(b))
      .flatMap(([, r]) => r);
    const request: ShadowingSessionRequest = {
      clientSessionId: newId(),
      unitId: unit.id,
      level: unit.level,
      mode,
      unitSentences: unit.lines.length,
      durationSeconds: Math.min(14400, Math.round((Date.now() - startedAt.current) / 1000)),
      sentences,
    };
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current.clear();
    setWork({});
    setFinished({
      request,
      matches: sentences.flatMap((s) => (s.contentMatch === null ? [] : [s.contentMatch])),
    });
    submit.mutate(request);
  };

  const evaluate = (answers: Work["answers"]) => {
    const saved = { ...results, [index]: resultsFor(index, answers) };
    setResults(saved);
    if (!continuous && index < unit.lines.length - 1) goSentence(index + 1);
    else finish(saved);
  };

  const restart = () => {
    abandon();
    setIndex(0);
    setStep(1);
    setWork({});
    setResults({});
    setFlagged([]);
    setFinished(null);
    startedAt.current = Date.now();
    submit.reset();
  };

  if (finished) {
    const done =
      finished.request.sentences.length === unit.lines.length
        ? [...(progress?.completedUnits ?? []), unit.id]
        : (progress?.completedUnits ?? []);
    return (
      <Completion
        unit={unit}
        request={finished.request}
        matches={finished.matches}
        saving={submit.isPending}
        saveError={submit.error}
        onRetrySave={() => submit.mutate(finished.request)}
        onRestart={restart}
        next={recommend(
          units,
          progress?.difficulties.filter((d) => d.unitId !== unit.id) ?? [],
          done,
          unit.id,
        )}
      />
    );
  }

  const changeMode = (m: Mode) => {
    abandon();
    onMode(m);
  };
  const allAnswered = checksFor(lines).every(([id]) => current.answers[id] !== undefined);
  const canStep = (s: Step) => !busy && (s !== 4 || !!take);

  return (
    <div className="mx-auto max-w-6xl space-y-4 @container">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label="Vị trí">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link
                to="/app/practice"
                className="inline-flex min-h-11 items-center gap-2 hover:text-primary"
              >
                <Mic aria-hidden className="h-4 w-4" /> Luyện tập
              </Link>
            </li>
            <ChevronRight aria-hidden className="h-4 w-4" />
            <li>
              <Link
                to="/app/shadowing"
                className="inline-flex min-h-11 items-center hover:text-primary"
              >
                Shadowing
              </Link>
            </li>
          </ol>
        </nav>
        <span className="ref-pill">{unit.level}</span>
        <div className="flex min-w-40 flex-1 items-center gap-3 text-sm">
          <div className="max-w-52 flex-1">
            <ProgressBar
              value={(practised / (continuous ? 1 : unit.lines.length)) * 100}
              label="Tiến độ bài shadowing"
            />
          </div>
          <span className="whitespace-nowrap">
            {continuous
              ? `Cả bài · ${unit.lines.length} câu`
              : `Câu ${index + 1} / ${unit.lines.length}`}
          </span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full"
              aria-label="Cài đặt Shadowing"
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-2 text-sm">
            <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
              Nhận dạng giọng nói
              <Switch
                checked={settings.recognition && recognitionSupported()}
                disabled={!recognitionSupported() || busy}
                onCheckedChange={() => toggle("recognition")}
              />
            </label>
            <p className="text-muted-foreground">
              {recognitionSupported()
                ? "Khi bật, trình duyệt chép lời bạn nói trong lúc ghi (chế độ theo câu) để so khớp nội dung. Nhiều trình duyệt gửi âm thanh tới máy chủ của hãng để làm việc này. Mặc định tắt."
                : "Trình duyệt này không có nhận dạng giọng nói."}
            </p>
            <p className="text-muted-foreground">
              Chưa có dịch vụ chấm phát âm nên không có điểm phát âm.
            </p>
          </PopoverContent>
        </Popover>
      </header>

      <div role="group" aria-label="Chế độ luyện" className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            className="ref-chip !min-h-11 disabled:opacity-45"
            aria-pressed={mode === m}
            disabled={practised > 0 && mode !== m}
            onClick={() => mode !== m && changeMode(m)}
          >
            {MODES[m].level}: {MODES[m].title}
          </button>
        ))}
        {practised > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={busy}
            onClick={() => finish(results)}
          >
            Kết thúc và lưu {practised} câu
          </Button>
        )}
      </div>

      <div className="grid items-start gap-4 @2xl:grid-cols-2">
        <Material
          unit={unit}
          line={shownLine}
          position={`Câu ${shownLine.index + 1} / ${unit.lines.length}`}
          player={player}
          state={continuous ? state : { ...state, index: 0 }}
          segments={segments}
          noAudio={noAudio}
          onFallback={segments[state.index]?.src ? () => setForceTts(true) : undefined}
          onPrevious={
            continuous
              ? state.index > 0
                ? () => player.seekSegment(state.index - 1)
                : null
              : index > 0
                ? () => goSentence(index - 1)
                : null
          }
          onNext={
            continuous
              ? state.index < unit.lines.length - 1
                ? () => player.seekSegment(state.index + 1)
                : null
              : index < unit.lines.length - 1
                ? () => goSentence(index + 1)
                : null
          }
          locked={busy}
          settings={settings}
          toggle={toggle}
          grammar={grammar}
          vocabulary={vocabulary}
        />

        <div className="min-w-0 space-y-4">
          <Stepper step={step} onStep={go} can={canStep} />
          <section aria-label="Thực hành" className="ref-card space-y-4 p-4">
            {step === 1 && (
              <>
                <h2 className="studio-head text-xl">1. Nghe mẫu</h2>
                <p className="text-sm text-muted-foreground">
                  {continuous
                    ? "Nghe trọn đoạn, có thể nghe nhiều lần và chỉnh chậm lại."
                    : "Nghe câu mẫu, có thể nghe nhiều lần và chỉnh chậm lại."}{" "}
                  Tắt “Câu tiếng Nhật” nếu muốn nghe trước khi đọc chữ.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-full"
                  disabled={noAudio}
                  onClick={() => player.play()}
                >
                  <Play className="mr-2 h-4 w-4" /> Phát mẫu
                </Button>
                <Button type="button" className="h-12 w-full rounded-full" onClick={() => go(2)}>
                  Tiếp: nói theo
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="studio-head text-xl">2. Nói theo</h2>
                <p className="text-sm text-muted-foreground">
                  {mode === "REPEAT"
                    ? "Audio phát xong sẽ tự dừng. Nhắc lại thành tiếng, nghe lại nếu cần."
                    : mode === "IMMEDIATE"
                      ? "Tập nói ngay khi mẫu vừa dứt. Lúc ghi âm cũng theo đúng nhịp này."
                      : "Nói đuổi theo mẫu, chậm hơn nửa nhịp. Nên đeo tai nghe để micro không thu lại tiếng mẫu."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-full"
                  disabled={noAudio}
                  onClick={playThenRepeat}
                >
                  <Play className="mr-2 h-4 w-4" />{" "}
                  {continuous ? "Tập nói đuổi (không ghi)" : "Nghe rồi nhắc lại"}
                </Button>
                {yourTurn > 0 && (
                  <p role="status" className="studio-note text-center font-bold">
                    Đến lượt bạn: nói thành tiếng ({yourTurn} giây)
                  </p>
                )}
                <Button type="button" className="h-12 w-full rounded-full" onClick={() => go(3)}>
                  Tiếp: ghi âm
                </Button>
                {mode === "REPEAT" && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 w-full"
                    onClick={() => go(5)}
                  >
                    Đã nhắc lại, đánh giá luôn (không ghi)
                  </Button>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="studio-head text-xl">3. Ghi âm</h2>
                {continuous && (
                  <p className="text-sm text-muted-foreground">
                    Bấm ghi: micro bật, mẫu phát cả bài và bạn nói đuổi theo. Ghi tự dừng sau khi
                    mẫu kết thúc. Nên đeo tai nghe.
                  </p>
                )}
                <RecordPanel
                  state={mic}
                  permission={permission}
                  leading={leading}
                  startLabel={
                    mode === "IMMEDIATE"
                      ? "Bấm để nghe mẫu rồi đọc ngay"
                      : continuous
                        ? "Bấm để ghi cùng cả bài"
                        : "Bấm để bắt đầu ghi âm"
                  }
                  maxSeconds={maxSeconds}
                  onStart={record}
                  onStop={() => {
                    recorder.stop();
                    player.stop();
                  }}
                  onCancel={abandon}
                />
                {!busy && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {take && (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => go(4)}
                      >
                        So sánh bản đã ghi
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11"
                      onClick={() => go(5)}
                    >
                      Bỏ qua ghi âm, tự đánh giá
                    </Button>
                  </div>
                )}
              </>
            )}

            {step === 4 && take && (
              <>
                <h2 className="studio-head text-xl">4. So sánh</h2>
                <ComparePanel
                  key={take.id}
                  lines={lines}
                  take={take}
                  takes={current.takes}
                  onSelect={(id) => update(index, (w) => ({ ...w, selected: id }))}
                  onDelete={remove}
                  onAgain={() => go(3)}
                  native={player}
                  nativeState={state}
                  nativeOff={noAudio}
                  furigana={settings.furigana}
                />
                {!continuous && take.heard && (
                  <Transcription line={unit.lines[index]} heard={take.heard} />
                )}
                <Button type="button" className="h-12 w-full rounded-full" onClick={() => go(5)}>
                  Tiếp: tự đánh giá
                </Button>
              </>
            )}

            {step === 5 && (
              <>
                <h2 className="studio-head text-xl">5. Tự đánh giá</h2>
                <p className="text-sm text-muted-foreground">
                  {current.attempts ? "Dựa vào bản ghi của bạn" : "Dựa vào lần bạn vừa nói"}, trả
                  lời trung thực. Đây là đánh giá của chính bạn, không phải điểm máy chấm.
                </p>
                <Checklist
                  items={checksFor(lines)}
                  answers={current.answers}
                  onAnswer={(id, ok) =>
                    update(index, (w) => ({ ...w, answers: { ...w.answers, [id]: ok } }))
                  }
                />
                {continuous && (
                  <fieldset className="space-y-1">
                    <legend className="text-sm font-semibold">
                      Câu nào bạn bị vấp? (không chọn: áp dụng cho cả bài)
                    </legend>
                    <div className="flex flex-wrap gap-1.5">
                      {unit.lines.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className="ref-chip !min-h-11"
                          aria-pressed={flagged.includes(i)}
                          onClick={() =>
                            setFlagged((f) =>
                              f.includes(i) ? f.filter((x) => x !== i) : [...f, i],
                            )
                          }
                        >
                          Câu {i + 1}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {!continuous && take?.heard && (
                  <Transcription line={unit.lines[index]} heard={take.heard} />
                )}
                <Button
                  type="button"
                  className="h-12 w-full rounded-full"
                  disabled={!allAnswered || take?.heard === "waiting"}
                  onClick={() => evaluate(current.answers)}
                >
                  {!continuous && index < unit.lines.length - 1
                    ? "Lưu đánh giá, sang câu tiếp"
                    : "Lưu đánh giá, hoàn thành"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 w-full"
                  disabled={take?.heard === "waiting"}
                  onClick={() => evaluate({})}
                >
                  Bỏ qua đánh giá
                </Button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
