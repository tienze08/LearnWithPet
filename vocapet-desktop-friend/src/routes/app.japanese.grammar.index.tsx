import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GRAMMAR_LEVELS, GROUP_LABEL, GRAMMAR_META, type GrammarGroupId } from "@/data/japanese/grammar";
import { GrammarList, type Status } from "@/components/grammar/GrammarList";
import type { LevelFilter } from "@/lib/japanese/grammar/search";

type Search = { level?: LevelFilter; group?: GrammarGroupId; q?: string; status?: Status };

// Filters live in the URL (?level=&group=&q=) so the back link from a detail page keeps them. Default level: N5.
export const Route = createFileRoute("/app/japanese/grammar/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    level: s.level === "ALL" || GRAMMAR_LEVELS.includes(s.level as never) ? (s.level as LevelFilter) : undefined,
    group: typeof s.group === "string" && s.group in GROUP_LABEL ? (s.group as GrammarGroupId) : undefined,
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    status: s.status === "TODO" || s.status === "LEARNED" || s.status === "FAVORITE" ? s.status : undefined,
  }),
  component: GrammarPage,
});

function GrammarPage() {
  const { level = "N5", group, q = "", status = "ALL" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ngữ pháp</h1>
        <p className="text-sm text-muted-foreground">Các mẫu ngữ pháp theo cấp JLPT. Chọn một mẫu để xem cách dùng và ví dụ.</p>
      </header>
      <GrammarList
        level={level}
        group={group ?? "ALL"}
        q={q}
        status={status}
        onChange={(p) =>
          navigate({
            search: (prev) => ({
              level: p.level ?? prev.level,
              group: p.group === undefined ? prev.group : p.group === "ALL" ? undefined : p.group,
              q: p.q === undefined ? prev.q : p.q || undefined,
              status: p.status === undefined ? prev.status : p.status === "ALL" ? undefined : p.status,
            }),
            replace: true,
          })
        }
      />
      <p className="text-xs text-muted-foreground">
        Dữ liệu ngữ pháp:{" "}
        <a className="font-semibold text-primary hover:underline" href={GRAMMAR_META.url} target="_blank" rel="noreferrer">
          OpenJLPT
        </a>{" "}
        ({GRAMMAR_META.licence}). Phần tiếng Việt do VocaPet biên soạn, là bản nháp chưa kiểm duyệt.
      </p>
    </div>
  );
}
