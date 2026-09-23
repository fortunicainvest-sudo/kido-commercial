// Client HTTP minimal — pas de dépendance externe, juste fetch avec gestion
// du token JWT et des erreurs de l'API dans un format cohérent.
const API_URL = import.meta.env.VITE_API_URL || "https://kido-backend.onrender.com";

let currentToken: string | null = localStorage.getItem("kido_token");

export function setToken(token: string | null) {
  currentToken = token;
  if (token) localStorage.setItem("kido_token", token);
  else localStorage.removeItem("kido_token");
}

export function getToken(): string | null {
  return currentToken;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (currentToken) headers.Authorization = `Bearer ${currentToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || "Une erreur est survenue.");
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  del: <T>(path: string) => request<T>("DELETE", path),
};
