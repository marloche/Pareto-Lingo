// Builds public/packs/ru/pack.json from the raw sources in data/raw/ru (run `npm run packs:fetch` first),
// and writes reports/ru-pack.md for a human check: coverage curve, top words, grammar notes and examples.
//
// Pipeline:
//   FrequencyWords spelling counts ─┐
//   OpenRussian words + all forms ──┼─► credit spellings to words ─► rank ─► pick up to 5,000 words
//   hand table (ru-extras.ts) ──────┘                                          │
//   Tatoeba rus + eng + links ─► per word: the sentence with the fewest not-yet-learned words (i+1)
//   grammar patterns (ru-grammar.ts) ─► matching sentences ─► placed right after the words they need
//   alphabet (ru-alphabet.ts) ─► 33 letters first
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import type { Example, Item, Pack } from '../src/core/types.ts';
import { apostropheToAccent, ruKey, ruPlain } from '../src/lang/ru.ts';
import { creditCounts, loadCorpus, loadLemmas, type Lemma } from './lib/ru-data.ts';
import { COMPOUND_FORMS, EXTRAS, PATCHES } from './lib/ru-extras.ts';
import { LETTERS } from './lib/ru-alphabet.ts';
import { GRAMMAR_SPACING, PATTERNS } from './lib/ru-grammar.ts';
import { isPlainSentence, makeTokenizer, similarity, type Tok } from './lib/ru-tokens.ts';

const RAW = 'data/raw/ru/';
const MAX_WORDS = 5000;
const EXAMPLES_PER_WORD = 2;
const EXAMPLES_PER_PATTERN = 3;
const CANDIDATES = 6;
const UNKNOWN = 1_000_000;

const t0 = Date.now();
const log = (msg: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);

if (!existsSync(RAW + 'fetched.json')) {
  console.error('Raw sources missing. Run: npm run packs:fetch');
  process.exit(1);
}
const fetched = JSON.parse(readFileSync(RAW + 'fetched.json', 'utf8')) as { fetchedAt: string; freqSha: string; openRussianSha: string };

// 1. Words and their frequency ───────────────────────────────────────────────────────────────
const lemmas = loadLemmas(PATCHES, EXTRAS, COMPOUND_FORMS);
const corpus = loadCorpus();
const { unmatched, claim } = creditCounts(lemmas, corpus);
const ranked = lemmas.filter((l) => l.count > 0 && l.en).sort((a, b) => b.count - a.count || a.row - b.row);
const rankOf = new Map<Lemma, number>(ranked.map((l, i) => [l, i + 1]));
log(`${lemmas.length} dictionary words, ${ranked.length} seen in ${corpus.total.toLocaleString('en')} corpus tokens`);

