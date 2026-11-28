import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Headphones, Info, PenLine } from "lucide-react";
import type { ListeningAttemptRequest } from "@/api/listening.api";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { Cat } from "@/components/ref/Cat";
import { Landscape } from "@/components/ref/Landscape";
import { ProgressBar } from "@/components/tango/shared";
import { Button } from "@/components/ui/button";
import { loadAllGrammar } from "@/data/japanese/grammar";
import { AUDIO } from "@/data/japanese/listening";
import {
  useListeningProgressQuery,
  useSubmitListeningMutation,
} from "@/hooks/queries/listening.queries";
import { useTangoLevelWordsQuery } from "@/hooks/queries/tango.queries";
import { useAudioPlayer, useJapaneseVoice } from "@/hooks/use-audio-player";
import { NO_VOICE } from "@/lib/audio/browser-output";
import { segmentsFor } from "@/lib/listening/content";
import {
  exercisesFor,
  grammarOf,
  linesOf,
  recommend,
  toAnswers,
  type Answer,
  type Submitted,
} from "@/lib/listening/session";
import type { Difficulty, Lesson } from "@/lib/listening/types";
import {
  ChooseCard,
  DialogueCard,
  DictationCard,
  FillCard,
  ListenButton,
  TYPE_INFO,
} from "./ExerciseCards";
import { Related, Results } from "./Results";
import { Transcript } from "./Transcript";

const LEVELS: [Difficulty, string][] = [
  ["EASY", "Dễ"],
  ["MEDIUM", "Vừa"],
  ["HARD", "Khó"],
];

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * One lesson from the first exercise to the results. `only` limits the run to those questions (review of mistakes).
 * shortcut: answers live in this component until the last exercise, so leaving mid-lesson discards them; save per
 * exercise if lessons get long.
 */
