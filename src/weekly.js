import { dateInRange } from './constants';

const fmtDay = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// Which tasks count as "this week's work" for the summary.
//  current week: everything active (not Backlog, not Done) + what was done this week
//  other weeks:  only what's reconstructable — scheduled (due in window) + done in window
export function weeklyTasks(tasks, config, start, end, isCurrent) {
  // fall back to the due date when a done task has no completion date
  const done = tasks.filter((t) => t.status === config.doneStatus && dateInRange(t.done || t.due, start, end));
  if (!isCurrent) {
    const due = tasks.filter((t) => t.status !== config.doneStatus && dateInRange(t.due, start, end));
    return [...due, ...done];
  }
  const backlog = config.statuses[0]?.name;
  const active = tasks.filter((t) => t.status !== config.doneStatus && t.status !== backlog);
  return [...active, ...done];
}

// parse the "Status = note" lines (config.weeklyStatusNotes) into { status: note }
function parseStatusNotes(raw) {
  const map = {};
  for (const line of String(raw || '').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return map;
}

// Per-task status note appended after the title:
//  blocked → "<blockedLabel> <reason>"  (e.g. "Blocked เนื่องจากรอหารือกับพี่กอล์ฟ")
//  else    → the note mapped from the task's status, where a "normal | end-of-week"
//            value lets wording differ by when you write the summary
//            (Mon "TODO" vs Fri/Sat "ยังไม่ได้ดำเนินการ").
function taskNote(t, notes, blockedLabel, endOfWeek) {
  if (t.blocked) return t.blockReason ? `${blockedLabel} ${t.blockReason}` : blockedLabel;
  const raw = notes[t.status];
  if (!raw) return '';
  const [normal, eow] = raw.split('|').map((s) => s.trim());
  return endOfWeek && eow ? eow : normal;
}

// Compose the team-style weekly message — "<author> (range)" then each project as a
// heading with its task titles (+ status note) as "- " bullets. Powers both the saved
// .md and the "Copy for Teams" clipboard text, so they're identical.
export function formatWeekly(items, { author, start, end, noGroupLabel = 'Other', config = {}, endOfWeek = false }) {
  const byProject = {};
  for (const t of items) {
    const key = t.project || noGroupLabel;
    (byProject[key] ||= []).push(t);
  }
  const projects = Object.keys(byProject).sort(
    (a, b) => (a === noGroupLabel) - (b === noGroupLabel) || a.localeCompare(b)
  );
  const notes = parseStatusNotes(config.weeklyStatusNotes);
  const blockedLabel = config.weeklyBlockedLabel || 'Blocked';
  const out = [`${author ? author + ' ' : ''}(${fmtDay(start)} – ${fmtDay(end)})`, ''];
  for (const p of projects) {
    out.push(p);
    for (const t of byProject[p]) {
      const note = taskNote(t, notes, blockedLabel, endOfWeek);
      out.push(`- ${t.title}${note ? ` — ${note}` : ''}`);
    }
    out.push('');
  }
  return out.join('\n').trim() + '\n';
}
