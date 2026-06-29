import { describe, it, expect } from 'vitest';
import { weeklyTasks, formatWeekly } from './weekly';

const config = {
  doneStatus: 'Done',
  statuses: [{ name: 'Backlog' }, { name: 'To do' }, { name: 'Doing' }, { name: 'In Review' }, { name: 'Done' }],
  weeklyStatusNotes: 'To do = TODO | not started\nDoing = in progress\nDone = done',
  weeklyBlockedLabel: 'Blocked',
  noGroupLabel: 'No project',
};
const start = new Date(2026, 5, 22);
const end = new Date(2026, 5, 28, 23, 59, 59);

const tasks = [
  { id: '1', title: 'Active doing', status: 'Doing', project: 'Trust1' },
  { id: '2', title: 'Backlog item', status: 'Backlog', project: 'Trust1' },
  { id: '3', title: 'Done this week', status: 'Done', done: '2026-06-24', project: 'Trust1' },
  { id: '4', title: 'Done last week', status: 'Done', done: '2026-06-15', project: 'Trust1' },
  { id: '5', title: 'Blocked one', status: 'To do', blocked: true, blockReason: 'waiting on IT', project: 'MDM' },
];

describe('weeklyTasks (current week)', () => {
  const ids = weeklyTasks(tasks, config, start, end, true).map((t) => t.id);
  it('includes active non-backlog tasks', () => expect(ids).toEqual(expect.arrayContaining(['1', '5'])));
  it('excludes the Backlog pool', () => expect(ids).not.toContain('2'));
  it('includes a task done in the window', () => expect(ids).toContain('3'));
  it('excludes a task done in a different week', () => expect(ids).not.toContain('4'));
});

describe('weeklyTasks (other week) falls back to due date for undated done', () => {
  const undated = [{ id: 'u', title: 'Done no date', status: 'Done', due: '2026-06-24' }];
  it('places it by its due date', () => {
    const ids = weeklyTasks(undated, config, start, end, false).map((t) => t.id);
    expect(ids).toContain('u');
  });
});

describe('formatWeekly', () => {
  it('groups by project, adds header + per-status notes', () => {
    const text = formatWeekly(weeklyTasks(tasks, config, start, end, true), {
      author: 'Korn',
      start,
      end,
      noGroupLabel: 'No project',
      config,
      endOfWeek: false,
    });
    expect(text).toContain('Korn (');
    expect(text).toContain('Trust1');
    expect(text).toContain('- Active doing — in progress');
    expect(text).toContain('- Done this week — done');
    expect(text).toContain('- Blocked one — Blocked waiting on IT');
  });

  it('uses end-of-week wording when endOfWeek is true', () => {
    const t = [{ id: 'x', title: 'Plan it', status: 'To do', project: 'P' }];
    const text = formatWeekly(t, { author: '', start, end, config, endOfWeek: true });
    expect(text).toContain('- Plan it — not started');
  });
});
