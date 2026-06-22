import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import Card from './Card';
import { statusDot } from '../constants';
import { useConfig } from '../ConfigContext';

export default function Column({ status, tasks, onCreate, onOpen, showProject }) {
  const config = useConfig();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const color = config.statuses.find((s) => s.name === status)?.color;
  const sorted = [...tasks].sort(
    (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title)
  );

  function submit() {
    const t = title.trim();
    if (t) onCreate(status, t); // create instantly; stay open for rapid multi-add
    setTitle('');
  }

  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${statusDot(color)}`} />
        <h2 className="text-sm font-semibold tracking-tight text-ink">{status}</h2>
        <span className="text-xs tabular-nums text-faint">{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={[
          'flex min-h-24 flex-1 flex-col gap-1.5 rounded-xl border p-1.5 transition',
          isOver ? 'border-accent/50 bg-accent-weak/60' : 'border-line bg-panel/60',
        ].join(' ')}
      >
        {sorted.map((t) => (
          <Card key={t.id} task={t} onOpen={onOpen} showProject={showProject} />
        ))}

        {adding ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              } else if (e.key === 'Escape') {
                setTitle('');
                setAdding(false);
              }
            }}
            onBlur={() => {
              if (title.trim()) submit();
              setAdding(false);
            }}
            placeholder="Task title… (Enter)"
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-auto rounded-lg border border-dashed border-line-strong py-2 text-sm text-faint transition hover:border-accent/50 hover:text-muted"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}
