const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const request = (token: string | null) =>
    fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

  let response = await request(localStorage.getItem("vocapet_token"));

  if (response.status === 401 && endpoint !== "/api/auth/refresh") {
    const refreshToken = localStorage.getItem("vocapet_refresh_token");
    if (refreshToken) {
      const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshResponse.ok) {
        const session = await refreshResponse.json();
        localStorage.setItem("vocapet_token", session.token);
        response = await request(session.token);
      }
    }
  }

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      data?.message || `HTTP ${response.status} - Unknown error`,
    );
  }

  return data as T;
}
