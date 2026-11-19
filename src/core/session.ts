// One study session, worked through step by step. Pure: the UI shows the current step and reports
// back; ordering and the end-of-session numbers live here so they can be unit-tested.
import { insertLater, type Step } from './queue.ts';
import { AGAIN, type Grade } from './srs.ts';
import { cardKey, type ReviewEntry } from './progress.ts';
import type { Graded } from './study.ts';

export interface Session {
  steps: Step[];
  /** Index of the current step; equal to steps.length when the session is over. */
  at: number;
  startedAt: number;
  /** Coverage (0–1) when the session started, for the summary. */
  coverageBefore: number;
  /** Cards that were due when the session started (reviews, as opposed to new items). */
  reviewKeys: Set<string>;
  /** Items introduced (new) in this session. */
  newIds: Set<string>;
  /** The first grade each card got in this session. */
  first: Map<string, Grade>;
  /** New items whose intro has been seen. */
  introduced: number;
}

export function startSession(steps: Step[], startedAt: number, coverageBefore: number): Session {
  const newIds = new Set(steps.filter((s) => s.kind === 'intro').map((s) => s.itemId));
  const reviewKeys = new Set(
    steps.flatMap((s) => (s.kind === 'test' && !newIds.has(s.itemId) ? [cardKey(s.itemId, s.mode)] : [])),
  );
  return { steps, at: 0, startedAt, coverageBefore, reviewKeys, newIds, first: new Map(), introduced: 0 };
}

export const currentStep = (s: Session): Step | undefined => s.steps[s.at];
export const isOver = (s: Session) => s.at >= s.steps.length;

/** The current step is an intro and it has been seen. */
export function introSeen(s: Session): void {
  if (currentStep(s)?.kind !== 'intro') throw new Error('The current step is not an intro.');
  s.introduced++;
  s.at++;
}

/** Records the grade of the current test and moves on; a card to see again comes back a few steps later. */
export function testGraded(s: Session, g: Graded): void {
  const step = currentStep(s);
  if (step?.kind !== 'test') throw new Error('The current step is not a test.');
  if (!s.first.has(g.entry.key)) s.first.set(g.entry.key, g.entry.grade);
  if (g.again) insertLater(s.steps, s.at, { kind: 'test', itemId: step.itemId, mode: step.mode });
  s.at++;
}

export interface Progress {
  /** Reviews graded so far / reviews in the session. */
  reviewsDone: number;
  reviews: number;
  /** New items introduced so far / new items in the session. */
  newDone: number;
  fresh: number;
}

export function sessionProgress(s: Session): Progress {
  let reviewsDone = 0;
  for (const k of s.first.keys()) if (s.reviewKeys.has(k)) reviewsDone++;
  return { reviewsDone, reviews: s.reviewKeys.size, newDone: s.introduced, fresh: s.newIds.size };
}

export interface Summary {
  /** Review cards graded. */
  reviews: number;
  /** Share of those remembered on the first try (graded Hard or better), 0–1; null if there were none. */
  remembered: number | null;
  /**
   * New items tested at least once. One that was only shown isn't saved (its card starts at the first
   * test), so it comes back as new next time and doesn't count here.
   */
  fresh: number;
  /** Whole minutes from start to now, at least 1. */
  minutes: number;
}

/** New items in this session that have been tested at least once. */
export const testedNew = (s: Session): string[] => [...s.newIds].filter((id) => s.first.has(cardKey(id, 'read')));

export function summarize(s: Session, now: number): Summary {
  let reviews = 0;
  let ok = 0;
  for (const [key, grade] of s.first) {
    if (!s.reviewKeys.has(key)) continue;
    reviews++;
    if (grade !== AGAIN) ok++;
  }
  return { reviews, remembered: reviews ? ok / reviews : null, fresh: testedNew(s).length, minutes: Math.max(1, Math.round((now - s.startedAt) / 60_000)) };
}

/** Reviews and new items in a planned session (each new item is an intro plus a test). */
export function planCounts(steps: readonly Step[]): { reviews: number; fresh: number } {
  const fresh = steps.filter((s) => s.kind === 'intro').length;
  return { reviews: steps.length - 2 * fresh, fresh };
}

/**
 * Typical seconds per card from the review log: the median gap between reviews made less than two
 * minutes apart, over the most recent 300. Falls back to `fallback` until there are 20 such gaps.
 */
export function secondsPerCard(log: readonly ReviewEntry[], fallback = 12): number {
  const gaps: number[] = [];
  for (let i = Math.max(1, log.length - 300); i < log.length; i++) {
    const d = (log[i].at - log[i - 1].at) / 1000;
    if (d > 0 && d < 120) gaps.push(d);
  }
  if (gaps.length < 20) return fallback;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/** Minutes a planned session should take at your own pace, at least 1. */
export const estimateMinutes = (steps: readonly Step[], log: readonly ReviewEntry[]) =>
  Math.max(1, Math.round((steps.length * secondsPerCard(log)) / 60));
