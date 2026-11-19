import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyBlock, ErrorBlock, LoadingBlock, ProgressBar } from "@/components/tango/shared";
import { QuestionCard } from "@/components/learning-path/QuestionCard";
import {
  getPlacement,
  submitPlacement,
  type Feasibility,
  type PathGoal,
  type PlacementAnswer,
  type ProfileRequest,
  type StartingLevel,
} from "@/api/learning-path.api";
import {
  useFeasibilityMutation,
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
  { value: "BEGINNER", label: "Chưa học", note: "Bắt đầu từ đầu" },
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
const MINUTES = [15, 30, 45, 60];
const DAYS = [3, 5, 6, 7];
const DEADLINES = [30, 60, 90];

type Step =
  | "level"
  | "goal"
  | "minutes"
  | "days"
  | "deadline"
  | "placement-intro"
  | "placement"
  | "check";

function PathSetup() {
  const status = usePathStatusQuery();
  const existing = usePathProfileQuery(status.data?.enabled === true);
  const editing = !!existing.data;
  const navigate = useNavigate();
  const save = useSaveProfileMutation();
  const [step, setStep] = useState<Step>("level");
  const [draft, setDraft] = useState<Partial<ProfileRequest>>({});
  const [placementDone, setPlacementDone] = useState<string | null>(null);

  useEffect(() => {
    if (existing.data) setDraft(existing.data);
  }, [existing.data]);

  if (status.isPending || (status.data?.enabled && existing.isPending))
    return <LoadingBlock rows={3} />;
  if (status.isError) return <ErrorBlock error={status.error} onRetry={() => status.refetch()} />;
  if (!status.data?.enabled)
    return <EmptyBlock title="Lộ trình học chưa được bật cho tài khoản này" />;

  const set = (patch: Partial<ProfileRequest>, next: Step) => {
    setDraft((d) => ({ ...d, ...patch }));
    setStep(next);
  };
  const full = (): ProfileRequest => ({
    currentLevel: draft.currentLevel ?? "BEGINNER",
    goal: draft.goal ?? "PASS_JLPT",
    minutesPerDay: draft.minutesPerDay ?? 30,
    daysPerWeek: draft.daysPerWeek ?? 5,
    targetDate: draft.targetDate ?? localDate(60),
    timezone: timezone(),
  });
  const afterDeadline = (): Step =>
    !editing && draft.currentLevel && draft.currentLevel !== "BEGINNER"
      ? "placement-intro"
      : "check";
  const order: Step[] = ["level", "goal", "minutes", "days", "deadline"];
  const at = order.indexOf(step);

  const finish = (patch?: Partial<ProfileRequest>) => {
    const body = { ...full(), ...patch };
    save.mutate(body, { onSuccess: () => navigate({ to: "/app/path" }) });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        {at > 0 && (
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => setStep(order[at - 1])}
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
          <Link to="/app/path" className="text-sm font-semibold text-primary hover:underline">
            Huỷ
          </Link>
        )}
      </div>
      {at >= 0 && (
        <ProgressBar
          value={Math.round(((at + 1) / order.length) * 100)}
          label={`Bước ${at + 1}/${order.length}`}
        />
      )}

      {step === "level" && (
        <Choice
          title="Trình độ hiện tại của bạn?"
          options={LEVELS.map((l) => ({ key: l.value, label: l.label, note: l.note }))}
          selected={draft.currentLevel}
          onPick={(v) => set({ currentLevel: v as StartingLevel }, "goal")}
        />
      )}
      {step === "goal" && (
        <Choice
          title="Mục tiêu của bạn?"
          options={GOALS.map((g) => ({ key: g.value, label: g.label }))}
          selected={draft.goal}
          onPick={(v) => set({ goal: v as PathGoal }, "minutes")}
        />
      )}
      {step === "minutes" && (
        <Choice
          title="Mỗi ngày bạn học được bao lâu?"
          options={MINUTES.map((m) => ({ key: String(m), label: `${m} phút` }))}
          selected={draft.minutesPerDay ? String(draft.minutesPerDay) : undefined}
          onPick={(v) => set({ minutesPerDay: Number(v) }, "days")}
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
          onPick={(v) => set({ daysPerWeek: Number(v) }, "deadline")}
        />
      )}
      {step === "deadline" && (
        <DeadlineStep
          value={draft.targetDate}
          onPick={(d) => set({ targetDate: d }, afterDeadline())}
        />
      )}

      {step === "placement-intro" && (
        <div className="space-y-4 rounded-3xl bg-card p-6">
          <h2 className="text-xl font-bold">Kiểm tra nhanh trình độ</h2>
          <p className="text-sm text-muted-foreground">
            Khoảng 15 câu Ngữ pháp, Từ vựng và Kanji, hỏi theo thứ tự lộ trình. Phần bạn đã biết sẽ
            chuyển sang ôn tập thay vì học lại từ đầu.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStep("placement")}>Làm bài kiểm tra</Button>
            <Button variant="outline" onClick={() => setStep("check")}>
              Bỏ qua
            </Button>
          </div>
        </div>
      )}
      {step === "placement" && (
        <PlacementTest
          onDone={(summary) => {
            setPlacementDone(summary);
            setStep("check");
          }}
        />
      )}

      {step === "check" && (
        <FeasibilityStep
          draft={full()}
          placementSummary={placementDone}
          saving={save.isPending}
          saveError={save.error}
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
  options: { key: string; label: string; note?: string }[];
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
          onClick={() => onPick(o.key)}
          className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${selected === o.key ? "bg-primary-soft text-primary-ink" : "bg-surface-2 hover:bg-primary-soft"}`}
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

/** Asks each type in curriculum order and stops that type at its first wrong item. */
function PlacementTest({ onDone }: { onDone: (summary: string) => void }) {
  const learned = useMarks("learned");
  const hints = useMemo(() => [...learned], [learned]);
  const placement = useQuery({
    queryKey: ["path", "placement", hints],
    queryFn: () => getPlacement(hints),
    staleTime: Infinity,
  });
  const { content, isLoading, error, refetch } = usePathContent();
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [stopped, setStopped] = useState<Set<string>>(new Set());
  const [qIndex, setQIndex] = useState(0);
  const [itemRight, setItemRight] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const items = useMemo(() => {
    if (!placement.data) return [];
    return [
      ...placement.data.grammar.map((id) => ({ itemType: "GRAMMAR" as const, itemId: id })),
      ...placement.data.vocab.map((id) => ({ itemType: "VOCAB" as const, itemId: id })),
      ...placement.data.kanji.map((id) => ({ itemType: "KANJI" as const, itemId: id })),
    ];
  }, [placement.data]);

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

  const remaining = items.filter(
    (i) =>
      !stopped.has(i.itemType) &&
      !answers.some((a) => a.itemType === i.itemType && a.itemId === i.itemId),
  );
  const current = remaining[0];

  const submit = async (all: PlacementAnswer[]) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await submitPlacement(all);
      onDone(
        `Bạn đã biết khoảng ${r.grammarKnown} mẫu ngữ pháp, ${r.vocabKnown} từ và ${r.kanjiKnown} chữ Kanji. Chúng sẽ được ôn lại sớm để xác nhận.`,
      );
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
        {submitError != null && <ErrorBlock error={submitError} onRetry={() => submit(answers)} />}
        {!submitting && submitError == null && (
          <Button onClick={() => submit(answers)}>Xem kết quả</Button>
        )}
      </div>
    );
  }

  const questions: Question[] = content.questionsFor(current.itemType, current.itemId);
  const q = questions[qIndex];
  const record = (correct: boolean) => {
    const a = { ...current, correct };
    setAnswers((list) => [...list, a]);
    if (!correct) setStopped((s) => new Set(s).add(current.itemType));
    setQIndex(0);
    setItemRight(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-bold">
        <span>Câu {answers.length + 1}</span>
        <button
          type="button"
          className="min-h-11 text-muted-foreground hover:text-foreground"
          onClick={() => submit(answers)}
        >
          Dừng và xem kết quả
        </button>
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

function FeasibilityStep({
  draft,
  placementSummary,
  saving,
  saveError,
  onConfirm,
  onEdit,
}: {
  draft: ProfileRequest;
  placementSummary: string | null;
  saving: boolean;
  saveError: unknown;
  onConfirm: (patch?: Partial<ProfileRequest>) => void;
  onEdit: () => void;
}) {
  const check = useFeasibilityMutation();
  const key = JSON.stringify(draft);
  useEffect(() => {
    check.mutate(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const f: Feasibility | undefined = check.data;

  return (
    <div className="space-y-4">
      {placementSummary && (
        <p className="rounded-2xl bg-primary-soft p-4 text-sm text-primary-ink">
          {placementSummary}
        </p>
      )}
      <div className="space-y-2 rounded-3xl bg-card p-6">
        <h2 className="text-xl font-bold">Kế hoạch của bạn</h2>
        <p className="text-sm text-muted-foreground">
          {draft.minutesPerDay} phút/ngày · {draft.daysPerWeek} ngày/tuần · hạn chót{" "}
          {formatViDate(draft.targetDate)}
        </p>
        {check.isPending && <LoadingBlock rows={1} />}
        {check.isError && <ErrorBlock error={check.error} onRetry={() => check.mutate(draft)} />}
        {f &&
          (f.feasible ? (
            <p className="font-semibold text-primary">
              Vừa sức! Còn {f.remainingNewItems} nội dung mới, dự kiến xong khoảng{" "}
              {formatViDate(f.estimatedFinish)}.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="font-semibold">
                Với {draft.minutesPerDay} phút/ngày, bạn cần khoảng {f.calendarDaysNeeded} ngày để
                học hết {f.remainingNewItems} nội dung mới, lâu hơn hạn chót đã chọn.
              </p>
              <p className="text-sm text-muted-foreground">Bạn có thể chọn một trong hai cách:</p>
              <div className="flex flex-wrap gap-2">
                {f.suggestedMinutesPerDay > 0 && f.suggestedMinutesPerDay <= 240 && (
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => onConfirm({ minutesPerDay: f.suggestedMinutesPerDay })}
                  >
                    Học {f.suggestedMinutesPerDay} phút/ngày
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => onConfirm({ targetDate: f.suggestedTargetDate })}
                >
                  Lùi hạn đến {formatViDate(f.suggestedTargetDate)}
                </Button>
              </div>
            </div>
          ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={saving || !f} onClick={() => onConfirm()}>
          {saving ? "Đang lưu…" : f && !f.feasible ? "Vẫn giữ kế hoạch này" : "Bắt đầu lộ trình"}
        </Button>
        <Button size="lg" variant="ghost" onClick={onEdit}>
          Sửa thời gian
        </Button>
      </div>
      {saveError != null && <ErrorBlock error={saveError} />}
    </div>
  );
}
