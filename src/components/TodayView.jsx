import CardView from './CardView';
import { dueBucket } from '../constants';
import { useConfig } from '../ConfigContext';

const SECTIONS = [
  { key: 'overdue', title: 'Overdue', icon: '⚠', tone: 'text-red-600' },
  { key: 'today', title: 'Due today', icon: '📅', tone: 'text-amber-600' },
  { key: 'week', title: 'This week', icon: '🗓', tone: 'text-slate-600' },
  { key: 'doing', title: 'In progress', icon: '🔵', tone: 'text-blue-600' },
  { key: 'review', title: 'In review — monitor', icon: '👀', tone: 'text-cyan-700' },
];

export default function TodayView({ tasks, onOpen }) {
  const config = useConfig();
  const notNear = (t) => ['later', null].includes(dueBucket(t.due));
  const open = tasks.filter((t) => t.status !== config.doneStatus);
  const groups = {
    overdue: open.filter((t) => dueBucket(t.due) === 'overdue'),
    today: open.filter((t) => dueBucket(t.due) === 'today'),
    week: open.filter((t) => dueBucket(t.due) === 'week'),
    // active / monitoring work not already surfaced by a near due date
    doing: open.filter((t) => (config.activeStatuses || []).includes(t.status) && notNear(t)),
    review: open.filter((t) => (config.reviewStatuses || []).includes(t.status) && notNear(t)),
  };
  const total = Object.values(groups).reduce((n, g) => n + g.length, 0);

  if (total === 0) {
    return <p className="text-slate-400">Nothing urgent — you’re clear. 🎉</p>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {SECTIONS.map((s) => {
        const items = groups[s.key];
        if (!items.length) return null;
        const sorted = [...items].sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
        return (
          <section key={s.key}>
            <h2 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${s.tone}`}>
              <span>{s.icon}</span>
              {s.title}
              <span className="text-slate-400">{items.length}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {sorted.map((t) => (
                <CardView key={t.id} task={t} showProject onClick={() => onOpen(t)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
