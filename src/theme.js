// Theme: 'system' (follow OS) | 'light' | 'dark'. The .dark class on <html> is the
// single source of truth; an inline script in index.html applies it before paint.
const KEY = 'kb-theme';
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getTheme() {
  return localStorage.getItem(KEY) || 'system';
}

export function resolveDark(theme = getTheme()) {
  return theme === 'dark' || (theme === 'system' && mq().matches);
}

export function applyTheme(theme = getTheme()) {
  document.documentElement.classList.toggle('dark', resolveDark(theme));
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}
