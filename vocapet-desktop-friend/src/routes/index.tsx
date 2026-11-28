import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, BookOpen, Layers, Route as RouteIcon, TrendingUp } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { Cat } from "@/components/ref/Cat";
import { Landscape } from "@/components/ref/Landscape";
import { Logo } from "@/components/ref/Logo";

const TITLE = "VocaPet — Học tiếng Nhật cùng một người bạn nhỏ đáng yêu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      {
        name: "description",
        content:
          "Lộ trình học tiếng Nhật cá nhân hóa: bảng chữ cái, từ vựng, kanji, ngữ pháp và flashcards ôn lặp lại, với thú cưng đồng hành mỗi ngày.",
      },
      { property: "og:title", content: TITLE },
      {
        property: "og:description",
        content:
          "Học tiếng Nhật thật vui: lộ trình theo trình độ, ôn tập đúng lúc, và một người bạn nhỏ luôn bên bạn.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: RouteIcon,
    title: "Lộ trình riêng",
    desc: "Chọn trình độ, mục tiêu và thời gian học; VocaPet xếp lịch từng ngày cho bạn.",
    tone: "bg-peach",
  },
  {
    icon: BookOpen,
    title: "Từ vựng, kanji, ngữ pháp",
    desc: "Học theo giáo trình Minna no Nihongo, kèm bảng Hiragana và Katakana.",
    tone: "bg-mint",
  },
  {
    icon: Layers,
    title: "Flashcards ôn lặp lại",
    desc: "Thẻ quay lại đúng lúc sắp quên, có furigana bật tắt khi cần.",
    tone: "bg-sky",
  },
  {
    icon: TrendingUp,
    title: "Tiến độ & chuỗi ngày",
    desc: "Xem chuỗi học, điểm XP và cột mốc JLPT để giữ nhịp mỗi ngày.",
    tone: "bg-lilac",
  },
];

const STEPS = [
  ["1", "Chọn trình độ và mục tiêu", "Từ N5 đến giao tiếp cơ bản, bạn quyết định tốc độ."],
  ["2", "Học mỗi ngày một chút", "Bài mới, luyện tập và kiểm tra cuối ngày chỉ vài phút."],
  ["3", "Ôn đúng lúc", "Thẻ cần ôn hiện lên đúng lúc để nhớ lâu hơn."],
] as const;

function Landing() {
  const navigate = useNavigate();
  // Landing stays server-rendered for SEO; a returning signed-in user goes straight to the app (Today).
  useEffect(() => {
    if (isAuthenticated()) navigate({ to: "/app", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="flex min-h-11 items-center rounded-full px-4 text-sm font-medium hover:bg-primary-soft"
          >
            Đăng nhập
          </Link>
          <Link to="/register" className="studio-btn min-h-11 rounded-full px-5">
            Bắt đầu miễn phí
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="studio-kicker">Học tiếng Nhật cùng thú cưng</p>
          <h1 className="studio-head mt-4 text-[2.75rem] leading-[1.1] sm:text-[3.5rem]">
            Học tiếng Nhật thật vui
            <br />
            với <span className="text-primary">người bạn nhỏ</span> bên cạnh.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-foreground/75">
            Một lộ trình dành riêng cho bạn: học chữ, từ vựng và ngữ pháp mỗi ngày, ôn lại đúng lúc,
            và có một chú mèo đồng hành để giữ chuỗi học của bạn.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/register" className="studio-btn min-h-12 gap-2 rounded-full px-7 text-base">
              Bắt đầu học <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link to="/login" className="studio-btn-quiet studio-btn min-h-12 rounded-full px-5">
              Tôi đã có tài khoản
            </Link>
          </div>
        </div>

        <div className="ref-card relative aspect-[5/4] overflow-hidden">
          <Landscape variant="welcome" />
          <Cat
            pose="read"
            className="absolute bottom-[6%] left-1/2 w-[46%] -translate-x-1/2 drop-shadow-[0_10px_14px_rgba(52,66,48,0.18)]"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, desc, tone }) => (
          <div key={title} className={`rounded-3xl p-6 ${tone}`}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/70 text-primary">
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-foreground/70">{desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="studio-head text-3xl">Bắt đầu chỉ với ba bước</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map(([n, title, desc]) => (
            <li key={n} className="ref-card p-6">
              <span className="studio-jp text-3xl text-primary">{n}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-foreground/70">{desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-primary-soft px-6 py-14 text-center">
          <Landscape variant="plan" />
          <div className="relative">
            <h2 className="studio-head text-3xl sm:text-4xl">
              Cùng bắt đầu chuỗi học đầu tiên nhé!
            </h2>
            <p className="mt-3 text-foreground/70">
              Mỗi ngày một chút, chú mèo sẽ luôn ở đây cùng bạn.
            </p>
            <Link
              to="/register"
              className="studio-btn mt-7 min-h-12 gap-2 rounded-full px-8 text-base"
            >
              Bắt đầu miễn phí <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm studio-muted">
        VocaPet · Học tiếng Nhật cùng người bạn nhỏ
      </footer>
    </div>
  );
}
