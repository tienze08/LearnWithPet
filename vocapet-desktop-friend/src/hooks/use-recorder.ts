import { useEffect, useState, useSyncExternalStore } from "react";
import { browserRecorderDeps, VoiceRecorder } from "@/lib/audio/recorder";

/** One recorder per screen; leaving the screen releases the microphone. */
export function useRecorder() {
  const [recorder] = useState(() => new VoiceRecorder(browserRecorderDeps()));
  useEffect(() => () => recorder.cancel(), [recorder]);
  const state = useSyncExternalStore(recorder.subscribe, recorder.getState, recorder.getState);
  return { recorder, state };
}

export type MicPermission = "granted" | "denied" | "prompt" | "unknown";

/** Reads the microphone permission without asking for it. */
export function useMicPermission(): MicPermission {
  const [permission, setPermission] = useState<MicPermission>("unknown");
  useEffect(() => {
    let status: PermissionStatus | undefined;
    let live = true;
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((s) => {
        if (!live) return;
        status = s;
        setPermission(s.state);
        s.onchange = () => setPermission(s.state);
      })
      .catch(() => {}); // some browsers cannot query the microphone
    return () => {
      live = false;
      if (status) status.onchange = null;
    };
  }, []);
  return permission;
}
