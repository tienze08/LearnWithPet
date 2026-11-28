import { useEffect } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GameProvider, useGame, type PetVariant } from "@/lib/store";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { usePathStatusQuery } from "@/hooks/queries/learning-path.queries";
import { useAuthStore } from "@/hooks/stores/auth.store";
import { avatarMap } from "@/types/avatar";
import { Landscape, type LandscapeVariant } from "@/components/ref/Landscape";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Dumbbell,
  Headphones,
  CalendarCheck,
  CalendarClock,
  BarChart3,
  Languages,
  Layers,
  Library,
  LogOut,
  Mic,
  PawPrint,
  Repeat,
  Settings,
  Sparkles,
  TrendingUp,
  Type,
} from "lucide-react";
import { Logo } from "@/components/ref/Logo";

/** Pages under Thư viện: the Library index lists them, so the nav carries only one entry. */
const LIBRARY_PATHS = ["/app/library", "/app/japanese", "/app/reader"];
/** Study runs full screen: no sidebar, no nav, only the lesson and its own exit. */
const FOCUS_PATHS = ["/app/path/study"];

function usePath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

/** Keeps the local game store on the account's pet; was in the old top bar, which every page rendered. */
function usePetSync() {
  const { state, setState } = useGame();
  const { data: me } = useMeQuery();
  useEffect(() => {
    const selectedSpecies = me?.pet?.species as PetVariant | undefined;
    if (selectedSpecies && selectedSpecies !== state.petVariant) {
      setState((current) => ({ ...current, petVariant: selectedSpecies }));
    }
  }, [me?.pet?.species, setState, state.petVariant]);
}

