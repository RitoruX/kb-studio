import { useState } from 'react';
import { ChevronUp, ChevronDown, XClose } from '@untitledui/icons';
import { COLOR_NAMES, statusDot } from '../constants';

const field =
  'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';
const label = 'block text-xs font-medium text-muted mb-1';

export default function SettingsModal({ config, onSave, onClose }) {
  const [statuses, setStatuses] = useState(config.statuses.map((s) => ({ ...s })));
  const [doneStatus, setDoneStatus] = useState(config.doneStatus);
  const [groupLabel, setGroupLabel] = useState(config.groupLabel);
  const [noGroupLabel, setNoGroupLabel] = useState(config.noGroupLabel);
  const [obsidianVault, setObsidianVault] = useState(config.obsidianVault || '');
  const [weeklyAuthor, setWeeklyAuthor] = useState(config.weeklyAuthor || '');
  const [statusNotes, setStatusNotes] = useState(config.weeklyStatusNotes || '');
  const [blockedLabel, setBlockedLabel] = useState(config.weeklyBlockedLabel || 'Blocked');
  const [activeStatuses, setActiveStatuses] = useState((config.activeStatuses || []).join(', '));
  const [reviewStatuses, setReviewStatuses] = useState((config.reviewStatuses || []).join(', '));
  const [inboxPath, setInboxPath] = useState(config.inbox?.path || '');
  const [inboxHeading, setInboxHeading] = useState(config.inbox?.heading || '');
  const [excludes, setExcludes] = useState((config.searchExclude || []).join('\n'));
  const [busy, setBusy] = useState(false);

  const setStatus = (i, patch) => setStatuses((p) => p.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStatus = () => setStatuses((p) => [...p, { name: '', color: 'slate' }]);
  const removeStatus = (i) => setStatuses((p) => p.filter((_, idx) => idx !== i));
  const move = (i, d) =>
    setStatuses((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const csv = (s) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  async function save() {
    setBusy(true);
    try {
      await onSave({
        statuses: statuses.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), color: s.color })),
        doneStatus,
        groupLabel,
        noGroupLabel,
        obsidianVault: obsidianVault.trim(),
        weeklyAuthor: weeklyAuthor.trim(),
        weeklyStatusNotes: statusNotes,
        weeklyBlockedLabel: blockedLabel.trim(),
        activeStatuses: csv(activeStatuses),
        reviewStatuses: csv(reviewStatuses),
        inbox: { path: inboxPath.trim(), heading: inboxHeading },
        searchExclude: excludes
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay-in fixed inset-0 z-30 flex items-start justify-center bg-stone-900/40 p-4 pt-12" onClick={onClose}>
      <div
        className="pop-in flex max-h-[88vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-surface p-4 shadow-raised sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-serif text-lg font-semibold tracking-tight text-ink">Settings</h3>

        <div className="space-y-5">
          {/* statuses */}
          <div>
            <label className={label}>Columns / statuses</label>
            <div className="space-y-2">
              {statuses.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${statusDot(s.color)}`} />
                  <input
                    className={`${field} flex-1`}
                    value={s.name}
                    onChange={(e) => setStatus(i, { name: e.target.value })}
                    placeholder="Status name"
                  />
                  <select
                    className="rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm text-ink"
                    value={s.color}
                    onChange={(e) => setStatus(i, { color: e.target.value })}
                  >
                    {COLOR_NAMES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <button onClick={() => move(i, -1)} className="px-1 text-faint transition hover:text-ink" title="Up">
                    <ChevronUp size={16} />
                  </button>
                  <button onClick={() => move(i, 1)} className="px-1 text-faint transition hover:text-ink" title="Down">
                    <ChevronDown size={16} />
                  </button>
                  <button onClick={() => removeStatus(i)} className="px-1 text-faint transition hover:text-red-600 dark:hover:text-red-400" title="Remove">
                    <XClose size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addStatus} className="mt-2 text-sm font-medium text-accent transition hover:text-accent/80">
              + Add status
            </button>
            <p className="mt-1 text-[11px] text-faint">
              Renaming a status here does not rewrite existing task files; move those cards over after.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>“Done” status</label>
              <select className={field} value={doneStatus} onChange={(e) => setDoneStatus(e.target.value)}>
                {statuses.map((s) => (
                  <option key={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Obsidian vault name</label>
              <input className={field} value={obsidianVault} onChange={(e) => setObsidianVault(e.target.value)} />
            </div>
            <div>
              <label className={label}>Group label</label>
              <input className={field} value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)} />
            </div>
            <div>
              <label className={label}>No-group label</label>
              <input className={field} value={noGroupLabel} onChange={(e) => setNoGroupLabel(e.target.value)} />
            </div>
            <div>
              <label className={label}>Today “in progress” statuses</label>
              <input className={field} value={activeStatuses} onChange={(e) => setActiveStatuses(e.target.value)} />
            </div>
            <div>
              <label className={label}>Today “in review” statuses</label>
              <input className={field} value={reviewStatuses} onChange={(e) => setReviewStatuses(e.target.value)} />
            </div>
            <div>
              <label className={label}>Inbox file</label>
              <input className={field} value={inboxPath} onChange={(e) => setInboxPath(e.target.value)} />
            </div>
            <div>
              <label className={label}>Capture heading</label>
              <input className={field} value={inboxHeading} onChange={(e) => setInboxHeading(e.target.value)} />
            </div>
            <div>
              <label className={label}>Weekly summary author</label>
              <input
                className={field}
                value={weeklyAuthor}
                onChange={(e) => setWeeklyAuthor(e.target.value)}
                placeholder="Name shown atop the weekly summary"
              />
            </div>
          </div>

          <div>
            <label className={label}>Weekly status notes (one per line: <code>Status = normal | end-of-week</code>)</label>
            <textarea
              className={`${field} resize-y font-mono text-xs`}
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder={'To do = TODO | ยังไม่ได้ดำเนินการ\nDoing = กำลังดำเนินการ'}
            />
            <p className="mt-1 text-[11px] text-faint">
              Appended after each task in the weekly summary. Blocked tasks instead show the prefix below + their reason.
            </p>
          </div>

          <div>
            <label className={label}>Blocked note prefix</label>
            <input className={field} value={blockedLabel} onChange={(e) => setBlockedLabel(e.target.value)} />
          </div>

          <div>
            <label className={label}>Search excludes (one per line)</label>
            <textarea
              className={`${field} resize-y font-mono text-xs`}
              rows={4}
              value={excludes}
              onChange={(e) => setExcludes(e.target.value)}
            />
          </div>

          <p className="rounded-lg bg-panel px-3 py-2 text-[11px] text-muted">
            Structural settings (how tasks are detected, where they’re stored, grouping) live in
            <code className="mx-1">kb-studio.config.json</code> in your vault — see the README presets.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:bg-panel hover:text-ink">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent/90 disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
