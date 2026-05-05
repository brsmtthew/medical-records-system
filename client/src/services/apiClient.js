import { clearSession, getAccessToken } from "./sessionService";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

export async function apiRequest(path, options = {}) {
  const token = getAccessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    clearSession();
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}
