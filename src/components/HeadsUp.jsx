export default function HeadsUp({ overdue, today, onView, onDismiss }) {
  if (!overdue && !today) return null;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
      <span className="font-medium text-amber-800">
        {overdue > 0 && <>⚠ {overdue} overdue</>}
        {overdue > 0 && today > 0 && <span className="text-amber-400"> · </span>}
        {today > 0 && <>📅 {today} due today</>}
      </span>
      <button
        onClick={onView}
        className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
      >
        View in Today
      </button>
      <button onClick={onDismiss} className="ml-auto rounded p-1 text-amber-500 hover:bg-amber-100" title="Dismiss">
        ✕
      </button>
    </div>
  );
}
