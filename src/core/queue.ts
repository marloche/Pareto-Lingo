// Builds a study session: due reviews first, the ones you're likeliest to forget leading; then new items
// in pack order, each shown once (intro, not graded) and tested a few cards later.
import type { Item } from './types.ts';
import { NEW, type Srs } from './srs.ts';
import { cardKey, dayEnd, dayKey, type CardRecord, type Mode, type Settings } from './progress.ts';

export type Step = { kind: 'intro'; itemId: string } | { kind: 'test'; itemId: string; mode: Mode };

/** Cards between a new item's intro and its first test, and before a missed card comes back. */
export const GAP = 3;

/** New items started today (reading cards created this study day). */
export function newToday(cards: Iterable<CardRecord>, now: Date, dayStartHour: number): number {
  const today = dayKey(now, dayStartHour);
  let n = 0;
  for (const c of cards) if (c.mode === 'read' && c.added === today) n++;
  return n;
}

/**
 * Cards due before the study day ends. Reviewed cards come first, lowest chance of recall first;
 * typing cards not yet tried (state New) come after them.
 */
export function dueCards(cards: Iterable<CardRecord>, now: Date, dayStartHour: number, srs: Srs): CardRecord[] {
  const end = dayEnd(now, dayStartHour).getTime();
  return [...cards]
    .filter((c) => c.srs.dueAt.getTime() <= end)
    .map((c) => ({ c, fresh: c.srs.state === NEW ? 1 : 0, r: srs.recall(c.srs, now) }))
    .sort((a, b) => a.fresh - b.fresh || a.r - b.r || a.c.srs.dueAt.getTime() - b.c.srs.dueAt.getTime())
    .map(({ c }) => c);
}

/** Puts `step` `gap` places after position `from` (or at the end if the list is shorter). */
export function insertLater(steps: Step[], from: number, step: Step, gap = GAP): void {
  steps.splice(Math.min(from + gap + 1, steps.length), 0, step);
}

/** @param items the pack's items, in teaching order */
export function buildSession(items: readonly Item[], cards: ReadonlyMap<string, CardRecord>, now: Date, settings: Settings, srs: Srs): Step[] {
  const inPack = new Set(items.map((i) => i.id));
  const mine = [...cards.values()].filter((c) => inPack.has(c.itemId));
  const steps: Step[] = dueCards(mine, now, settings.dayStartHour, srs).map((c) => ({ kind: 'test', itemId: c.itemId, mode: c.mode }));

  // The daily limit is per language: new Japanese words today leave Russian's new words alone.
  const room = Math.max(0, settings.newPerDay - newToday(mine, now, settings.dayStartHour));
  const fresh = items.filter((i) => !cards.has(cardKey(i.id, 'read'))).slice(0, room);
  for (const i of fresh) steps.push({ kind: 'intro', itemId: i.id });
  for (const i of fresh) {
    const at = steps.findIndex((s) => s.kind === 'intro' && s.itemId === i.id);
    insertLater(steps, at, { kind: 'test', itemId: i.id, mode: 'read' });
  }
  return steps;
}
