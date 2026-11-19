// Grading one card: updates its memory state, logs the review, and unlocks a word's typing card once
// its reading card is well known (card model A: recognize first, produce later).
import type { Item } from './types.ts';
import { AGAIN, REVIEW, type Grade, type Srs } from './srs.ts';
import { cardKey, dayKey, type CardRecord, type Mode, type ReviewEntry } from './progress.ts';

/** A word's typing card unlocks once its reading card's review interval reaches this many days. */
export const WRITE_UNLOCK_DAYS = 21;
/** A card due again within this many minutes comes back in the same session. */
export const SAME_SESSION_MINUTES = 20;

export interface Graded {
  /** Cards to save: the graded one, and a typing card if this review unlocked it. */
  save: CardRecord[];
  entry: ReviewEntry;
  /** Show this card again later in the same session. */
  again: boolean;
  /** The typing card this review unlocked, if any. */
  unlocked?: CardRecord;
}

/** Only words get a typing card, and only when an example marks the word (the gap to fill). */
export const canWrite = (item: Item) => item.kind === 'word' && item.examples.some((e) => e.focus);

export function gradeCard(
  srs: Srs,
  cards: ReadonlyMap<string, CardRecord>,
  item: Item,
  mode: Mode,
  grade: Grade,
  now: Date,
  dayStartHour: number,
): Graded {
  const key = cardKey(item.id, mode);
  const today = dayKey(now, dayStartHour);
  const before = cards.get(key) ?? { key, itemId: item.id, mode, added: today, srs: srs.newCard(now) };
  const after: CardRecord = { ...before, srs: srs.review(before.srs, grade, now) };
  const save = [after];

  const writeKey = cardKey(item.id, 'write');
  let unlocked: CardRecord | undefined;
  if (mode === 'read' && canWrite(item) && after.srs.state === REVIEW && after.srs.scheduledDays >= WRITE_UNLOCK_DAYS && !cards.has(writeKey)) {
    unlocked = { key: writeKey, itemId: item.id, mode: 'write', added: today, srs: srs.newCard(now) };
    save.push(unlocked);
  }

  const soon = after.srs.dueAt.getTime() - now.getTime() <= SAME_SESSION_MINUTES * 60_000;
  return { save, entry: { at: now.getTime(), key, grade }, again: grade === AGAIN || soon, ...(unlocked ? { unlocked } : {}) };
}
