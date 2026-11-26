import { useState } from "react";

import { Card, Japanese, PRIMARY, SECONDARY } from "@/components/practice/ui";
import { shuffle, type Result } from "@/lib/practice-progress";
import { VOCABULARY, type Sentence } from "@/lib/sentence-practice";

type CardProps = {
  sentence: Sentence;
  /** false trong phần kiểm tra: không báo đúng sai, không hiện đáp án. */
  feedback: boolean;
  onDone: (result: Result | null, answer: string) => void;
};

function isAccepted(sentence: Sentence, tiles: string[]) {
  return sentence.accepted.some((order) => order.join("|") === tiles.join("|"));
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
      className="min-h-12 rounded-xl border-2 border-border bg-card px-3 py-1 text-lg font-bold hover:border-primary"
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

export function BuildCard({ sentence, feedback, onDone }: CardProps) {
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
  const result: Result = isAccepted(sentence, words) ? "correct" : "wrong";
  const full = picked.length === sentence.tiles.length;
  const submit = () => (feedback ? setChecked(true) : onDone(result, words.join(" ")));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold">{sentence.vi}</h2>
      <div
        aria-label="Câu bạn ghép"
        className="flex min-h-24 flex-wrap content-start gap-2 border-b-2 border-dashed border-border pb-3"
      >
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
          <div aria-label="Các mảnh" className="flex min-h-24 flex-wrap content-start gap-2">
            {order
              .filter((n) => !picked.includes(n))
              .map((n) => (
                <Tile key={n} word={sentence.tiles[n]} onClick={() => setPicked([...picked, n])} />
              ))}
          </div>
          <button type="button" className={PRIMARY} disabled={!full} onClick={submit}>
            {!full ? "Chọn đủ các mảnh" : feedback ? "Kiểm tra" : "Nộp câu trả lời"}
          </button>
        </>
      ) : (
        <>
          <Card>
            <p role="status" className="font-extrabold">
              {result === "correct" ? "✓ Đúng" : "✗ Chưa khớp đáp án"}
            </p>
            <Japanese ja={sentence.ja} kana={sentence.kana} />
          </Card>
          <button type="button" className={PRIMARY} onClick={() => onDone(result, words.join(" "))}>
            Câu tiếp theo
          </button>
          {result === "wrong" && (
            <button
              type="button"
              className={SECONDARY}
              onClick={() => onDone("disputed", words.join(" "))}
            >
              Câu của tôi cũng đúng?
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function ReadCard({ sentence, feedback, onDone }: CardProps) {
  const [revealed, setRevealed] = useState(false);
  const [text, setText] = useState("");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold">Câu này nghĩa là gì?</h2>
      <Card>
        <Japanese ja={sentence.ja} kana={sentence.kana} />
      </Card>
      {!feedback ? (
        <>
          <textarea
            aria-label="Nghĩa tiếng Việt"
            placeholder="Viết nghĩa tiếng Việt"
            className="h-24 w-full rounded-2xl border-2 border-border bg-card p-3"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            className={PRIMARY}
            disabled={!text.trim()}
            onClick={() => onDone(null, text.trim())}
          >
            Nộp câu trả lời
          </button>
        </>
      ) : !revealed ? (
        <button type="button" className={PRIMARY} onClick={() => setRevealed(true)}>
          Xem đáp án
        </button>
      ) : (
        <>
          <Card>
            <p className="font-extrabold">{sentence.vi}</p>
          </Card>
          <button type="button" className={PRIMARY} onClick={() => onDone("correct", "")}>
            Tôi hiểu đúng
          </button>
          <button type="button" className={SECONDARY} onClick={() => onDone("wrong", "")}>
            Tôi hiểu sai
          </button>
        </>
      )}
    </div>
  );
}
