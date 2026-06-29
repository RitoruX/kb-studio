import { AlertTriangle, CalendarDate, XClose } from '@untitledui/icons';

export default function HeadsUp({ overdue, today, onView, onDismiss }) {
  if (!overdue && !today) return null;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <span className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200">
        {overdue > 0 && <span className="flex items-center gap-1"><AlertTriangle size={14} /> {overdue} overdue</span>}
        {overdue > 0 && today > 0 && <span className="text-amber-400 dark:text-amber-500/70">·</span>}
        {today > 0 && <span className="flex items-center gap-1"><CalendarDate size={14} /> {today} due today</span>}
      </span>
      <button
        onClick={onView}
        className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
      >
        View this week
      </button>
      <button onClick={onDismiss} className="ml-auto rounded p-1 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/15" title="Dismiss">
        <XClose size={15} />
      </button>
    </div>
  );
}
