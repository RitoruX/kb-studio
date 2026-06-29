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

// warm / earthy family so project chips belong to the green-wood identity —
// moss, honey, clay, olive, gold, walnut, terracotta. (No pure red: it would
// read as the "blocked" semantic.)
const PALETTE = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
  'bg-stone-200 text-stone-700 dark:bg-stone-600/30 dark:text-stone-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
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

// current calendar week as [Mon 00:00, Sun 23:59:59] in local time
export function weekRange(ref = new Date()) {
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back up to Monday
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// is a YYYY-MM-DD date inside the current calendar week?
export function inThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return false;
  const { start, end } = weekRange();
  return d >= start && d <= end;
}

// is a YYYY-MM-DD date within [start, end] (Date objects)?
export function dateInRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return !isNaN(d) && d >= start && d <= end;
}

// ISO-8601 week label like "2026-W26" for the week containing `ref`
export function isoWeekLabel(ref = new Date()) {
  const d = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3); // nearest Thursday
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  firstThu.setUTCDate(firstThu.getUTCDate() - ((firstThu.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((d - firstThu) / (7 * 86400000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// time bucket for the week view: 'overdue' | 'today' | 'week' | 'later' | null
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
