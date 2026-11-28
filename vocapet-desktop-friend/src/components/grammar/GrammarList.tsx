import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  AVAILABLE_LEVELS,
  GRAMMAR_LEVELS,
  GROUP_LABEL,
  loadAllGrammar,
  type GrammarGroupId,
} from "@/data/japanese/grammar";
import { searchGrammar, type GroupFilter, type LevelFilter } from "@/lib/japanese/grammar/search";
import { useMarks } from "@/lib/japanese/grammar/progress";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import { GrammarCard } from "./GrammarCard";

export type Status = "ALL" | "TODO" | "LEARNED" | "FAVORITE";
const STATUS: { id: Status; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "TODO", label: "Chưa học" },
  { id: "LEARNED", label: "Đã học" },
  { id: "FAVORITE", label: "Yêu thích" },
];
const LEVEL_CHIPS: LevelFilter[] = ["ALL", ...GRAMMAR_LEVELS];

function Chip({
  active,
  dim,
  onClick,
  children,
}: {
  active: boolean;
  dim?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-9 rounded-full px-3 text-xs font-semibold transition-colors ${active ? "bg-primary-soft text-primary-ink" : "bg-surface-2 hover:bg-primary-soft"} ${dim && !active ? "text-muted-foreground" : ""}`}
    >
      {children}
    </button>
  );
}

type Change = { level?: LevelFilter; group?: GroupFilter; q?: string; status?: Status };
const ROW =
  "flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 [&>button]:shrink-0"; // one scrollable row on phones, wraps from sm up

/** Grammar list: level chips, group chips, search, learning-status filter. Data is loaded on demand. */
export function GrammarList({
  level,
  group,
  q,
  status,
  onChange,
}: {
  level: LevelFilter;
  group: GroupFilter;
  q: string;
  status: Status;
  onChange: (p: Change) => void;
}) {
  const learned = useMarks("learned");
  const favorites = useMarks("favorite");
  const query = useQuery({
    queryKey: ["grammar", "all"],
    queryFn: loadAllGrammar,
    staleTime: Infinity,
  });

  const inLevel = useMemo(
    () => (query.data ?? []).filter((g) => level === "ALL" || g.level === level),
    [query.data, level],
  );
  const groups = useMemo(
    () => [...new Set(inLevel.flatMap((g) => g.groups))] as GrammarGroupId[],
    [inLevel],
  );
  const shown = useMemo(
    () =>
      searchGrammar(inLevel, q).filter(
        (g) =>
          (group === "ALL" || g.groups.includes(group)) &&
          (status === "ALL" ||
            (status === "TODO"
              ? !learned.has(g.id)
              : status === "LEARNED"
                ? learned.has(g.id)
                : favorites.has(g.id))),
      ),
    [inLevel, q, group, status, learned, favorites],
  );
  const noData = level !== "ALL" && !AVAILABLE_LEVELS.includes(level);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Tìm ngữ pháp theo mẫu, nghĩa, cấu trúc, từ khóa hoặc cách đọc"
          placeholder="Mẫu câu, nghĩa, cấu trúc, cách đọc…"
          className="pl-9"
          value={q}
          onChange={(e) => onChange({ q: e.target.value })}
        />
      </div>

      <div className={ROW} role="group" aria-label="Cấp độ JLPT">
        {LEVEL_CHIPS.map((l) => (
          <Chip
            key={l}
            active={level === l}
            dim={l !== "ALL" && !AVAILABLE_LEVELS.includes(l)}
            onClick={() => onChange({ level: l, group: "ALL" })}
          >
            {l === "ALL" ? "Tất cả" : l}
          </Chip>
        ))}
      </div>

      {!noData && groups.length > 1 && (
        <div className={ROW} role="group" aria-label="Nhóm ngữ pháp">
          <Chip active={group === "ALL"} onClick={() => onChange({ group: "ALL" })}>
            Mọi nhóm
          </Chip>
          {groups.map((x) => (
            <Chip key={x} active={group === x} onClick={() => onChange({ group: x })}>
              {GROUP_LABEL[x]}
            </Chip>
          ))}
        </div>
      )}
      {!noData && (
        <div className={ROW} role="group" aria-label="Trạng thái học">
          {STATUS.map((s) => (
            <Chip key={s.id} active={status === s.id} onClick={() => onChange({ status: s.id })}>
              {s.label}
            </Chip>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <LoadingBlock rows={4} />
      ) : query.isError ? (
        <ErrorBlock error={query.error} onRetry={() => query.refetch()} />
      ) : noData ? (
        <EmptyBlock title={`${level}: chưa có dữ liệu`}>
          Ngữ pháp cấp này chưa được thêm vào VocaPet.
        </EmptyBlock>
      ) : (
        <>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Phần tiếng Việt là bản nháp do VocaPet biên soạn, chưa được kiểm duyệt.
          </p>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {shown.length}/{inLevel.length} mẫu ngữ pháp · Đã học{" "}
            {inLevel.filter((g) => learned.has(g.id)).length}/{inLevel.length}
          </p>
          {shown.length === 0 ? (
            <EmptyBlock title="Không tìm thấy mẫu ngữ pháp phù hợp">
              Thử bỏ bớt bộ lọc hoặc đổi từ khóa.
            </EmptyBlock>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((g) => (
                <GrammarCard
                  key={g.id}
                  g={g}
                  learned={learned.has(g.id)}
                  favorite={favorites.has(g.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
