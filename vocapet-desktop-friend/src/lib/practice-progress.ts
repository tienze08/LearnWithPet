// Logic tiến độ của phần luyện câu. Không phụ thuộc React để dễ kiểm tra.
import { SENTENCES, type Sentence } from "@/lib/sentence-practice";

export type Result = "correct" | "wrong" | "disputed";
// result = null: câu đọc hiểu trong phần kiểm tra, chờ người học tự chấm.
export type Answer = { id: string; result: Result | null; answer: string };
export type Progress = {
  queue: string[];
  answers: Answer[];
  checkStarted: boolean;
  retry: string[];
};
export type Store = Record<string, Progress>;
export type Stage = "practice" | "gate" | "check" | "result" | "retry";

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function getSentence(id: string): Sentence {
  return SENTENCES.find((s) => s.id === id)!;
}

function sentencesOf(grammarId: string, set: Sentence["set"]) {
  return SENTENCES.filter((s) => s.grammar === grammarId && s.set === set);
}

export function practiceCount(grammarId: string) {
  return sentencesOf(grammarId, "practice").length;
}

// Câu kiểm tra luôn đứng sau câu luyện tập.
export function newProgress(grammarId: string): Progress {
  const ids = (set: Sentence["set"]) => shuffle(sentencesOf(grammarId, set)).map((s) => s.id);
  return {
    queue: [...ids("practice"), ...ids("check")],
    answers: [],
    checkStarted: false,
    retry: [],
  };
}

export function stageOf(grammarId: string, p: Progress): Stage {
  if (p.retry.length > 0) return "retry";
  const practice = practiceCount(grammarId);
  if (p.answers.length < practice) return "practice";
  if (p.answers.length >= p.queue.length) return "result";
  return p.checkStarted ? "check" : "gate";
}

export function needsReview(p: Progress) {
  return p.answers.filter((a) => a.result === "wrong" || a.result === "disputed");
}

export function setResult(p: Progress, id: string, result: Result): Progress {
  return { ...p, answers: p.answers.map((a) => (a.id === id ? { ...a, result } : a)) };
}

export function score(p: Progress, set: Sentence["set"]) {
  const own = p.answers.filter((a) => getSentence(a.id).set === set);
  return {
    correct: own.filter((a) => a.result === "correct").length,
    total: own.length,
    pending: own.filter((a) => a.result === null).length,
  };
}

export function statusLabel(grammarId: string, p: Progress | undefined) {
  if (!p) return "Chưa học";
  const practice = practiceCount(grammarId);
  const check = p.queue.length - practice;
  switch (stageOf(grammarId, p)) {
    case "practice":
      return `Đang luyện ${p.answers.length + 1}/${practice}`;
    case "gate":
      return "Chờ kiểm tra";
    case "check":
      return `Đang kiểm tra ${p.answers.length - practice + 1}/${check}`;
    case "retry":
      return "Đang luyện lại";
    case "result": {
      const s = score(p, "check");
      return s.pending ? "Chờ tự chấm" : `Câu mới: ${s.correct}/${s.total}`;
    }
  }
}

// Bỏ qua dữ liệu cũ hoặc hỏng thay vì làm sập trang.
export function parseStore(raw: string | null): Store {
  try {
    const data: unknown = JSON.parse(raw ?? "{}");
    if (!data || typeof data !== "object") return {};
    const known = (grammarId: string, id: unknown) =>
      SENTENCES.some((s) => s.id === id && s.grammar === grammarId);
    return Object.fromEntries(
      Object.entries(data as Store).filter(
        ([g, p]) =>
          Array.isArray(p?.queue) &&
          Array.isArray(p.answers) &&
          Array.isArray(p.retry) &&
          p.queue.length > 0 &&
          p.queue.length === SENTENCES.filter((s) => s.grammar === g).length &&
          p.queue.every((id) => known(g, id)) &&
          p.retry.every((id) => known(g, id)) &&
          p.answers.length <= p.queue.length &&
          p.answers.every((a, i) => a?.id === p.queue[i]),
      ),
    );
  } catch {
    return {};
  }
}
