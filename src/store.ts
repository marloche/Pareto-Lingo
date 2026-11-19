// IndexedDB storage for progress (cards, review history, settings) via idb. The pack is never stored
// here: the service worker caches it like any other file. Dates inside cards survive as Date objects.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Backup } from './core/backup.ts';
import type { Graded } from './core/study.ts';
import { DEFAULT_SETTINGS, type CardRecord, type ReviewEntry, type Settings } from './core/progress.ts';

interface LingoDB extends DBSchema {
  cards: { key: string; value: CardRecord };
  log: { key: number; value: ReviewEntry };
  meta: { key: string; value: Settings };
}

export interface Store {
  cards(): Promise<Map<string, CardRecord>>;
  log(): Promise<ReviewEntry[]>;
  settings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
  /** Saves a review and the cards it changed, together; returns the review's id in the log. */
  saveGrade(g: Graded): Promise<number>;
  /** Takes a saved review back: puts cards back as they were, deletes cards it created, drops the log entry. */
  undoGrade(restore: CardRecord[], remove: string[], logId: number | undefined): Promise<void>;
  /** Replaces all progress with a backup's. */
  restore(b: Backup): Promise<void>;
}

export async function openStore(name = 'pareto-lingo'): Promise<Store> {
  const db: IDBPDatabase<LingoDB> = await openDB<LingoDB>(name, 1, {
    upgrade(d) {
      d.createObjectStore('cards', { keyPath: 'key' });
      d.createObjectStore('log', { autoIncrement: true });
      d.createObjectStore('meta');
    },
  });
  return {
    async cards() {
      return new Map((await db.getAll('cards')).map((c) => [c.key, c]));
    },
    log: () => db.getAll('log'),
    async settings() {
      return { ...DEFAULT_SETTINGS, ...((await db.get('meta', 'settings')) ?? {}) };
    },
    async saveSettings(s) {
      await db.put('meta', s, 'settings');
    },
    async saveGrade(g) {
      const tx = db.transaction(['cards', 'log'], 'readwrite');
      const [id] = await Promise.all([tx.objectStore('log').add(g.entry), ...g.save.map((c) => tx.objectStore('cards').put(c)), tx.done]);
      return id as number;
    },
    async undoGrade(restore, remove, logId) {
      const tx = db.transaction(['cards', 'log'], 'readwrite');
      const cards = tx.objectStore('cards');
      await Promise.all([
        ...restore.map((c) => cards.put(c)),
        ...remove.map((k) => cards.delete(k)),
        ...(logId === undefined ? [] : [tx.objectStore('log').delete(logId)]),
        tx.done,
      ]);
    },
    async restore(b) {
      const tx = db.transaction(['cards', 'log', 'meta'], 'readwrite');
      const cards = tx.objectStore('cards');
      const log = tx.objectStore('log');
      await Promise.all([cards.clear(), log.clear()]);
      await Promise.all([
        ...b.cards.map((c) => cards.put(c)),
        ...b.log.map((e) => log.add(e)),
        tx.objectStore('meta').put(b.settings, 'settings'),
        tx.done,
      ]);
    },
  };
}
