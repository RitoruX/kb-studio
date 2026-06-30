// Shared control styles — single source of truth so the header's chrome buttons
// (in App.jsx + the extracted ThemeToggle) stay identical and can't drift apart.
// Height is LOCKED with h-8 rather than left to padding + content: equal padding
// still let Inbox (a text label, ~20px line) sit taller than the icon-only
// buttons (a 16px glyph). Lock the height and every control matches regardless
// of what's inside it.
export const ICON_BTN =
  'inline-flex h-8 items-center justify-center rounded-full bg-panel px-2.5 text-muted transition hover:bg-line hover:text-ink';
