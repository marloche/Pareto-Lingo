// Practice: repeat a past day's lesson or a topic (Alphabet, Words 1–50…, Grammar) for extra practice.
// Practice runs never change the schedule; app.ts grades them without saving anything.
import type { Item } from './types.ts';
import type { Step } from './queue.ts';
import { AGAIN } from './srs.ts';
import { dayKey, type ReviewEntry } from './progress.ts';

export interface PracticeSet {
  /** "day:2026-11-18" or "topic:words-1". */
  id: string;
  title: string;
  /** Card keys ("itemId|mode") in the set, in the order they were first studied. */
  keys: string[];
  /** Past lessons: cards remembered on the first try that day (graded Hard or better). */
  right?: number;
}

/** Words per topic block. */
export const TOPIC_SIZE = 50;
/** Cards in one topic practice run, picked at random from the topic. */
export const TOPIC_RUN = 20;

const itemOf = (key: string) => key.slice(0, key.lastIndexOf('|'));

/** Past study days with this pack's reviews, newest first. */
export function pastLessons(log: readonly ReviewEntry[], inPack: (itemId: string) => boolean, startHour: number, limit = 14): PracticeSet[] {
  const days = new Map<string, Map<string, number>>();
  for (const e of log) {
    if (!inPack(itemOf(e.key))) continue;
    const day = dayKey(e.at, startHour);
    const first = days.get(day) ?? days.set(day, new Map()).get(day)!;
    if (!first.has(e.key)) first.set(e.key, e.grade);
  }
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, limit)
    .map(([day, first]) => ({
      id: `day:${day}`,
      title: day,
      keys: [...first.keys()],
      right: [...first.values()].filter((g) => g !== AGAIN).length,
    }));
}

/** Topics with at least one card you've studied: Alphabet, Words 1–50, 51–100…, Grammar. */
export function topics(items: readonly Item[], hasCard: (key: string) => boolean): PracticeSet[] {
  const sets: PracticeSet[] = [];
  const add = (id: string, title: string, list: readonly Item[]) => {
    const keys = list.flatMap((i) => (['read', 'write'] as const).map((m) => `${i.id}|${m}`).filter(hasCard));
    if (keys.length) sets.push({ id: `topic:${id}`, title, keys });
  };
  add('letters', 'Alphabet', items.filter((i) => i.kind === 'letter'));
  const words = items.filter((i) => i.kind === 'word');
  for (let k = 0; k < words.length; k += TOPIC_SIZE) {
    add(`words-${k / TOPIC_SIZE + 1}`, `Words ${k + 1}–${Math.min(words.length, k + TOPIC_SIZE)}`, words.slice(k, k + TOPIC_SIZE));
  }
  add('grammar', 'Grammar', items.filter((i) => i.kind === 'grammar'));
  return sets;
}

/** The test steps for a practice run: shuffled, and at most `cap` of them. */
export function practiceSteps(keys: readonly string[], cap = Infinity, random = Math.random): Step[] {
  const list = [...keys];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, cap).map((key) => ({ kind: 'test', itemId: itemOf(key), mode: key.endsWith('|write') ? 'write' : 'read' }));
}
