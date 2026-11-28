import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useGame } from "@/lib/store";
import { PetCard } from "@/components/PetCard";
import { PetSpecies } from "@/components/PetSpecies";
import { Button } from "@/components/ui/button";
import { useMeQuery, useUpdateAvatarMutation } from "@/hooks/queries/user.queries";
import {
  usePathProfileQuery,
  usePathStatusQuery,
  useSaveProfileMutation,
} from "@/hooks/queries/learning-path.queries";
import { useAuthStore } from "@/hooks/stores/auth.store";
import type { PathGoal, ProfileResponse } from "@/api/learning-path.api";
import { formatViDate } from "@/lib/learning-path/dates";
import { ErrorBlock } from "@/components/tango/shared";

export const Route = createFileRoute("/app/profile")({
  component: SettingsPage,
});

const AVATARS = [
  { type: "FOX", emoji: "🦊" },
  { type: "PANDA", emoji: "🐼" },
  { type: "KOALA", emoji: "🐨" },
  { type: "FROG", emoji: "🐸" },
  { type: "MONKEY", emoji: "🐵" },
  { type: "UNICORN", emoji: "🦄" },
  { type: "TIGER", emoji: "🐯" },
  { type: "PENGUIN", emoji: "🐧" },
  { type: "OCTOPUS", emoji: "🐙" },
  { type: "STAR", emoji: "🌟" },
  { type: "ROCKET", emoji: "🚀" },
  { type: "CLOVER", emoji: "🍀" },
];
const GOAL_LABEL: Record<PathGoal, string> = {
  PASS_JLPT: "Đỗ JLPT",
  BASIC_CONVERSATION: "Giao tiếp cơ bản",
  PREPARE_NEXT_LEVEL: "Chuẩn bị lên cấp tiếp theo",
};
const MINUTES = [15, 30, 45, 60];
const DAYS = [3, 5, 6, 7];
const WORD_GOALS = [5, 10, 20, 30];

const SECTIONS = [
  { id: "learning", label: "Mục tiêu học" },
  { id: "account", label: "Tài khoản" },
  { id: "pet", label: "Thú cưng" },
];

/** Settings: grouped label-and-control rows. Every control writes through an existing mutation or the existing store. */
function SettingsPage() {
  return (
    <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16">
      <nav
        aria-label="Các nhóm cài đặt"
        className="hidden lg:sticky lg:top-10 lg:block lg:self-start"
      >
        <p className="studio-kicker pb-3">Cài đặt</p>
        <ol className="studio-rule-t">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="studio-row studio-rule-b flex min-h-11 items-center px-2 text-sm"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="min-w-0 max-w-[760px] space-y-14">
        <header className="space-y-3">
          <p className="studio-kicker lg:hidden">Cài đặt</p>
          <h1 className="studio-head text-4xl leading-[1.05] sm:text-5xl">Cài đặt</h1>
          <p className="studio-muted">Mục tiêu, tài khoản và người bạn đồng hành của bạn.</p>
        </header>
        <LearningGoals />
        <Account />
        <PetSection />
      </div>
    </div>
  );
}

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8 space-y-3">
      <h2 id={`${id}-title`} className="studio-head text-2xl">
        {title}
      </h2>
      <dl className="studio-rule-t">{children}</dl>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="studio-rule-b grid gap-3 py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-center sm:gap-6">
      <dt>
        <span className="block text-[0.9375rem] font-medium">{label}</span>
        {hint && <span className="block text-xs studio-muted">{hint}</span>}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** A row of choices; the selected one is filled. aria-pressed carries the state for screen readers. */
function Choices<T extends number>({
  label,
  options,
  value,
  unit,
  disabled,
  onPick,
}: {
  label: string;
  options: T[];
  value: T | undefined;
  unit: string;
  disabled?: boolean;
  onPick: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap border border-border">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          disabled={disabled}
          onClick={() => value !== o && onPick(o)}
          className={`min-h-11 min-w-16 border-r border-border px-3 text-sm tabular-nums transition-colors last:border-r-0 disabled:opacity-60 ${
            value === o ? "bg-primary text-primary-foreground" : "bg-sheet hover:bg-primary-soft"
          }`}
        >
          {o} {unit}
        </button>
      ))}
    </div>
  );
}

