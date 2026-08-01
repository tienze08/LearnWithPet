import { useEffect } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { GameProvider, useGame, type PetVariant } from "@/lib/store";
import { PetCompanion } from "@/components/PetCompanion";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { useAuthStore } from "@/hooks/stores/auth.store";
import { avatarMap } from "@/types/avatar";
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
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b-2 border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link to="/app" className="flex items-center gap-2 font-extrabold text-lg">
          <span className="text-2xl">🌱</span>
          <span>VocaPet</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-4">
          <NavLink to="/app" icon={<LayoutDashboard className="w-4 h-4" />} label="Home" />
          <NavLink to="/app/decks" icon={<Library className="w-4 h-4" />} label="Decks" />
          <NavLink to="/app/reader" icon={<BookOpen className="w-4 h-4" />} label="Reader" />
          <NavLink to="/app/tasks" icon={<Target className="w-4 h-4" />} label="Tasks" />
          <NavLink to="/app/pets" icon={<PawPrintIcon className="w-4 h-4" />} label="Pets" />
          <NavLink to="/app/achievements" icon={<Trophy className="w-4 h-4" />} label="Awards" />
          <NavLink to="/app/profile" icon={<User className="w-4 h-4" />} label="Profile" />
        </nav>
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
          <Link
            to="/app/profile"
            className="ml-1 flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border-2 border-border hover:border-primary transition-colors"
            aria-label="Your profile"
          >
            <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-lg">
              {avatarEmoji}
            </span>
            <span className="hidden sm:inline text-sm font-bold truncate">{displayName}</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-border text-muted-foreground transition-colors hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
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
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background border-t-2 border-border">
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

function ShellInner() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <TopBar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

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
