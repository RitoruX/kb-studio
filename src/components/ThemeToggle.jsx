import { useEffect, useState } from 'react';
import { Monitor01, Sun, Moon01 } from '@untitledui/icons';
import { getTheme, setTheme, applyTheme } from '../theme';

// cycle System → Light → Dark; system detection beats a binary sun/moon switch
const NEXT = { system: 'light', light: 'dark', dark: 'system' };
const ICON = { system: Monitor01, light: Sun, dark: Moon01 };
const LABEL = { system: 'System', light: 'Light', dark: 'Dark' };

export default function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme);

  // when following the OS, react live to its light/dark changes
  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => theme === 'system' && applyTheme('system');
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, [theme]);

  function cycle() {
    const next = NEXT[theme];
    setTheme(next);
    setThemeState(next);
  }

  const Icon = ICON[theme];
  return (
    <button
      onClick={cycle}
      title={`Theme: ${LABEL[theme]} — click for ${LABEL[NEXT[theme]]}`}
      aria-label={`Theme: ${LABEL[theme]}. Click to switch to ${LABEL[NEXT[theme]]}.`}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-panel hover:text-ink"
    >
      <Icon size={15} /> {LABEL[theme]}
    </button>
  );
}