// 2. Example sentences ─────────────────────────────────────────────────────────────────────────
async function* lines(file: string): AsyncGenerator<string> {
  const rl = createInterface({ input: createReadStream(RAW + file, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

const links = new Map<number, number[]>();
for await (const line of lines('rus-eng_links.tsv')) {
  const [a, b] = line.split('\t').map(Number);
  if (a && b) (links.get(a) ?? links.set(a, []).get(a)!).push(b);
}
log(`${links.size} Russian sentences have an English translation`);

/** A candidate example: `focus` tells candidates apart (word or pattern focus), `at` is the focus token's index. */
interface Cand { score: number; sid: number; text: string; toks: Tok[]; focus: string; at: number }
const keep = (list: Cand[], c: Cand, max = CANDIDATES) => {
  if (list.length === max && c.score >= list[list.length - 1].score) return;
  let i = list.length;
  while (i > 0 && list[i - 1].score > c.score) i--;
  list.splice(i, 0, c);
  if (list.length > max) list.pop();
};
/** What a word costs a learner when it appears in an example: its frequency rank, or a penalty. */
const STOCK_NAME_COST = 50; // Том, Мэри: Tatoeba's regulars, recognisable at once
const NAME_COST = 3000; // other names read fine but crowd out real words
const tokenCost = (t: Tok) =>
  t.stock ? STOCK_NAME_COST : t.name ? NAME_COST : t.abbr || !t.lemmas.length ? UNKNOWN : (rankOf.get(t.lemmas[0]) ?? UNKNOWN);

const tokenize = makeTokenizer(claim);
const maybeInPack = new Set(ranked.slice(0, MAX_WORDS + 2000));
const wordCands = new Map<Lemma, Cand[]>();
/** Grammar: the easiest sentence per focus word, so the examples can show the pattern on different words. */
const grammarBest = new Map<string, Map<string, Cand>>(PATTERNS.map((p) => [p.id, new Map()]));
/** Mid-sentence uses per word: capitalised (a name: Генри) vs lowercase. Flags names posing as words. */
const nameUse = new Map<Lemma, number>();
const wordUse = new Map<Lemma, number>();
let scanned = 0;

for await (const line of lines('rus_sentences.tsv')) {
  const tab1 = line.indexOf('\t');
  const sid = Number(line.slice(0, tab1));
  if (!links.has(sid)) continue;
  const text = line.slice(line.indexOf('\t', tab1 + 1) + 1).trim();
  if (!isPlainSentence(text)) continue;
  const toks = tokenize(text);
  const n = toks.length;
  if (n < 2 || n > 10) continue;
  scanned++;
  for (const t of toks) {
    if (t.initial || t.stock || t.abbr) continue;
    if (t.name) {
      const l = claim(t.key)?.find((x) => x.en);
      if (l) nameUse.set(l, (nameUse.get(l) ?? 0) + 1);
    } else if (t.lemmas[0] && /^\p{Ll}/u.test(t.text)) wordUse.set(t.lemmas[0], (wordUse.get(t.lemmas[0]) ?? 0) + 1);
  }
  const ranks = toks.map(tokenCost);
  const maxAll = Math.max(...ranks);
  const lengthCost = 15 * Math.abs(n - 5);

  // For each word in the sentence: how many *other* words would still be new when it is taught?
  const seen = new Set<Lemma>();
  for (let i = 0; i < n; i++) {
    const target = toks[i].lemmas[0];
    if (!target || seen.has(target) || !maybeInPack.has(target)) continue;
    seen.add(target);
    if (target.examplesWith && !toks.some((x) => target.examplesWith!.has(x.key))) continue;
    const r = rankOf.get(target)!;
    let newer = 0;
    let maxOther = 0;
    for (let j = 0; j < n; j++) {
      if (toks[j].lemmas[0] === target) continue;
      if (ranks[j] > r) newer++;
      if (ranks[j] > maxOther) maxOther = ranks[j];
    }
    const ambiguous = toks[i].lemmas.length > 1 ? 300 : 0;
    const score = newer * 100_000 + Math.min(maxOther, 99_999) + lengthCost + ambiguous;
    const list = wordCands.get(target) ?? [];
    keep(list, { score, sid, text, toks, focus: target.id, at: i });
    wordCands.set(target, list);
  }
  for (const p of PATTERNS) {
    const word = p.find(toks, text);
    if (!word) continue;
    const focus = p.byForm ? word.key : (word.lemmas[0]?.id ?? word.key);
    const score = Math.min(maxAll, 99_999) + lengthCost;
    const best = grammarBest.get(p.id)!;
    if (!best.has(focus) || score < best.get(focus)!.score) best.set(focus, { score, sid, text, toks, focus, at: toks.indexOf(word) });
  }
}
log(`${scanned} usable sentences scanned`);
const grammarCands = new Map<string, Cand[]>(
  [...grammarBest].map(([id, best]) => [id, [...best.values()].sort((a, b) => a.score - b.score).slice(0, 60)]),
);

const needEng = new Set<number>();
for (const list of [...wordCands.values(), ...grammarCands.values()]) for (const c of list) for (const e of links.get(c.sid)!) needEng.add(e);
const eng = new Map<number, string>();
for await (const line of lines('eng_sentences.tsv')) {
  const tab1 = line.indexOf('\t');
  const id = Number(line.slice(0, tab1));
  if (needEng.has(id)) eng.set(id, line.slice(line.indexOf('\t', tab1 + 1) + 1).trim());
}
log(`${eng.size} English translations loaded`);

/** Puts stress marks on every word whose stress is unambiguous, and restores ё where the dictionary has it. */
function applyShape(word: string, shape: string): string | null {
  const chars = [...word];
  let out = '';
  let j = 0;
  for (const ch of shape) {
    if (ch === '́') { out += ch; continue; }
    const w = chars[j];
    if (w === undefined || ruKey(w) !== ruKey(ch)) return null;
    out += ch === 'ё' ? (w === w.toUpperCase() ? 'Ё' : 'ё') : w;
    j++;
  }
  return j === chars.length ? out : null;
}
/** Stress-marks a sentence and returns where each word ends up in the new text, as [start, end). */
function stressSentence(text: string, toks: Tok[]): { text: string; ranges: [number, number][] } {
  let out = '';
  let pos = 0;
  const ranges: [number, number][] = [];
  for (const t of toks) {
    out += text.slice(pos, t.start);
    const shapes = new Set<string>();
    for (const l of t.lemmas) for (const s of l.spellings.get(t.key) ?? []) shapes.add(apostropheToAccent(s).toLowerCase());
    const word = (shapes.size === 1 && applyShape(t.text, [...shapes][0])) || t.text;
    ranges.push([out.length, out.length + word.length]);
    out += word;
    pos = t.start + t.text.length;
  }
  return { text: out + text.slice(pos), ranges };
}
/** The example with its focus word in bold, for the report. */
const bold = (e: Example) => (e.focus ? `${e.text.slice(0, e.focus[0])}**${e.text.slice(...e.focus)}**${e.text.slice(e.focus[1])}` : e.text);
/**
 * Takes the best candidates in order, skipping near-duplicates. With `distinctFocus` (grammar), each
 * example must show the pattern on a different word, so three examples are three different cases.
 */
function pickExamples(cands: Cand[] | undefined, max: number, distinctFocus = false): Example[] {
  const out: Example[] = [];
  const chosen: Cand[] = [];
  for (const c of cands ?? []) {
    const translations = links.get(c.sid)!.filter((e) => eng.has(e)).sort((a, b) => eng.get(a)!.length - eng.get(b)!.length);
    if (!translations.length) continue;
    const en = eng.get(translations[0])!;
    if (out.some((x) => x.en === en)) continue;
    if (chosen.some((x) => similarity(x.toks, c.toks) >= 0.5 || (distinctFocus && x.focus === c.focus))) continue;
    chosen.push(c);
    const s = stressSentence(c.text, c.toks);
    out.push({ text: s.text, en, src: `tatoeba:${c.sid}/${translations[0]}`, focus: s.ranges[c.at] });
    if (out.length === max) break;
  }
  return out;
}

// 3. Items in teaching order ────────────────────────────────────────────────────────────────────
/** Splits "say, tell; speak" into senses, ignoring separators inside parentheses. */
function glosses(en: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of en) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  const out: string[] = [];
  for (const p of parts) {
    const s = p.replace(/\s+/g, ' ').trim();
    if (s && !out.includes(s)) out.push(s.length > 60 ? `${s.slice(0, 57)}…` : s);
    if (out.length === 4) break;
  }
  return out;
}

const words: { lemma: Lemma; examples: Example[] }[] = [];
const noExample: Lemma[] = [];
for (const lemma of ranked) {
  if (words.length === MAX_WORDS) break;
  const examples = pickExamples(wordCands.get(lemma), EXAMPLES_PER_WORD);
  if (!examples.length) { noExample.push(lemma); continue; }
  words.push({ lemma, examples });
}

const wordItem = ({ lemma: l, examples }: { lemma: Lemma; examples: Example[] }): Item => {
  const stressed = apostropheToAccent(l.show ?? l.accented);
  const pron = l.info === 'pronoun';
  return {
    id: l.id,
    kind: 'word',
    order: 0,
    text: ruPlain(stressed),
    stressed,
    pos: pron ? 'pron' : l.pos,
    ...(l.info && !pron ? { info: l.info } : {}),
    gloss: glosses(l.en),
    rank: rankOf.get(l)!,
    share: Number((l.count / corpus.total).toPrecision(4)),
    examples,
  };
};

const indexOfWord = (bare: string) => {
  const i = words.findIndex((w) => w.lemma.bare === bare);
  if (i < 0) throw new Error(`grammar pattern needs "${bare}", which isn't in the pack`);
  return i;
};
const grammarAfter = new Map<number, Item[]>();
const grammarReport: string[] = [];
PATTERNS.forEach((p, k) => {
  const after = Math.min(words.length - 1, Math.max(GRAMMAR_SPACING * k, ...p.needs.map(indexOfWord)));
  const examples = pickExamples(grammarCands.get(p.id), EXAMPLES_PER_PATTERN, true);
  if (!examples.length) throw new Error(`grammar pattern "${p.id}" matched no usable sentence`);
  const item: Item = { id: `ru:g:${p.id}`, kind: 'grammar', order: 0, text: p.title, title: p.title, note: p.note, gloss: [], examples };
  (grammarAfter.get(after) ?? grammarAfter.set(after, []).get(after)!).push(item);
  grammarReport.push(`### ${p.title}\nAfter word #${after + 1} (${words[after].lemma.bare}). Found in sentences on ${grammarBest.get(p.id)!.size} different words.\n\n${p.note}\n\n${examples.map((e) => `- ${bold(e)} — *${e.en}*`).join('\n')}\n`);
});

const letterItems: Item[] = LETTERS.map((L) => {
  const byContains = ['ё', 'й', 'ъ', 'ы', 'ь'].includes(L.lower);
  const matching = words.filter(({ lemma }) => {
    const plain = ruPlain(apostropheToAccent(lemma.show ?? lemma.accented)).toLowerCase();
    return byContains ? plain.includes(L.lower) : plain.startsWith(L.lower);
  });
  // A concrete noun makes the best example word (жизнь, not the particle же); then a verb.
  const w = matching.find((x) => x.lemma.pos === 'noun') ?? matching.find((x) => x.lemma.pos === 'verb') ?? matching[0];
  const ex = w ? wordItem(w) : undefined;
  return {
    id: `ru:l:${L.lower}`,
    kind: 'letter',
    order: 0,
    text: `${L.upper} ${L.lower}`,
    title: `${L.upper} ${L.lower}`,
    note: L.hint,
    gloss: [],
    examples: ex ? [{ text: ex.stressed!, en: ex.gloss[0] ?? '', src: 'pack' }] : [],
  };
});

const items: Item[] = [...letterItems];
words.forEach((w, i) => {
  items.push(wordItem(w));
  for (const g of grammarAfter.get(i) ?? []) items.push(g);
});
items.forEach((it, i) => { it.order = i + 1; });

// The build date in local time (UTC would stamp tomorrow's date on an evening build in the Americas).
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const pack: Pack = {
  schema: 1,
  lang: 'ru',
  name: 'Russian',
  nativeName: 'Русский',
  version: today,
  tts: 'ru-RU',
  matcher: 'ru',
  license: 'CC BY-SA 4.0',
  corpus: { name: 'OpenSubtitles 2018 (via FrequencyWords)', tokens: corpus.total },
  sources: [
    { name: 'FrequencyWords (OpenSubtitles 2018)', url: 'https://github.com/hermitdave/FrequencyWords', license: 'CC BY-SA 4.0', usedFor: 'word frequencies', version: fetched.freqSha.slice(0, 7) },
    { name: 'OpenRussian.org dictionary data', url: 'https://github.com/Badestrand/russian-dictionary', license: 'CC BY-SA 4.0', usedFor: 'dictionary forms, stress, English meanings, word forms', version: fetched.openRussianSha.slice(0, 7) },
    { name: 'Tatoeba', url: 'https://tatoeba.org', license: 'CC BY 2.0 FR', usedFor: 'example sentences and translations (stress marks added)', version: fetched.fetchedAt },
    { name: 'Pareto-Lingo hand table', url: 'https://github.com/marloche/Pareto-Lingo/tree/main/scripts/lib', license: 'CC BY-SA 4.0', usedFor: 'missing pronoun and number forms, data fixes, alphabet hints, grammar notes (scripts/lib in the app’s source code)' },
  ],
  items,
};

mkdirSync('public/packs/ru', { recursive: true });
const json = JSON.stringify(pack);
writeFileSync('public/packs/ru/pack.json', json);
log(`wrote public/packs/ru/pack.json: ${items.length} items (${letterItems.length} letters, ${words.length} words, ${PATTERNS.length} grammar), ${(json.length / 1e6).toFixed(2)} MB`);

// 4. Report for a human check ───────────────────────────────────────────────────────────────────
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const curve: string[] = [];
let cum = 0;
const marks = new Set([100, 250, 500, 1000, 2000, 3000, 4000, 5000]);
words.forEach((w, i) => {
  cum += w.lemma.count;
  if (marks.has(i + 1)) curve.push(`| ${i + 1} | ${pct(cum / corpus.total)} |`);
});
const unmatchedTotal = [...unmatched.values()].reduce((a, b) => a + b, 0);
const topUnmatched = [...unmatched].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, c]) => `${k} (${c.toLocaleString('en')})`).join(', ');
const noExampleTop = noExample.filter((l) => rankOf.get(l)! <= 2000);
const top100 = words.slice(0, 100).map((w) => {
  const it = wordItem(w);
  return `| ${it.rank} | ${it.stressed} | ${it.gloss.slice(0, 2).join('; ')} | ${(100 * it.share!).toFixed(2)}% | ${bold(w.examples[0])} — *${w.examples[0].en}* |`;
});
const hand = words.filter((w) => w.lemma.hand).map((w) => `${wordItem(w).stressed} (#${rankOf.get(w.lemma)})`);
const asName = (l: Lemma) => nameUse.get(l) ?? 0;
const nameLike = words
  .filter((w) => asName(w.lemma) >= 5 && asName(w.lemma) > 2 * (wordUse.get(w.lemma) ?? 0))
  .map((w) => `| ${wordItem(w).stressed} | #${rankOf.get(w.lemma)} | ${w.lemma.en.slice(0, 40)} | ${asName(w.lemma)} | ${wordUse.get(w.lemma) ?? 0} |`);

