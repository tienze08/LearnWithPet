import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarCheck, Check, ClipboardCheck, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyBlock, ErrorBlock, LoadingBlock, ProgressBar } from "@/components/tango/shared";
import { QuestionCard } from "@/components/learning-path/QuestionCard";
import {
  checkFeasibility,
  getPlacement,
  submitPlacement,
  type PathGoal,
  type PlacementAnswer,
  type PlacementResult,
  type ProfileRequest,
  type Skill,
  type StartingLevel,
} from "@/api/learning-path.api";
import {
  usePathPreviewQuery,
  usePathProfileQuery,
  usePathStatusQuery,
  useSaveProfileMutation,
} from "@/hooks/queries/learning-path.queries";
import { usePathContent } from "@/lib/learning-path/content";
import { useMarks } from "@/lib/japanese/grammar/progress";
import type { Question } from "@/lib/learning-path/questions";
import {
  browserTimezone as timezone,
  daysUntil,
  formatViDate,
  localDate,
} from "@/lib/learning-path/dates";

export const Route = createFileRoute("/app/path/setup")({ component: PathSetup });

const LEVELS: { value: StartingLevel; label: string; note: string }[] = [
  { value: "BEGINNER", label: "Chưa biết tiếng Nhật", note: "Bắt đầu từ bảng chữ cái Hiragana" },
  { value: "STUDYING", label: "Đang học N5", note: "Có bài kiểm tra ngắn để bỏ qua phần đã biết" },
  {
    value: "KNOWS_LEVEL",
    label: "Đã biết N5",
    note: "Có bài kiểm tra ngắn để bỏ qua phần đã biết",
  },
];
const GOALS: { value: PathGoal; label: string }[] = [
  { value: "PASS_JLPT", label: "Đỗ JLPT N5" },
  { value: "BASIC_CONVERSATION", label: "Giao tiếp cơ bản" },
  { value: "PREPARE_NEXT_LEVEL", label: "Chuẩn bị lên N4" },
];
/** Shown but not selectable until their content exists. */
const GOALS_SOON = ["Đỗ JLPT N4", "Đỗ JLPT N3"];
const MINUTES = [15, 30, 45, 60];
const DAYS = [3, 5, 6, 7];
const DEADLINES = [30, 60, 90];
/** Placement sections, in the order the test asks them. */
const SKILLS: { skill: Skill; label: string }[] = [
  { skill: "HIRAGANA", label: "Hiragana" },
  { skill: "KATAKANA", label: "Katakana" },
  { skill: "GRAMMAR", label: "Ngữ pháp" },
  { skill: "VOCAB", label: "Từ vựng" },
  { skill: "KANJI", label: "Kanji" },
];

type Step =
  | "level"
  | "goal"
  | "minutes"
  | "days"
  | "deadline"
  | "known"
  | "placement-intro"
  | "placement"
  | "placement-result"
  | "preview";

/** Unfinished onboarding, kept in this browser so leaving halfway resumes at the same step. */
type Saved = {
  step: Step;
  draft: Partial<ProfileRequest>;
  known: Skill[];
  answers: PlacementAnswer[];
  result: PlacementResult | null;
};
// shortcut: per-browser only; move to the backend if onboarding must resume across devices.
const SAVED_KEY = "vocapet.path-setup.v1";

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    // A deadline that has passed since is dropped; the learner picks a new one.
    if (s.draft.targetDate && daysUntil(s.draft.targetDate) < 1) delete s.draft.targetDate;
    return s;
  } catch {
    return null;
  }
}
function storeSaved(s: Saved | null) {
  try {
    if (s) localStorage.setItem(SAVED_KEY, JSON.stringify(s));
    else localStorage.removeItem(SAVED_KEY);
  } catch {
    // storage blocked: onboarding still works, it just won't resume
  }
}

const skillOf = (a: { itemType: string; itemId: string }): Skill =>
  a.itemType === "KANA"
    ? a.itemId.startsWith("katakana:")
      ? "KATAKANA"
      : "HIRAGANA"
    : (a.itemType as Skill);

