import { projectColor, dueMeta } from '../constants';
import { toExcerpt } from './Markdown';
import { useConfig } from '../ConfigContext';

// Presentational card — used by both the draggable board Card and the Today view.
// Pass innerRef + dragProps for the board; pass just onClick for static lists.
export default function CardView({ task, showProject, onClick, innerRef, dragProps = {}, dragging, overlay, grab }) {
  const config = useConfig();
  const due = dueMeta(task.due);
  const excerpt = toExcerpt(task.description);

  return (
    <div
      ref={innerRef}
      {...dragProps}
      onClick={onClick}
      className={[
        'group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow',
        grab ? 'cursor-grab active:cursor-grabbing' : onClick ? 'cursor-pointer' : '',
        dragging ? 'opacity-40' : '',
        overlay ? 'rotate-2 shadow-lg cursor-grabbing' : '',
      ].join(' ')}
    >
      <p className="text-sm font-medium leading-snug text-slate-800">{task.title}</p>

      {excerpt && (
        <p className="mt-1 max-h-20 overflow-hidden whitespace-pre-line text-xs leading-snug text-slate-500">
          {excerpt}
        </p>
      )}

      {(due || showProject) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {due && (
            <span
              className={[
                'rounded px-1.5 py-0.5 text-[11px] font-medium',
                due.overdue
                  ? 'bg-red-100 text-red-700'
                  : due.soon
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-500',
              ].join(' ')}
            >
              {due.overdue ? '⚠ ' : '📅 '}
              {due.label}
            </span>
          )}
          {showProject &&
            (task.project ? (
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${projectColor(task.project)}`}>
                {task.project}
              </span>
            ) : (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
                {config.noGroupLabel}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
