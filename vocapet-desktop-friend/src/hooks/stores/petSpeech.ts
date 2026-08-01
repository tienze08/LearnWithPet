import { create } from "zustand";

export interface PetSpeech {
  message: string;
  duration: number;
  priority: number;
}

interface PetSpeechStore {
  speech: PetSpeech | null;

  showSpeech: (speech: PetSpeech) => void;

  clearSpeech: () => void;
}

let timer: number | undefined;

export const usePetSpeech = create<PetSpeechStore>((set, get) => ({

  speech: null,

  showSpeech(speech) {

    const current = get().speech;

    if (current && current.priority > speech.priority) {
      return;
    }

    if (timer) {
      clearTimeout(timer);
    }

    set({ speech });

    timer = window.setTimeout(() => {

      set({ speech: null });

    }, speech.duration * 1000);
  },

  clearSpeech() {

    if (timer) clearTimeout(timer);

    set({ speech: null });
  },
}));

export function speakPet(
    message: string,
    priority = 1,
    duration = 3
) {
    usePetSpeech.getState().showSpeech({
        message,
        priority,
        duration,
    });
}