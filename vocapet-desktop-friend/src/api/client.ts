const API_URL = "http://localhost:8080";

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("vocapet_token");

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {

    throw new Error(
      data?.message || `HTTP ${response.status} - Unknown error`
    );
  }

  return data;
}