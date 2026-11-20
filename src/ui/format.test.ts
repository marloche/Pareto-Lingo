import { describe, expect, it } from 'vitest';
import { count, dayLabel, hourLabel, interval, longDate, pct, wordTags } from './format.ts';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

describe('format', () => {
  it('names study days', () => {
    const now = new Date(2026, 10, 18, 2); // 2 am: before the 4 am day start, so still the 17th
    expect(dayLabel('2026-11-17', now, 4)).toBe('Today');
    expect(dayLabel('2026-11-16', now, 4)).toBe('Yesterday');
    expect(dayLabel('2026-11-15', now, 4)).toBe('Sunday, 15 November');
  });

  it('says how long until a card comes back', () => {
    expect(interval(10 * MIN, true)).toBe('soon');
    expect(interval(10 * MIN)).toBe('10 min');
    expect(interval(14.3 * 60 * MIN)).toBe('14 h');
    expect(interval(1 * DAY)).toBe('1 day');
    expect(interval(8.2 * DAY)).toBe('8 days');
    expect(interval(92.4 * DAY)).toBe('3 mo');
    expect(interval(885 * DAY)).toBe('2 yr');
  });

  it('formats numbers and dates', () => {
    expect(pct(0.5136)).toBe('51.4%');
    expect(count(1, 'review')).toBe('1 review');
    expect(count(1200, 'review')).toBe('1,200 reviews');
    expect(longDate(new Date(2026, 10, 17))).toBe('Tuesday, 17 November');
    expect(hourLabel(0)).toBe('midnight');
    expect(hourLabel(4)).toBe('4:00 AM');
  });

  it('turns word info into readable tags', () => {
    expect(wordTags('verb', 'impf · ↔ захотеть')).toEqual(['verb', 'imperfective', 'pair: захотеть']);
    expect(wordTags('noun', 'f')).toEqual(['noun', 'feminine']);
    expect(wordTags('other', '')).toEqual([]);
    expect(wordTags('adj', 'pronoun')).toEqual(['adjective', 'pronoun']);
  });
});
