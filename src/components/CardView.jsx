import { Flag01, Check, CalendarDate, AlertTriangle } from '@untitledui/icons';
import { projectColor, dueMeta } from '../constants';
import { toExcerpt } from './Markdown';
import { useConfig } from '../ConfigContext';

// Presentational card — used by both the draggable board Card and the Today view.
// Pass innerRef + dragProps for the board; pass just onClick for static lists.
export default function CardView({ task, showProject, onClick, onToggleBlocked, innerRef, dragProps = {}, dragging, overlay, grab }) {
  const config = useConfig();
  const due = dueMeta(task.due);
  const excerpt = toExcerpt(task.description);
  const interactive = !!onClick && !overlay;

  return (
    <div
      ref={innerRef}
      {...dragProps}
      onClick={onClick}
      // keyboard-first: cards are reachable by Tab (role/tabindex from dnd-kit on
      // the board; set here for the static Today list) and open on Enter/Space.
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={[
        'group rounded-lg border border-line bg-surface p-2.5 shadow-card transition hover:border-line-strong hover:shadow-card-hover',
        interactive ? 'active:scale-[0.99]' : '',
        grab ? 'cursor-grab active:cursor-grabbing' : onClick ? 'cursor-pointer' : '',
        dragging ? 'opacity-40' : '',
        overlay ? 'rotate-2 shadow-raised cursor-grabbing' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-1.5">
        <p className="flex-1 text-sm font-medium leading-snug text-ink">{task.title}</p>
        {onToggleBlocked && (
          <button
            type="button"
            title={task.blocked ? 'Unblock' : 'Mark blocked'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleBlocked(task);
            }}
            className={[
              'shrink-0 rounded leading-none transition',
              task.blocked ? 'text-red-600 opacity-100 dark:text-red-400' : 'text-muted opacity-0 group-hover:opacity-60 hover:!opacity-100',
            ].join(' ')}
          >
            <Flag01 size={14} />
          </button>
        )}
      </div>

      {excerpt && (
        <p className="mt-1 max-h-20 overflow-hidden whitespace-pre-line text-xs leading-snug text-muted">
          {excerpt}
        </p>
      )}

      {(due || showProject || task.blocked || task.done) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {task.blocked && (
            <span
              title={task.blockReason || 'Blocked'}
              className="inline-flex max-w-full items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300"
            >
              <Flag01 size={11} className="shrink-0" />
              <span className="truncate">{task.blockReason || 'Blocked'}</span>
            </span>
          )}
          {task.done && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Check size={11} className="shrink-0" /> {task.done}
            </span>
          )}
          {due && (
            <span
              className={[
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                due.overdue
                  ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                  : due.soon
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                    : 'bg-panel text-muted',
              ].join(' ')}
            >
              {due.overdue ? <AlertTriangle size={11} /> : <CalendarDate size={11} />}
              {due.label}
            </span>
          )}
          {showProject &&
            (task.project ? (
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${projectColor(task.project)}`}>
                {task.project}
              </span>
            ) : (
              <span className="rounded bg-panel px-1.5 py-0.5 text-[11px] font-medium text-faint">
                {config.noGroupLabel}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
