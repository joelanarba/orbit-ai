// Thin client for the Orbit dashboard API (Lambda Function URL).
// The shared token lives in localStorage and rides on every request.

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const TOKEN_KEY = "orbit.token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "x-orbit-token": getToken() ?? "",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? data.errors?.join("; ") ?? `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  status: () => request("GET", "/status"),
  reports: () => request("GET", "/reports"),
  report: (date) => request("GET", `/reports/${date}`),
  tasks: () => request("GET", "/tasks"),
  createTask: (task) => request("POST", "/tasks", task),
  updateTask: (id, patch) => request("PATCH", `/tasks/${id}`, patch),
  deleteTask: (id) => request("DELETE", `/tasks/${id}`),
  runNow: () => request("POST", "/run"),
};
