import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, Layers, ListChecks, Search, X } from "lucide-react";
import { useTangoSearchQuery } from "@/hooks/queries/tango.queries";
import { getKanaForSection, type KanaScript, type KanaSection } from "@/lib/japanese/kana";
import { searchKanji } from "@/lib/japanese/kanji";
import { searchGrammar } from "@/lib/japanese/grammar/search";
import { loadGrammarLevel } from "@/data/japanese/grammar";

export const Route = createFileRoute("/app/library")({ component: LibraryPage });

type Group = "kana" | "hiragana" | "katakana" | "vocab" | "grammar" | "kanji" | "reading" | "deck";
const FILTERS: { id: Group | "all"; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "hiragana", label: "Hiragana" },
  { id: "katakana", label: "Katakana" },
  { id: "kanji", label: "Kanji" },
  { id: "grammar", label: "Ngữ pháp" },
  { id: "vocab", label: "Từ vựng" },
  { id: "deck", label: "Flashcards" },
];
const SHOW = 8;

const KANA_ALL = (["hiragana", "katakana"] as KanaScript[]).flatMap((script) =>
  (["basic", "dakuten", "handakuten", "yoon"] as KanaSection[]).flatMap((section) =>
    getKanaForSection(script, section).map((e) => ({ ...e, script })),
  ),
);

/** Typing settles for 250 ms before the vocabulary search hits the API. */
function useSettled(value: string, ms = 250) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

/** Library: a table of contents (目次) with real counts, or search results grouped by kind while typing. */
function LibraryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Group | "all">("all");
  const q = useSettled(query.trim());
  const [showFilters, setShowFilters] = useState(true);
  const shows = (g: Group) =>
    filter === "all" || filter === g || (g === "kana" && (filter === "hiragana" || filter === "katakana"));

  return (
    <div className="mx-auto max-w-[1040px] space-y-8">
      <header className="space-y-6">
        <div className="flex items-center gap-3">
          <label htmlFor="library-search" className="sr-only">
            Tìm trong thư viện
          </label>
          <div className="ref-card flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-full px-5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
            <Search aria-hidden className="h-4 w-4 shrink-0 studio-muted" />
            <input
              id="library-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bài học, từ vựng, kanji, mẫu câu…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2 text-[0.9375rem] outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Xoá tìm kiếm"
                className="grid h-9 w-9 place-items-center rounded-xl hover:bg-primary-soft"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((v) => !v)}
            className="ref-card inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold"
          >
            Bộ lọc
            <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className="space-y-2">
          <h1 className="studio-head text-4xl leading-tight sm:text-[2.75rem]">Thư viện kiến thức</h1>
          <p className="text-base studio-muted">Khám phá và học bất cứ điều gì bạn muốn!</p>
        </div>
        <div role="group" aria-label="Lọc theo nhóm" hidden={!showFilters} className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className="ref-chip"
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {q ? <Results q={q} shows={shows} /> : <Contents shows={shows} />}
    </div>
  );
}

