import { useState } from 'react';

// item {raw, text, details[]} <-> the editable textarea form (title line + "  - " bullets)
const toText = (it) => [it.text, ...(it.details || []).map((d) => `  - ${d}`)].join('\n');
function fromText(text) {
  const lines = text.split('\n');
  const title = (lines[0] || '').replace(/^\s*-\s*(\[.\]\s*)?/, '').trim();
  const details = lines.slice(1).map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
  return { title, details };
}

export default function InboxDrawer({ open, items, onClose, onPromote, onFileNote, onRemove, onEdit }) {
  const [editingRaw, setEditingRaw] = useState(null);
  const [draft, setDraft] = useState('');
  if (!open) return null;

  function startEdit(it) {
    setEditingRaw(it.raw);
    setDraft(toText(it));
  }
  async function saveEdit(it) {
    const { title, details } = fromText(draft);
    if (title) await onEdit(it, title, details);
    setEditingRaw(null);
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-slate-900/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-sm flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
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
                <li key={it.raw} className="rounded-lg border border-slate-200 p-2.5">
                  {editingRaw === it.raw ? (
                    <div>
                      <textarea
                        autoFocus
                        rows={Math.max(2, draft.split('\n').length)}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingRaw(null);
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit(it);
                        }}
                        className="w-full resize-none rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <div className="mt-1.5 flex gap-2">
                        <button
                          onClick={() => saveEdit(it)}
                          className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingRaw(null)}
                          className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <span className="ml-auto self-center text-[10px] text-slate-400">⌘↵ save · Esc cancel</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2">
                        <p className="text-sm text-slate-700">{it.text}</p>
                        {it.details?.length > 0 && (
                          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-500">
                            {it.details.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => onPromote(it)}
                          className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                        >
                          → Task
                        </button>
                        <button
                          onClick={() => onFileNote(it)}
                          title="File into the knowledge base as a note"
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          → Note
                        </button>
                        <button
                          onClick={() => startEdit(it)}
                          title="Edit this item"
                          className="rounded-md px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => onRemove(it)}
                          title="Remove from inbox"
                          className="ml-auto rounded-md px-1.5 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400">
          Items are open <code>- [ ]</code> lines in <code>_Inbox.md</code>. <b>→ Task</b> files it into a
          project; <b>→ Note</b> saves it to the KB; <b>✎</b> edits it in place.
        </p>
      </div>
    </div>
  );
}
