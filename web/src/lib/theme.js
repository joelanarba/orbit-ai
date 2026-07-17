const STORAGE_KEY = "orbit-theme";

export function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredTheme() {
  if (typeof sessionStorage === "undefined") return null;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function resolveTheme() {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute("content", theme);
}

export function setTheme(theme) {
  sessionStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme(current) {
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
