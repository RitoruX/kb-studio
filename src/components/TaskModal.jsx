import { useEffect, useRef, useState } from 'react';
import { Flag01 } from '@untitledui/icons';
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
    blocked: !!task.blocked,
    blockReason: task.blockReason || '',
  });
  const [busy, setBusy] = useState(false);
  // Notion-style single field: render by default when there's content, edit on click
  const [editingDesc, setEditingDesc] = useState(!task.description?.trim());
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const panelRef = useRef(null);
  // snapshot of the form at open, to detect unsaved edits
  const initialRef = useRef(null);
  if (initialRef.current === null) initialRef.current = { ...form };
  const dirty = JSON.stringify(form) !== JSON.stringify(initialRef.current);

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px'; // capped by maxHeight + scroll
  };

  // leave description edit mode, formatting the source first
  const stopEditingDesc = () => {
    setForm((f) => ({ ...f, description: normalizeChecklists(f.description) }));
    if (form.description.trim()) setEditingDesc(false);
  };

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // restore focus to whatever opened the modal (e.g. the board card) on close
  useEffect(() => {
    const prev = document.activeElement;
    return () => {
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, []);

  // when entering edit mode, fit the box to existing content and focus it
  useEffect(() => {
    if (editingDesc && descRef.current) {
      autoGrow(descRef.current);
      descRef.current.focus();
    }
  }, [editingDesc]);

  // ⌘/Ctrl+Enter saves from anywhere; Esc leaves description edit first, else closes
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        if (editingDesc && document.activeElement === descRef.current) {
          e.preventDefault();
          stopEditingDesc();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // intentional: save/stopEditingDesc are recreated each render; deps cover what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, editingDesc, form, busy]);

  // keep keyboard focus inside the dialog
  function trapTab(e) {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const f = panelRef.current.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])'
    );
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

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

  const label = 'block text-xs font-medium text-muted mb-1';
  const field =
    'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';

  return (
    <div
      className="overlay-in fixed inset-0 z-20 flex items-start justify-center bg-stone-900/40 p-4 pt-10 sm:pt-20"
      // outside-click closes only when clean — guards against discarding edits by mis-click
      onClick={() => !dirty && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="pop-in flex max-h-[88vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-surface p-4 shadow-raised sm:p-5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
      >
        <div className="mb-4 flex items-center gap-2">
          <h3 id="task-modal-title" className="font-serif text-lg font-semibold tracking-tight text-ink">
            {isNew ? 'New task' : 'Edit task'}
          </h3>
          {dirty && (
            <span className="rounded-full bg-accent-weak px-2 py-0.5 text-[11px] font-medium text-accent">
              Unsaved
            </span>
          )}
        </div>

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
              <label className="text-xs font-medium text-muted">Description</label>
              {!editingDesc && form.description.trim() && (
                <button
                  type="button"
                  onClick={() => setEditingDesc(true)}
                  className="ml-auto rounded text-[11px] text-faint hover:text-ink"
                >
                  Edit
                </button>
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
                onBlur={stopEditingDesc}
                placeholder="Write here… markdown: **bold**, - bullet, [] checkbox, # heading. Esc or click out to format · ⌘↵ to save."
                className={`${field} block w-full resize-none overflow-y-auto`}
                style={{ minHeight: '11rem', maxHeight: '26rem' }}
              />
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                title="Click to edit"
                className="cursor-text overflow-y-auto rounded-lg border border-line bg-canvas px-3 py-2 hover:border-line-strong"
                style={{ minHeight: '11rem', maxHeight: '26rem' }}
              >
                {form.description.trim() ? (
                  <Markdown text={form.description} onToggleTask={handleToggleTask} />
                ) : (
                  <span className="text-sm text-faint">Click to add a description…</span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

          <div className="space-y-2">
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.blocked}
                onChange={(e) => setForm((f) => ({ ...f, blocked: e.target.checked }))}
              />
              <Flag01 size={14} /> Blocked
            </label>
            {form.blocked && (
              <input
                className={field}
                value={form.blockReason}
                onChange={set('blockReason')}
                placeholder="Why is it blocked? (e.g. waiting on IT)"
              />
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          {!isNew && onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Delete
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:bg-panel hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!form.title.trim() || busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent/90 disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
