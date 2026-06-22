import { useConfig } from '../ConfigContext';
import { statusDot } from '../constants';

// Loading placeholder that matches the real board's shape (columns + cards)
// instead of a spinner — so the layout doesn't jump when data arrives.
export default function BoardSkeleton() {
  const config = useConfig();
  return (
    <div className="flex animate-pulse gap-3 overflow-x-hidden pb-4" aria-hidden="true">
      {config.statuses.map((s, i) => (
        <div key={s.name} className="flex w-64 shrink-0 flex-col">
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot(s.color)}`} />
            <div className="h-3 w-20 rounded bg-line" />
          </div>
          <div className="flex min-h-24 flex-1 flex-col gap-1.5 rounded-xl border border-line bg-panel/60 p-1.5">
            {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
              <div key={j} className="rounded-lg border border-line bg-surface p-2.5 shadow-card">
                <div className="h-3 w-3/4 rounded bg-line" />
                <div className="mt-2 h-2.5 w-1/2 rounded bg-panel" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
