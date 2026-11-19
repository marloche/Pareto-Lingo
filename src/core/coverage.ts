// Coverage: the share of everyday speech (corpus word tokens) made up of words you know, all their
// forms counted. A word counts once its reading card has graduated to Review.
import type { Item } from './types.ts';
import { isKnown } from './srs.ts';
import { cardKey, type CardRecord } from './progress.ts';

export interface Coverage {
  /** 0–1 */
  share: number;
  /** Words known. */
  known: number;
  /** Words in the pack. */
  words: number;
}

export function coverage(items: readonly Item[], cards: ReadonlyMap<string, CardRecord>): Coverage {
  let share = 0;
  let known = 0;
  let words = 0;
  for (const item of items) {
    if (item.kind !== 'word') continue;
    words++;
    const card = cards.get(cardKey(item.id, 'read'));
    if (card && isKnown(card.srs)) {
      known++;
      share += item.share ?? 0;
    }
  }
  return { share, known, words };
}

/** Coverage after learning the pack's first n words in order, for each n in `marks`. */
export function packCurve(items: readonly Item[], marks: readonly number[]): { words: number; share: number }[] {
  const out: { words: number; share: number }[] = [];
  const want = new Set(marks);
  let words = 0;
  let share = 0;
  for (const item of items) {
    if (item.kind !== 'word') continue;
    words++;
    share += item.share ?? 0;
    if (want.has(words)) out.push({ words, share });
  }
  return out;
}
