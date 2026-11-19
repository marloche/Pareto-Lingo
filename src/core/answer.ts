// Checking a typed answer. Each language's matcher decides what counts as the same text (stress
// marks, ё/е, kana script, pinyin tones…); this file adds "close" for a one-letter slip or another
// form of the right word.
import type { Matcher } from '../lang/index.ts';
import { AGAIN, GOOD, HARD, type Grade } from './srs.ts';

export type Verdict = 'right' | 'close' | 'wrong';

/** The grade a verdict suggests; the learner can still change it. */
export const VERDICT_GRADE: Record<Verdict, Grade> = { right: GOOD, close: HARD, wrong: AGAIN };

/** Levenshtein distance: inserts, deletes and substitutions. */
export function editDistance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length];
}

/**
 * @param accepted right answers (the word as it appears in the sentence)
 * @param near answers that are close but not right (e.g. the dictionary form when the sentence needs another form)
 */
export function checkAnswer(m: Matcher, input: string, accepted: readonly string[], near: readonly string[] = []): Verdict {
  const k = m.key(input);
  if (!k) return 'wrong';
  const keys = accepted.map((a) => m.key(a));
  if (keys.includes(k)) return 'right';
  if (near.some((n) => m.key(n) === k)) return 'close';
  if (keys.some((a) => [...a].length >= 4 && editDistance(a, k) === 1)) return 'close';
  if (m.loose && accepted.some((a) => m.loose!(a) === m.loose!(input))) return 'close';
  return 'wrong';
}
