// Display choices of the Shadowing screen, kept in this browser.
import { useState } from "react";

const DEFAULTS = {
  japanese: true,
  furigana: true,
  vietnamese: true,
  vocabulary: false,
  grammar: false,
  /** Speech-to-text may send audio to the browser vendor, so the learner has to switch it on. */
  recognition: false,
};
export type Settings = typeof DEFAULTS;

const KEY = "vocapet.shadowing.v1";

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function useShadowingSettings() {
  const [settings, setSettings] = useState(load);
  const toggle = (key: keyof Settings) =>
    setSettings((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage blocked: the choice lasts for this visit */
      }
      return next;
    });
  return [settings, toggle] as const;
}
