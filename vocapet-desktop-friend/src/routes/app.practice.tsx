import { createFileRoute, Link } from "@tanstack/react-router";

import { Session } from "@/components/practice/Session";
import { Card, Japanese, Kicker, PRIMARY, SECONDARY } from "@/components/practice/ui";
import { usePracticeProgress } from "@/hooks/usePracticeProgress";
import {
  newProgress,
  practiceCount,
  stageOf,
  statusLabel,
  type Progress,
} from "@/lib/practice-progress";
import { EXAMPLES, GRAMMAR, type Grammar } from "@/lib/sentence-practice";

type PracticeSearch = { g?: string; run?: boolean };

export const Route = createFileRoute("/app/practice")({
  validateSearch: (search: Record<string, unknown>): PracticeSearch => ({
    g: GRAMMAR.some((x) => x.id === search.g) ? (search.g as string) : undefined,
    run: search.run === true ? true : undefined,
  }),
  component: PracticePage,
});

// Danh sách mẫu → Hiểu mẫu (?g=) → Luyện, kiểm tra, kết quả (?g=&run=).
// Dùng URL để nút quay lại của trình duyệt đi đúng từng bước.
function PracticePage() {
  const { g, run } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { store, save } = usePracticeProgress();

  if (!store) return <p className="text-muted-foreground">Đang tải…</p>;

  const grammar = GRAMMAR.find((x) => x.id === g);
  const toList = () => navigate({ search: {} });

  if (!grammar) {
    return <PatternList store={store} onOpen={(id) => navigate({ search: { g: id } })} />;
  }

  const progress = store[grammar.id];
  const change = (next: Progress) => save(grammar.id, next);

  if (run && progress) {
    return <Session grammar={grammar} progress={progress} onChange={change} onExit={toList} />;
  }

  return (
    <Learn
      grammar={grammar}
      progress={progress}
      onBack={toList}
      onStart={(restart) => {
        if (!progress || restart) change(newProgress(grammar.id));
        navigate({ search: { g: grammar.id, run: true } });
      }}
    />
  );
}

function PatternList({
  store,
  onOpen,
}: {
  store: Record<string, Progress>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/app" className="inline-block py-2 text-sm font-extrabold text-primary">
        ← Trang chủ
      </Link>
      <h1 className="text-3xl font-extrabold">Luyện câu N5</h1>
      <p className="text-sm text-muted-foreground">
        Mỗi mẫu: đọc kiến thức, luyện, rồi kiểm tra bằng câu mới. Bản thử nghiệm, nội dung chưa được
        duyệt.
      </p>
      {GRAMMAR.map((g) => (
        <button
          key={g.id}
          type="button"
          className={`${SECONDARY} space-y-2 p-4 !text-left`}
          onClick={() => onOpen(g.id)}
        >
          <span className="flex justify-between gap-3 text-sm">
            <span>Bài {g.lesson}</span>
            <span className="text-primary">{statusLabel(g.id, store[g.id])}</span>
          </span>
          <span className="block">{g.title}</span>
        </button>
      ))}
    </div>
  );
}

function startLabel(grammar: Grammar, progress: Progress | undefined) {
  if (!progress) return "Bắt đầu luyện";
  switch (stageOf(grammar.id, progress)) {
    case "practice":
      return `Tiếp tục câu ${progress.answers.length + 1}/${practiceCount(grammar.id)}`;
    case "gate":
      return "Sang phần kiểm tra";
    case "check":
      return "Tiếp tục kiểm tra";
    case "retry":
      return "Tiếp tục luyện lại";
    case "result":
      return "Xem kết quả";
  }
}

function Learn({
  grammar,
  progress,
  onBack,
  onStart,
}: {
  grammar: Grammar;
  progress: Progress | undefined;
  onBack: () => void;
  onStart: (restart: boolean) => void;
}) {
  const done = progress && stageOf(grammar.id, progress) === "result";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <button type="button" className="py-2 text-sm font-extrabold text-primary" onClick={onBack}>
        ← Danh sách mẫu
      </button>
      <Kicker>Bài {grammar.lesson} · Hiểu mẫu</Kicker>
      <h1 className="text-2xl font-extrabold">{grammar.title}</h1>
      <Card>
        <p>{grammar.note}</p>
      </Card>
      {EXAMPLES[grammar.id].map((e) => (
        <Card key={e.ja}>
          <Japanese ja={e.ja} kana={e.kana} />
          <p>{e.vi}</p>
        </Card>
      ))}
      <button type="button" className={PRIMARY} onClick={() => onStart(false)}>
        {startLabel(grammar, progress)}
      </button>
      {done && (
        <>
          <button type="button" className={SECONDARY} onClick={() => onStart(true)}>
            Làm lại từ đầu
          </button>
          <p className="text-sm text-muted-foreground">
            Làm lại sẽ xóa kết quả cũ. Câu kiểm tra khi đó không còn là câu mới.
          </p>
        </>
      )}
    </div>
  );
}
