// Loads OpenRussian dictionary tables and the FrequencyWords counts, and credits every corpus
// spelling to dictionary words ("lemmas"), so frequency is counted per word, not per spelling.
import { readFileSync } from 'node:fs';
import { ruKey } from '../../src/lang/ru.ts';

export type Pos = 'noun' | 'verb' | 'adj' | 'other';

export interface Lemma {
  id: string;
  pos: Pos;
  table: string;
  /** Row in its OpenRussian table; the tables are roughly frequency-sorted, so it breaks ties. */
  row: number;
  bare: string;
  /** Stress-marked with an apostrophe after the stressed vowel, OpenRussian style. */
  accented: string;
  en: string;
  info: string;
  /** Lookup key → grammatical slots (sg_gen, past_f, …) this word fills with that spelling. */
  forms: Map<string, Set<string>>;
  /** Lookup key → stress-marked spellings, to put stress on words inside example sentences. */
  spellings: Map<string, Set<string>>;
  /** Corpus tokens credited to this word. */
  count: number;
  /** Nouns: refers to people or animals (OpenRussian's "animate" column). */
  animate?: boolean;
  /** Hand table: example sentences must contain one of these lookup keys (есть "there is" needs у). */
  examplesWith?: Set<string>;
  /** Display form overriding the dictionary form (stress-marked), e.g. должен for должный. */
  show?: string;
  /** Came from (or was changed by) the hand table in ru-extras.ts. */
  hand?: boolean;
}

export interface PatchInput {
  bare: string;
  pos?: Pos;
  en?: string;
  show?: string;
  forms?: string[];
  /** Remove this entry entirely (a data artifact, e.g. a case form listed as its own word). */
  drop?: boolean;
  /** Remove forms filling these slots (e.g. short forms that belong to a separate entry like рад). */
  dropSlots?: string[];
  /** Example sentences must contain one of these words, to show the right reading of a homograph. */
  examplesWith?: string[];
  /** Fix a wrong part of speech in the source. The id keeps the original, so saved progress stays linked. */
  setPos?: Pos;
}

export interface ExtraWord {
  bare: string;
  accented: string;
  pos: Pos;
  en: string;
  info?: string;
  /** Extra spellings that belong to this word (stress-marked). */
  forms?: string[];
}

const RAW = 'data/raw/ru/';

/** First column holding word forms, per table (earlier columns are metadata). */
const FORM_START: Record<string, number> = { nouns: 10, verbs: 6, adjectives: 4, others: 4 };
const POS_OF: Record<string, Pos> = { nouns: 'noun', verbs: 'verb', adjectives: 'adj', others: 'other' };

function readTsv(file: string): string[][] {
  return readFileSync(RAW + file, 'utf8')
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter(Boolean)
    .map((l) => l.split('\t'));
}

