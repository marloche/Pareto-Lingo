// Chinese answer keys and pinyin display. An answer can be hanzi, or pinyin with tone marks (nǐ hǎo)
// or tone numbers (ni3 hao3); ü can be typed as ü, v or u:. CC-CEDICT writes pinyin with numbers.

/** Combining marks for tones 1–4 (macron, acute, caron, grave). */
const MARKS = ['', '\u0304', '\u0301', '\u030c', '\u0300'];
const TONE_OF: Record<string, string> = { '\u0304': '1', '\u0301': '2', '\u030c': '3', '\u0300': '4' };

/**
 * Comparison key: hanzi without spaces or punctuation, or for pinyin "letters|tones",
 * e.g. "nǐ hǎo" and "ni3hao3" both give "nihao|33". The neutral tone (5, 0 or no mark) is dropped.
 */
export function zhKey(s: string): string {
  const t = s.normalize('NFKC').toLowerCase().replace(/u:/g, 'ü');
  const d = t.normalize('NFD');
  if (!/[a-z]/.test(d)) return t.replace(/[\s\p{P}]/gu, '');
  let letters = '';
  let tones = '';
  for (const ch of d) {
    if (ch >= 'a' && ch <= 'z') letters += ch === 'v' ? 'ü' : ch;
    else if (ch === '\u0308' && letters.endsWith('u')) letters = `${letters.slice(0, -1)}ü`;
    else if (TONE_OF[ch]) tones += TONE_OF[ch];
    else if (ch >= '1' && ch <= '4') tones += ch;
  }
  return `${letters}|${tones}`;
}

/** Pinyin letters without tones ("ni3 hao3" and "ni hao" both give "nihao"); hanzi as in zhKey. */
export const zhLooseKey = (s: string): string => zhKey(s).split('|')[0];

/**
 * "ni3 hao3" → "nǐ hǎo". The mark goes on a or e if there is one, on the o of "ou", otherwise on the
 * last vowel. Tone 5 (neutral) gets no mark.
 */
export function numbersToMarks(s: string): string {
  return s.replace(/([a-zA-ZüÜ:]+)([0-5])/g, (_m, syl: string, tone: string) => {
    const x = syl.replace(/u:|v/g, 'ü').replace(/U:|V/g, 'Ü');
    const n = Number(tone);
    if (n < 1 || n > 4) return x;
    const lower = x.toLowerCase();
    let i = lower.search(/[ae]/);
    if (i < 0) i = lower.indexOf('ou');
    if (i < 0) for (let k = lower.length - 1; k >= 0 && i < 0; k--) if ('iouü'.includes(lower[k])) i = k;
    if (i < 0) return x;
    return `${x.slice(0, i + 1)}${MARKS[n]}${x.slice(i + 1)}`.normalize('NFC');
  });
}
