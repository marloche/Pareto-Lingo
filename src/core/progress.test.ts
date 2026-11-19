import { describe, expect, it } from 'vitest';
import { cardKey, dayEnd, dayKey, shiftDay } from './progress.ts';

describe('study days', () => {
  it('a study day starts at the start hour, so late nights count for the day before', () => {
    expect(dayKey(new Date(2026, 10, 17, 3, 59), 4)).toBe('2026-11-16');
    expect(dayKey(new Date(2026, 10, 17, 4, 0), 4)).toBe('2026-11-17');
    expect(dayKey(new Date(2026, 10, 17, 23, 0), 4)).toBe('2026-11-17');
    expect(dayKey(new Date(2026, 0, 1, 1, 0), 4)).toBe('2025-12-31');
    expect(dayKey(new Date(2026, 10, 17, 1, 0), 0)).toBe('2026-11-17');
  });

  it('a study day ends at the next start hour', () => {
    expect(dayEnd(new Date(2026, 10, 17, 10), 4)).toEqual(new Date(2026, 10, 18, 4));
    expect(dayEnd(new Date(2026, 10, 18, 2), 4)).toEqual(new Date(2026, 10, 18, 4));
  });

  it('steps across month and year ends', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('keys a card by item and mode', () => {
    expect(cardKey('ru:w:verb:знать', 'write')).toBe('ru:w:verb:знать|write');
  });
});