export function Workspace({
  lesson,
  lessons,
  only: initialOnly,
}: {
  lesson: Lesson;
  lessons: Lesson[];
  only?: string[];
}) {
  const [only, setOnly] = useState(initialOnly);
  const exercises = useMemo(() => exercisesFor(lesson, only), [lesson, only]);
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [chosen, setChosen] = useState<Difficulty | null>(null);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState<ListeningAttemptRequest | null>(null);
  const [forceTts, setForceTts] = useState(false);
  const startedAt = useRef(Date.now());
  const plays = useRef(0);

  const segments = useMemo(() => segmentsFor(lesson, AUDIO, forceTts), [lesson, forceTts]);
  const { player, state } = useAudioPlayer(segments);
  const voice = useJapaneseVoice();
  const allFiles = segments.every((s) => s.src);
  const credits = forceTts
    ? []
    : [
        ...new Set(
          [
            AUDIO.dialogues[lesson.id],
            ...lesson.lines.map((l) => AUDIO.sentences[l.sentenceId ?? `${lesson.id}:${l.index}`]),
          ].flatMap((a) => (a ? [`${a.source} (${a.license})`] : [])),
        ),
      ];
  const noAudio = voice === false && segments.every((s) => !s.src);
  const unplayable = ([from, to]: [number, number]) =>
    voice === false && segments.slice(from, to + 1).some((s) => !s.src);

  useEffect(() => {
    player.onStart = () => plays.current++;
    return () => void (player.onStart = null);
  }, [player]);

  const grammar =
    useQuery({ queryKey: ["grammar", "all"], queryFn: loadAllGrammar, staleTime: Infinity }).data ??
    [];
  const vocabulary = useTangoLevelWordsQuery("N5").data ?? [];
  const progress = useListeningProgressQuery().data;
  const submit = useSubmitListeningMutation();

  const exercise = exercises[at];
  const difficulty = chosen ?? exercise?.difficulty ?? "MEDIUM";
  const lines = exercise ? linesOf(exercise) : ([0, 0] as [number, number]);
  // Fill and dictation ask for the text itself, so that line stays hidden until answered.
  const masked =
    !answered && (exercise?.type === "fill" || exercise?.type === "dictation")
      ? [exercise.line]
      : [];

  const reset = useCallback(() => {
    player.stop();
    plays.current = 0;
    setChosen(null);
    setAnswered(false);
  }, [player]);

  const restart = (questions?: string[]) => {
    reset();
    setOnly(questions);
    setAt(0);
    setAnswers([]);
    setFinished(null);
    startedAt.current = Date.now();
    submit.reset();
  };

  const onSubmit = (results: Submitted[]) => {
    setAnswered(true);
    setAnswers((all) => [
      ...all,
      ...toAnswers(lesson, exercise, results, difficulty, Math.max(0, plays.current - 1)),
    ]);
  };

  const next = () => {
    if (at < exercises.length - 1) {
      reset();
      setAt(at + 1);
      return;
    }
    player.stop();
    const attempt: ListeningAttemptRequest = {
      clientAttemptId: newId(),
      lessonId: lesson.id,
      level: lesson.level,
      mode: only ? "REVIEW" : "FULL",
      durationSeconds: Math.min(14400, Math.round((Date.now() - startedAt.current) / 1000)),
      answers,
    };
    setFinished(attempt);
    submit.mutate(attempt);
  };

  if (finished) {
    // This run counts right away, even before the server has answered.
    const mine = {
      lessonId: lesson.id,
      lastAccuracy: 1,
      mistakes: [],
      lastCompletedAt: new Date().toISOString(),
    };
    const records = [...(progress?.lessons ?? []).filter((r) => r.lessonId !== lesson.id), mine];
    return (
      <Results
        lesson={lesson}
        attempt={finished}
        saving={submit.isPending}
        saveError={submit.error}
        onRetrySave={() => submit.mutate(finished)}
        onReview={restart}
        onRestart={() => restart()}
        next={recommend(
          lessons,
          records,
          progress?.weakWords.map((w) => w.ref),
          lesson.id,
        )}
        grammar={grammar}
        vocabulary={vocabulary}
      />
    );
  }

  const info = TYPE_INFO[exercise.type];
  const key = `${exercise.id}:${difficulty}:${at}`;
  const card = { lesson, difficulty, onSubmit };

  return (
    <div className="mx-auto max-w-7xl space-y-4 @container">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label="Vị trí" className="min-w-0">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link
                to="/app/listening"
                className="inline-flex min-h-11 items-center gap-2 hover:text-primary"
              >
                <Headphones aria-hidden className="h-4 w-4" /> Luyện nghe
              </Link>
            </li>
            <ChevronRight aria-hidden className="h-4 w-4" />
            <li>{lesson.topic}</li>
            <ChevronRight aria-hidden className="h-4 w-4" />
            <li aria-current="page" className="text-foreground">
              {lesson.title}
            </li>
          </ol>
        </nav>
        <span className="ref-pill">{lesson.level}</span>
        <div className="flex min-w-40 flex-1 items-center gap-3 text-sm">
          <span className="whitespace-nowrap">
            {only ? "Ôn câu sai" : "Bài tập"} {at + 1}/{exercises.length}
          </span>
          <div className="max-w-52 flex-1">
            <ProgressBar
              value={((at + (answered ? 1 : 0)) / exercises.length) * 100}
              label="Tiến độ bài nghe"
            />
          </div>
        </div>
      </header>

      <div className="grid items-start gap-4 @xl:grid-cols-2 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.95fr)]">
        <section aria-label="Bài nghe" className="ref-card min-w-0 space-y-3 p-4">
          <h1 className="studio-head flex items-center gap-2 text-xl">
            <Headphones aria-hidden className="h-5 w-5 shrink-0 text-primary" /> {lesson.title}
          </h1>
          <figure className="hidden @xl:block">
            <div className="relative h-44 overflow-hidden rounded-2xl bg-primary-soft">
              <Landscape variant="today" />
              <Cat pose="sit" width={130} className="absolute bottom-1 left-1/2 -translate-x-1/2" />
            </div>
          </figure>
          <p className="text-sm">{lesson.context}</p>
          <p className="text-xs text-muted-foreground">
            {credits.length > 0 && `Bản ghi âm: ${credits.join("; ")}. `}
            {!allFiles &&
              `${credits.length ? "Các câu còn lại dùng giọng" : "Giọng"} máy (TTS) của trình duyệt, chưa phải người bản ngữ đọc. Thời lượng là ước tính.`}
          </p>
          <AudioPlayer
            player={player}
            state={state}
            source={allFiles ? "file" : "tts"}
            unavailable={noAudio ? NO_VOICE : null}
            onFallback={segments[state.index]?.src ? () => setForceTts(true) : undefined}
          />
          <p className="flex items-start gap-2 border-t border-border pt-3 text-sm">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {lesson.tip} Hãy
            nghe cả đoạn trước khi trả lời.
          </p>
        </section>

        <section aria-label="Bài tập" className="ref-card min-w-0 space-y-4 p-4">
          <h2 className="studio-head flex items-center gap-2 text-xl">
            <PenLine aria-hidden className="h-5 w-5 shrink-0 text-primary" /> {info.title}
          </h2>
          <p className="text-sm text-muted-foreground">{info.instruction}</p>
          <div role="group" aria-label="Độ khó" className="flex justify-end gap-1.5">
            {LEVELS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="ref-chip !min-h-11 disabled:opacity-50"
                aria-pressed={difficulty === id}
                // The level is part of the result, so it is fixed once answered.
                disabled={answered && difficulty !== id}
                onClick={() => !answered && setChosen(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <ListenButton
            disabled={unplayable(lines)}
            label={lines[0] === lines[1] ? "Nghe câu này" : "Nghe cả đoạn"}
            onClick={() => player.play(...lines)}
          />
          {exercise.type === "choose" ? (
            <ChooseCard key={key} {...card} exercise={exercise} />
          ) : exercise.type === "fill" ? (
            <FillCard key={key} {...card} exercise={exercise} />
          ) : exercise.type === "dictation" ? (
            <DictationCard key={key} {...card} exercise={exercise} />
          ) : (
            <DialogueCard key={key} {...card} exercise={exercise} />
          )}
          {answered && (
            <>
              {exercise.type !== "dialogue" && (
                <Related
                  explain
                  grammarIds={grammarOf(lesson, exercise)}
                  words={exercise.words ?? []}
                  grammar={grammar}
                  vocabulary={vocabulary}
                />
              )}
              <Button type="button" className="h-12 w-full rounded-full" onClick={next}>
                {at === exercises.length - 1 ? "Hoàn thành bài" : "Bài tập tiếp theo"}
              </Button>
            </>
          )}
        </section>

        <Transcript
          lesson={lesson}
          segments={segments}
          player={player}
          state={state}
          masked={masked}
          disabled={noAudio}
        />
      </div>
    </div>
  );
}
