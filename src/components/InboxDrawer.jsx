export default function InboxDrawer({ open, items, onClose, onPromote, onRemove }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-slate-900/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">📥 Inbox — triage</h2>
          <span className="text-xs text-slate-400">{items.length} open</span>
          <button onClick={onClose} className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {items.length === 0 ? (
            <p className="px-1 py-2 text-sm text-slate-400">
              Nothing to triage. Capture with the “Dump to inbox” box.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li
                  key={it.raw}
                  className="flex items-start gap-2 rounded-lg border border-slate-200 p-2.5"
                >
                  <span className="flex-1 text-sm text-slate-700">{it.text}</span>
                  <button
                    onClick={() => onPromote(it)}
                    className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    → Make task
                  </button>
                  <button
                    onClick={() => onRemove(it)}
                    title="Remove from inbox"
                    className="shrink-0 rounded-md px-1.5 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400">
          Reads open <code>- [ ]</code> lines from <code>_Inbox.md</code>. “Make task” files it into a
          project and removes the line.
        </p>
      </div>
    </div>
  );
}
