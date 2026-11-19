import { describe, expect, it } from 'vitest';
import { GOOD, makeSrs, type Srs } from './srs.ts';
import { gradeCard } from './study.ts';
import { DEFAULT_SETTINGS, type CardRecord } from './progress.ts';
import { GAP, buildSession, insertLater, type Step } from './queue.ts';
import type { Item } from './types.ts';
import { word } from './test-fixtures.ts';

const t0 = new Date(2026, 10, 17, 10);
const settings = { ...DEFAULT_SETTINGS, newPerDay: 4 };
const items = [1, 2, 3, 4, 5, 6].map((n) => word(n));

function learn(srs: Srs, cards: Map<string, CardRecord>, item: Item, at: Date) {
  for (const c of gradeCard(srs, cards, item, 'read', GOOD, at, 4).save) cards.set(c.key, c);
}
const intros = (steps: Step[]) => steps.filter((s) => s.kind === 'intro').map((s) => s.itemId);

describe('session', () => {
  it('teaches new items in pack order, each tested a few cards after its intro', async () => {
    const srs = await makeSrs(0.9, false);
    const steps = buildSession(items, new Map(), t0, settings, srs);
    expect(intros(steps)).toEqual(['t:w:1', 't:w:2', 't:w:3', 't:w:4']);
    expect(steps).toHaveLength(8);
    for (const id of intros(steps)) {
      const intro = steps.findIndex((s) => s.kind === 'intro' && s.itemId === id);
      const test = steps.findIndex((s) => s.kind === 'test' && s.itemId === id);
      expect(test - intro - 1).toBeGreaterThanOrEqual(GAP);
      expect(steps[test]).toEqual({ kind: 'test', itemId: id, mode: 'read' });
    }
  });

  it('counts items already started today against the daily limit', async () => {
    const srs = await makeSrs(0.9, false);
    const cards = new Map<string, CardRecord>();
    for (const i of items.slice(0, 3)) learn(srs, cards, i, t0);
    expect(intros(buildSession(items, cards, new Date(2026, 10, 17, 22), settings, srs))).toEqual(['t:w:4']);
    expect(intros(buildSession(items, cards, new Date(2026, 10, 18, 10), settings, srs))).toEqual(['t:w:4', 't:w:5', 't:w:6']);
  });

  it('counts only new items from this pack against the daily limit', async () => {
    const srs = await makeSrs(0.9, false);
    const cards = new Map<string, CardRecord>();
    for (const i of items.slice(0, 3)) learn(srs, cards, i, t0);
    const other = [7, 8, 9].map((n) => word(n));
    expect(intros(buildSession(other, cards, new Date(2026, 10, 17, 22), settings, srs))).toEqual(['t:w:7', 't:w:8', 't:w:9']);
  });

  it('puts due reviews first, the one likeliest to be forgotten leading', async () => {
    const srs = await makeSrs(0.9, false);
    const cards = new Map<string, CardRecord>();
    learn(srs, cards, items[1], new Date(2026, 10, 11, 10));
    learn(srs, cards, items[0], new Date(2026, 10, 1, 10));
    const steps = buildSession(items, cards, t0, { ...settings, newPerDay: 0 }, srs);
    expect(steps).toEqual([
      { kind: 'test', itemId: 't:w:1', mode: 'read' },
      { kind: 'test', itemId: 't:w:2', mode: 'read' },
    ]);
  });

  it('leaves out cards whose item is no longer in the pack', async () => {
    const srs = await makeSrs(0.9, false);
    const cards = new Map<string, CardRecord>();
    learn(srs, cards, word(99), new Date(2026, 10, 1, 10));
    expect(buildSession(items, cards, t0, { ...settings, newPerDay: 0 }, srs)).toEqual([]);
  });

  it('inserts a step a few places on, or at the end', () => {
    const steps: Step[] = [1, 2, 3, 4, 5].map((n) => ({ kind: 'intro', itemId: `i${n}` }));
    insertLater(steps, 0, { kind: 'test', itemId: 'x', mode: 'read' });
    expect(steps.map((s) => s.itemId)).toEqual(['i1', 'i2', 'i3', 'i4', 'x', 'i5']);
    insertLater(steps, 4, { kind: 'test', itemId: 'y', mode: 'read' });
    expect(steps.at(-1)!.itemId).toBe('y');
  });
});
