import { useState } from 'react';
import {
  AlertTriangle,
  CalendarDate,
  Flag01,
  PlayCircle,
  Eye,
  ClipboardCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Save01,
} from '@untitledui/icons';
import CardView from './CardView';
import { dueBucket, weekRange, dateInRange, isoWeekLabel } from '../constants';
import { useConfig } from '../ConfigContext';
import { saveWeekly } from '../api';
import { toast } from '../toast';
import { weeklyTasks, formatWeekly } from '../weekly';

// The week view is status-driven, not due-date-driven: most tasks are ad-hoc and
// never get a due date, so "this week" means what's active/planned now plus what
// was finished within the selected calendar week. Past/future weeks show only the
// reconstructable facts — what got done (from `done` dates) and what's scheduled
// (from `due` dates); live status (blocked/in progress) is a "now" thing and only
// shown for the current week.
const CURRENT = [
  { key: 'overdue', title: 'Overdue', Icon: AlertTriangle, tone: 'text-red-600 dark:text-red-400' },
  { key: 'today', title: 'Due today', Icon: CalendarDate, tone: 'text-amber-600 dark:text-amber-400' },
  { key: 'blocked', title: 'Blocked', Icon: Flag01, tone: 'text-red-600 dark:text-red-400' },
  { key: 'doing', title: 'In progress', Icon: PlayCircle, tone: 'text-blue-600 dark:text-blue-400' },
  { key: 'review', title: 'In review — monitor', Icon: Eye, tone: 'text-cyan-700 dark:text-cyan-400' },
  { key: 'plan', title: 'To do this week', Icon: ClipboardCheck, tone: 'text-accent' },
  { key: 'done', title: 'Done this week', Icon: CheckCircle, tone: 'text-emerald-600 dark:text-emerald-400' },
];
const OTHER = [
  { key: 'due', title: 'Scheduled', Icon: CalendarDate, tone: 'text-amber-600 dark:text-amber-400' },
  { key: 'done', title: 'Done', Icon: CheckCircle, tone: 'text-emerald-600 dark:text-emerald-400' },
];

const fmtDay = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const relLabel = (o) =>
  o === -1 ? 'last week' : o === 1 ? 'next week' : o < 0 ? `${-o} weeks ago` : `in ${o} weeks`;

