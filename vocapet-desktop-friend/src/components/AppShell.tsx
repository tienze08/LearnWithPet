import { useEffect } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { GameProvider, useGame, type PetVariant } from "@/lib/store";
import { PetCompanion } from "@/components/PetCompanion";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { useAuthStore } from "@/hooks/stores/auth.store";
import { avatarMap } from "@/types/avatar";
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
  PawPrint,
  LogOut,
  Trophy,
  BookOpen,
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
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-[4.25rem] flex items-center gap-4">
        <Link to="/app" className="flex items-center gap-2 font-extrabold tracking-tight text-lg">
          <span className="text-2xl">🌱</span>
          <span>VocaPet</span>
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm font-bold">
          <Stat
            icon={<Flame className="w-4 h-4 text-streak" />}
            value={me?.streak ?? state.streak}
          />
          <Stat icon={<Coins className="w-4 h-4 text-coin" />} value={userCoins} />
          <div className="hidden sm:flex items-center gap-2">
            <Zap className="w-4 h-4 text-xp" />
            <span>Lv {userLevel}</span>
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-xp" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border border-border bg-card/70 shadow-sm transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Open account menu"
              >
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                  {avatarEmoji}
                </span>
                <span className="hidden sm:inline max-w-28 text-sm font-bold truncate">{displayName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-2">
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
      </div>
    </header>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <div className="flex items-center gap-1">
      {icon}
      <span>{value}</span>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path === to || (to !== "/app" && path.startsWith(to));
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
        active
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-card/80"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="flex justify-around py-2">
        <NavLink to="/app" icon={<LayoutDashboard className="w-5 h-5" />} label="Home" />
        <NavLink to="/app/decks" icon={<Library className="w-5 h-5" />} label="Decks" />
        <NavLink to="/app/tasks" icon={<Target className="w-5 h-5" />} label="Tasks" />
        <NavLink to="/app/pets" icon={<PawPrint className="w-5 h-5" />} label="Pets" />
        <NavLink to="/app/profile" icon={<User className="w-5 h-5" />} label="Profile" />
      </div>
    </nav>
  );
}

function DesktopSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 md:block">
      <div className="sticky top-[4.25rem] py-8 pr-6">
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Learn
        </p>
        <nav className="space-y-1">
          <NavLink to="/app" icon={<LayoutDashboard className="w-4 h-4" />} label="Home" />
          <NavLink to="/app/decks" icon={<Library className="w-4 h-4" />} label="Study & decks" />
          <NavLink to="/app/reader" icon={<BookOpen className="w-4 h-4" />} label="Reader" />
          <NavLink to="/app/tasks" icon={<Target className="w-4 h-4" />} label="Missions" />
        </nav>
        <p className="mb-3 mt-8 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Your companion
        </p>
        <nav className="space-y-1">
          <NavLink to="/app/pets" icon={<PawPrintIcon className="w-4 h-4" />} label="Pets" />
          <NavLink to="/app/achievements" icon={<Trophy className="w-4 h-4" />} label="Progress & awards" />
          <NavLink to="/app/profile" icon={<User className="w-4 h-4" />} label="Settings" />
        </nav>
      </div>
    </aside>
  );
}

function ShellInner() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <TopBar />

      <div className="mx-auto flex w-full max-w-7xl px-4">
        <DesktopSidebar />
        <main className="min-w-0 flex-1 py-8 md:py-10 md:pl-2">
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <PetCompanion />
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
