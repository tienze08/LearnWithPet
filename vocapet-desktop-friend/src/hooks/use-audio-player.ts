import { useEffect, useState, useSyncExternalStore } from "react";
import { browserOutput, japaneseVoice } from "@/lib/audio/browser-output";
import { PlaylistPlayer, type Segment } from "@/lib/audio/engine";

/** null while the browser is still loading its voices. */
export function useJapaneseVoice(): boolean | null {
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return setHas(false);
    const check = () => japaneseVoice() && setHas(true);
    check();
    window.speechSynthesis.addEventListener("voiceschanged", check);
    // Chrome fills the list late; after this long, there is no Japanese voice.
    const timer = setTimeout(() => setHas(!!japaneseVoice()), 2000);
    return () => {
      clearTimeout(timer);
      window.speechSynthesis.removeEventListener("voiceschanged", check);
    };
  }, []);
  return has;
}

/** One player for a playlist. `segments` must be memoized: a new array reloads the player. Client only. */
export function useAudioPlayer(segments: Segment[]) {
  const [player] = useState(() => new PlaylistPlayer(browserOutput()));
  useEffect(() => {
    player.load(segments);
    return () => player.stop();
  }, [player, segments]);
  const state = useSyncExternalStore(player.subscribe, player.getState, player.getState);
  return { player, state };
}
