// OpenJLPT's formation field uses a closed token set (see schema/grammar.schema.json). This table renders those tokens in
// Vietnamese; Japanese parts are left as they are. A fixed table, not machine translation.
const TOKENS: [RegExp, string][] = [
  [/Verb-nai stem/g, "Động từ (gốc ない)"],
  [/Verb-stem/g, "Động từ (bỏ ます)"],
  [/Verb-dict/g, "Động từ thể từ điển"],
  [/Verb-volitional/g, "Động từ thể ý chí"],
  [/Verb-plain/g, "Động từ thể thông thường"],
  [/Verb-nai/g, "Động từ thể ない"],
  [/Verb-te/g, "Động từ thể て"],
  [/Verb-ta/g, "Động từ thể た"],
  [/Verb-ba/g, "Động từ thể ば"],
  [/i-Adj-ku/g, "Tính từ い (い→く)"],
  [/i-Adj stem/g, "Tính từ い (bỏ い)"],
  [/i-Adj/g, "Tính từ い"],
  [/na-Adj/g, "Tính từ な"],
  [/Question word/g, "Từ để hỏi"],
  [/Sentence/g, "Câu"],
  [/Noun/g, "Danh từ"],
];

export function formationVi(formation: string): string {
  return TOKENS.reduce((s, [re, vi]) => s.replace(re, vi), formation);
}
