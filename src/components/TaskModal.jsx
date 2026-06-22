import { useEffect, useRef, useState } from 'react';
import Markdown, { toggleChecklistItem, normalizeChecklists } from './Markdown';
import { useConfig } from '../ConfigContext';

export default function TaskModal({ task, projects, onSave, onDelete, onClose, onPatch }) {
  const config = useConfig();
  const isNew = !!task.isNew;
  const [form, setForm] = useState({
    title: task.title || '',
    description: normalizeChecklists(task.description || ''),
    due: task.due || '',
    status: task.status || config.statuses[0]?.name || 'Backlog',
    project: task.project || '',
  });
  const [busy, setBusy] = useState(false);
  // Notion-style single field: render by default when there's content, edit on click
  const [editingDesc, setEditingDesc] = useState(!task.description?.trim());
  const titleRef = useRef(null);
  const descRef = useRef(null);

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px'; // capped by maxHeight + scroll
  };

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // when entering edit mode, fit the box to existing content and focus it
  useEffect(() => {
    if (editingDesc && descRef.current) {
      autoGrow(descRef.current);
      descRef.current.focus();
    }
  }, [editingDesc]);

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // tick a checkbox in the rendered description; persist right away for saved tasks
  function handleToggleTask(index) {
    const next = toggleChecklistItem(form.description, index);
    setForm((f) => ({ ...f, description: next }));
    if (!isNew && onPatch) onPatch({ description: next });
  }

  async function save() {
    if (!form.title.trim() || busy) return;
    setBusy(true);
    try {
      await onSave({ ...form, description: normalizeChecklists(form.description) });
    } finally {
      setBusy(false);
    }
  }

  const label = 'block text-xs font-medium text-slate-500 mb-1';
  const field =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center bg-slate-900/40 p-4 pt-20"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-slate-800">
          {isNew ? 'New task' : 'Edit task'}
        </h3>

        <div className="space-y-3">
          <div>
            <label className={label}>Title</label>
            <input
              ref={titleRef}
              className={field}
              value={form.title}
              onChange={set('title')}
              placeholder="What needs doing?"
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center">
              <label className="text-xs font-medium text-slate-500">Description</label>
              {!editingDesc && form.description.trim() && (
                <span className="ml-auto text-[11px] text-slate-400">click to edit</span>
              )}
            </div>
            {editingDesc ? (
              <textarea
                ref={descRef}
                value={form.description}
                onChange={(e) => {
                  set('description')(e);
                  autoGrow(e.target);
                }}
                onBlur={() => {
                  setForm((f) => ({ ...f, description: normalizeChecklists(f.description) }));
                  if (form.description.trim()) setEditingDesc(false);
                }}
                placeholder="Write here… markdown: **bold**, - bullet, [] checkbox, # heading. Click outside to format."
                className={`${field} block w-full resize-none overflow-y-auto`}
                style={{ minHeight: '11rem', maxHeight: '26rem' }}
              />
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                title="Click to edit"
                className="cursor-text overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:border-slate-300"
                style={{ minHeight: '11rem', maxHeight: '26rem' }}
              >
                {form.description.trim() ? (
                  <Markdown text={form.description} onToggleTask={handleToggleTask} />
                ) : (
                  <span className="text-sm text-slate-400">Click to add a description…</span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Due</label>
              <input type="date" className={field} value={form.due} onChange={set('due')} />
            </div>
            <div>
              <label className={label}>Status</label>
              <select className={field} value={form.status} onChange={set('status')}>
                {config.statuses.map((s) => (
                  <option key={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>{config.groupLabel}</label>
              <input
                className={field}
                list="kb-groups"
                value={form.project}
                onChange={set('project')}
                placeholder={config.noGroupLabel}
              />
              <datalist id="kb-groups">
                {projects.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          {!isNew && onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!form.title.trim() || busy}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
