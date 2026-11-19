import { describe, expect, it } from 'vitest';
import { State } from 'ts-fsrs';
import { AGAIN, GOOD, LEARNING, NEW, RELEARNING, REVIEW, isKnown, makeSrs, reviveCard } from './srs.ts';

const t0 = new Date(2026, 10, 17, 10);

describe('srs', () => {
  it('numbers card states the way ts-fsrs does', () => {
    expect([NEW, LEARNING, REVIEW, RELEARNING]).toEqual([State.New, State.Learning, State.Review, State.Relearning]);
  });

  it('schedules a new card: Good graduates it for days, Again brings it back within minutes', async () => {
    const srs = await makeSrs(0.9, false);
    const card = srs.newCard(t0);
    expect(card.state).toBe(NEW);
    expect(srs.recall(card, t0)).toBe(0);

    const good = srs.review(card, GOOD, t0);
    expect(good.state).toBe(REVIEW);
    expect(isKnown(good)).toBe(true);
    expect(good.dueAt.getTime() - t0.getTime()).toBeGreaterThan(2 * 86_400_000);

    const again = srs.review(card, AGAIN, t0);
    expect(again.state).toBe(LEARNING);
    expect(isKnown(again)).toBe(false);
    expect(again.dueAt.getTime() - t0.getTime()).toBeLessThanOrEqual(20 * 60_000);
  });

  it('recall falls to the target retention when a card comes due', async () => {
    const srs = await makeSrs(0.9, false);
    const card = srs.review(srs.newCard(t0), GOOD, t0);
    expect(srs.recall(card, t0)).toBeGreaterThan(0.99);
    expect(srs.recall(card, card.dueAt)).toBeCloseTo(0.9, 2);
  });

  it('revives a card that went through JSON, which ts-fsrs rejects otherwise', async () => {
    const srs = await makeSrs(0.9, false);
    const card = srs.review(srs.newCard(t0), GOOD, t0);
    const json = JSON.parse(JSON.stringify(card));
    expect(() => srs.review(json, GOOD, card.dueAt)).toThrow();
    const back = reviveCard(json);
    expect(back.dueAt).toBeInstanceOf(Date);
    expect(back.lastReviewAt).toBeInstanceOf(Date);
    expect(srs.review(back, GOOD, card.dueAt).state).toBe(REVIEW);
  });
});
