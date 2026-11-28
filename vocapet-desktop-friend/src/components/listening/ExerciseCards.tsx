import { useMemo, useRef, useState } from "react";
import { Check, Lightbulb, Volume2, X } from "lucide-react";
import { Ruby } from "@/components/kanji-map/Ruby";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseFurigana } from "@/lib/japanese/grammar/furigana";
import { sample } from "@/lib/japanese/practice";
import {
  gradeBlank,
  gradeDictation,
  skeleton,
  type DictationResult,
  type PartStatus,
} from "@/lib/listening/grade";
import type { Submitted } from "@/lib/listening/session";
import type {
  Blank,
  ChoiceQuestion,
  Difficulty,
  Lesson,
  Line,
  SourceExercise,
} from "@/lib/listening/types";

type Of<T extends SourceExercise["type"]> = Extract<SourceExercise, { type: T }>;

export interface CardProps {
  lesson: Lesson;
  difficulty: Difficulty;
  /** Called once, when the answer is checked. */
  onSubmit: (results: Submitted[]) => void;
}

/** Plays the exercise's audio; replaying is always allowed. */
export function ListenButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className="grid justify-items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary transition-transform hover:scale-105 disabled:opacity-50"
        aria-label={label}
      >
        <Volume2 className="h-7 w-7" />
      </button>
      <span className="text-xs text-muted-foreground">{disabled ? "Chưa có âm thanh" : label}</span>
    </div>
  );
}

/** Hint button; hard difficulty has none. */
function Hint({ difficulty, hint }: { difficulty: Difficulty; hint: string }) {
  const [open, setOpen] = useState(difficulty === "EASY");
  if (difficulty === "HARD")
    return <p className="text-xs text-muted-foreground">Mức Khó: không có gợi ý.</p>;
  return open ? (
    <p role="status" className="studio-note flex items-start gap-2 text-sm">
      <Lightbulb aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ochre" /> {hint}
    </p>
  ) : (
    <Button
      type="button"
      variant="outline"
      className="h-11 rounded-full"
      onClick={() => setOpen(true)}
    >
      <Lightbulb className="mr-2 h-4 w-4" /> Gợi ý
    </Button>
  );
}

function Verdict({ ok, children }: { ok: boolean; children?: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`studio-rise rounded-2xl border p-3 text-sm ${ok ? "border-primary bg-primary-soft" : "border-seal bg-peach"}`}
    >
      <p className={`flex items-center gap-2 font-bold ${ok ? "text-primary" : "text-seal-ink"}`}>
        {ok ? <Check aria-hidden className="h-4 w-4" /> : <X aria-hidden className="h-4 w-4" />}
        {ok ? "Chính xác" : "Chưa đúng"}
      </p>
      {children}
    </div>
  );
}

function CheckButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      className="h-12 w-full rounded-full"
      disabled={disabled}
      onClick={onClick}
    >
      <Check className="mr-2 h-4 w-4" /> Kiểm tra đáp án
    </Button>
  );
}

export const LineText = ({ line, furigana = true }: { line: Line; furigana?: boolean }) =>
  furigana && line.furigana ? (
    <Ruby segments={parseFurigana(line.furigana)} />
  ) : (
    <span lang="ja">{line.japanese}</span>
  );

/** Options in random order; easy mode keeps the answer and at most two others. */
function useOptions(q: ChoiceQuestion, difficulty: Difficulty) {
  return useMemo(() => {
    if (difficulty !== "EASY") return sample(q.options);
    return sample([
      q.answer,
      ...sample(
        q.options.filter((o) => o !== q.answer),
        2,
      ),
    ]);
  }, [q, difficulty]);
}

