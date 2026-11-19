import { describe, expect, it } from 'vitest';
import { currentStep, estimateMinutes, introSeen, isOver, planCounts, secondsPerCard, sessionProgress, startSession, summarize, testGraded } from './session.ts';
import type { Step } from './queue.ts';
import { AGAIN, GOOD, HARD, type Grade } from './srs.ts';
import type { Graded } from './study.ts';
import type { ReviewEntry } from './progress.ts';

const test = (itemId: string): Step => ({ kind: 'test', itemId, mode: 'read' });
const intro = (itemId: string): Step => ({ kind: 'intro', itemId });
// testGraded only reads the key, the grade and `again` from a Graded result.
const graded = (itemId: string, grade: Grade, again = grade === AGAIN): Graded =>
  ({ save: [], entry: { at: 0, key: `${itemId}|read`, grade }, again }) as Graded;

describe('a session', () => {
  it('tells reviews from new items', () => {
    const s = startSession([test('r1'), test('r2'), intro('n1'), test('n1')], 0, 0.5);
    expect([...s.reviewKeys]).toEqual(['r1|read', 'r2|read']);
    expect([...s.newIds]).toEqual(['n1']);
    expect(planCounts(s.steps)).toEqual({ reviews: 2, fresh: 1 });
  });

  it('brings a missed card back after three other cards', () => {
    const s = startSession([test('a'), test('b'), test('c'), test('d'), test('e')], 0, 0);
    testGraded(s, graded('a', AGAIN));
    expect(s.steps.map((x) => x.itemId)).toEqual(['a', 'b', 'c', 'd', 'a', 'e']);
    expect(currentStep(s)?.itemId).toBe('b');
  });

  it('brings a missed card back at the end when fewer cards are left', () => {
    const s = startSession([test('a'), test('b')], 0, 0);
    testGraded(s, graded('a', AGAIN));
    expect(s.steps.map((x) => x.itemId)).toEqual(['a', 'b', 'a']);
  });

  it('counts the first grade of each review for "remembered"', () => {
    const s = startSession([test('a'), test('b'), intro('n'), test('n')], 0, 0);
    testGraded(s, graded('a', AGAIN)); // a comes back at the end
    testGraded(s, graded('b', HARD));
    introSeen(s);
    testGraded(s, graded('n', GOOD));
    testGraded(s, graded('a', GOOD)); // second try doesn't change the first grade
    expect(isOver(s)).toBe(true);
    expect(summarize(s, 3 * 60_000)).toEqual({ reviews: 2, remembered: 0.5, fresh: 1, minutes: 3 });
    expect(sessionProgress(s)).toEqual({ reviewsDone: 2, reviews: 2, newDone: 1, fresh: 1 });
  });

  it('refuses the wrong action for the step', () => {
    const s = startSession([intro('n'), test('n')], 0, 0);
    expect(() => testGraded(s, graded('n', GOOD))).toThrow();
    introSeen(s);
    expect(() => introSeen(s)).toThrow();
  });

  it('counts a new item once it has been tested, not when it was only shown', () => {
    const s = startSession([intro('n'), intro('m'), test('n'), test('m')], 0, 0);
    introSeen(s);
    introSeen(s);
    testGraded(s, graded('n', GOOD)); // the session ends here
    expect(summarize(s, 0).fresh).toBe(1);
    expect(sessionProgress(s).newDone).toBe(2);
  });

  it('reports no "remembered" share without reviews', () => {
    const s = startSession([intro('n'), test('n')], 0, 0);
    expect(summarize(s, 0).remembered).toBeNull();
    expect(summarize(s, 0).minutes).toBe(1);
  });
});

describe('pace', () => {
  const log = (gaps: number[]): ReviewEntry[] => {
    let at = 0;
    return [{ at, key: 'k', grade: GOOD }, ...gaps.map((g) => ({ at: (at += g * 1000), key: 'k', grade: GOOD }) as ReviewEntry)];
  };

  it('uses a default until there is enough history', () => {
    expect(secondsPerCard(log([5, 6, 7]))).toBe(12);
  });

  it('takes the median gap and ignores breaks', () => {
    const gaps = [...Array.from({ length: 30 }, () => 8), 600, 900];
    expect(secondsPerCard(log(gaps))).toBe(8);
    expect(estimateMinutes(Array.from({ length: 30 }, () => test('x')), log(gaps))).toBe(4);
  });
});
