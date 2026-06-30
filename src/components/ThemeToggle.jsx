import { useEffect, useState } from 'react';
import { getTheme, setTheme, applyTheme } from '../theme';

// All three modes are visible at once and the active one is filled — so you can
// see the options and jump straight to any of them. (The old tri-state *cycle*
// hid the choices and, worse, System + Light render identically when the OS is
// light, so cycling between them produced no visible change — it read as broken.)
const MODES = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

export default function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme);

  // when following the OS, react live to its light/dark changes
  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => theme === 'system' && applyTheme('system');
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, [theme]);

  function pick(mode) {
    setTheme(mode);
    setThemeState(mode);
  }

  // Same segmented pattern as the Board/Weekly switch — one control language for
  // "pick one of a fixed, small set" across the app.
  return (
    <div role="group" aria-label="Theme" className="flex rounded-lg bg-panel p-0.5 text-sm">
      {MODES.map(([mode, label]) => (
        <button
          key={mode}
          onClick={() => pick(mode)}
          aria-pressed={theme === mode}
          className={[
            'rounded-md px-2.5 py-1 font-medium transition',
            theme === mode ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
