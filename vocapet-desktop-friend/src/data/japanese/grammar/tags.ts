import type { GrammarGroupId, SourceGrammar } from "./types";

export const GROUP_LABEL: Record<GrammarGroupId, string> = {
  particle: "Trợ từ",
  verb: "Động từ",
  adjective: "Tính từ",
  sentence: "Thể câu",
  condition: "Điều kiện",
  time: "Thời gian",
  reason: "Nguyên nhân, lý do",
  comparison: "So sánh",
  wish: "Mong muốn, ý định",
  rule: "Nhờ vả, cho phép, bắt buộc",
  other: "Khác",
};

// A group is assigned only when the source's own tags (or formation tokens) say so. Nothing is inferred beyond that.
const BY_TAG: Partial<Record<GrammarGroupId, string[]>> = {
  particle: ["particle"],
  sentence: ["copula", "negation", "question", "politeness", "casual", "tense"],
  condition: ["condition"],
  time: ["time", "sequence", "simultaneity", "completion"],
  reason: ["reason"],
  comparison: ["comparison"],
  wish: ["desire", "decision", "purpose", "invitation", "suggestion"],
  rule: ["request", "permission", "prohibition", "obligation", "necessity"],
};

/** Groups of one point: by tag, plus verb/adjective from the formation tokens. "other" when none applies. */
export function groupsOf(g: Pick<SourceGrammar, "tags" | "formation">): GrammarGroupId[] {
  const out = new Set<GrammarGroupId>();
  for (const [group, tags] of Object.entries(BY_TAG)) if (tags!.some((t) => g.tags.includes(t))) out.add(group as GrammarGroupId);
  if (/Verb/.test(g.formation)) out.add("verb");
  if (/Adj/.test(g.formation)) out.add("adjective");
  return out.size ? [...out] : ["other"];
}
