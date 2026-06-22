// Status colors are stored in config as names (e.g. "blue"); map them to literal
// Tailwind classes here so the scanner keeps the classes in the build.
export const STATUS_COLORS = {
  slate: 'bg-slate-400',
  gray: 'bg-gray-400',
  red: 'bg-red-500',
  rose: 'bg-rose-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500',
  lime: 'bg-lime-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  purple: 'bg-purple-500',
  fuchsia: 'bg-fuchsia-500',
  pink: 'bg-pink-500',
};
export const COLOR_NAMES = Object.keys(STATUS_COLORS);
export const statusDot = (color) => STATUS_COLORS[color] || 'bg-slate-400';

// fallback config used before /api/config resolves (mirrors the server defaults)
export const DEFAULT_CONFIG = {
  statuses: [
    { name: 'Backlog', color: 'slate' },
    { name: 'To do', color: 'violet' },
    { name: 'Doing', color: 'blue' },
    { name: 'In Review', color: 'cyan' },
    { name: 'Done', color: 'emerald' },
  ],
  doneStatus: 'Done',
  activeStatuses: ['Doing'],
  reviewStatuses: ['In Review'],
  groupLabel: 'Project',
  noGroupLabel: 'No project',
  obsidianVault: '',
};

const PALETTE = [
  'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
];

export function projectColor(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function dueMeta(due) {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due + 'T00:00:00');
  if (isNaN(d)) return { label: due, overdue: false, soon: false };
  const days = Math.round((d - today) / 86400000);
  return { label: due, overdue: days < 0, soon: days >= 0 && days <= 2 };
}

// time bucket for the Today view: 'overdue' | 'today' | 'week' | 'later' | null
export function dueBucket(due) {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due + 'T00:00:00');
  if (isNaN(d)) return null;
  const days = Math.round((d - today) / 86400000);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'week';
  return 'later';
}