/** Highlights on its own path, on its sub-paths, and on any extra prefix in `match` (e.g. Today also owns /app/path). */
function NavLink({
  to,
  icon,
  label,
  match = [],
  compact,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  match?: string[];
  compact?: boolean;
}) {
  const path = usePath();
  const active =
    path === to || (to !== "/app" && path.startsWith(to)) || match.some((m) => path.startsWith(m));
  if (compact) {
    return (
      <Link
        to={to}
        // exact: otherwise Link marks /app (Today) current on every /app/* page; `active` decides instead.
        activeOptions={{ exact: true }}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {icon}
        <span className="truncate">{label}</span>
      </Link>
    );
  }
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
        active
          ? "bg-primary-soft font-semibold text-foreground [&_svg]:text-primary"
          : "text-muted-foreground hover:bg-primary-soft/60 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

/** Library's children, indented under it as in the reference. Exact-prefix match so Từ vựng ≠ Kanji. */
function SubLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const active = usePath().startsWith(to);
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      aria-current={active ? "page" : undefined}
      className={`ml-5 flex min-h-9 items-center gap-3 rounded-xl px-3 text-[0.8125rem] transition-colors ${
        active
          ? "font-semibold text-primary"
          : "text-muted-foreground hover:bg-primary-soft/60 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function Wordmark() {
  return (
    <Link to="/app" className="flex min-h-11 items-center" aria-label="VocaPet, về Hôm nay">
      <Logo />
    </Link>
  );
}

function Streak() {
  const { state } = useGame();
  const { data: me } = useMeQuery();
  const streak = me?.streak ?? state.streak;
  return (
    <span className="flex items-center gap-2 text-sm" aria-label={`${streak} ngày học liên tiếp`}>
      <span
        aria-hidden
        className="studio-seal"
        data-state={streak > 0 ? "done" : "empty"}
        style={{ "--seal-size": "1.5rem" } as React.CSSProperties}
      >
        {streak > 0 ? "済" : ""}
      </span>
      <span className="tabular-nums">
        <b>{streak}</b> <span className="studio-muted">ngày liên tiếp</span>
      </span>
    </span>
  );
}

function AccountMenu({ withName, extra }: { withName?: boolean; extra?: boolean }) {
  const { state } = useGame();
  const logout = useAuthStore((auth) => auth.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useMeQuery();
  const avatarEmoji = me?.avatar ? (avatarMap[me.avatar] ?? "🦊") : state.user.avatarEmoji;
  const displayName = me?.name || state.user.displayName || "Bạn";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center gap-2 rounded-[var(--radius)] px-1.5 text-sm transition-colors hover:bg-sheet"
          aria-label="Mở menu tài khoản"
        >
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-sheet text-base"
          >
            {avatarEmoji}
          </span>
          {withName && <span className="max-w-32 truncate font-medium">{displayName}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate font-semibold">{displayName}</p>
          {me?.email && (
            <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{me.email}</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {extra && (
          <DropdownMenuItem onSelect={() => navigate({ to: "/app/listening" })}>
            <Headphones className="mr-2 h-4 w-4" />
            Luyện nghe
          </DropdownMenuItem>
        )}
        {extra && (
          <DropdownMenuItem onSelect={() => navigate({ to: "/app/shadowing" })}>
            <Mic className="mr-2 h-4 w-4" />
            Shadowing
          </DropdownMenuItem>
        )}
        {extra && (
          <>
            <DropdownMenuItem onSelect={() => navigate({ to: "/app/plan" })}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Kế hoạch FSRS
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/app/analytics" })}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Phân tích
            </DropdownMenuItem>
          </>
        )}
        {extra && (
          <DropdownMenuItem onSelect={() => navigate({ to: "/app/decks" })}>
            <Layers className="mr-2 h-4 w-4" />
            Flashcards
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => navigate({ to: "/app/pets" })}>
          <PawPrint className="mr-2 h-4 w-4" />
          Thú cưng
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/app/profile" })}>
          <Settings className="mr-2 h-4 w-4" />
          Cài đặt
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => {
            logout();
            queryClient.clear(); // the next account must not see this one's cached data
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopSidebar() {
  const path = usePathStatusQuery();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/70 bg-sheet/80 px-3 py-5 md:sticky md:top-0 md:flex md:h-screen">
      <div className="px-2">
        <Wordmark />
      </div>
      <nav aria-label="Điều hướng chính" className="mt-8 flex-1 space-y-0.5 overflow-y-auto">
        {path.data?.enabled && (
          <NavLink
            to="/app"
            match={["/app/path"]}
            icon={<CalendarCheck className="h-4 w-4" />}
            label="Hôm nay"
          />
        )}
        <NavLink
          to="/app/plan"
          icon={<CalendarClock className="h-4 w-4" />}
          label="Kế hoạch FSRS"
        />
        <NavLink to="/app/review" icon={<Repeat className="h-4 w-4" />} label="Ôn tập" />
        <NavLink
          to="/app/library"
          match={["/app/reader"]}
          icon={<Library className="h-4 w-4" />}
          label="Thư viện"
        />
        <div className="space-y-0.5" role="group" aria-label="Trong thư viện">
          <SubLink
            to="/app/japanese/grammar"
            icon={<BookOpen className="h-4 w-4" />}
            label="Ngữ pháp"
          />
          <SubLink
            to="/app/japanese/tango"
            icon={<Languages className="h-4 w-4" />}
            label="Từ vựng"
          />
          <SubLink to="/app/japanese/kanji" icon={<Sparkles className="h-4 w-4" />} label="Kanji" />
          <SubLink
            to="/app/japanese/alphabet"
            icon={<Type className="h-4 w-4" />}
            label="Bảng chữ cái"
          />
        </div>
        <NavLink to="/app/listening" icon={<Headphones className="h-4 w-4" />} label="Luyện nghe" />
        <NavLink to="/app/shadowing" icon={<Mic className="h-4 w-4" />} label="Shadowing" />
        <NavLink to="/app/practice" icon={<Dumbbell className="h-4 w-4" />} label="Luyện tập" />
        <NavLink to="/app/decks" icon={<Layers className="h-4 w-4" />} label="Flashcards" />
        <NavLink to="/app/progress" icon={<TrendingUp className="h-4 w-4" />} label="Tiến độ" />
        <NavLink to="/app/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Phân tích" />
        <NavLink to="/app/profile" icon={<Settings className="h-4 w-4" />} label="Cài đặt" />
      </nav>
      <div className="space-y-3 border-t border-border px-2 pt-4">
        <Streak />
        <AccountMenu withName />
      </div>
    </aside>
  );
}

function MobileTopBar() {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border px-4 md:hidden">
      <Wordmark />
      <div className="ml-auto flex items-center gap-2">
        <Streak />
        <AccountMenu extra />
      </div>
    </header>
  );
}

function MobileNav() {
  const path = usePathStatusQuery();
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {path.data?.enabled && (
        <NavLink
          compact
          to="/app"
          match={["/app/path"]}
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Hôm nay"
        />
      )}
      <NavLink compact to="/app/review" icon={<Repeat className="h-5 w-5" />} label="Ôn tập" />
      <NavLink
        compact
        to="/app/library"
        match={LIBRARY_PATHS}
        icon={<Library className="h-5 w-5" />}
        label="Thư viện"
      />
      <NavLink
        compact
        to="/app/practice"
        icon={<Dumbbell className="h-5 w-5" />}
        label="Luyện tập"
      />
      <NavLink
        compact
        to="/app/progress"
        icon={<TrendingUp className="h-5 w-5" />}
        label="Tiến độ"
      />
    </nav>
  );
}

function sceneryFor(path: string): LandscapeVariant {
  if (path.startsWith("/app/path")) return "plan";
  if (
    path.startsWith("/app/library") ||
    path.startsWith("/app/japanese") ||
    path.startsWith("/app/decks")
  )
    return "library";
  if (
    path.startsWith("/app/review") ||
    path.startsWith("/app/practice") ||
    path.startsWith("/app/listening") ||
    path.startsWith("/app/shadowing")
  )
    return "flash";
  if (path.startsWith("/app/progress")) return "progress";
  return "today";
}

function ShellInner() {
  usePetSync();
  const path = usePath();
  if (FOCUS_PATHS.some((p) => path.startsWith(p))) {
    return (
      <main className="min-h-screen">
        <Outlet />
      </main>
    );
  }
  return (
    <div className="min-h-screen pb-20 md:flex md:pb-0">
      <DesktopSidebar />
      <div className="relative min-w-0 flex-1">
        <div aria-hidden className="pointer-events-none fixed inset-0 md:left-60">
          <Landscape variant={sceneryFor(path)} />
        </div>
        <MobileTopBar />
        <main className="relative px-4 py-6 md:px-8 md:py-10 lg:px-12">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

export function AppShell() {
  return (
    <GameProvider>
      <ShellInner />
    </GameProvider>
  );
}
