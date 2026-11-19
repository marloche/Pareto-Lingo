// Japanese answer keys: full- and half-width unified (NFKC) and katakana folded into hiragana, so an
// answer typed in either kana script matches; a kanji spelling matches when the pack lists it.

/** カタカナ → かたかな (ー and other marks are kept). */
export function kataToHira(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** Comparison key for a typed Japanese answer. */
export function jaKey(s: string): string {
  return kataToHira(s.normalize('NFKC'))
    .toLowerCase()
    .replace(/[\s\p{P}]/gu, '');
}
