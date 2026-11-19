// Numbers for the Today and Stats screens, worked out from the review log and the cards.
import { dayEnd, dayKey, shiftDay, type CardRecord, type ReviewEntry } from './progress.ts';

/** Reviews per study day (YYYY-MM-DD). */
export function reviewsByDay(log: readonly ReviewEntry[], dayStartHour: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of log) {
    const k = dayKey(e.at, dayStartHour);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

/** Study days in a row with at least one review, up to today; today not done yet doesn't break it. */
export function streak(log: readonly ReviewEntry[], now: Date, dayStartHour: number): number {
  const days = reviewsByDay(log, dayStartHour);
  let day = dayKey(now, dayStartHour);
  if (!days.has(day)) day = shiftDay(day, -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = shiftDay(day, -1);
  }
  return n;
}

/** Cards coming due on each of the next `days` study days; [0] is everything due by the end of today. */
export function forecast(cards: Iterable<CardRecord>, now: Date, dayStartHour: number, days = 7): number[] {
  const out = new Array<number>(days).fill(0);
  const ends: number[] = [];
  let end = dayEnd(now, dayStartHour);
  for (let i = 0; i < days; i++) {
    ends.push(end.getTime());
    end = dayEnd(end, dayStartHour);
  }
  for (const c of cards) {
    const due = c.srs.dueAt.getTime();
    const i = ends.findIndex((e) => due <= e);
    if (i >= 0) out[i]++;
  }
  return out;
}
