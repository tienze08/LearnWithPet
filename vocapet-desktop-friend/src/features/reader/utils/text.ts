export function sentenceAround(text: string, term: string) {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return "";
  let start = idx;
  while (start > 0 && !".!?\n".includes(text[start - 1])) start--;
  let end = idx + term.length;
  while (end < text.length && !".!?\n".includes(text[end])) end++;
  return text.slice(start, Math.min(end + 1, text.length)).trim();
}

export function speakWord(word: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}
