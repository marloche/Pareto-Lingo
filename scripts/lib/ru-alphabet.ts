// The Cyrillic alphabet: stage 0 of the Russian pack. Sound hints are hand-written, approximate
// English comparisons (standard textbook ones). The example word for each letter is picked by the build:
// the most frequent pack word that starts with it (or contains it, for ъ ы ь).
export interface Letter {
  upper: string;
  lower: string;
  hint: string;
}

const VOWELS = 'аеёиоуыэюя';
/**
 * What the device voice says to show a letter's sound. Speech voices read a lone consonant as its
 * name (б → "бэ"), so consonants get a following "а" (ба), й a vowel before it (ай), and vowels are
 * said as they are. The hard and soft signs have no sound of their own, so nothing.
 */
export function letterSound(lower: string): string | undefined {
  if (lower === 'ъ' || lower === 'ь') return undefined;
  if (lower === 'й') return 'ай';
  return VOWELS.includes(lower) ? lower : lower + 'а';
}

export const LETTERS: Letter[] = [
  { upper: 'А', lower: 'а', hint: '“a” as in father' },
  { upper: 'Б', lower: 'б', hint: '“b” as in bed' },
  { upper: 'В', lower: 'в', hint: '“v” as in vine. Looks like B, sounds like v' },
  { upper: 'Г', lower: 'г', hint: '“g” as in go' },
  { upper: 'Д', lower: 'д', hint: '“d” as in do' },
  { upper: 'Е', lower: 'е', hint: '“ye” as in yes' },
  { upper: 'Ё', lower: 'ё', hint: '“yo” as in yogurt. Always stressed; often printed as е' },
  { upper: 'Ж', lower: 'ж', hint: '“zh”, like the s in pleasure' },
  { upper: 'З', lower: 'з', hint: '“z” as in zoo. Looks like 3' },
  { upper: 'И', lower: 'и', hint: '“ee” as in see' },
  { upper: 'Й', lower: 'й', hint: 'short “y” as in boy' },
  { upper: 'К', lower: 'к', hint: '“k” as in kite' },
  { upper: 'Л', lower: 'л', hint: '“l” as in lamp' },
  { upper: 'М', lower: 'м', hint: '“m” as in mother' },
  { upper: 'Н', lower: 'н', hint: '“n” as in no. Looks like H, sounds like n' },
  { upper: 'О', lower: 'о', hint: '“o” as in more when stressed; unstressed it sounds like “a”' },
  { upper: 'П', lower: 'п', hint: '“p” as in pet' },
  { upper: 'Р', lower: 'р', hint: 'rolled “r”. Looks like P, sounds like r' },
  { upper: 'С', lower: 'с', hint: '“s” as in sun. Looks like C, sounds like s' },
  { upper: 'Т', lower: 'т', hint: '“t” as in top' },
  { upper: 'У', lower: 'у', hint: '“oo” as in boot. Looks like y, sounds like oo' },
  { upper: 'Ф', lower: 'ф', hint: '“f” as in face' },
  { upper: 'Х', lower: 'х', hint: '“kh”, like ch in Scottish loch. Looks like X' },
  { upper: 'Ц', lower: 'ц', hint: '“ts” as in cats' },
  { upper: 'Ч', lower: 'ч', hint: '“ch” as in chair' },
  { upper: 'Ш', lower: 'ш', hint: '“sh” as in shop' },
  { upper: 'Щ', lower: 'щ', hint: 'a long, soft “shch”, as in fresh sheep' },
  { upper: 'Ъ', lower: 'ъ', hint: 'hard sign: no sound of its own; keeps the next vowel separate' },
  { upper: 'Ы', lower: 'ы', hint: 'an “i” said with the tongue pulled back, between bit and boot' },
  { upper: 'Ь', lower: 'ь', hint: 'soft sign: no sound of its own; softens the consonant before it' },
  { upper: 'Э', lower: 'э', hint: '“e” as in met' },
  { upper: 'Ю', lower: 'ю', hint: '“yu” as in you' },
  { upper: 'Я', lower: 'я', hint: '“ya” as in yard' },
];
