// Checks the built Russian pack (public/packs/ru/pack.json), so a pipeline change can't quietly break it.
import { describe, expect, it } from 'vitest';
import raw from '../../public/packs/ru/pack.json?raw';
import type { Pack } from './types.ts';

const pack = JSON.parse(raw) as Pack;

describe('Russian pack', () => {
  it('is schema 1, CC BY-SA, and names its sources', () => {
    expect(pack.schema).toBe(1);
    expect(pack.license).toBe('CC BY-SA 4.0');
    expect(pack.sources.map((s) => s.name).join(' ')).toMatch(/FrequencyWords.*OpenRussian.*Tatoeba/);
  });

  it('numbers items 1…n with unique ids', () => {
    expect(pack.items.map((i) => i.order)).toEqual(pack.items.map((_, i) => i + 1));
    expect(new Set(pack.items.map((i) => i.id)).size).toBe(pack.items.length);
  });

  it('starts with the 33 letters', () => {
    expect(pack.items.slice(0, 33).every((i) => i.kind === 'letter')).toBe(true);
    expect(pack.items.filter((i) => i.kind === 'letter')).toHaveLength(33);
  });

  it('teaches words in frequency order', () => {
    const ranks = pack.items.filter((i) => i.kind === 'word').map((i) => i.rank!);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('gives every word and grammar item an example that marks its focus word', () => {
    const bad = pack.items
      .filter((i) => i.kind !== 'letter')
      .filter((i) => !i.examples.length || i.examples.some((e) => !e.focus || e.focus[0] < 0 || e.focus[0] >= e.focus[1] || e.focus[1] > e.text.length))
      .map((i) => i.id);
    expect(bad).toEqual([]);
  });

  it('word shares add up to the coverage of the whole pack, under 100%', () => {
    const total = pack.items.reduce((s, i) => s + (i.share ?? 0), 0);
    expect(total).toBeGreaterThan(0.85);
    expect(total).toBeLessThan(1);
  });
});
