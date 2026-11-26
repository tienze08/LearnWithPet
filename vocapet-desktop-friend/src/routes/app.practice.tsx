import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import {
  GRAMMAR,
  SENTENCES,
  VOCABULARY,
  type Grammar,
  type Sentence,
} from "@/lib/sentence-practice";

export const Route = createFileRoute("/app/practice")({
  component: PracticePage,
});

type Result = true | false | "disputed";
type Attempt = { sentence: Sentence; result: Result; answer: string };
type Session = { grammar: Grammar; queue: Sentence[]; attempts: Attempt[] };

const PRIMARY =
  "rounded-xl border-2 border-primary bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40";
const SECONDARY =
  "rounded-xl border-2 border-border bg-card px-4 py-2 text-sm font-bold hover:border-primary";

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function isAccepted(sentence: Sentence, tiles: string[]) {
  return sentence.accepted.some((order) => order.join("|") === tiles.join("|"));
}

// Câu kiểm tra luôn đứng sau câu luyện tập.
function startSession(grammar: Grammar): Session {
  const own = SENTENCES.filter((s) => s.grammar === grammar.id);
  return {
    grammar,
    queue: [
      ...shuffle(own.filter((s) => s.set === "practice")),
      ...shuffle(own.filter((s) => s.set === "check")),
    ],
    attempts: [],
  };
}

function PracticePage() {
  const [session, setSession] = useState<Session | null>(null);

  if (!session) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-3xl font-extrabold">Luyện câu N5 · bài 1–5</h1>
          <p className="text-sm text-muted-foreground">
            Bản thử nghiệm, nội dung chưa được duyệt. Kết quả chưa được lưu vào tiến trình học.
          </p>
        </header>
        {GRAMMAR.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`${SECONDARY} block w-full p-4 text-left`}
            onClick={() => setSession(startSession(g))}
          >
            <span className="block text-base">
              Bài {g.lesson}: {g.title}
            </span>
            <span className="mt-1 block font-normal text-muted-foreground">{g.note}</span>
          </button>
        ))}
      </div>
    );
  }

  const index = session.attempts.length;
  const sentence = session.queue[index];
  const record = (result: Result, answer = "") =>
    setSession({
      ...session,
      attempts: [...session.attempts, { sentence, result, answer }],
    });

  return (
    <div className="space-y-4">
      <button type="button" className={SECONDARY} onClick={() => setSession(null)}>
        ← Chọn mẫu khác
      </button>
      {sentence ? (
        <>
          <p className="text-sm text-muted-foreground">
            Câu {index + 1}/{session.queue.length} ·{" "}
            {sentence.set === "check" ? "Kiểm tra (câu mới)" : "Luyện tập"}
          </p>
          <div className="space-y-3 rounded-2xl border-2 border-border bg-card p-4">
            <p className="text-xs font-bold text-muted-foreground">{session.grammar.note}</p>
            {sentence.mode === "build" ? (
              <BuildCard key={sentence.id} sentence={sentence} onDone={record} />
            ) : (
              <ReadCard key={sentence.id} sentence={sentence} onDone={record} />
            )}
          </div>
        </>
      ) : (
        <Summary session={session} />
      )}
    </div>
  );
}

type CardProps = {
  sentence: Sentence;
  onDone: (result: Result, answer?: string) => void;
};

function AnswerKey({ sentence }: { sentence: Sentence }) {
  return (
    <div lang="ja">
      <p className="text-2xl">{sentence.ja}</p>
      <p className="text-sm text-muted-foreground">{sentence.kana}</p>
    </div>
  );
}

