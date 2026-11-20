import { describe, expect, it } from 'vitest';
import { pastLessons, practiceSteps, topics, TOPIC_SIZE } from './practice.ts';
import type { ReviewEntry } from './progress.ts';
import type { Item } from './types.ts';
import { word } from './test-fixtures.ts';

const at = (day: number, hour: number) => new Date(2026, 10, day, hour).getTime();

describe('past lessons', () => {
  const log: ReviewEntry[] = [
    { at: at(17, 10), key: 't:w:1|read', grade: 3 },
    { at: at(17, 10), key: 't:w:2|read', grade: 1 },
    { at: at(17, 11), key: 't:w:2|read', grade: 3 }, // second try the same day: the first grade counts
    { at: at(18, 2), key: 't:w:3|read', grade: 3 }, // 2 am, before the 4 am day start: still the 17th
    { at: at(18, 9), key: 'x:w:9|read', grade: 3 }, // another language's pack
    { at: at(18, 9), key: 't:w:1|write', grade: 2 },
  ];
  const sets = pastLessons(log, (id) => id.startsWith('t:'), 4);

  it('groups this pack’s reviews by study day, newest first', () => {
    expect(sets.map((s) => s.title)).toEqual(['2026-11-18', '2026-11-17']);
    expect(sets[1].keys).toEqual(['t:w:1|read', 't:w:2|read', 't:w:3|read']);
    expect(sets[0].keys).toEqual(['t:w:1|write']);
  });

  it('counts cards remembered on the first try', () => {
    expect(sets[1].right).toBe(2);
  });
});

describe('topics', () => {
  const items: Item[] = [
    { id: 't:l:a', kind: 'letter', order: 1, text: 'A', gloss: [], examples: [] },
    ...Array.from({ length: TOPIC_SIZE + 5 }, (_, i) => word(i + 1)),
  ];
  it('lists only topics with studied cards, words in blocks', () => {
    const have = new Set(['t:l:a|read', 't:w:2|read', 't:w:2|write', `t:w:${TOPIC_SIZE + 3}|read`]);
    const sets = topics(items, (k) => have.has(k));
    expect(sets.map((s) => s.title)).toEqual(['Alphabet', `Words 1–${TOPIC_SIZE}`, `Words ${TOPIC_SIZE + 1}–${TOPIC_SIZE + 5}`]);
    expect(sets[1].keys).toEqual(['t:w:2|read', 't:w:2|write']);
  });
});

describe('practice steps', () => {
  it('makes one test per card, in the card’s mode, capped', () => {
    const steps = practiceSteps(['t:w:1|read', 't:w:2|write', 't:w:3|read'], 2, () => 0.5);
    expect(steps).toHaveLength(2);
    expect(steps.every((s) => s.kind === 'test')).toBe(true);
    const all = practiceSteps(['t:w:1|read', 't:w:2|write'], Infinity, () => 0);
    expect(all.find((s) => s.itemId === 't:w:2')).toEqual({ kind: 'test', itemId: 't:w:2', mode: 'write' });
  });
});