/** The path profile: minutes and days save through the same profile mutation Today uses (the plan re-forms). */
function LearningGoals() {
  const { state, setState } = useGame();
  const status = usePathStatusQuery();
  const pathOn = status.data?.enabled === true;
  const profile = usePathProfileQuery(pathOn);
  const save = useSaveProfileMutation();
  const p = profile.data;
  const apply = (patch: Partial<ProfileResponse>) => {
    if (!p) return;
    const { currentLevel, goal, minutesPerDay, daysPerWeek, targetDate, timezone } = {
      ...p,
      ...patch,
    };
    save.mutate({ currentLevel, goal, minutesPerDay, daysPerWeek, targetDate, timezone });
  };

  return (
    <Group id="learning" title="Mục tiêu học">
      {pathOn && profile.isError && (
        <div className="py-4">
          <ErrorBlock error={profile.error} onRetry={() => profile.refetch()} />
        </div>
      )}
      {pathOn && p && (
        <>
          <Row label="Mục tiêu" hint={`Cấp ${p.targetLevel}`}>
            <p className="text-sm">
              {GOAL_LABEL[p.goal]} {p.targetLevel} · hạn {formatViDate(p.targetDate)}
            </p>
            <Link to="/app/path/setup" className="studio-link text-sm">
              Thiết lập lại lộ trình
            </Link>
          </Row>
          <Row label="Thời gian mỗi ngày" hint="Lịch học sẽ được xếp lại">
            <Choices
              label="Số phút mỗi ngày"
              options={MINUTES}
              value={p.minutesPerDay}
              unit="phút"
              disabled={save.isPending}
              onPick={(v) => apply({ minutesPerDay: v })}
            />
          </Row>
          <Row label="Số ngày mỗi tuần" hint="Lịch học sẽ được xếp lại">
            <Choices
              label="Số ngày học mỗi tuần"
              options={DAYS}
              value={p.daysPerWeek}
              unit="ngày"
              disabled={save.isPending}
              onPick={(v) => apply({ daysPerWeek: v })}
            />
          </Row>
        </>
      )}
      {pathOn && profile.isPending && (
        <div className="h-24 animate-pulse rounded-[2px] bg-surface-2" aria-busy="true" />
      )}
      <Row label="Từ mới mỗi ngày" hint="Lưu trên thiết bị này">
        <Choices
          label="Số từ mới mỗi ngày"
          options={WORD_GOALS}
          value={state.dailyGoal}
          unit="từ"
          onPick={(g) => setState((s) => ({ ...s, dailyGoal: g }))}
        />
      </Row>
      <p className="pt-2 text-sm" aria-live="polite">
        {save.isPending && <span className="studio-muted">Đang lưu và xếp lại lịch…</span>}
        {save.isSuccess && <span className="text-primary">Đã lưu. Lịch học đã được cập nhật.</span>}
        {save.isError && (
          <span role="alert" className="text-destructive">
            {save.error instanceof Error ? save.error.message : "Chưa lưu được"}
          </span>
        )}
      </p>
    </Group>
  );
}

function Account() {
  const { data: me } = useMeQuery();
  const updateAvatar = useUpdateAvatarMutation();
  const logout = useAuthStore((auth) => auth.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return (
    <Group id="account" title="Tài khoản">
      <Row label="Ảnh đại diện">
        <div role="group" aria-label="Chọn ảnh đại diện" className="flex flex-wrap gap-1.5">
          {AVATARS.map((a) => (
            <button
              key={a.type}
              type="button"
              aria-pressed={me?.avatar === a.type}
              aria-label={`Ảnh đại diện ${a.emoji}`}
              disabled={updateAvatar.isPending}
              onClick={() => updateAvatar.mutate(a.type)}
              className={`grid h-11 w-11 place-items-center rounded-[var(--radius)] border text-xl transition-transform hover:-translate-y-px ${
                me?.avatar === a.type ? "border-primary bg-primary-soft" : "border-border bg-sheet"
              }`}
            >
              {a.emoji}
            </button>
          ))}
        </div>
        {updateAvatar.isError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Chưa đổi được ảnh đại diện.
          </p>
        )}
      </Row>
      <Row label="Tên hiển thị" hint="Chưa đổi được trong ứng dụng">
        <p className="text-sm">{me?.name || "—"}</p>
      </Row>
      <Row label="Email">
        <p className="truncate text-sm">{me?.email || "—"}</p>
      </Row>
      <Row label="Phiên đăng nhập">
        <Button
          variant="outline"
          onClick={() => {
            logout();
            queryClient.clear(); // the next account must not see this one's cached data
            navigate({ to: "/login" });
          }}
        >
          <LogOut aria-hidden className="h-4 w-4" /> Đăng xuất
        </Button>
      </Row>
    </Group>
  );
}

/** The companion: its card and the collection, as before; level and coins live here rather than in the top bar. */
function PetSection() {
  const { data: me } = useMeQuery();
  return (
    <section id="pet" aria-labelledby="pet-title" className="scroll-mt-8 space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="pet-title" className="studio-head text-2xl">
          Thú cưng
        </h2>
        {me && (
          <p className="text-sm tabular-nums studio-muted">
            Cấp {me.level} · {me.xp} XP · {me.coin} xu
          </p>
        )}
      </div>
      <PetCard />
      <PetSpecies />
      <p className="text-sm">
        <Link to="/app/progress" className="studio-link">
          Xem các dấu mốc đã đạt trong Tiến độ
        </Link>
      </p>
    </section>
  );
}
