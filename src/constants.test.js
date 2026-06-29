import { describe, it, expect, vi, afterEach } from 'vitest';
import { weekRange, isoWeekLabel, dateInRange, dueBucket } from './constants';

describe('weekRange', () => {
  it('returns Mon..Sun for a midweek date', () => {
    const { start, end } = weekRange(new Date(2026, 5, 25)); // Thu 25 Jun 2026
    expect(start.getDate()).toBe(22); // Monday
    expect(start.getDay()).toBe(1);
    expect([start.getHours(), start.getMinutes()]).toEqual([0, 0]);
    expect(end.getDate()).toBe(28); // Sunday
    expect(end.getDay()).toBe(0);
    expect(end.getHours()).toBe(23);
  });

  it('treats Sunday as the last day of its week (not the next)', () => {
    const { start, end } = weekRange(new Date(2026, 5, 28)); // Sun 28 Jun
    expect(start.getDate()).toBe(22);
    expect(end.getDate()).toBe(28);
  });
});

describe('isoWeekLabel', () => {
  it('labels a known mid-year week', () => {
    expect(isoWeekLabel(new Date(2026, 5, 25))).toBe('2026-W26');
  });

  it('rolls a late-December date into next year’s W01', () => {
    expect(isoWeekLabel(new Date(2025, 11, 29))).toBe('2026-W01'); // Mon 29 Dec 2025
  });

  it('keeps an early-January date in the prior year’s W53', () => {
    expect(isoWeekLabel(new Date(2027, 0, 1))).toBe('2026-W53'); // Fri 1 Jan 2027
  });
});

describe('dateInRange', () => {
  const { start, end } = weekRange(new Date(2026, 5, 25));
  it('inside the week', () => expect(dateInRange('2026-06-24', start, end)).toBe(true));
  it('start boundary (Mon)', () => expect(dateInRange('2026-06-22', start, end)).toBe(true));
  it('end boundary (Sun)', () => expect(dateInRange('2026-06-28', start, end)).toBe(true));
  it('just after the week', () => expect(dateInRange('2026-06-29', start, end)).toBe(false));
  it('empty string', () => expect(dateInRange('', start, end)).toBe(false));
});

describe('dueBucket', () => {
  afterEach(() => vi.useRealTimers());
  const freeze = () => vi.useFakeTimers().setSystemTime(new Date(2026, 5, 25, 12)); // Thu 25 Jun

  it('overdue / today / week / later', () => {
    freeze();
    expect(dueBucket('2026-06-24')).toBe('overdue');
    expect(dueBucket('2026-06-25')).toBe('today');
    expect(dueBucket('2026-06-30')).toBe('week');
    expect(dueBucket('2026-08-01')).toBe('later');
  });

  it('null when there is no due date', () => {
    freeze();
    expect(dueBucket('')).toBe(null);
  });
});
