// Splits Russian sentences into words and looks each one up in the dictionary data.
import { ruKey } from '../../src/lang/ru.ts';
import type { Lemma } from './ru-data.ts';

export interface Tok {
  /** As written in the sentence. */
  text: string;
  /** Index of the first character in the sentence. */
  start: number;
  /** Lookup key (lowercase, ё → е). */
  key: string;
  /** Dictionary words this spelling can belong to (with English); the likeliest reading first. Empty for names. */
  lemmas: Lemma[];
  /** "pos:slot" for every reading, e.g. "noun:sg_gen", "verb:past_f", "adj:decl_f_nom". */
  slots: Set<string>;
  /** Proper name: capitalised in mid-sentence, or one of Tatoeba's stock names. */
  name: boolean;
  /** Tatoeba's stock names (Том, Мэри…): so common there that they cost a learner nothing. */
  stock: boolean;
  /** All-caps abbreviation the dictionary doesn't know (ПТСР, УДО). */
  abbr: boolean;
  /** Only spaces separate it from the word before (no comma, dash or quote). False for the first word. */
  joined: boolean;
  /** Starts the sentence (or a quote), where a capital letter says nothing about names. */
  initial: boolean;
}

// Combining stress marks (U+0300, U+0301) belong inside a word: some Tatoeba sentences already have them.
const WORD = /[\p{Script=Cyrillic}̀́]+(?:-[\p{Script=Cyrillic}̀́]+)*/gu;
const STOCK = new Set(
  ['Том', 'Тома', 'Тому', 'Томом', 'Томе', 'Мэри', 'Джон', 'Джона', 'Джону', 'Джоном', 'Джоне', 'Алиса', 'Алисы', 'Алисе', 'Алису', 'Алисой'].map(ruKey),
);
/** Pronouns some writers capitalise for politeness (Вы); never names. */
const POLITE = new Set(['вы', 'вас', 'вам', 'вами', 'ваш', 'ваша', 'ваше', 'ваши', 'вашего', 'вашей', 'вашему', 'вашим', 'вашем', 'вашу', 'ваших', 'вашими']);
const EMPTY = new Set<string>();
/** Words that take an infinitive (хочу, могу, надо, буду…), by dictionary form. */
const BEFORE_INF = new Set(['хотеть', 'захотеть', 'мочь', 'смочь', 'надо', 'нужно', 'можно', 'нельзя', 'должный', 'будет', 'начать', 'начинать', 'перестать', 'любить', 'уметь', 'пора']);

/** A word starts a sentence if nothing but quotes, dashes or end punctuation come before it. */
function startsSentence(text: string, at: number): boolean {
  for (let i = at - 1; i >= 0; i--) {
    const ch = text[i];
    if (/\s/.test(ch)) continue;
    return /[.!?…"«„“”—–:-]/.test(ch);
  }
  return true;
}

/** Returns a tokenizer that remembers each spelling's lookup (sentences repeat words a lot). */
export function makeTokenizer(claim: (key: string) => Lemma[] | undefined): (text: string) => Tok[] {
  const cache = new Map<string, { lemmas: Lemma[]; slots: Set<string> }>();
  const lookup = (key: string) => {
    let hit = cache.get(key);
    if (!hit) {
      const lemmas = (claim(key) ?? []).filter((l) => l.en);
      const slots = new Set<string>();
      for (const l of lemmas) for (const s of l.forms.get(key) ?? []) slots.add(`${l.pos}:${s}`);
      hit = { lemmas, slots };
      cache.set(key, hit);
    }
    return hit;
  };
  return (text) => {
    const out: Tok[] = [];
    let prevEnd = -1;
    for (const m of text.matchAll(WORD)) {
      const word = m[0];
      const start = m.index ?? 0;
      const joined = prevEnd >= 0 && text.slice(prevEnd, start).trim() === '';
      prevEnd = start + word.length;
      const key = ruKey(word);
      const capital = /^\p{Lu}/u.test(word);
      const initial = startsSentence(text, start);
      const stock = capital && STOCK.has(key);
      const name = stock || (capital && !initial && !POLITE.has(key));
      const hit = lookup(key);
      const abbr = !name && word.length > 1 && word === word.toUpperCase() && !hit.lemmas.length;
      out.push(
        name
          ? { text: word, start, key, lemmas: [], slots: EMPTY, name, stock, abbr: false, joined, initial }
          : { text: word, start, key, lemmas: hit.lemmas, slots: hit.slots, name: capital && !hit.lemmas.length && !abbr, stock: false, abbr, joined, initial },
      );
    }
    // «Я не могу это есть» is “I can't eat this”, not “there is”: within two words after a word that
    // takes an infinitive (no punctuation between), a spelling that can be an infinitive is read as one.
    out.forEach((t, i) => {
      if (t.lemmas.length < 2 || !t.joined) return;
      const inf = t.lemmas.find((l) => l.pos === 'verb' && l.forms.get(t.key)?.has('inf'));
      if (!inf || inf === t.lemmas[0]) return;
      const near = [out[i - 1], out[i - 1]?.joined ? out[i - 2] : undefined];
      if (near.some((p) => p?.lemmas[0] && BEFORE_INF.has(p.lemmas[0].bare))) t.lemmas = [inf, ...t.lemmas.filter((l) => l !== inf)];
    });
    return out;
  };
}

/** True if the sentence is plain enough to teach from: Cyrillic words and ordinary punctuation only. */
export function isPlainSentence(text: string): boolean {
  return !/[A-Za-z0-9@#%&*_=+<>[\]{}|\\/~^]/.test(text) && text.length <= 90;
}

/** Jaccard similarity of two sentences' word sets, to avoid near-duplicate examples. */
export function similarity(a: Tok[], b: Tok[]): number {
  const A = new Set(a.map((t) => t.key));
  const B = new Set(b.map((t) => t.key));
  let both = 0;
  for (const k of A) if (B.has(k)) both++;
  return both / (A.size + B.size - both || 1);
}
