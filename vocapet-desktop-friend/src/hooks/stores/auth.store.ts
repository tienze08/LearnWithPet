import { create } from "zustand";

interface AuthState {
  token: string | null;
  name: string | null;
  hydrated: boolean;

  login: (token: string, name: string, hydrated?: boolean, refreshToken?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  name: null,
  hydrated: false,

  login: (token, name, hydrated = false, refreshToken) => {
    localStorage.setItem("vocapet_token", token);
    localStorage.setItem("vocapet_name", name);
    if (refreshToken) localStorage.setItem("vocapet_refresh_token", refreshToken);

    set({ token, name, hydrated });
  },

  logout: () => {
    localStorage.removeItem("vocapet_token");
    localStorage.removeItem("vocapet_name");
    localStorage.removeItem("vocapet_refresh_token");

    set({
      token: null,
      name: null,
      hydrated: false,
    });
  },
}));
