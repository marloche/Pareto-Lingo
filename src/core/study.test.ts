import { describe, expect, it } from 'vitest';
import { AGAIN, GOOD, NEW, makeSrs } from './srs.ts';
import { WRITE_UNLOCK_DAYS, canWrite, gradeCard } from './study.ts';
import type { CardRecord } from './progress.ts';
import { grammar, letter, word } from './test-fixtures.ts';

const t0 = new Date(2026, 10, 17, 10);
const item = word(1);

describe('grading', () => {
  it('creates the card on its first grade, dated to the study day, and logs the review', async () => {
    const srs = await makeSrs(0.9, false);
    const g = gradeCard(srs, new Map(), item, 'read', GOOD, t0, 4);
    expect(g.save).toHaveLength(1);
    expect(g.save[0]).toMatchObject({ key: 't:w:1|read', itemId: 't:w:1', mode: 'read', added: '2026-11-17' });
    expect(g.entry).toEqual({ at: t0.getTime(), key: 't:w:1|read', grade: GOOD });
    expect(g.again).toBe(false);
    expect(g.unlocked).toBeUndefined();
  });

  it('a missed card comes back in the same session', async () => {
    const srs = await makeSrs(0.9, false);
    expect(gradeCard(srs, new Map(), item, 'read', AGAIN, t0, 4).again).toBe(true);
  });

  it('unlocks the typing card once, when the reading interval first reaches 3 weeks', async () => {
    const srs = await makeSrs(0.9, false);
    const cards = new Map<string, CardRecord>();
    let now = t0;
    let unlockedOn = -1;
    for (let i = 0; i < 8 && unlockedOn < 0; i++) {
      const g = gradeCard(srs, cards, item, 'read', GOOD, now, 4);
      for (const c of g.save) cards.set(c.key, c);
      if (g.unlocked) unlockedOn = i;
      else expect(g.save[0].srs.scheduledDays).toBeLessThan(WRITE_UNLOCK_DAYS);
      now = g.save[0].srs.dueAt;
    }
    expect(unlockedOn).toBeGreaterThan(0);
    const write = cards.get('t:w:1|write')!;
    expect(write).toMatchObject({ itemId: 't:w:1', mode: 'write' });
    expect(write.srs.state).toBe(NEW);
    expect(gradeCard(srs, cards, item, 'read', GOOD, now, 4).unlocked).toBeUndefined();
  });

  it('only words get a typing card', () => {
    expect(canWrite(word(1))).toBe(true);
    expect(canWrite(letter(1))).toBe(false);
    expect(canWrite(grammar(1))).toBe(false);
    expect(canWrite({ ...word(2), examples: [{ text: 'x', en: 'x', src: 'pack' }] })).toBe(false);
  });
});
