import { useEffect } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { GameProvider, useGame, type PetVariant } from "@/lib/store";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { useAuthStore } from "@/hooks/stores/auth.store";
import { avatarMap } from "@/types/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Coins,
  Flame,
  Zap,
  LayoutDashboard,
  Library,
  User,
  PawPrintIcon,
  Target,
  LogOut,
  Trophy,
  BookOpen,
  Languages,
  Mic,
  ScrollText,
  Sparkles,
  Layers,
  Search,
  Repeat,
  GraduationCap,
} from "lucide-react";

function TopBar() {
  const { state, setState } = useGame();
  const logout = useAuthStore((auth) => auth.logout);
  const navigate = useNavigate();
  const { data: me } = useMeQuery();
  const userLevel = me?.level ?? state.level;
  const userXp = me?.xp ?? state.xp;
  const userCoins = me?.coin ?? state.coins;
  const pct = userXp % 100;
  const avatarEmoji = me?.avatar ? (avatarMap[me.avatar] ?? "🦊") : state.user.avatarEmoji;
  const displayName = me?.name || state.user.displayName || "You";

  useEffect(() => {
    const selectedSpecies = me?.pet?.species as PetVariant | undefined;
    if (selectedSpecies && selectedSpecies !== state.petVariant) {
      setState((current) => ({ ...current, petVariant: selectedSpecies }));
    }
  }, [me?.pet?.species, setState, state.petVariant]);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-4 md:px-6">
      <Link to="/app" className="flex items-center gap-2 font-bold tracking-tight md:hidden">
        <span className="text-xl">🌱</span>
        <span>VocaPet</span>
      </Link>
      <div className="ml-auto flex items-center gap-2 text-sm font-semibold">
        <Stat icon={<Flame className="h-4 w-4 text-streak" />} value={me?.streak ?? state.streak} />
        <Stat icon={<Coins className="h-4 w-4 text-coin" />} value={userCoins} />
        <div className="hidden items-center gap-2 rounded-full bg-muted/70 px-3 py-1 sm:flex">
          <Zap className="h-4 w-4 text-xp" />
          <span>Lv {userLevel}</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-background">
            <div className="h-full bg-xp" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Open account menu"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-base">
                {avatarEmoji}
              </span>
              <span className="hidden max-w-28 truncate sm:inline">{displayName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl">
            <DropdownMenuLabel>
              <p className="truncate font-bold">{displayName}</p>
              {me?.email && <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{me.email}</p>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/app/profile" })}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                logout();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1">
      {icon}
      <span>{value}</span>
    </div>
  );
}

function NavLink({ to, icon, label, soon }: { to: string; icon: React.ReactNode; label: string; soon?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path === to || (to !== "/app" && path.startsWith(to));
  if (soon) {
    return (
      <span className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground/60" aria-disabled="true">
        {icon}
        {label}
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Soon</span>
      </span>
    );
  }
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="flex justify-around py-2">
        <NavLink to="/app" icon={<LayoutDashboard className="w-5 h-5" />} label="Home" />
        <NavLink to="/app/japanese/alphabet" icon={<Languages className="w-5 h-5" />} label="Alphabet" />
        <NavLink to="/app/japanese/tango" icon={<BookOpen className="w-5 h-5" />} label="Vocab" />
        <NavLink to="/app/decks" icon={<Library className="w-5 h-5" />} label="Flashcards" />
        <NavLink to="/app/profile" icon={<User className="w-5 h-5" />} label="Settings" />
      </div>
    </nav>
  );
}

function DesktopSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col p-3 md:sticky md:top-0 md:flex md:h-screen">
      <Link to="/app" className="flex items-center gap-3 rounded-xl px-2 py-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xl">🌱</span>
        <span className="grid leading-tight">
          <span className="text-base font-bold tracking-tight">VocaPet</span>
          <span className="text-[11px] text-muted-foreground">Study companion</span>
        </span>
      </Link>

      <Button asChild className="btn-pop mt-4 w-full justify-start">
        <Link to="/app/decks">
          <BookOpen className="mr-2 h-4 w-4" />
          Start studying
        </Link>
      </Button>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto">
        <NavGroup label="Main">
          <NavLink to="/app" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
        </NavGroup>
        <NavGroup label="Learning">
          <NavLink to="/app/japanese/alphabet" icon={<Languages className="w-4 h-4" />} label="Alphabet" />
          <NavLink to="/app/japanese/tango" icon={<BookOpen className="w-4 h-4" />} label="Vocabulary" />
          <NavLink to="/app/japanese/kanji" icon={<Sparkles className="w-4 h-4" />} label="Kanji" soon />
          <NavLink to="/app/japanese/grammar" icon={<ScrollText className="w-4 h-4" />} label="Grammar" soon />
          <NavLink to="/app/japanese/listening" icon={<Mic className="w-4 h-4" />} label="Listening" soon />
          <NavLink to="/app/japanese/jlpt" icon={<GraduationCap className="w-4 h-4" />} label="JLPT Practice" soon />
        </NavGroup>
        <NavGroup label="Practice">
          <NavLink to="/app/decks" icon={<Layers className="w-4 h-4" />} label="Flashcards" />
          <NavLink to="/app/review" icon={<Repeat className="w-4 h-4" />} label="Review Center" />
          <NavLink to="/app/vocabulary" icon={<Search className="w-4 h-4" />} label="My Vocabulary" soon />
          <NavLink to="/app/reader" icon={<BookOpen className="w-4 h-4" />} label="Reader" />
        </NavGroup>
        <NavGroup label="Personal">
          <NavLink to="/app/achievements" icon={<Trophy className="w-4 h-4" />} label="My Progress" />
          <NavLink to="/app/tasks" icon={<Target className="w-4 h-4" />} label="Missions" />
          <NavLink to="/app/profile" icon={<User className="w-4 h-4" />} label="Settings" />
        </NavGroup>
      </nav>
    </aside>
  );
}

function ShellInner() {
  return (
    <div className="min-h-screen pb-20 md:flex md:pb-0">
      <DesktopSidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:h-screen md:py-3 md:pr-3">
        <div className="flex min-h-0 flex-1 flex-col md:overflow-hidden md:rounded-2xl md:border md:border-border/70 md:bg-card/80 md:shadow-sm md:backdrop-blur-xl">
          <TopBar />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
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