/** Splits a form cell into stress-marked spellings: "ра'за, ра'зу", "зверя'ми//зверьми'", "*све'ты". */
export function cellSpellings(cell: string | undefined): string[] {
  if (!cell) return [];
  return cell
    .split(/[,;/]+/)
    .map((s) => s.replace(/\*/g, '').trim())
    .filter((s) => s && /^[\p{Script=Cyrillic}'`̀́-]+$/u.test(s));
}

function cleanPartner(cell: string | undefined): string {
  return cellSpellings(cell).map((s) => s.replace(/['`]/g, '').normalize('NFD').replace(/[̀́]/g, '').normalize('NFC')).join(', ');
}

function addForm(l: Lemma, spelling: string, slot: string): void {
  const key = ruKey(spelling);
  if (!key) return;
  (l.forms.get(key) ?? l.forms.set(key, new Set()).get(key)!).add(slot);
  (l.spellings.get(key) ?? l.spellings.set(key, new Set()).get(key)!).add(spelling);
}

function makeLemma(pos: Pos, table: string, row: number, bare: string, accented: string, en: string, info: string): Lemma {
  const l: Lemma = {
    id: `ru:w:${pos}:${accented || bare}`,
    pos, table, row, bare, accented: accented || bare, en, info,
    forms: new Map(), spellings: new Map(), count: 0,
  };
  addForm(l, l.accented, pos === 'verb' ? 'inf' : 'lemma');
  return l;
}

export function loadLemmas(
  patches: readonly PatchInput[] = [],
  extras: readonly ExtraWord[] = [],
  compoundForms: Readonly<Record<string, string[]>> = {},
): Lemma[] {
  const out: Lemma[] = [];
  for (const table of ['nouns', 'verbs', 'adjectives', 'others']) {
    const rows = readTsv(`openrussian-${table}.csv`);
    const head = rows.shift()!;
    const pos = POS_OF[table];
    rows.forEach((r, row) => {
      const [bare, accented, en] = r;
      if (!bare || /\s/.test(bare)) return; // multi-word entries are out of scope for v1
      let info = '';
      if (pos === 'noun') {
        const g = r[4] === 'm' || r[4] === 'f' || r[4] === 'n' ? r[4] : '';
        info = [g, r[9] === '1' ? 'pl only' : '', r[7] === '1' ? 'indecl.' : ''].filter(Boolean).join(' · ');
      } else if (pos === 'verb') {
        const asp = r[4] === 'perfective' ? 'pf' : r[4] === 'imperfective' ? 'impf' : '';
        const partner = cleanPartner(r[5]);
        info = [asp, partner ? `↔ ${partner}` : ''].filter(Boolean).join(' · ');
      }
      const l = makeLemma(pos, table, row, bare.trim(), (accented ?? '').trim(), (en ?? '').trim(), info);
      if (pos === 'noun') l.animate = r[6] === '1';
      for (let j = FORM_START[table]; j < head.length; j++) {
        const slot = head[j];
        if (slot === 'superlative') continue;
        for (const s of cellSpellings(r[j])) addForm(l, s, slot);
      }
      out.push(l);
    });
  }
  const all = dedupe(out);

  // Hand table. A word OpenRussian already has gets patched rather than duplicated.
  const byBare = new Map<string, Lemma[]>();
  for (const l of all) (byBare.get(ruKey(l.bare)) ?? byBare.set(ruKey(l.bare), []).get(ruKey(l.bare))!).push(l);
  // Without a part of speech, prefer the function-word table: hand patches are mostly for those.
  const prefer: Pos[] = ['other', 'noun', 'verb', 'adj'];
  const find = (bare: string, pos?: Pos) => {
    const list = byBare.get(ruKey(bare)) ?? [];
    if (pos) return list.find((l) => l.pos === pos);
    return [...list].sort((a, b) => prefer.indexOf(a.pos) - prefer.indexOf(b.pos))[0];
  };
  const patch = (l: Lemma, p: PatchInput) => {
    if (p.en) l.en = p.en;
    if (p.show) l.show = p.show;
    for (const slot of p.dropSlots ?? []) {
      for (const [key, slots] of l.forms) {
        slots.delete(slot);
        if (!slots.size) { l.forms.delete(key); l.spellings.delete(key); }
      }
    }
    for (const f of p.forms ?? []) addForm(l, f, 'hand');
    if (p.examplesWith) l.examplesWith = new Set(p.examplesWith.map(ruKey));
    if (p.setPos) l.pos = p.setPos;
    l.hand = true;
  };
  const dropped = new Set<Lemma>();
  for (const p of patches) {
    const l = find(p.bare, p.pos);
    if (!l) throw new Error(`hand table: no OpenRussian word "${p.bare}" (${p.pos ?? 'any'}) to patch`);
    if (p.drop) dropped.add(l);
    else patch(l, p);
  }
  for (const [bare, forms] of Object.entries(compoundForms)) {
    const l = find(bare);
    if (l) patch(l, { bare, forms });
  }
  extras.forEach((x, i) => {
    const existing = find(x.bare);
    if (existing && !dropped.has(existing)) {
      patch(existing, { bare: x.bare, en: existing.en ? undefined : x.en, forms: x.forms });
      if (x.info && !existing.info) existing.info = x.info;
      return;
    }
    const l = makeLemma(x.pos, 'hand', i, x.bare, x.accented, x.en, x.info ?? '');
    for (const f of x.forms ?? []) addForm(l, f, 'hand');
    l.hand = true;
    all.push(l);
  });
  return all.filter((l) => !dropped.has(l));
}

/**
 * Drops duplicate rows: the same word listed twice with the same set of forms (keeps the first),
 * and form-less adjective rows that just repeat an "others" word (e.g. "как").
 */
function dedupe(lemmas: Lemma[]): Lemma[] {
  const otherBare = new Set(lemmas.filter((l) => l.table === 'others').map((l) => ruKey(l.bare)));
  const seen = new Set<string>();
  const ids = new Set<string>();
  return lemmas.filter((l) => {
    if (l.table === 'adjectives' && l.forms.size === 1 && otherBare.has(ruKey(l.bare))) return false;
    const sig = `${l.pos}|${ruKey(l.bare)}|${[...l.forms.keys()].sort().join(',')}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    // Ids must be unique; a true homograph with identical pos + stress gets a numeric suffix.
    let id = l.id;
    for (let n = 2; ids.has(id); n++) id = `${l.id}#${n}`;
    l.id = id;
    ids.add(id);
    return true;
  });
}

export interface Corpus {
  /** Lookup key → count (spellings that differ only by ё/е or case are summed). */
  counts: Map<string, number>;
  /** Tokens that are Cyrillic words: the coverage denominator. */
  total: number;
  totalAll: number;
}

export function loadCorpus(): Corpus {
  const counts = new Map<string, number>();
  let total = 0;
  let totalAll = 0;
  for (const line of readFileSync(RAW + 'ru_full.txt', 'utf8').split('\n')) {
    const sp = line.lastIndexOf(' ');
    if (sp < 0) continue;
    const word = line.slice(0, sp);
    const n = Number(line.slice(sp + 1));
    if (!Number.isFinite(n)) continue;
    totalAll += n;
    if (!/^[\p{Script=Cyrillic}]+(-[\p{Script=Cyrillic}]+)*$/u.test(word)) continue;
    total += n;
    const key = ruKey(word);
    counts.set(key, (counts.get(key) ?? 0) + n);
  }
  return { counts, total, totalAll };
}

export interface Credit {
  /** Corpus tokens whose spelling matched no dictionary word. */
  unmatched: Map<string, number>;
  /**
   * Lookup key → words it can belong to (artifacts without English dropped when a real word competes),
   * sorted so the word that took most of *this spelling's* count comes first.
   */
  claim: (key: string) => Lemma[] | undefined;
}

/**
 * Credits each corpus spelling to the words it can be a form of.
 * - One candidate: it gets the whole count.
 * - Several (homographs such as стали = steel / became): each inflecting word gets an estimate from its
 *   own unambiguous forms (average count per seen form); words that never inflect share what is left.
 *   With no evidence at all, the earliest row in OpenRussian's (roughly frequency-sorted) table wins.
 * The result is an estimate; coverage is shown with "≈" for that reason.
 */
export function creditCounts(lemmas: Lemma[], corpus: Corpus): Credit {
  const index = new Map<string, Lemma[]>();
  for (const l of lemmas) for (const key of l.forms.keys()) (index.get(key) ?? index.set(key, []).get(key)!).push(l);

  // Entries without English are mostly artifacts (a stray form listed as its own word, a name);
  // when a real word also claims the spelling, the artifact gets nothing.
  const claim = (key: string): Lemma[] | undefined => {
    const found = index.get(key);
    if (!found) return undefined;
    const withEn = found.filter((l) => l.en);
    return withEn.length ? withEn : found;
  };

  const evidence = new Map<Lemma, { sum: number; seen: number }>();
  for (const l of lemmas) {
    let sum = 0;
    let seen = 0;
    for (const key of l.forms.keys()) {
      const c0 = claim(key);
      if (!c0 || c0.length !== 1 || c0[0] !== l) continue;
      const c = corpus.counts.get(key) ?? 0;
      if (c > 0) { sum += c; seen++; }
    }
    evidence.set(l, { sum, seen });
  }
  const estimate = (l: Lemma, c: number) => {
    const e = evidence.get(l)!;
    return e.seen ? Math.min(c, e.sum / e.seen) : 0;
  };

  const unmatched = new Map<string, number>();
  /** For spellings shared by several words: how much of that spelling's count each one got. */
  const share = new Map<string, Map<Lemma, number>>();
  const give = (key: string, l: Lemma, n: number) => {
    l.count += n;
    const m = share.get(key) ?? share.set(key, new Map()).get(key)!;
    m.set(l, (m.get(l) ?? 0) + n);
  };
  for (const [key, c] of corpus.counts) {
    const cands = claim(key);
    if (!cands) { unmatched.set(key, c); continue; }
    if (cands.length === 1) { cands[0].count += c; continue; }
    const inflecting = cands.filter((l) => l.forms.size > 1);
    const fixed = cands.filter((l) => l.forms.size <= 1);
    if (fixed.length) {
      let left = c;
      for (const l of inflecting) { const e = estimate(l, c); give(key, l, e); left -= e; }
      for (const l of fixed) give(key, l, Math.max(0, left) / fixed.length);
      continue;
    }
    const ests = inflecting.map((l) => estimate(l, c));
    const sum = ests.reduce((a, b) => a + b, 0);
    if (sum > 0) inflecting.forEach((l, i) => give(key, l, (c * ests[i]) / sum));
    else give(key, [...cands].sort((a, b) => a.row - b.row)[0], c);
  }
  const sortedClaim = (key: string): Lemma[] | undefined => {
    const cands = claim(key);
    if (!cands || cands.length < 2) return cands;
    const m = share.get(key);
    return [...cands].sort((a, b) => (m?.get(b) ?? 0) - (m?.get(a) ?? 0) || b.count - a.count);
  };
  return { unmatched, claim: sortedClaim };
}
