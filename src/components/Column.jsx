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
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${statusDot(color)}`} />
        <h2 className="text-sm font-semibold text-slate-700">{status}</h2>
        <span className="text-xs text-slate-400">{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={[
          'flex min-h-24 flex-1 flex-col gap-2 rounded-xl border p-2 transition',
          isOver ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-slate-100/60',
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
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-auto rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-600"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}