function PathSetup() {
  const status = usePathStatusQuery();
  const existing = usePathProfileQuery(status.data?.enabled === true);
  const editing = !!existing.data;
  const navigate = useNavigate();
  const save = useSaveProfileMutation();
  const [saved] = useState(loadSaved);
  const [step, setStep] = useState<Step>(saved?.step ?? "level");
  const [draft, setDraft] = useState<Partial<ProfileRequest>>(saved?.draft ?? {});
  const [known, setKnown] = useState<Skill[]>(saved?.known ?? []);
  const [answers, setAnswers] = useState<PlacementAnswer[]>(saved?.answers ?? []);
  const [result, setResult] = useState<PlacementResult | null>(saved?.result ?? null);

  useEffect(() => {
    if (!existing.data) return;
    // Editing an existing plan never resumes a stale draft.
    setDraft(existing.data);
    setStep("level");
    storeSaved(null);
  }, [existing.data]);

  useEffect(() => {
    if (!editing) storeSaved({ step, draft, known, answers, result });
  }, [editing, step, draft, known, answers, result]);

  if (status.isPending || (status.data?.enabled && existing.isPending))
    return <LoadingBlock rows={3} />;
  if (status.isError) return <ErrorBlock error={status.error} onRetry={() => status.refetch()} />;
  if (!status.data?.enabled)
    return <EmptyBlock title="Lộ trình học chưa được bật cho tài khoản này" />;

  const tests = !editing && !!draft.currentLevel && draft.currentLevel !== "BEGINNER";
  // Once the placement is submitted it is final (it already wrote progress), so its steps leave the flow.
  const flow: Step[] = [
    "level",
    "goal",
    "minutes",
    "days",
    "deadline",
    ...(tests
      ? result
        ? (["known", "placement-result"] as Step[])
        : (["known", "placement-intro", "placement"] as Step[])
      : []),
    "preview",
  ];
  const at = flow.indexOf(step);
  const nextOf = (s: Step) => flow[flow.indexOf(s) + 1] ?? "preview";
  const back = () => {
    if (step === "placement-result") return setStep("known");
    // From the preview, never back into a placement that was skipped (it would submit an empty test).
    if (step === "preview" && tests) return setStep(result ? "placement-result" : "known");
    if (at > 0) setStep(flow[at - 1]);
  };

  const set = (patch: Partial<ProfileRequest>, from: Step) => {
    setDraft((d) => ({ ...d, ...patch }));
    // The next step depends on the level just picked, so it is worked out from the patched draft.
    if (from === "deadline") {
      const lvl = patch.currentLevel ?? draft.currentLevel;
      setStep(
        !editing && lvl && lvl !== "BEGINNER" ? (result ? "placement-result" : "known") : "preview",
      );
    } else setStep(nextOf(from));
  };
  const full = (): ProfileRequest => ({
    currentLevel: draft.currentLevel ?? "BEGINNER",
    goal: draft.goal ?? "PASS_JLPT",
    minutesPerDay: draft.minutesPerDay ?? 30,
    daysPerWeek: draft.daysPerWeek ?? 5,
    targetDate: draft.targetDate ?? localDate(60),
    timezone: timezone(),
  });

  const finish = () =>
    save.mutate(full(), {
      onSuccess: () => {
        storeSaved(null);
        navigate({ to: "/app" });
      },
    });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        {at > 0 && step !== "placement" && (
          <button
            type="button"
            aria-label="Quay lại"
            onClick={back}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {status.data.path?.title}
          </p>
          <h1 className="text-2xl font-bold">
            {editing ? "Sửa thiết lập lộ trình" : "Thiết lập lộ trình học"}
          </h1>
        </div>
        {editing && (
          <Link to="/app" className="text-sm font-semibold text-primary hover:underline">
            Huỷ
          </Link>
        )}
      </div>
      {at >= 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">
            Bước {at + 1}/{flow.length}
          </p>
          <ProgressBar
            value={Math.round(((at + 1) / flow.length) * 100)}
            label={`Bước ${at + 1}/${flow.length}`}
          />
        </div>
      )}

      {step === "level" && (
        <Choice
          title="Trình độ hiện tại của bạn?"
          options={LEVELS.map((l) => ({ key: l.value, label: l.label, note: l.note }))}
          selected={draft.currentLevel}
          onPick={(v) => {
            const lvl = v as StartingLevel;
            // Pre-select what this level usually knows; the learner adjusts it on the "known" step.
            if (!known.length && lvl !== "BEGINNER")
              setKnown(
                lvl === "KNOWS_LEVEL" ? SKILLS.map((s) => s.skill) : ["HIRAGANA", "KATAKANA"],
              );
            set({ currentLevel: lvl }, "level");
          }}
        />
      )}
      {step === "level" && !editing && (
        <div className="space-y-1 border-t border-border/70 pt-4">
          <Button
            variant="ghost"
            disabled={save.isPending}
            onClick={async () => {
              // Defaults: beginner, 30 min/day, 5 days/week, 60 days, editable later from Today. If 60 days do not
              // fit (the path includes both kana scripts), the deadline moves to the first date that does, and we say so.
              const body: ProfileRequest = {
                currentLevel: "BEGINNER",
                goal: "PASS_JLPT",
                minutesPerDay: 30,
                daysPerWeek: 5,
                targetDate: localDate(60),
                timezone: timezone(),
              };
              const f = await checkFeasibility(body).catch(() => null);
              if (f && !f.feasible) body.targetDate = f.suggestedTargetDate;
              save.mutate(body, {
                onSuccess: () => {
                  storeSaved(null);
                  if (f && !f.feasible)
                    toast.info(
                      `60 ngày chưa đủ với 30 phút/ngày, nên hạn chót được đặt là ${formatViDate(body.targetDate)}. Bạn sửa lại được trong thiết lập.`,
                    );
                  navigate({ to: "/app" });
                },
              });
            }}
          >
            {save.isPending ? "Đang tạo kế hoạch…" : "Bỏ qua, dùng mặc định"}
          </Button>
          <p className="px-4 text-xs text-muted-foreground">
            Mới bắt đầu · 30 phút/ngày · 5 ngày/tuần · 60 ngày. Bạn sửa lại được bất cứ lúc nào.
          </p>
          {save.isError && <ErrorBlock error={save.error} />}
        </div>
      )}
      {step === "goal" && (
        <Choice
          title="Mục tiêu của bạn?"
          options={[
            ...GOALS.map((g) => ({ key: g.value as string, label: g.label })),
            ...GOALS_SOON.map((label) => ({ key: label, label, note: "Sắp có", disabled: true })),
          ]}
          selected={draft.goal}
          onPick={(v) => set({ goal: v as PathGoal }, "goal")}
        />
      )}
      {step === "minutes" && (
        <Choice
          title="Mỗi ngày bạn học được bao lâu?"
          options={MINUTES.map((m) => ({ key: String(m), label: `${m} phút` }))}
          selected={draft.minutesPerDay ? String(draft.minutesPerDay) : undefined}
          onPick={(v) => set({ minutesPerDay: Number(v) }, "minutes")}
        />
      )}
      {step === "days" && (
        <Choice
          title="Mỗi tuần học mấy ngày?"
          options={DAYS.map((d) => ({
            key: String(d),
            label: `${d} ngày`,
            note:
              d === 3
                ? "Thứ 2, 4, 6"
                : d === 5
                  ? "Thứ 2 đến thứ 6"
                  : d === 6
                    ? "Thứ 2 đến thứ 7"
                    : "Mỗi ngày",
          }))}
          selected={draft.daysPerWeek ? String(draft.daysPerWeek) : undefined}
          onPick={(v) => set({ daysPerWeek: Number(v) }, "days")}
        />
      )}
      {step === "deadline" && (
        <DeadlineStep value={draft.targetDate} onPick={(d) => set({ targetDate: d }, "deadline")} />
      )}

      {step === "known" && (
        <KnownStep
          value={known}
          onChange={setKnown}
          // Placement already done: changing this only goes back to its result.
          onNext={() =>
            setStep(result ? "placement-result" : known.length ? "placement-intro" : "preview")
          }
        />
      )}

      {step === "placement-intro" && (
        <div className="space-y-4 rounded-3xl bg-card p-6">
          <h2 className="text-xl font-bold">Kiểm tra nhanh trình độ</h2>
          <p className="text-sm text-muted-foreground">
            Chỉ hỏi phần bạn đã chọn (
            {SKILLS.filter((s) => known.includes(s.skill))
              .map((s) => s.label)
              .join(", ")}
            ), theo thứ tự lộ trình. Mỗi phần dừng ở câu sai đầu tiên. Phần bạn đã biết sẽ chuyển
            sang ôn tập thay vì học lại từ đầu.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStep("placement")}>
              {answers.length ? "Làm tiếp bài kiểm tra" : "Làm bài kiểm tra"}
            </Button>
            <Button variant="outline" onClick={() => setStep("preview")}>
              Bỏ qua
            </Button>
          </div>
        </div>
      )}
      {step === "placement" && (
        <PlacementTest
          known={known}
          answers={answers}
          onAnswer={(a) => setAnswers((list) => [...list, a])}
          onDone={(r) => {
            setResult(r);
            setAnswers([]);
            setStep("placement-result");
          }}
        />
      )}
      {step === "placement-result" && result && (
        <PlacementResultView result={result} onNext={() => setStep("preview")} />
      )}

      {step === "preview" && (
        <PreviewStep
          draft={full()}
          editing={editing}
          saving={save.isPending}
          saveError={save.error}
          onPatch={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onConfirm={finish}
          onEdit={() => setStep("minutes")}
        />
      )}
    </div>
  );
}