const report = `# Russian pack report

Built ${today} in ${((Date.now() - t0) / 1000).toFixed(0)} s. Sources: FrequencyWords \`${fetched.freqSha.slice(0, 7)}\`, OpenRussian \`${fetched.openRussianSha.slice(0, 7)}\`, Tatoeba export of ${fetched.fetchedAt}.

- **Items:** ${items.length}: ${letterItems.length} letters, ${words.length} words, ${PATTERNS.length} grammar patterns
- **Corpus:** ${corpus.total.toLocaleString('en')} Cyrillic word tokens from film and TV subtitles
- **Spellings matched to a dictionary word:** ${pct(1 - unmatchedTotal / corpus.total)} (the rest are mostly names)
- **Words skipped for having no usable example sentence:** ${noExample.length} (${noExampleTop.length} of them in the top 2,000: ${noExampleTop.map((l) => l.bare).join(', ') || 'none'})
- **Pack size:** ${(json.length / 1e6).toFixed(2)} MB

## Coverage curve
Share of all word tokens in the corpus that the first N pack words account for (all their forms merged).

| Words learned | Coverage |
|---|---|
${curve.join('\n')}

## Top 100 words
| Rank | Word | Meaning | Share | Example |
|---|---|---|---|---|
${top100.join('\n')}

## Grammar patterns (AI-written notes: please review)
${grammarReport.join('\n')}
## Hand table
Words added or fixed by hand (standard forms missing from the dictionary data): ${hand.join(', ')}.

## Possible names
Pack words written with a capital mid-sentence more than twice as often as without in the example sentences. A name that looks like a dictionary word (Генри → "henry") takes that word's place in the frequency list; drop those in the hand table. Real proper nouns (Бог, Москва) can stay.

| Word | Rank | Meaning | Capitalised | Lowercase |
|---|---|---|---|---|
${nameLike.join('\n')}

## Most common unmatched spellings
${topUnmatched}
`;
mkdirSync('reports', { recursive: true });
writeFileSync('reports/ru-pack.md', report);
log('wrote reports/ru-pack.md');
