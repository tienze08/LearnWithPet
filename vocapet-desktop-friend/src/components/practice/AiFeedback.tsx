import type { GradeIssueType, GradeResponse, GradeVerdict } from "@/api/translation.api";

const VERDICT: Record<GradeVerdict, string> = {
  CORRECT: "Đúng",
  ACCEPTABLE: "Chấp nhận được",
  INCORRECT: "Chưa đúng",
};
const ISSUE: Record<GradeIssueType, string> = {
  GRAMMAR: "Ngữ pháp",
  VOCABULARY: "Từ vựng",
  PARTICLE: "Trợ từ",
  MEANING: "Ý nghĩa",
};

export function AiFeedback({ result }: { result: GradeResponse }) {
  return (
    <div role="status" className="space-y-2 rounded-lg border border-border bg-sheet p-4 text-sm">
      <p className="font-bold">AI nhận xét: {VERDICT[result.verdict]}</p>
      {result.issues.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {result.issues.map((i, n) => (
            <li key={n}>
              <b>{ISSUE[i.type] ?? i.type}:</b> {i.detail}
            </li>
          ))}
        </ul>
      )}
      <p>{result.explanation}</p>
      {result.suggestion && (
        <p>
          Gợi ý câu: <b>{result.suggestion}</b>
        </p>
      )}
      <p className="text-xs text-muted-foreground">AI có thể chấm sai.</p>
    </div>
  );
}
