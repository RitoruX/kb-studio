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
    <div
      className={[
        'flex w-[320px] min-w-[280px] shrink-0 flex-col rounded-xl border p-4 transition-all duration-500',
        isOver ? 'border-primary/20 bg-primary/5' : 'border-outline-variant/30 bg-surface-container-low/50',
      ].join(' ')}
    >
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusDot(color)}`} />
          <h2 className="text-sm font-semibold text-on-surface">{status}</h2>
          <span className="rounded-full bg-surface-variant px-2 py-0.5 text-xs text-on-surface-variant">
            {tasks.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="kanban-scroll flex min-h-24 flex-1 flex-col gap-3 overflow-y-auto pr-1"
      >
        {sorted.map((t) => (
          <Card key={t.id} task={t} onOpen={onOpen} showProject={showProject} />
        ))}
      </div>

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
          className="mt-3 rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-outline-variant/50 py-2 text-sm font-medium text-primary transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 hover:bg-surface-container-high hover:shadow-sm active:scale-[0.98]"
        >
          + Add task
        </button>
      )}
    </div>
  );
}
