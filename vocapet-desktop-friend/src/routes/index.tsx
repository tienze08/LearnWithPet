import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Bell, Trophy, BookOpen, Zap, Heart } from "lucide-react";
import Pet from "@/components/PixiPet/Pet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VocaPet — Learn English with a pet who quizzes you" },
      {
        name: "description",
        content:
          "A cute virtual companion lives on your screen and pops up to test your vocabulary. Daily streaks, decks, and quizzes for IELTS, TOEIC, and TOEFL learners.",
      },
      { property: "og:title", content: "VocaPet — Learn English with a pet who quizzes you" },
      {
        property: "og:description",
        content:
          "Your friendly vocabulary companion. Spaced repetition + surprise pop quizzes from a pet that grows with you.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [challengeResult, setChallengeResult] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);

  const startChallenge = () => {
    setSelectedOption(null);
    setChallengeResult(null);
    setTimeLeft(10);
    setChallengeOpen(true);
  };

  useEffect(() => {
    if (!challengeOpen || challengeResult !== null) return;

    const timer = window.setInterval(() => {
      setTimeLeft((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(timer);
          setChallengeResult(false);
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [challengeOpen, challengeResult]);

  const submitChallenge = () => {
    if (!selectedOption || challengeResult !== null) return;
    setChallengeResult(selectedOption === "Never giving up");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-extrabold text-xl">
          <span className="text-2xl">🌱</span> VocaPet
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/app">Open app</Link>
          </Button>
          <Button asChild className="btn-pop">
            <Link to="/app">Start free</Link>
          </Button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-10 pb-20 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            New · AI Vocabulary Pet
          </span>
          <h1 className="mt-4 text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
            Learn English
            <br />
            with a pet that <span className="text-primary">never forgets.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-lg">
            VocaPet lives on your screen and pops up every few minutes with a 10-second vocabulary
            challenge. Learn new words together, watch it grow, and build your streak.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="btn-pop text-base h-12 px-6">
              <Link to="/app">
                <Sparkles className="w-5 h-5 mr-2" /> Meet your pet
              </Link>
            </Button>
            <Button variant="secondary" size="lg" className="h-12 px-6" onClick={startChallenge}>
              <Zap className="w-5 h-5 mr-2" /> Try a 10-sec Challenge
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Try the challenge first — no account required.</p>
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-streak" /> 500+ curated words
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-coin" /> Daily streaks
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-square rounded-[3rem] from-primary/20 via-accent to-secondary border-2 border-border card-pop flex items-center justify-center relative overflow-hidden">
            {challengeOpen ? (
              <div className="w-[min(100%-2rem,26rem)] rounded-3xl border-2 border-border bg-card p-5 shadow-lg">
                <div className="flex items-center gap-3">
                  <Pet size={62} mood={challengeResult === true ? "excited" : challengeResult === false ? "sad" : "waiting"} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-primary">10-sec challenge · preview</p>
                    <p className="text-sm font-bold">Burumaru wants to test you!</p>
                  </div>
                  <span className={`text-xl font-extrabold tabular-nums ${timeLeft <= 3 ? "text-destructive" : "text-primary"}`}>
                    {timeLeft}
                  </span>
                </div>
                <div className="my-4 text-center">
                  <p className="text-xs text-muted-foreground">What does</p>
                  <p className="text-2xl font-extrabold">persistent</p>
                  <p className="text-xs text-muted-foreground">mean?</p>
                </div>
                <div className="grid gap-2">
                  {["Giving up easily", "Never giving up", "Moving quickly"].map((option, index) => (
                    <button
                      key={option}
                      type="button"
                      disabled={challengeResult !== null}
                      onClick={() => setSelectedOption(option)}
                      className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold transition-colors ${
                        selectedOption === option ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </button>
                  ))}
                </div>
                {challengeResult === null ? (
                  <Button className="mt-3 w-full btn-pop" disabled={!selectedOption} onClick={submitChallenge}>
                    Answer
                  </Button>
                ) : challengeResult ? (
                  <div className="mt-3 rounded-xl bg-success/10 p-3 text-center">
                    <p className="font-extrabold text-success">Yay! You got it! 🎉</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">Preview reward: +10 XP · 🔥 Streak +1 · ❤️ Happiness +5</p>
                    <p className="mt-1 text-xs text-muted-foreground">Create an account to save real progress with Burumaru.</p>
                    <Button asChild size="sm" className="mt-3 h-8 text-xs">
                      <Link to="/register">Save my progress</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl bg-muted p-3 text-center">
                    <p className="font-bold">Almost — persistent means “never giving up.”</p>
                    <Button variant="link" className="mt-1 h-auto p-0 text-primary" onClick={startChallenge}>Try again</Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="absolute top-6 left-6 bg-card border-2 border-border rounded-2xl px-4 py-2 card-pop text-sm font-bold flex items-center gap-2 animate-bob">
                  <Bell className="w-4 h-4 text-warning" /> Surprise quiz!
                </div>
                <div className="absolute bottom-6 right-6 bg-card border-2 border-border rounded-2xl px-4 py-2 card-pop text-sm font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-xp" /> +10 XP
                </div>
                <Pet size={300} mood="excited" />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20 grid md:grid-cols-3 gap-5">
        <Feature
          icon="🔔"
          title="Pop-up quizzes"
          desc="Every 5–30 minutes your pet appears with a 10-second multiple choice quiz."
        />
        <Feature
          icon="🧠"
          title="Spaced repetition"
          desc="The right words come back at the right time so you actually remember them."
        />
        <Feature
          icon="🏆"
          title="Built for IELTS & TOEIC"
          desc="Curated decks for tests, business, travel, and daily English."
        />
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-24 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold">Start your streak today</h2>
        <p className="mt-3 text-muted-foreground">
          10 words a day. One adorable companion. Real progress.
        </p>
        <Button asChild size="lg" className="btn-pop mt-6 h-12 px-8 text-base">
          <Link to="/app">
            <BookOpen className="w-5 h-5 mr-2" />
            Start learning free
          </Link>
        </Button>
      </section>

      <footer className="border-t-2 border-border py-6 text-center text-sm text-muted-foreground">
        Made with 🌱 by VocaPet
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border-2 border-border bg-card p-6 card-pop">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-extrabold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
