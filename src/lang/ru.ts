// Russian text helpers shared by the app (answer matching) and the pack build (lookup keys).

const COMBINING_ACUTE = '́';
const VOWELS = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';

/**
 * Lookup and comparison key: lowercase, no stress marks, ё → е, й kept.
 * NFD splits ё into е + U+0308 and й into и + U+0306; we drop every combining mark except U+0306.
 */
export function ruKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/['`*]/g, '')
    .replace(/[̀-̅̇-ͯ]/g, '')
    .normalize('NFC')
    .toLowerCase();
}

/** Strips stress marks but keeps ё and case. For speech synthesis and plain display. */
export function ruPlain(s: string): string {
  return s.normalize('NFD').replace(/[̀́]/g, '').normalize('NFC').replace(/['`]/g, '');
}

function vowelCount(s: string): number {
  let n = 0;
  for (const ch of s) if (VOWELS.includes(ch)) n++;
  return n;
}

/**
 * OpenRussian marks stress with an apostrophe after the stressed vowel ("соба'ка").
 * Returns the display form with U+0301 ("соба́ка"). One-vowel words and words with ё get no mark,
 * which is the usual convention in learner materials. Secondary stress (`) is dropped.
 */
export function apostropheToAccent(accented: string): string {
  const s = accented.replace(/`/g, '').replace(/\*/g, '').trim();
  const plain = s.replace(/'/g, '');
  if (vowelCount(plain) <= 1 || /[ёЁ]/.test(plain)) return plain;
  return s.replace(/([аеёиоуыэюяАЕЁИОУЫЭЮЯ])'/g, `$1${COMBINING_ACUTE}`).replace(/'/g, '');
}

/** Normalizes a typed answer for comparison: key form, punctuation dropped, spaces collapsed. */
export function ruAnswerKey(s: string): string {
  return ruKey(s)
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the typed answer matches any accepted answer, ignoring stress, ё/е, case and punctuation. */
export function ruMatches(input: string, accepted: readonly string[]): boolean {
  const k = ruAnswerKey(input);
  if (!k) return false;
  return accepted.some((a) => ruAnswerKey(a) === k);
}
