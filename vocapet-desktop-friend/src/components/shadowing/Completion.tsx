import { Link } from "@tanstack/react-router";
import type { ShadowingSessionRequest } from "@/api/shadowing.api";
import { formatTime } from "@/components/audio/AudioPlayer";
import { LineText } from "@/components/listening/ExerciseCards";
import { Button } from "@/components/ui/button";
import {
  CHECKS,
  MODES,
  sentenceKey,
  type Recommendation,
  type Unit,
} from "@/lib/shadowing/session";

export function Completion({
  unit,
  request,
  matches,
  saving,
  saveError,
  onRetrySave,
  onRestart,
  next,
}: {
  unit: Unit;
  request: ShadowingSessionRequest;
  matches: number[];
  saving: boolean;
  saveError: Error | null;
  onRetrySave: () => void;
  onRestart: () => void;
  next: Recommendation | null;
}) {
  const { sentences } = request;
  const complete = sentences.length === unit.lines.length;
  const recordings = sentences.reduce((n, s) => n + s.recordings, 0);
  const stats = [
    ["Câu đã luyện", `${sentences.length}/${unit.lines.length}`],
    ["Lần ghi âm", recordings],
    ["Thời gian", formatTime(request.durationSeconds)],
    ...(matches.length
      ? [
          [
            "Khớp nội dung TB",
            `${Math.round(matches.reduce((a, b) => a + b, 0) / matches.length)}%`,
          ],
        ]
      : []),
  ];
  const label = Object.fromEntries(CHECKS);
  const hard = unit.lines.flatMap((line) => {
    const result = sentences.find((s) => s.sentenceKey === sentenceKey(unit, line));
    return result?.missed.length ? [{ line, missed: result.missed }] : [];
  });
  const judged = sentences.some((s) => s.passed.length || s.missed.length);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="studio-seal"
          data-state="done"
          data-stamp
          style={{ "--seal-size": "3.5rem" } as React.CSSProperties}
        >
          済
        </span>
        <div>
          <p className="studio-kicker">
            {complete ? "Hoàn thành bài shadowing" : "Đã kết thúc buổi luyện"}
          </p>
          <h1 className="studio-head text-2xl">{unit.title}</h1>
          <p className="text-sm text-muted-foreground">{MODES[request.mode].title}</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([name, value]) => (
          <div key={name} className="ref-card flex flex-col-reverse items-center p-3 text-center">
            <dt className="text-xs text-muted-foreground">{name}</dt>
            <dd className="studio-head text-2xl">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Hoàn thành bài không có nghĩa là phát âm đã chuẩn hay đã thuộc từ vựng, ngữ pháp. Bản ghi âm
        đã được xoá khỏi trình duyệt và chưa từng được tải lên.
      </p>

      {saving ? (
        <p role="status" className="text-sm">
          Đang lưu kết quả (không gửi âm thanh)…
        </p>
      ) : saveError ? (
        <div role="alert" className="border-l-2 border-seal py-2 pl-4 text-sm">
          <p className="font-semibold">Chưa lưu được kết quả</p>
          <p className="text-muted-foreground">
            {saveError.message}. Giữ nguyên trang này rồi thử lại.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetrySave}>
            Thử lại
          </Button>
        </div>
      ) : (
        <p role="status" className="text-sm text-primary">
          Đã lưu kết quả.
        </p>
      )}

      <section aria-label="Điểm cần luyện" className="ref-card space-y-2 p-4">
        <h2 className="font-bold">Điểm bạn tự đánh giá là chưa ổn</h2>
        {hard.length ? (
          <ul className="divide-y divide-border">
            {hard.map(({ line, missed }) => (
              <li key={line.index} className="py-2">
                <p className="text-lg leading-loose">
                  <LineText line={line} />
                </p>
                <p className="text-sm text-muted-foreground">
                  Chưa đạt: {missed.map((c) => label[c].replace(/^Tôi /, "")).join("; ")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {judged ? "Bạn không đánh dấu điểm nào chưa ổn." : "Bạn chưa tự đánh giá câu nào."}
          </p>
        )}
      </section>

      {next && (
        <p className="studio-note text-sm">
          <b>Nên luyện tiếp:</b> {next.unit.title}. {next.reason}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {next && (
          <Button asChild className="h-11 rounded-full">
            <Link
              to="/app/shadowing/$unitId"
              params={{ unitId: next.unit.id }}
              search={{ mode: request.mode }}
            >
              Bài tiếp theo
            </Link>
          </Button>
        )}
        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={onRestart}>
          Luyện lại
        </Button>
        <Button asChild variant="ghost" className="h-11 rounded-full">
          <Link to="/app/shadowing">Chọn bài khác</Link>
        </Button>
      </div>
    </div>
  );
}