function Choice({
  title,
  options,
  selected,
  onPick,
}: {
  title: string;
  options: { key: string; label: string; note?: string; disabled?: boolean }[];
  selected?: string;
  onPick: (key: string) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-xl font-bold">{title}</legend>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={selected === o.key}
          disabled={o.disabled}
          onClick={() => onPick(o.key)}
          className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selected === o.key ? "bg-primary-soft text-primary-ink" : "bg-surface-2 hover:bg-primary-soft disabled:hover:bg-surface-2"}`}
        >
          <span className="flex-1">
            <span className="block font-semibold">{o.label}</span>
            {o.note && <span className="block text-xs text-muted-foreground">{o.note}</span>}
          </span>
          {selected === o.key && <Check aria-hidden className="h-5 w-5" />}
        </button>
      ))}
    </fieldset>
  );
}

function DeadlineStep({ value, onPick }: { value?: string; onPick: (date: string) => void }) {
  const [custom, setCustom] = useState(value ?? localDate(45));
  return (
    <div className="space-y-3">
      <Choice
        title="Bạn muốn hoàn thành trong bao lâu?"
        options={DEADLINES.map((d) => ({
          key: localDate(d),
          label: `${d} ngày`,
          note: `Đến ${formatViDate(localDate(d))}`,
        }))}
        selected={value}
        onPick={onPick}
      />
      <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-surface-2 p-4">
        <label className="flex-1 text-sm font-semibold">
          Hoặc chọn ngày
          <Input
            type="date"
            min={localDate(1)}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="mt-1"
          />
        </label>
        <Button
          variant="outline"
          disabled={!custom || daysUntil(custom) < 1}
          onClick={() => onPick(custom)}
        >
          Chọn ngày này
        </Button>
      </div>
    </div>
  );
}

/** "What do you already know?" Decides which placement sections are asked. */
function KnownStep({
  value,
  onChange,
  onNext,
}: {
  value: Skill[];
  onChange: (v: Skill[]) => void;
  onNext: () => void;
}) {
  const toggle = (s: Skill) =>
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  return (
    <div className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="mb-1 text-xl font-bold">Bạn đã học những phần nào?</legend>
        <p className="mb-3 text-sm text-muted-foreground">
          Chọn tất cả phần bạn đã từng học. Bài kiểm tra chỉ hỏi những phần này.
        </p>
        {SKILLS.map(({ skill, label }) => {
          const on = value.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(skill)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition-colors ${on ? "bg-primary-soft text-primary-ink" : "bg-surface-2 hover:bg-primary-soft"}`}
            >
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
              >
                {on && <Check className="h-3.5 w-3.5" />}
              </span>
              {label}
            </button>
          );
        })}
      </fieldset>
      <Button size="lg" className="w-full sm:w-auto" onClick={onNext}>
        {value.length ? "Tiếp tục" : "Chưa học phần nào, bỏ qua kiểm tra"}
      </Button>
    </div>
  );
}