export default function WeekView({ tasks, onOpen, onToggleBlocked }) {
  const config = useConfig();
  const [offset, setOffset] = useState(0); // 0 = current week, -1 = last week, …
  const [saving, setSaving] = useState(false);
  const backlog = config.statuses[0]?.name; // first column = "someday" pool, kept off the week view

  const ref = new Date();
  ref.setDate(ref.getDate() + offset * 7);
  const { start, end } = weekRange(ref);
  const isCurrent = offset === 0;
  const weekId = isoWeekLabel(ref);

  // a "now-state" task lands in exactly one current-week section (first match wins)
  const bucketOf = (t) => {
    if (t.blocked) return 'blocked';
    const due = dueBucket(t.due);
    if (due === 'overdue') return 'overdue';
    if (due === 'today') return 'today';
    if ((config.activeStatuses || []).includes(t.status)) return 'doing';
    if ((config.reviewStatuses || []).includes(t.status)) return 'review';
    if (t.status === backlog) return null;
    return 'plan';
  };

  const sections = isCurrent ? CURRENT : OTHER;
  const groups = Object.fromEntries(sections.map((s) => [s.key, []]));
  const open = tasks.filter((t) => t.status !== config.doneStatus);
  // fall back to the due date when a done task has no completion date
  groups.done = tasks.filter((t) => t.status === config.doneStatus && dateInRange(t.done || t.due, start, end));
  if (isCurrent) {
    for (const t of open) {
      const b = bucketOf(t);
      if (b) groups[b].push(t);
    }
  } else {
    groups.due = open.filter((t) => dateInRange(t.due, start, end));
  }
  const total = sections.reduce((n, s) => n + groups[s.key].length, 0);

  // project-grouped team-style text — same text saved to the .md and copied for Teams
  const summaryText = formatWeekly(weeklyTasks(tasks, config, start, end, isCurrent), {
    author: config.weeklyAuthor,
    start,
    end,
    noGroupLabel: config.noGroupLabel,
    config,
    endOfWeek: [5, 6].includes(new Date().getDay()), // Fri/Sat wording
  });

  async function onSaveSummary() {
    if (saving) return;
    setSaving(true);
    try {
      const r = await saveWeekly(weekId, summaryText);
      if (r.existed) {
        // already on disk (you may have hand-edited it) — replacing is a deliberate click
        toast(`${weekId} already saved`, {
          type: 'info',
          duration: 7000,
          action: {
            label: 'Overwrite',
            onClick: async () => {
              await saveWeekly(weekId, summaryText, true);
              toast('Weekly summary overwritten');
            },
          },
        });
      } else {
        toast(`Saved ${r.file}`);
      }
    } catch (e) {
      toast(`Couldn’t save summary — ${e.message || e}`, { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast('Copied — paste into the Teams chat');
    } catch {
      toast('Couldn’t copy to clipboard', { type: 'error' });
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">
          {isCurrent ? 'This Week' : `${fmtDay(start)} – ${fmtDay(end)}`}
        </h2>
        <span className="text-sm text-muted">
          {isCurrent ? `${fmtDay(start)} – ${fmtDay(end)}` : relLabel(offset)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setOffset((o) => o - 1)}
            title="Previous week"
            className="rounded-lg border border-line-strong bg-surface p-1.5 text-muted transition hover:text-ink"
          >
            <ChevronLeft size={16} />
          </button>
          {!isCurrent && (
            <button
              onClick={() => setOffset(0)}
              className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-xs font-medium text-muted transition hover:text-ink"
            >
              This week
            </button>
          )}
          <button
            onClick={() => setOffset((o) => o + 1)}
            title="Next week"
            className="rounded-lg border border-line-strong bg-surface p-1.5 text-muted transition hover:text-ink"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={onCopy}
            disabled={total === 0}
            title="Copy the summary to paste into the Teams chat"
            className="ml-1 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition hover:text-ink disabled:opacity-40"
          >
            Copy for Teams
          </button>
          <button
            onClick={onSaveSummary}
            disabled={saving || total === 0}
            title="Save a weekly-summary draft to the vault"
            className="flex items-center gap-1.5 rounded-lg bg-clay px-2.5 py-1.5 text-xs font-semibold text-clay-fg transition hover:bg-clay/90 disabled:opacity-40"
          >
            <Save01 size={14} /> {saving ? 'Saving…' : 'Save summary'}
          </button>
        </div>
      </div>

      {total === 0 ? (
        isCurrent ? (
          <div className="flex max-w-md flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-panel/40 px-6 py-12 text-center">
            <CheckCircle size={30} className="text-accent" />
            <p className="text-sm font-medium text-ink">You’re all clear this week</p>
            <p className="text-xs leading-relaxed text-muted">
              Nothing active, planned, or due. Press{' '}
              <kbd className="rounded border border-line-strong px-1 font-mono text-[11px]">n</kbd> to add a task, or
              pull one from the Backlog on the board.
            </p>
          </div>
        ) : (
          <p className="text-faint">Nothing completed or scheduled in this week.</p>
        )
      ) : (
        sections.map((s) => {
          const items = groups[s.key];
          if (!items.length) return null;
          const sorted =
            s.key === 'done'
              ? [...items].sort((a, b) => (b.done || '').localeCompare(a.done || '')) // most recent first
              : [...items].sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
          return (
            <section key={s.key}>
              <h3 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${s.tone}`}>
                <s.Icon size={15} />
                {s.title}
                <span className="tabular-nums text-faint">{items.length}</span>
              </h3>
              <div className="flex flex-col gap-2">
                {sorted.map((t) => (
                  <CardView key={t.id} task={t} showProject onClick={() => onOpen(t)} onToggleBlocked={onToggleBlocked} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
