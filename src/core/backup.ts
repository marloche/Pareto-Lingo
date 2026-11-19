// Backup file: all progress as one JSON file. Home-screen apps on iPhone keep their storage apart from
// Safari, so export / import is how progress moves between devices and survives a reinstall.
import { reviveCard } from './srs.ts';
import { DEFAULT_SETTINGS, ymd, type CardRecord, type ReviewEntry, type Settings } from './progress.ts';

export interface Backup {
  app: 'pareto-lingo';
  v: 1;
  exportedAt: string;
  settings: Settings;
  cards: CardRecord[];
  log: ReviewEntry[];
}

export function makeBackup(settings: Settings, cards: Iterable<CardRecord>, log: readonly ReviewEntry[], now: Date): Backup {
  return { app: 'pareto-lingo', v: 1, exportedAt: now.toISOString(), settings, cards: [...cards], log: [...log] };
}

/** File name for an export, e.g. pareto-lingo-2026-11-17.json (local date). */
export const backupName = (now: Date) => `pareto-lingo-${ymd(now)}.json`;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Reads a backup file. Throws an Error whose message can be shown as is. */
export function readBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file isn’t a Pareto-Lingo backup (it isn’t JSON).');
  }
  if (!isObj(raw) || raw.app !== 'pareto-lingo') throw new Error('This file isn’t a Pareto-Lingo backup.');
  if (raw.v !== 1) throw new Error(`This backup is from a newer version of the app (format ${String(raw.v)}). Update the app first.`);
  if (!Array.isArray(raw.cards) || !Array.isArray(raw.log)) throw new Error('This backup is damaged (cards or history missing).');

  const cards: CardRecord[] = raw.cards.map((c: unknown, i: number) => {
    if (!isObj(c) || typeof c.key !== 'string' || typeof c.itemId !== 'string' || (c.mode !== 'read' && c.mode !== 'write') || !isObj(c.srs)) {
      throw new Error(`This backup is damaged (card ${i + 1}).`);
    }
    try {
      return { key: c.key, itemId: c.itemId, mode: c.mode, added: String(c.added ?? ''), srs: reviveCard(c.srs as never) };
    } catch {
      throw new Error(`This backup is damaged (card ${i + 1} has no valid date).`);
    }
  });
  const log: ReviewEntry[] = raw.log.filter(
    (e: unknown): e is ReviewEntry => isObj(e) && typeof e.at === 'number' && typeof e.key === 'string' && [1, 2, 3, 4].includes(e.grade as number),
  );
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(isObj(raw.settings) ? (raw.settings as Partial<Settings>) : {}) };
  return { app: 'pareto-lingo', v: 1, exportedAt: String(raw.exportedAt ?? ''), settings, cards, log };
}
