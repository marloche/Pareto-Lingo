import { describe, expect, it } from 'vitest';
import { GOOD, makeSrs } from './srs.ts';
import { gradeCard } from './study.ts';
import { DEFAULT_SETTINGS } from './progress.ts';
import { backupDue, backupName, makeBackup, readBackup } from './backup.ts';
import { word } from './test-fixtures.ts';

const t0 = new Date(2026, 10, 17, 10);

describe('backup reminder', () => {
  const DAY = 86_400_000;
  const now = new Date(2026, 10, 23, 12).getTime();
  const answer = (daysAgo: number) => ({ at: now - daysAgo * DAY, key: 't:w:1|read', grade: 3 as const });

  it('is due once an answer in no backup is a week old', () => {
    expect(backupDue([answer(6)], undefined, now)).toBeUndefined();
    expect(backupDue([answer(8), answer(1)], undefined, now)).toBe(8);
    expect(backupDue([answer(12)], now - 20 * DAY, now)).toBe(20);
  });

  it('never nags when nothing new was answered since the last backup', () => {
    expect(backupDue([], undefined, now)).toBeUndefined();
    expect(backupDue([answer(30)], now - 25 * DAY, now)).toBeUndefined();
  });

  it('counts only answers after the last backup', () => {
    expect(backupDue([answer(30), answer(3)], now - 10 * DAY, now)).toBeUndefined();
  });
});

describe('backup', () => {
  it('round-trips progress through a JSON file, dates included', async () => {
    const srs = await makeSrs(0.9, false);
    const g = gradeCard(srs, new Map(), word(1), 'read', GOOD, t0, 4);
    const back = readBackup(JSON.stringify(makeBackup(DEFAULT_SETTINGS, g.save, [g.entry], t0)));
    const card = back.cards[0];
    expect(card.srs.dueAt).toBeInstanceOf(Date);
    expect(card.srs.dueAt.getTime()).toBe(g.save[0].srs.dueAt.getTime());
    expect(card).toMatchObject({ key: 't:w:1|read', itemId: 't:w:1', mode: 'read', added: '2026-11-17' });
    expect(back.log).toEqual([g.entry]);
    expect(back.settings).toEqual(DEFAULT_SETTINGS);
    expect(srs.review(card.srs, GOOD, card.srs.dueAt).reps).toBe(2);
  });

  it('says why a file can’t be read', () => {
    expect(() => readBackup('not json')).toThrow(/isn’t JSON/);
    expect(() => readBackup('{"app":"habit-quest"}')).toThrow(/isn’t a Pareto-Lingo backup/);
    expect(() => readBackup('{"app":"pareto-lingo","v":2,"cards":[],"log":[]}')).toThrow(/newer version/);
    expect(() => readBackup('{"app":"pareto-lingo","v":1,"cards":[{"key":"k"}],"log":[]}')).toThrow(/card 1/);
  });

  it('fills settings an older backup lacks with defaults', () => {
    const b = readBackup('{"app":"pareto-lingo","v":1,"cards":[],"log":[],"settings":{"newPerDay":5}}');
    expect(b.settings).toEqual({ ...DEFAULT_SETTINGS, newPerDay: 5 });
  });

  it('names the file by date', () => {
    expect(backupName(new Date(2026, 10, 17, 23, 30))).toBe('pareto-lingo-2026-11-17.json'); // local date, even late in the evening
  });
});
