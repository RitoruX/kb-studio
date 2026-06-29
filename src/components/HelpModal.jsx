import { useEffect } from 'react';
import { XClose } from '@untitledui/icons';

const GROUPS = [
  {
    title: 'Anywhere',
    keys: [
      [['c'], 'Capture to inbox'],
      [['n'], 'New task'],
      [['/'], 'Search the vault'],
      [['t'], 'Toggle Board / Weekly'],
      [['?'], 'Show this help'],
    ],
  },
  {
    title: 'Search',
    keys: [
      [['↑', '↓'], 'Move between results'],
      [['↵'], 'Open selected result'],
      [['Esc'], 'Close search'],
    ],
  },
  {
    title: 'Task editor',
    keys: [
      [['⌘', '↵'], 'Save (Ctrl ↵ on Windows)'],
      [['Esc'], 'Close'],
    ],
  },
  {
    title: 'Board',
    keys: [[['drag'], 'Drag a card to change its status']],
  },
];

export default function HelpModal({ onClose }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="overlay-in fixed inset-0 z-40 flex items-start justify-center bg-stone-900/40 p-4 pt-16"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="pop-in w-full max-w-md rounded-2xl bg-surface p-5 shadow-raised"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <h3 className="font-serif text-lg font-semibold tracking-tight text-ink">Keyboard shortcuts</h3>
          <button
            onClick={onClose}
            className="ml-auto rounded p-1 text-faint transition hover:bg-panel hover:text-ink"
            aria-label="Close"
          >
            <XClose size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">{g.title}</h4>
              <ul className="flex flex-col gap-1.5">
                {g.keys.map(([keys, label]) => (
                  <li key={label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">{label}</span>
                    <span className="flex shrink-0 gap-1">
                      {keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border border-line-strong bg-panel px-1.5 py-0.5 font-mono text-[11px] text-ink"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
