import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import { StudyRunner } from "@/components/learning-path/StudyRunner";
import { BLOCK_ORDER, getToday, type BlockType } from "@/api/learning-path.api";
import {
  usePathReviewQueueQuery,
  usePathStatusQuery,
  useTodayQuery,
} from "@/hooks/queries/learning-path.queries";
import { usePathContent } from "@/lib/learning-path/content";

/** DUE = grammar/kanji due now, opened from the Review Center (outside the frozen Today plan). */
type StudyBlock = BlockType | "DUE";
const BLOCKS: StudyBlock[] = [...BLOCK_ORDER, "DUE"];

const TITLE: Record<StudyBlock, string> = {
  GRAMMAR: "Ngữ pháp hôm nay",
  VOCAB: "Từ vựng hôm nay",
  KANJI: "Kanji hôm nay",
  REVIEW: "Ôn tập hôm nay",
  DUE: "Ôn Ngữ pháp và Kanji",
};

export const Route = createFileRoute("/app/path/study")({
  validateSearch: (s: Record<string, unknown>): { block: StudyBlock } => ({
    block: BLOCKS.includes(s.block as StudyBlock) ? (s.block as StudyBlock) : "GRAMMAR",
  }),
  component: StudyPage,
});

function StudyPage() {
  const { block } = Route.useSearch();
  const status = usePathStatusQuery();
  const ready = status.data?.enabled === true && status.data.onboarded;
  const today = useTodayQuery(ready && block !== "DUE");
  const due = usePathReviewQueueQuery(ready && block === "DUE");
  const { content, isLoading, error, refetch } = usePathContent();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const back = block === "DUE" ? "/app/review" : "/app/path";
  const header = (
    <div className="flex items-center gap-3">
      <Link
        to={back}
        aria-label="Quay lại"
        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-2xl font-bold">{TITLE[block]}</h1>
    </div>
  );

  if (status.isPending || isLoading || (block === "DUE" ? due.isPending : today.isPending))
    return <LoadingBlock rows={3} />;
  if (!ready)
    return (
      <EmptyBlock title="Bạn chưa thiết lập lộ trình học">
        <Link to="/app/path/setup" className="font-semibold text-primary">
          Thiết lập ngay
        </Link>
      </EmptyBlock>
    );
  const loadError = error ?? (block === "DUE" ? due.error : today.error);
  if (loadError || !content)
    return (
      <ErrorBlock
        error={loadError}
        onRetry={() => {
          refetch();
          today.refetch();
          due.refetch();
        }}
      />
    );

  const items =
    block === "DUE"
      ? (due.data ?? []).map((i) => ({ ...i, done: false }))
      : (today.data?.blocks.find((b) => b.type === block)?.items ?? []);

  // After a block, go to the next unfinished one of today's plan, or back to Today.
  const onFinished = async () => {
    if (block === "DUE") {
      qc.invalidateQueries({ queryKey: ["path"] });
      navigate({ to: "/app/review" });
      return;
    }
    const fresh = await qc.fetchQuery({
      queryKey: ["path", "today"],
      queryFn: getToday,
      staleTime: 0,
    });
    const next = BLOCK_ORDER.map((t) => fresh.blocks.find((b) => b.type === t)).find(
      (b) => b && b.items.length > 0 && b.status !== "DONE",
    );
    if (next) navigate({ to: "/app/path/study", search: { block: next.type } });
    else navigate({ to: "/app/path" });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {header}
      {items.length === 0 ? (
        <EmptyBlock title="Không có nội dung nào ở phần này">
          <Link to={back} className="font-semibold text-primary">
            Quay lại
          </Link>
        </EmptyBlock>
      ) : (
        <StudyRunner
          key={block}
          items={items}
          review={block === "REVIEW" || block === "DUE"}
          content={content}
          onFinished={onFinished}
        />
      )}
    </div>
  );
}
