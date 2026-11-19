// What the app stores about you, kept apart from the read-only pack. Cards join pack items by id only.
import type { Grade, SrsCard } from './srs.ts';

/** read: see the word, recall the meaning. write: see the meaning and the sentence, type the word. */
export type Mode = 'read' | 'write';

export interface CardRecord {
  /** `${itemId}|${mode}` */
  key: string;
  itemId: string;
  mode: Mode;
  /** Study day it was created (YYYY-MM-DD), for the daily limit on new items. */
  added: string;
  srs: SrsCard;
}

export interface ReviewEntry {
  /** When, in ms since 1970. */
  at: number;
  key: string;
  grade: Grade;
}

export interface Settings {
  /** Language pack in use, e.g. "ru". */
  lang: string;
  /** New items (letters, words, grammar) per study day. */
  newPerDay: number;
  /** Target chance of remembering a card when it comes due (FSRS desired retention). */
  retention: number;
  /** A study day starts at this hour, so late nights count for the day before. */
  dayStartHour: number;
  /** Read words and sentences aloud (Web Speech API). */
  speak: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lang: 'ru', newPerDay: 10, retention: 0.9, dayStartHour: 4, speak: true };

export const cardKey = (itemId: string, mode: Mode) => `${itemId}|${mode}`;

/** A date as local YYYY-MM-DD. */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The study day a moment belongs to, as local YYYY-MM-DD; each day starts at `startHour`. */
export function dayKey(t: Date | number, startHour: number): string {
  const d = new Date(t);
  if (d.getHours() < startHour) d.setDate(d.getDate() - 1);
  return ymd(d);
}

/** The study day `delta` days from `key` (calendar arithmetic, safe across daylight-saving changes). */
export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + delta, 12));
}

/** When the current study day ends: the next `startHour` o'clock. */
export function dayEnd(now: Date, startHour: number): Date {
  const end = new Date(now);
  end.setHours(startHour, 0, 0, 0);
  if (end <= now) end.setDate(end.getDate() + 1);
  return end;
}
