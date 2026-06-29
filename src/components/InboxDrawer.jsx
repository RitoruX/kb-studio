import { useState } from 'react';
import { Inbox01, XClose, Edit01 } from '@untitledui/icons';

// item {raw, text, details[]} <-> the editable textarea form (title line + "  - " bullets)
const toText = (it) => [it.text, ...(it.details || []).map((d) => `  - ${d}`)].join('\n');
function fromText(text) {
  const lines = text.split('\n');
  const title = (lines[0] || '').replace(/^\s*-\s*(\[.\]\s*)?/, '').trim();
  const details = lines.slice(1).map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
  return { title, details };
}

export default function InboxDrawer({ open, items, projects = [], onClose, onPromote, onFileNote, onRemove, onEdit }) {
  const [editingRaw, setEditingRaw] = useState(null);
  const [draft, setDraft] = useState('');
  const [filingRaw, setFilingRaw] = useState(null);
  const [fileProject, setFileProject] = useState('');
  if (!open) return null;

  function fileNow(it) {
    onFileNote(it, fileProject.trim());
    setFilingRaw(null);
    setFileProject('');
  }

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
    <div className="overlay-in fixed inset-0 z-20 flex justify-end bg-stone-900/30" onClick={onClose}>
      <div className="drawer-in flex h-full w-full max-w-sm flex-col bg-surface shadow-raised" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-ink"><Inbox01 size={15} /> Inbox — triage</h2>
          <span className="text-xs tabular-nums text-faint">{items.length} open</span>
          <button onClick={onClose} className="ml-auto rounded p-1 text-faint transition hover:bg-panel hover:text-ink">
            <XClose size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {items.length === 0 ? (
            <p className="px-1 py-2 text-sm text-faint">
              Nothing to triage. Capture with the “Dump to inbox” box.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.raw} className="rounded-lg border border-line p-2.5">
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
                        className="w-full resize-none rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                      />
                      <div className="mt-1.5 flex gap-2">
                        <button
                          onClick={() => saveEdit(it)}
                          className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-fg transition hover:bg-accent/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingRaw(null)}
                          className="rounded-md px-2 py-1 text-xs text-muted transition hover:bg-panel hover:text-ink"
                        >
                          Cancel
                        </button>
                        <span className="ml-auto self-center text-[10px] text-faint">⌘↵ save · Esc cancel</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2">
                        <p className="text-sm text-ink">{it.text}</p>
                        {it.details?.length > 0 && (
                          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted">
                            {it.details.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => onPromote(it)}
                          className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-fg transition hover:bg-accent/90"
                        >
                          → Task
                        </button>
                        <button
                          onClick={() => {
                            setFilingRaw(filingRaw === it.raw ? null : it.raw);
                            setFileProject('');
                          }}
                          title="File into the knowledge base as a note"
                          className={[
                            'rounded-md border px-2 py-1 text-xs font-medium transition',
                            filingRaw === it.raw
                              ? 'border-accent bg-accent-weak text-accent'
                              : 'border-line-strong text-ink hover:bg-panel',
                          ].join(' ')}
                        >
                          → Note
                        </button>
                        <button
                          onClick={() => startEdit(it)}
                          title="Edit this item"
                          className="rounded-md px-1.5 py-1 text-faint transition hover:bg-panel hover:text-ink"
                        >
                          <Edit01 size={14} />
                        </button>
                        <button
                          onClick={() => onRemove(it)}
                          title="Remove from inbox"
                          className="ml-auto rounded-md px-1.5 py-1 text-faint transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          <XClose size={15} />
                        </button>
                      </div>

                      {filingRaw === it.raw && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <input
                            autoFocus
                            list="kb-inbox-projects"
                            value={fileProject}
                            onChange={(e) => setFileProject(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                fileNow(it);
                              } else if (e.key === 'Escape') {
                                setFilingRaw(null);
                              }
                            }}
                            placeholder="Project for this note (optional)"
                            className="flex-1 rounded-md border border-line-strong bg-surface px-2 py-1 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                          />
                          <button
                            onClick={() => fileNow(it)}
                            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg transition hover:bg-accent/90"
                          >
                            File
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <datalist id="kb-inbox-projects">
          {projects.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

        <p className="border-t border-line px-4 py-2 text-[11px] text-faint">
          Items are open <code>- [ ]</code> lines in <code>_Inbox.md</code>. <b>→ Task</b> files it into a
          project; <b>→ Note</b> saves it to the KB (optionally tagged with a project); the edit button changes
          it in place.
        </p>
      </div>
    </div>
  );
}