/** The table of contents: one editorial row per section, real counts and the learner's own progress. */
function Contents({ shows }: { shows: (g: Group) => boolean }) {
  const entries: {
    group: Group;
    to: string;
    jp?: string;
    icon?: React.ReactNode;
    label: string;
    cta: string;
    tone: string;
    circle: string;
  }[] = [
    { group: "hiragana", to: "/app/japanese/alphabet", jp: "あ", label: "Hiragana", cta: "Bắt đầu từ cơ bản", tone: "bg-[var(--p-rose)]", circle: "bg-[#f7c9cc] text-[#d9505f]" },
    { group: "katakana", to: "/app/japanese/alphabet", jp: "ア", label: "Katakana", cta: "Học ngay", tone: "bg-[var(--p-sky)]", circle: "bg-[#cfe0f7] text-[#3b7bd4]" },
    { group: "kanji", to: "/app/japanese/kanji", jp: "漢", label: "Kanji", cta: "Khám phá", tone: "bg-[var(--p-mint)]", circle: "bg-[#d3e4cc] text-primary" },
    { group: "grammar", to: "/app/japanese/grammar", icon: <BookOpen className="h-7 w-7" />, label: "Ngữ pháp", cta: "Tìm hiểu", tone: "bg-[var(--p-peach)]", circle: "bg-[#f8dfae] text-[#c8872a]" },
    { group: "vocab", to: "/app/japanese/tango", icon: <ListChecks className="h-7 w-7" />, label: "Từ vựng", cta: "Học ngay", tone: "bg-[var(--p-lilac)]", circle: "bg-[#d9d2f2] text-[#6a5bb5]" },
    { group: "deck", to: "/app/decks", icon: <Layers className="h-7 w-7" />, label: "Flashcards", cta: "Luyện tập", tone: "bg-[var(--p-forest-soft)]", circle: "bg-[#c7dfc4] text-primary" },
  ];

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {entries
          .filter((e) => shows(e.group))
          .map((e) => (
            <li key={e.group}>
              <Link
                to={e.to}
                className={`ref-card group flex h-full min-h-[12.5rem] flex-col items-center justify-center gap-2 p-5 text-center transition-transform hover:-translate-y-0.5 ${e.tone}`}
              >
                <span
                  lang="ja"
                  aria-hidden
                  className={`grid h-16 w-16 place-items-center rounded-full text-4xl ${e.circle} ${e.jp ? "studio-jp" : ""}`}
                >
                  {e.jp ?? e.icon}
                </span>
                <span className="mt-2 block text-lg font-semibold text-foreground">{e.label}</span>
                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                  {e.cta}
                  <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
      </ul>
      {shows("reading") && (
        <p className="text-sm studio-muted">
          Đọc văn bản của bạn, tra từ và lưu từ mới:{" "}
          <Link to="/app/reader" className="studio-link">
            Mở trình đọc
          </Link>
        </p>
      )}
    </>
  );
}

interface Hit {
  key: string;
  jp: string;
  /** grammar patterns mix Vietnamese notes into the Japanese, so they stay in the sans face */
  plain?: boolean;
  main: string;
  sub: string;
  link: React.ReactNode;
}

/** Search results by kind: vocabulary from the Tango search API, grammar, kanji and kana from the app's own data. */
function Results({ q, shows }: { q: string; shows: (g: Group) => boolean }) {
  const vocab = useTangoSearchQuery(q, "N5");
  const grammarAll = useQuery({
    queryKey: ["grammar", "N5"],
    queryFn: () => loadGrammarLevel("N5"),
    staleTime: Infinity,
  });
  const lower = q.toLowerCase();
  const kana = useMemo(
    () => KANA_ALL.filter((k) => k.kana === q || k.romaji === lower || k.romaji.startsWith(lower)),
    [q, lower],
  );
  const kanji = useMemo(() => searchKanji(q), [q]);
  const grammar = useMemo(
    () => (grammarAll.data ? searchGrammar(grammarAll.data, q) : []),
    [grammarAll.data, q],
  );

  const groups: { id: Group; title: string; to: string; loading?: boolean; hits: Hit[] }[] = [
    {
      id: "vocab",
      title: "Từ vựng",
      to: "/app/japanese/tango",
      loading: vocab.isFetching && !vocab.data,
      hits: (vocab.data?.vocabularies ?? []).map((v) => ({
        key: `v${v.vocabularyId}`,
        jp: v.expression ?? v.kana,
        main: v.primaryMeaning ?? "",
        sub: v.expression && v.expression !== v.kana ? v.kana : "",
        link: (
          <Link
            to="/app/japanese/tango/vocabularies/$vocabularyId"
            params={{ vocabularyId: String(v.vocabularyId) }}
            className="absolute inset-0"
            aria-label={`${v.expression ?? v.kana}: ${v.primaryMeaning ?? ""}`}
          />
        ),
      })),
    },
    {
      id: "grammar",
      title: "Ngữ pháp",
      to: "/app/japanese/grammar",
      loading: grammarAll.isPending,
      hits: grammar.map((g) => ({
        key: `g${g.id}`,
        jp: g.displayPattern,
        plain: true,
        main: g.meaningVi ?? "",
        sub: "",
        link: (
          <Link
            to="/app/japanese/grammar/$grammarId"
            params={{ grammarId: g.id }}
            className="absolute inset-0"
            aria-label={`${g.displayPattern}: ${g.meaningVi ?? ""}`}
          />
        ),
      })),
    },
    {
      id: "kanji",
      title: "Kanji",
      to: "/app/japanese/kanji",
      hits: kanji.map((k) => ({
        key: `k${k.char}`,
        jp: k.char,
        main: `${k.hanViet} · ${k.meaning}`,
        sub: [...k.on, ...k.kun].slice(0, 3).join("、"),
        link: (
          <Link
            to="/app/japanese/kanji"
            search={{ k: k.char }}
            className="absolute inset-0"
            aria-label={`${k.char}: ${k.hanViet}, ${k.meaning}`}
          />
        ),
      })),
    },
    {
      id: "kana",
      title: "Kana",
      to: "/app/japanese/alphabet",
      hits: kana.map((k) => ({
        key: `${k.script}${k.kana}`,
        jp: k.kana,
        main: k.romaji,
        sub: k.script === "hiragana" ? "Hiragana" : "Katakana",
        link: (
          <Link
            to="/app/japanese/alphabet"
            className="absolute inset-0"
            aria-label={`${k.kana}: ${k.romaji}`}
          />
        ),
      })),
    },
  ];
  const visible = groups.filter((g) => shows(g.id));
  const anyLoading = visible.some((g) => g.loading);
  const total = visible.reduce((n, g) => n + g.hits.length, 0);

  return (
    <section aria-live="polite" aria-busy={anyLoading} className="space-y-10">
      <p className="text-sm studio-muted">
        {anyLoading ? "Đang tìm…" : total === 0 ? "" : `${total} kết quả cho “${q}”`}
      </p>
      {!anyLoading && total === 0 && (
        <div className="studio-rule-t studio-rule-b space-y-2 py-8">
          <p className="studio-head text-2xl">Không tìm thấy “{q}”</p>
          <p className="text-sm studio-muted">
            Thử gõ nghĩa tiếng Việt, cách đọc romaji (ví dụ: “ka”), chữ kana hoặc kanji.
          </p>
        </div>
      )}
      {vocab.isError && shows("vocab") && (
        <p role="alert" className="text-sm text-destructive">
          Chưa tìm được từ vựng. Thử lại sau.
        </p>
      )}
      {visible
        .filter((g) => g.hits.length > 0)
        .map((g) => (
          <div key={g.id} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h2 className="studio-kicker studio-kicker-muted">
                {g.title} · {g.hits.length}
              </h2>
              {g.hits.length > SHOW && (
                <Link to={g.to} className="studio-link text-sm">
                  Mở {g.title.toLowerCase()}
                </Link>
              )}
            </div>
            <ul className="studio-rule-t grid sm:grid-cols-2 sm:gap-x-8">
              {g.hits.slice(0, SHOW).map((h) => (
                <li
                  key={h.key}
                  className="studio-row studio-rule-b relative grid min-h-14 grid-cols-[minmax(4rem,auto)_1fr] items-center gap-4 px-2 py-2.5"
                >
                  <span
                    lang="ja"
                    className={h.plain ? "text-base font-medium" : "studio-jp text-xl"}
                  >
                    {h.jp}
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block truncate">{h.main}</span>
                    {h.sub && (
                      <span lang="ja" className="block truncate text-xs studio-muted">
                        {h.sub}
                      </span>
                    )}
                  </span>
                  {h.link}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}