function Tile({
  word,
  onClick,
  disabled,
}: {
  word: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const kana = VOCABULARY[word]?.kana;
  return (
    <button
      type="button"
      lang="ja"
      className={`${SECONDARY} text-lg`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="block">{word}</span>
      {kana && kana !== word && (
        <span className="block text-[11px] font-normal text-muted-foreground">{kana}</span>
      )}
    </button>
  );
}

function BuildCard({ sentence, onDone }: CardProps) {
  const [order] = useState(() => {
    let next = sentence.tiles.map((_, i) => i);
    // Tránh hiện sẵn đáp án đúng.
    for (let i = 0; i < 20; i++) {
      next = shuffle(next);
      if (
        !isAccepted(
          sentence,
          next.map((n) => sentence.tiles[n]),
        )
      )
        break;
    }
    return next;
  });
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);

  const words = picked.map((n) => sentence.tiles[n]);
  const answer = words.join("");
  const correct = isAccepted(sentence, words);

  return (
    <>
      <p className="text-xs text-muted-foreground">Ghép câu tiếng Nhật</p>
      <p className="font-bold">{sentence.vi}</p>
      <div className="flex min-h-20 flex-wrap gap-2 border-b-2 border-dashed border-border pb-3">
        {picked.map((n) => (
          <Tile
            key={n}
            word={sentence.tiles[n]}
            disabled={checked}
            onClick={() => setPicked(picked.filter((p) => p !== n))}
          />
        ))}
      </div>
      {!checked ? (
        <>
          <div className="flex flex-wrap gap-2">
            {order
              .filter((n) => !picked.includes(n))
              .map((n) => (
                <Tile key={n} word={sentence.tiles[n]} onClick={() => setPicked([...picked, n])} />
              ))}
          </div>
          <button
            type="button"
            className={PRIMARY}
            disabled={picked.length !== sentence.tiles.length}
            onClick={() => setChecked(true)}
          >
            Kiểm tra
          </button>
        </>
      ) : (
        <>
          <p role="status" className="font-extrabold">
            {correct ? "✓ Đúng" : "✗ Chưa khớp đáp án"}
          </p>
          <p className="text-xs text-muted-foreground">Đáp án mẫu</p>
          <AnswerKey sentence={sentence} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={PRIMARY} onClick={() => onDone(correct, answer)}>
              Tiếp
            </button>
            {!correct && (
              <button
                type="button"
                className={SECONDARY}
                onClick={() => onDone("disputed", answer)}
              >
                Câu của tôi cũng đúng?
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

function ReadCard({ sentence, onDone }: CardProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Nói hoặc viết nghĩa tiếng Việt, rồi xem đáp án
      </p>
      <AnswerKey sentence={sentence} />
      {!revealed ? (
        <button type="button" className={PRIMARY} onClick={() => setRevealed(true)}>
          Xem đáp án
        </button>
      ) : (
        <>
          <p className="font-bold">{sentence.vi}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={PRIMARY} onClick={() => onDone(true)}>
              Tôi hiểu đúng
            </button>
            <button type="button" className={SECONDARY} onClick={() => onDone(false)}>
              Tôi hiểu sai
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Summary({ session }: { session: Session }) {
  const [copyLabel, setCopyLabel] = useState("Sao chép kết quả");
  const score = (set: Sentence["set"]) => {
    const own = session.attempts.filter((a) => a.sentence.set === set);
    return `${own.filter((a) => a.result === true).length}/${own.length}`;
  };
  const report = [
    `Mẫu ${session.grammar.id} · ${new Date().toISOString().slice(0, 10)}`,
    `Luyện: ${score("practice")} · Câu mới: ${score("check")}`,
    ...session.attempts
      .filter((a) => a.result !== true)
      .map(
        (a) =>
          `${a.sentence.id} ${a.sentence.mode} ${a.result === "disputed" ? "KHIẾU NẠI" : "sai"} ${a.answer}`,
      ),
  ].join("\n");

  return (
    <div className="space-y-3 rounded-2xl border-2 border-border bg-card p-4">
      <h2 className="text-2xl font-extrabold">Câu mới: {score("check")}</h2>
      <p>Luyện tập: {score("practice")}</p>
      <textarea
        readOnly
        aria-label="Kết quả"
        className="h-40 w-full rounded-xl border-2 border-border bg-background p-2 text-sm"
        value={report}
      />
      <button
        type="button"
        className={PRIMARY}
        onClick={() =>
          navigator.clipboard
            .writeText(report)
            .then(() => setCopyLabel("Đã chép"))
            .catch(() => setCopyLabel("Hãy chép từ ô trên"))
        }
      >
        {copyLabel}
      </button>
    </div>
  );
}