/** Asks each chosen section in curriculum order and stops that section at its first wrong item. */
function PlacementTest({
  known,
  answers,
  onAnswer,
  onDone,
}: {
  known: Skill[];
  answers: PlacementAnswer[];
  onAnswer: (a: PlacementAnswer) => void;
  onDone: (r: PlacementResult) => void;
}) {
  const learned = useMarks("learned");
  const hints = useMemo(() => [...learned], [learned]);
  const placement = useQuery({
    queryKey: ["path", "placement", hints],
    queryFn: () => getPlacement(hints),
    staleTime: Infinity,
  });
  const { content, isLoading, error, refetch } = usePathContent();
  const [qIndex, setQIndex] = useState(0);
  const [itemRight, setItemRight] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const items = useMemo(() => {
    if (!placement.data) return [];
    const d = placement.data;
    return [
      ...[...d.hiragana, ...d.katakana].map((id) => ({ itemType: "KANA" as const, itemId: id })),
      ...d.grammar.map((id) => ({ itemType: "GRAMMAR" as const, itemId: id })),
      ...d.vocab.map((id) => ({ itemType: "VOCAB" as const, itemId: id })),
      ...d.kanji.map((id) => ({ itemType: "KANJI" as const, itemId: id })),
    ].filter((i) => known.includes(skillOf(i)));
  }, [placement.data, known]);

  if (placement.isPending || isLoading) return <LoadingBlock rows={3} />;
  if (placement.isError || error || !content)
    return (
      <ErrorBlock
        error={placement.error ?? error}
        onRetry={() => {
          placement.refetch();
          refetch();
        }}
      />
    );

  const stopped = new Set(answers.filter((a) => !a.correct).map(skillOf));
  const remaining = items.filter(
    (i) =>
      !stopped.has(skillOf(i)) &&
      !answers.some((a) => a.itemType === i.itemType && a.itemId === i.itemId),
  );
  const current = remaining[0];
  // Sections stop early, so the total is an upper bound that shrinks as sections end.
  const max = answers.length + remaining.length;

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      onDone(await submitPlacement(answers));
    } catch (e) {
      setSubmitError(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!current) {
    return (
      <div className="space-y-3 rounded-3xl bg-card p-6 text-center">
        <p className="font-bold">{submitting ? "Đang lưu kết quả…" : "Đã xong bài kiểm tra"}</p>
        {submitError != null && <ErrorBlock error={submitError} onRetry={submit} />}
        {!submitting && submitError == null && <Button onClick={submit}>Xem kết quả</Button>}
      </div>
    );
  }

  const questions: Question[] = content.questionsFor(current.itemType, current.itemId);
  const q = questions[qIndex];
  const record = (correct: boolean) => {
    onAnswer({ ...current, correct });
    setQIndex(0);
    setItemRight(true);
  };
  const section = SKILLS.find((s) => s.skill === skillOf(current))?.label;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-bold">
            Câu {answers.length + 1} / {max}
            <span className="ml-2 font-semibold text-muted-foreground">· {section}</span>
          </span>
          <button
            type="button"
            disabled={submitting}
            className="min-h-11 text-muted-foreground hover:text-foreground"
            onClick={submit}
          >
            Dừng và xem kết quả
          </button>
        </div>
        <ProgressBar
          value={(answers.length / Math.max(1, max)) * 100}
          label={`Đã làm ${answers.length} trên tối đa ${max} câu`}
        />
        {submitError != null && <ErrorBlock error={submitError} onRetry={submit} />}
      </div>
      {q ? (
        <QuestionCard
          q={q}
          nextLabel={qIndex < questions.length - 1 ? "Câu tiếp" : "Tiếp tục"}
          onAnswer={(c) => setItemRight((r) => r && c)}
          onNext={() =>
            qIndex < questions.length - 1 ? setQIndex((i) => i + 1) : record(itemRight)
          }
        />
      ) : (
        <Button onClick={() => record(false)}>Bỏ qua câu này</Button>
      )}
    </div>
  );
}

