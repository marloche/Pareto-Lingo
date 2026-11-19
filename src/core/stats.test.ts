import { describe, expect, it } from 'vitest';
import type { CardRecord, ReviewEntry } from './progress.ts';
import type { SrsCard } from './srs.ts';
import { forecast, reviewsByDay, streak } from './stats.ts';

const at = (day: number, hour = 10) => new Date(2026, 10, day, hour).getTime();
const review = (t: number): ReviewEntry => ({ at: t, key: 'k', grade: 3 });

describe('stats', () => {
  it('streak counts study days in a row', () => {
    expect(streak([14, 15, 16, 17].map((d) => review(at(d))), new Date(2026, 10, 17, 12), 4)).toBe(4);
  });

  it('a streak lasts until a whole study day passes without a review', () => {
    const log = [review(at(15)), review(at(16))];
    expect(streak(log, new Date(2026, 10, 17, 12), 4)).toBe(2);
    expect(streak(log, new Date(2026, 10, 18, 12), 4)).toBe(0);
  });

  it('a review at 2 AM counts for the day before', () => {
    expect(reviewsByDay([review(at(16, 10)), review(at(17, 2))], 4)).toEqual(new Map([['2026-11-16', 2]]));
  });

  it('forecast counts cards due on each coming study day, overdue ones today', () => {
    const card = (due: Date) => ({ key: String(+due), itemId: 'i', mode: 'read', added: '', srs: { dueAt: due } as SrsCard }) as CardRecord;
    const cards = [new Date(2026, 10, 16), new Date(2026, 10, 17, 23), new Date(2026, 10, 18, 3), new Date(2026, 10, 18, 5), new Date(2026, 10, 30)].map(card);
    expect(forecast(cards, new Date(2026, 10, 17, 10), 4, 3)).toEqual([3, 1, 0]);
  });
});
