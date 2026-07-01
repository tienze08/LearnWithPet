export function speak(text: string) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}