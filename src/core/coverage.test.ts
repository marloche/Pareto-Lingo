import { describe, expect, it } from 'vitest';
import { AGAIN, GOOD, makeSrs, type Grade } from './srs.ts';
import { gradeCard } from './study.ts';
import type { CardRecord } from './progress.ts';
import { coverage, packCurve } from './coverage.ts';
import { grammar, letter, word } from './test-fixtures.ts';

const t0 = new Date(2026, 10, 17, 10);

describe('coverage', () => {
  it('adds up the share of words whose reading card is known', async () => {
    const srs = await makeSrs(0.9, false);
    const items = [word(1, 0.05), word(2, 0.03), word(3, 0.02), letter(4), grammar(5)];
    const cards = new Map<string, CardRecord>();
    const grade = (i: number, g: Grade) => {
      for (const c of gradeCard(srs, cards, items[i], 'read', g, t0, 4).save) cards.set(c.key, c);
    };
    grade(0, GOOD); // known
    grade(1, AGAIN); // still learning: doesn't count yet
    grade(3, GOOD); // a letter: not a word
    expect(coverage(items, cards)).toEqual({ share: 0.05, known: 1, words: 3 });
  });

  it('pack curve: coverage after the first n words, in teaching order', () => {
    const items = [word(1, 0.05), grammar(2), word(3, 0.03), word(4, 0.02)];
    const curve = packCurve(items, [1, 3]);
    expect(curve.map((c) => c.words)).toEqual([1, 3]);
    expect(curve[0].share).toBeCloseTo(0.05);
    expect(curve[1].share).toBeCloseTo(0.1);
  });
});
