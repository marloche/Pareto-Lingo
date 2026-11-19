// A tiny made-up pack for unit tests. Not real data and never shipped (only test files import it).
import type { Item } from './types.ts';

export const word = (n: number, share = 0.01): Item => ({
  id: `t:w:${n}`,
  kind: 'word',
  order: n,
  text: `w${n}`,
  gloss: [`word ${n}`],
  rank: n,
  share,
  examples: [{ text: `a w${n} b`, en: `a word ${n} b`, src: 'pack', focus: [2, 2 + `w${n}`.length] }],
});

export const letter = (n: number): Item => ({ id: `t:l:${n}`, kind: 'letter', order: n, text: `L${n}`, gloss: [], examples: [] });

export const grammar = (n: number): Item => ({
  id: `t:g:${n}`,
  kind: 'grammar',
  order: n,
  text: `pattern ${n}`,
  title: `pattern ${n}`,
  note: 'note',
  gloss: [],
  examples: [{ text: 'x y z', en: 'x y z', src: 'pack', focus: [2, 3] }],
});