/** Per-skill outcome of the placement test, with what it means for the path. */
function PlacementResultView({ result, onNext }: { result: PlacementResult; onNext: () => void }) {
  const verdict = (s: PlacementResult["sections"][number]) =>
    s.asked === 0
      ? "Không kiểm tra · học từ đầu"
      : s.known >= s.total
        ? "Đã nắm cả phần"
        : s.known > 0
          ? `Đã biết ${s.known}/${s.total}`
          : "Học từ đầu";
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Kết quả kiểm tra</h2>
        <p className="text-sm text-muted-foreground">
          Phần bạn đã biết được bỏ qua trong bài mới và sẽ được ôn lại sớm để xác nhận. Nếu ôn sai,
          hệ thống tự đưa chúng về lại lộ trình.
        </p>
      </div>
      <ul className="divide-y divide-border/70 rounded-2xl bg-card">
        {result.sections.map((s) => {
          const pct = s.total ? Math.round((s.known / s.total) * 100) : 0;
          return (
            <li key={s.skill} className="space-y-2 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{s.label}</span>
                <span className="text-sm text-muted-foreground">{verdict(s)}</span>
              </div>
              <ProgressBar value={pct} label={`${s.label}: đã biết ${pct}%`} />
              {s.asked > 0 && (
                <p className="text-xs text-muted-foreground">
                  Trả lời đúng {s.correct}/{s.asked} câu
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <Button size="lg" className="w-full sm:w-auto" onClick={onNext}>
        Xem lộ trình của bạn
      </Button>
    </div>
  );
}

const GOAL_LABEL: Record<PathGoal, string> = {
  PASS_JLPT: "Đỗ JLPT N5",
  BASIC_CONVERSATION: "Giao tiếp cơ bản",
  PREPARE_NEXT_LEVEL: "Chuẩn bị lên N4",
};

/** The path this draft would give (same projection as the roadmap). Confirming saves the profile and starts it. */
function PreviewStep({
  draft,
  editing,
  saving,
  saveError,
  onPatch,
  onConfirm,
  onEdit,
}: {
  draft: ProfileRequest;
  editing: boolean;
  saving: boolean;
  saveError: unknown;
  onPatch: (patch: Partial<ProfileRequest>) => void;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  const preview = usePathPreviewQuery(draft);
  const [allStages, setAllStages] = useState(false);

  if (preview.isPending) return <LoadingBlock rows={4} />;
  if (preview.isError)
    return (
      <div className="space-y-3">
        <ErrorBlock error={preview.error} onRetry={() => preview.refetch()} />
        <Button variant="outline" onClick={onEdit}>
          Sửa thiết lập
        </Button>
      </div>
    );

  const p = preview.data;
  const f = p.feasibility;
  const hours = Math.round((f.studyDaysNeeded * draft.minutesPerDay) / 60);
  const stages = allStages ? p.stages : p.stages.slice(0, 4);
  const reviewDays = p.days.filter((d) => d.kind === "UNIT_REVIEW").length;
  const testDays = p.days.filter((d) => d.kind === "WEEKLY_TEST").length;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Lộ trình của bạn</h2>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-3xl bg-card p-5 text-sm sm:grid-cols-3">
        <Fact label="Mục tiêu" value={GOAL_LABEL[draft.goal]} />
        <Fact
          label="Mỗi ngày"
          value={`${draft.minutesPerDay} phút · ${draft.daysPerWeek} ngày/tuần`}
        />
        <Fact label="Tổng thời gian" value={`${f.studyDaysNeeded} buổi · ~${hours} giờ`} />
        <Fact label="Bắt đầu" value={formatViDate(p.startDate)} />
        <Fact label="Dự kiến xong" value={formatViDate(f.estimatedFinish)} />
        <Fact label="Hạn chót" value={formatViDate(draft.targetDate)} />
      </dl>

      {f.feasible ? (
        <p className="rounded-2xl bg-primary-soft p-4 text-sm font-semibold text-primary-ink">
          Vừa sức! Còn {f.remainingNewItems} nội dung mới, xong trước hạn chót.
        </p>
      ) : (
        <div className="space-y-3 rounded-2xl bg-warning/15 p-4 text-sm">
          <p className="font-semibold">
            Với {draft.minutesPerDay} phút/ngày, bạn cần khoảng {f.calendarDaysNeeded} ngày để học
            hết {f.remainingNewItems} nội dung mới, lâu hơn hạn chót đã chọn. Bạn có thể điều chỉnh:
          </p>
          <div className="flex flex-wrap gap-2">
            {f.suggestedMinutesPerDay > 0 && f.suggestedMinutesPerDay <= 240 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPatch({ minutesPerDay: f.suggestedMinutesPerDay })}
              >
                Học {f.suggestedMinutesPerDay} phút/ngày
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPatch({ targetDate: f.suggestedTargetDate })}
            >
              Lùi hạn đến {formatViDate(f.suggestedTargetDate)}
            </Button>
          </div>
        </div>
      )}

      {p.prioritySkills.length > 0 && (
        <section aria-labelledby="priority" className="space-y-2">
          <h3 id="priority" className="font-bold">
            Ưu tiên trước
          </h3>
          <ul className="flex flex-wrap gap-2">
            {p.prioritySkills.map((s) => (
              <li
                key={s.skill}
                className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold"
              >
                {s.label}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  còn {s.total - s.introduced}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="stages" className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="stages" className="font-bold">
            Các chặng học
          </h3>
          <span className="text-xs text-muted-foreground">
            {p.stages.length} chặng · {reviewDays} ngày ôn · {testDays} bài kiểm tra tuần
          </span>
        </div>
        <ol className="space-y-2">
          {stages.map((s) => (
            <li key={s.index} className="space-y-1.5 rounded-2xl bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">Chặng {s.index}</span>
                <span className="text-xs text-muted-foreground">
                  {formatViDate(s.from)} – {formatViDate(s.to)}
                </span>
              </div>
              {s.topics.length > 0 && (
                <p className="text-sm">
                  {s.topics.slice(0, 3).join(" · ")}
                  {s.topics.length > 3 && ` · +${s.topics.length - 3}`}
                </p>
              )}
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarCheck aria-hidden className="h-3.5 w-3.5" /> {s.lessonDays} ngày học
                </span>
                {s.reviewDays > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Repeat aria-hidden className="h-3.5 w-3.5" /> {s.reviewDays} ngày ôn
                  </span>
                )}
                {s.testDate && (
                  <span className="inline-flex items-center gap-1">
                    <ClipboardCheck aria-hidden className="h-3.5 w-3.5" /> Kiểm tra{" "}
                    {formatViDate(s.testDate)}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
        {p.stages.length > 4 && (
          <Button variant="ghost" size="sm" onClick={() => setAllStages((v) => !v)}>
            {allStages ? "Thu gọn" : `Xem thêm ${p.stages.length - 4} chặng`}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Đây là dự kiến nếu bạn học đều mỗi ngày. Lộ trình tự điều chỉnh theo kết quả học và bài
          kiểm tra tuần.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={saving} onClick={onConfirm}>
          {saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Bắt đầu lộ trình"}
        </Button>
        <Button size="lg" variant="ghost" onClick={onEdit}>
          Sửa thời gian
        </Button>
      </div>
      {saveError != null && <ErrorBlock error={saveError} />}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