function Options({
  question,
  difficulty,
  picked,
  checked,
  onPick,
}: {
  question: ChoiceQuestion;
  difficulty: Difficulty;
  picked: string | null;
  checked: boolean;
  onPick: (option: string) => void;
}) {
  const options = useOptions(question, difficulty);
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 font-semibold">{question.question}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const right = checked && o === question.answer;
          const wrong = checked && o === picked && o !== question.answer;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={picked === o}
              disabled={checked}
              onClick={() => onPick(o)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-center text-sm transition-colors ${
                right
                  ? "border-primary bg-primary-soft font-bold"
                  : wrong
                    ? "studio-shake border-seal bg-peach"
                    : picked === o
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-sheet enabled:hover:bg-primary-soft/60"
              }`}
            >
              {right && <Check aria-label="Đáp án đúng" className="h-4 w-4 text-primary" />}
              {wrong && <X aria-label="Bạn chọn sai" className="h-4 w-4 text-seal-ink" />}
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ChooseCard({
  difficulty,
  onSubmit,
  exercise,
}: CardProps & { exercise: Of<"choose"> }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const ok = picked === exercise.answer;
  return (
    <div className="space-y-4">
      <Options
        question={exercise}
        difficulty={difficulty}
        picked={picked}
        checked={checked}
        onPick={setPicked}
      />
      <Hint difficulty={difficulty} hint={exercise.hint} />
      {checked ? (
        <Verdict ok={ok}>
          <p className="mt-1">{exercise.explain}</p>
        </Verdict>
      ) : (
        <CheckButton
          disabled={picked === null}
          onClick={() => {
            setChecked(true);
            onSubmit([{ correct: ok, words: exercise.words, grammar: exercise.grammar }]);
          }}
        />
      )}
    </div>
  );
}

/** Easy mode: the right text among two others of the same kind. */
function bankFor(blank: Blank, lesson: Lesson): string[] {
  const pools: Record<Blank["kind"], string[]> = {
    particle: ["は", "が", "を", "に", "で", "へ", "と", "も"],
    verb: ["ください", "います", "あります", "します", "行きます"],
    word: [
      ...lesson.exercises.flatMap((e) =>
        e.type === "dialogue" ? e.questions.flatMap((q) => q.words ?? []) : (e.words ?? []),
      ),
      "後ろ",
      "友達",
    ],
  };
  const others = [...new Set(pools[blank.kind])].filter((w) => w !== blank.text);
  return sample([blank.text, ...sample(others, 2)]);
}

const KIND: Record<Blank["kind"], string> = {
  word: "từ vựng",
  particle: "trợ từ",
  verb: "dạng động từ / mẫu câu",
};

export function FillCard({
  lesson,
  difficulty,
  onSubmit,
  exercise,
}: CardProps & { exercise: Of<"fill"> }) {
  const line = lesson.lines[exercise.line];
  const { blanks } = exercise;
  const [values, setValues] = useState<string[]>(() => blanks.map(() => ""));
  const [checked, setChecked] = useState<boolean[] | null>(null);
  const banks = useMemo(() => blanks.map((b) => bankFor(b, lesson)), [blanks, lesson]);
  // The sentence around the blanks: blanks.length + 1 pieces.
  const pieces = useMemo(() => {
    let rest = line.japanese;
    const out = blanks.map((b) => {
      const at = rest.indexOf(b.text);
      const before = rest.slice(0, at);
      rest = rest.slice(at + b.text.length);
      return before;
    });
    return [...out, rest];
  }, [line, blanks]);
  const set = (i: number, v: string) => setValues((all) => all.map((x, j) => (j === i ? v : x)));
  const submit = () => {
    if (checked || values.some((v) => !v.trim())) return;
    const result = blanks.map((b, i) => gradeBlank(line, b, values[i]));
    setChecked(result);
    onSubmit([
      { correct: result.every(Boolean), words: exercise.words, grammar: exercise.grammar },
    ]);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p lang="ja" className="jp-serif text-center text-2xl !leading-[2.4]">
        {pieces.map((piece, i) => (
          <span key={i}>
            {piece}
            {i < blanks.length && (
              <input
                lang="ja"
                value={values[i]}
                onChange={(e) => set(i, e.target.value)}
                // Enter that confirms an IME conversion must not submit.
                onKeyDown={(e) =>
                  e.key === "Enter" && e.nativeEvent.isComposing && e.preventDefault()
                }
                readOnly={difficulty === "EASY" || !!checked}
                aria-label={`Chỗ trống ${i + 1} (${KIND[blanks[i].kind]})`}
                aria-invalid={checked ? !checked[i] : undefined}
                autoComplete="off"
                style={{ width: `${Math.max(4, blanks[i].text.length + 2)}em` }}
                className={`mx-1 max-w-full border-b-2 bg-transparent text-center ${
                  !checked
                    ? "border-primary"
                    : checked[i]
                      ? "border-primary bg-primary-soft"
                      : "border-seal bg-peach"
                }`}
              />
            )}
          </span>
        ))}
      </p>
      {difficulty === "EASY" &&
        !checked &&
        blanks.map((b, i) => (
          <div
            key={i}
            role="group"
            aria-label={`Chọn cho chỗ trống ${i + 1}`}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-xs text-muted-foreground">Ô {i + 1}</span>
            {banks[i].map((w) => (
              <button
                key={w}
                type="button"
                lang="ja"
                className="ref-chip !min-h-11 !text-base"
                aria-pressed={values[i] === w}
                onClick={() => set(i, w)}
              >
                {w}
              </button>
            ))}
          </div>
        ))}
      <Hint difficulty={difficulty} hint={exercise.hint} />
      {checked ? (
        <Verdict ok={checked.every(Boolean)}>
          <ul className="mt-1 space-y-1">
            {blanks.map((b, i) => (
              <li key={i}>
                Ô {i + 1} ({KIND[b.kind]}):{" "}
                {checked[i] ? (
                  "đúng, "
                ) : (
                  <>
                    bạn viết <del lang="ja">{values[i]}</del>, đáp án là{" "}
                  </>
                )}
                <b lang="ja">{b.text}</b>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-lg">
            <LineText line={line} />
          </p>
          <p className="mt-1">{exercise.explain}</p>
        </Verdict>
      ) : (
        <Button
          type="submit"
          className="h-12 w-full rounded-full"
          disabled={values.some((v) => !v.trim())}
        >
          <Check className="mr-2 h-4 w-4" /> Kiểm tra đáp án
        </Button>
      )}
    </form>
  );
}

const PART: Record<Exclude<PartStatus, "ok">, string> = {
  missing: "Thiếu",
  particle: "Sai trợ từ",
  spelling: "Sai chính tả",
  wrong: "Sai từ",
};

export function DictationCard({
  lesson,
  difficulty,
  onSubmit,
  exercise,
}: CardProps & { exercise: Of<"dictation"> }) {
  const line = lesson.lines[exercise.line];
  const [value, setValue] = useState("");
  const [result, setResult] = useState<DictationResult | null>(null);
  const done = useRef(false);
  const submit = () => {
    if (done.current || !value.trim()) return;
    done.current = true;
    const graded = gradeDictation(line, value, exercise.accept);
    setResult(graded);
    onSubmit([{ correct: graded.correct, words: exercise.words, grammar: exercise.grammar }]);
  };
  const problems = result?.parts.filter((p) => p.status !== "ok") ?? [];

  return (
    <div className="space-y-4">
      {difficulty === "EASY" && !result && (
        <p className="text-center">
          <span className="block text-xs text-muted-foreground">Khung câu (chữ đầu mỗi từ)</span>
          <span lang="ja" className="text-lg">
            {skeleton(line)}
          </span>
        </p>
      )}
      <Textarea
        lang="ja"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        readOnly={!!result}
        maxLength={200}
        placeholder="ここに入力してください"
        aria-label="Chép lại câu bạn nghe được"
        className="rounded-2xl bg-sheet text-lg md:text-lg"
      />
      <Hint difficulty={difficulty} hint={exercise.hint} />
      {result ? (
        <Verdict ok={result.correct}>
          {!result.correct && (
            <div className="mt-2 space-y-2">
              <p lang="ja" className="flex flex-wrap gap-1 text-lg" aria-label="So sánh từng từ">
                {result.parts.map((p, i) => (
                  <span
                    key={i}
                    className={
                      p.status === "ok"
                        ? ""
                        : p.status === "missing"
                          ? "rounded border-2 border-dashed border-seal px-1"
                          : "rounded bg-butter px-1 underline decoration-wavy"
                    }
                  >
                    {p.text}
                  </span>
                ))}
              </p>
              <ul>
                {problems.map((p, i) => (
                  <li key={i}>
                    {PART[p.status as Exclude<PartStatus, "ok">]}: <b lang="ja">{p.text}</b>
                  </li>
                ))}
                {result.extra && (
                  <li>
                    Thừa: <del lang="ja">{result.extra}</del>
                  </li>
                )}
              </ul>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Transcript đúng</p>
          <p className="text-lg">
            <LineText line={line} />
          </p>
          <p>{line.meaningVi}</p>
          <p className="mt-1">{exercise.explain}</p>
        </Verdict>
      ) : (
        <CheckButton disabled={!value.trim()} onClick={submit} />
      )}
    </div>
  );
}

export function DialogueCard({
  difficulty,
  onSubmit,
  exercise,
}: CardProps & { exercise: Of<"dialogue"> }) {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const answered = exercise.questions.filter((q) => picks[q.id]).length;
  const right = exercise.questions.filter((q) => picks[q.id] === q.answer).length;
  return (
    <div className="space-y-5">
      <Hint difficulty={difficulty} hint={exercise.hint} />
      {exercise.questions.map((q) => (
        <div key={q.id} className="space-y-2 border-b border-border pb-4">
          <Options
            question={q}
            difficulty={difficulty}
            picked={picks[q.id] ?? null}
            checked={checked}
            onPick={(o) => setPicks((p) => ({ ...p, [q.id]: o }))}
          />
          {checked && (
            <Verdict ok={picks[q.id] === q.answer}>
              <p className="mt-1">{q.explain}</p>
            </Verdict>
          )}
        </div>
      ))}
      {checked ? (
        <p role="status" className="text-center font-bold">
          Đúng {right}/{exercise.questions.length} câu về đoạn hội thoại
        </p>
      ) : (
        <>
          <p className="text-center text-xs text-muted-foreground">
            Đã trả lời {answered}/{exercise.questions.length}. Trả lời hết các câu rồi mới kiểm tra.
          </p>
          <CheckButton
            disabled={answered < exercise.questions.length}
            onClick={() => {
              setChecked(true);
              onSubmit(
                exercise.questions.map((q) => ({
                  sub: q.id,
                  correct: picks[q.id] === q.answer,
                  words: q.words,
                  grammar: q.grammar,
                })),
              );
            }}
          />
        </>
      )}
    </div>
  );
}
