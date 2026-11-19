// Spaced repetition: a thin wrapper over ts-fsrs (FSRS-7), so the rest of the app never touches its API.
// ts-fsrs 6's own types are heavy generics, so the card shape is written out here; srs.test.ts checks it
// against the library at runtime.
import { DefaultScheduler } from 'ts-fsrs';

/** Card states, as numbered by ts-fsrs. */
export const NEW = 0;
export const LEARNING = 1;
export const REVIEW = 2;
export const RELEARNING = 3;

/** A card's memory state as ts-fsrs keeps it. Stored as-is in IndexedDB, where Dates survive. */
export interface SrsCard {
  stability: number;
  stabilityFast: number;
  difficulty: number;
  state: number;
  scheduleStatus: string;
  dueAt: Date;
  lastReviewAt: Date | null;
  cardId: string;
  reps: number;
  lapses: number;
  /** Days until the next review, as scheduled at the last review. */
  scheduledDays: number;
  learningStep: number;
}

/** 1 Again (forgot) · 2 Hard · 3 Good · 4 Easy, as in ts-fsrs. */
export type Grade = 1 | 2 | 3 | 4;
export const AGAIN: Grade = 1;
export const HARD: Grade = 2;
export const GOOD: Grade = 3;
export const EASY: Grade = 4;

export interface Srs {
  newCard(now: Date): SrsCard;
  review(card: SrsCard, grade: Grade, now: Date): SrsCard;
  /** Chance of recalling the card at `now`, 0–1; 0 for a card never reviewed. */
  recall(card: SrsCard, now: Date): number;
}

/** The part of the ts-fsrs scheduler this app uses. */
interface Scheduler {
  newCard(o: { now: Date }): SrsCard;
  review(o: { card: SrsCard; grade: Grade; now: Date }): { card: SrsCard };
  chrono: { difference(from: Date, to: Date): number };
  model: { forgettingCurve(card: SrsCard, elapsedDays: number): number };
}

/**
 * @param retention target chance of remembering a card when it comes due (0.9 = 90%)
 * @param fuzz spread due dates a little so cards learned together don't stay together (off in tests)
 */
export async function makeSrs(retention = 0.9, fuzz = true): Promise<Srs> {
  const s = (await DefaultScheduler({
    desiredRetention: retention,
    learningSteps: ['1m', '10m'],
    relearningSteps: ['10m'],
    enableFuzz: fuzz,
  })) as unknown as Scheduler;
  return {
    newCard: (now) => s.newCard({ now }),
    review: (card, grade, now) => s.review({ card, grade, now }).card,
    recall: (card, now) => {
      if (card.state === NEW || !card.lastReviewAt) return 0;
      return s.model.forgettingCurve(card, Math.max(0, s.chrono.difference(card.lastReviewAt, now)));
    },
  };
}

/** Learned: graduated to Review (not new, not still learning, not relearning after a lapse). */
export const isKnown = (card: SrsCard) => card.state === REVIEW;

/** Turns a card read back from JSON (dates as strings) into one ts-fsrs accepts. */
export function reviveCard(raw: SrsCard): SrsCard {
  const due = new Date(raw.dueAt);
  if (Number.isNaN(due.getTime())) throw new Error('card has no valid due date');
  return { ...raw, dueAt: due, lastReviewAt: raw.lastReviewAt ? new Date(raw.lastReviewAt) : null };
}
