const TOKEN_KEY = "vocapet_token";
const NAME_KEY = "vocapet_name";
const REFRESH_TOKEN_KEY = "vocapet_refresh_token";

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  name: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Thin REST client for the VocaPet auth endpoints. */
async function request<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* ignore non-JSON responses */
  }

  if (!res.ok) {
    const message =
      (data as { message?: string } | null)?.message ??
      "Something went wrong. Please try again.";
    throw new Error(message);
  }

  return data as T;
}

export function registerUser(payload: RegisterPayload) {
  return request<AuthResponse>("/api/auth/register", payload);
}

export function loginUser(payload: LoginPayload) {
  return request<AuthResponse>("/api/auth/login", payload);
}

/* ---- localStorage session helpers (ready for protected routes) ---- */

export function saveSession({ token, name, refreshToken }: AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NAME_KEY, name);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserName() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NAME_KEY);
}

export function isAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  return !!localStorage.getItem("vocapet_token");
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
