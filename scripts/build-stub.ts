// Builds the Japanese or Chinese starter pack (public/packs/<lang>/pack.json, ~20 words) from the raw
// sources in data/raw/<lang> (run `npm run packs:fetch:<lang>` first), and writes reports/<lang>-pack.md.
//
// Pipeline:
//   FrequencyWords counts ─► in order: keep tokens that are a dictionary word ─► top 20
//   JMdict (ja) / CC-CEDICT (zh) ─► reading (kana / pinyin), meanings, part of speech
//   Tatoeba sentences + English links ─► the 2 shortest sentences where the word stands on its own
//
// A starter pack has no alphabet or grammar items: it only proves a language plugs in.
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import type { Example, Item, Pack } from '../src/core/types.ts';
import { numbersToMarks } from '../src/lang/zh.ts';
import { PICK, SKIP } from './lib/stub-extras.ts';

const lang = process.argv[2];
if (lang !== 'ja' && lang !== 'zh') {
  console.error('Usage: node scripts/build-stub.ts ja|zh');
  process.exit(1);
}
const RAW = `data/raw/${lang}/`;
const WORDS = 20;
const EXAMPLES_PER_WORD = 2;
const MAX_SENTENCE = 18; // characters: short sentences for a first look
const MIN_WORD_CHARS = 3; // "是。" alone shows nothing
const CRUDE = /\b(bitch|fuck\w*|shit|damn|ass|bastard|hell)\b/i;

if (!existsSync(RAW + 'fetched.json')) {
  console.error(`Raw sources missing. Run: npm run packs:fetch:${lang}`);
  process.exit(1);
}
const fetched = JSON.parse(readFileSync(RAW + 'fetched.json', 'utf8')) as { fetchedAt: string; freqSha: string; jmdictTag?: string };

const HAN = /\p{Script=Han}/u;
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u;
const isWordChar = (ch: string | undefined) => !!ch && (HAN.test(ch) || KANA.test(ch));

// 1. Dictionary entries ───────────────────────────────────────────────────────────────────────
interface Entry {
  /** Written form as it appears in text. */
  text: string;
  /** Kana (ja) or tone-marked pinyin (zh); none when the text is already kana. */
  reading?: string;
  /** Pinyin with tone numbers (zh), used in the id. */
  key: string;
  pos?: string;
  gloss: string[];
}

/** Every dictionary form, for spotting a match that is really part of a longer word. */
const longForms = new Set<string>();
/** Written form → its entries. */
const dict = new Map<string, Entry[]>();
const add = (form: string, e: Entry) => {
  const list = dict.get(form) ?? [];
  list.push(e);
  dict.set(form, list);
};

if (lang === 'ja') {
  interface JmText { text: string; common: boolean; tags: string[]; appliesToKanji?: string[] }
  interface JmWord { id: string; kanji: JmText[]; kana: JmText[]; sense: { partOfSpeech: string[]; misc: string[]; gloss: { text: string }[] }[] }
  const jm = JSON.parse(readFileSync(RAW + 'jmdict-eng-common.json', 'utf8')) as { words: JmWord[] };
  const posOf = (tags: string[]): string | undefined => {
    const t = tags[0] ?? '';
    if (t === 'pn') return 'pron';
    if (t.startsWith('v')) return 'verb';
    if (t.startsWith('adj')) return 'adj';
    if (t === 'n') return 'noun';
    return 'other';
  };
  for (const w of jm.words) {
    const sense = w.sense[0];
    const gloss = sense.gloss.map((g) => g.text).slice(0, 3);
    const pos = posOf(sense.partOfSpeech);
    for (const k of w.kanji) {
      longForms.add(k.text);
      if (!k.common) continue;
      const kana = w.kana.find((r) => r.common && (!r.appliesToKanji || r.appliesToKanji.includes('*') || r.appliesToKanji.includes(k.text)));
      if (kana) add(k.text, { text: k.text, reading: kana.text, key: kana.text, pos, gloss });
    }
    // A kana spelling counts as a word of its own when the entry has no kanji or is usually written in kana.
    const usuallyKana = !w.kanji.length || w.sense.some((s) => s.misc.includes('uk'));
    for (const r of w.kana) {
      longForms.add(r.text);
      if (r.common && usuallyKana) add(r.text, { text: r.text, key: r.text, pos, gloss });
    }
  }
} else {
  // CC-CEDICT line: 傳統 传统 [chuan2 tong3] /tradition/traditional/
  for (const line of readFileSync(RAW + 'cedict.txt', 'utf8').split('\n')) {
    const m = /^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/\s*$/.exec(line);
    if (!m) continue;
    const [, , simp, pinyin, defs] = m;
    longForms.add(simp);
    // Names, surnames and spelling variants are never the everyday word.
    if (/^[A-Z]/.test(pinyin)) continue;
    const gloss = defs
      .split('/')
      .filter((g) => !/^(CL:|surname |variant of |old variant of |used in |see |\(old\)|also written|also pr\.|\(Note)/i.test(g))
      // Drop pinyin cross-references ("[ta1 ri4]") and qualifiers that open a meaning ("(bound form) not"), unless
      // they are the whole meaning ("(question particle)"). A note after the meaning stays: "~'s (possessive particle)".
      .map((g) => g.replace(/\[[^\]]*\]/g, '').replace(/\s*\(Note:[^)]*\)/g, '').replace(/^(\s*\([^()]*\))+\s*/, '').replace(/\s+([;,)])/g, '$1').trim() || g)
      .filter((g, i) => i === 0 || !/^\(bound form\)/.test(g));
    if (!gloss.length) continue;
    const key = pinyin.toLowerCase().replace(/\s+/g, ' ');
    add(simp, { text: simp, reading: numbersToMarks(key).replace(/ /g, ''), key: key.replace(/ /g, ''), gloss: gloss.slice(0, 3) });
  }
}

// 2. Frequency order ──────────────────────────────────────────────────────────────────────────
const freqFile = lang === 'ja' ? 'ja_full.txt' : 'zh_cn_full.txt';
const counts: [string, number][] = [];
let total = 0;
for (const line of readFileSync(RAW + freqFile, 'utf8').split('\n')) {
  const [tok, n] = line.trim().split(' ');
  if (!tok || !n || ![...tok].some(isWordChar)) continue; // punctuation, Latin letters, digits
  counts.push([tok, Number(n)]);
  total += Number(n);
}

/** The 1,000 most frequent tokens: a longer word made of the word plus only these is still the word (不知道). */
const frequent = new Set(counts.slice(0, 1000).map(([tok]) => tok));
/** Meanings that fit on a card: the first, then more while all of them stay within 50 characters. */
const short = (gloss: string[]): string[] => gloss.filter((_, i) => i === 0 || gloss.slice(0, i + 1).join('; ').length <= 50);
const skipped: { tok: string; why: string }[] = [];
const picked: { entry: Entry; count: number }[] = [];
const missing: string[] = [];
for (const [tok, n] of counts) {
  if (picked.length >= WORDS) break;
  const hand = SKIP[lang][tok];
  if (hand) { skipped.push({ tok, why: hand }); continue; }
  if (lang === 'ja' && [...tok].length === 1 && KANA.test(tok)) { skipped.push({ tok, why: 'single kana: a particle or a piece of a longer word' }); continue; }
  const entries = dict.get(tok);
  if (!entries) { skipped.push({ tok, why: 'not a dictionary word (a piece the word splitter cut off)' }); continue; }
  const pick = PICK[lang][tok];
  const distinct = [...new Map(entries.map((e) => [e.key, e])).values()];
  let entry: Entry | undefined;
  if (pick) entry = distinct.find((e) => e.key === pick.key);
  else if (distinct.length === 1) entry = distinct[0];
  if (!entry) {
    missing.push(`${tok}: ${pick ? `pick "${pick.key}" matches no entry` : 'several readings'}. Options:\n${distinct.map((e) => `  ${e.key}  ${e.gloss.join('; ')}`).join('\n')}`);
    entry = distinct[0];
  }
  const same = picked.find((p) => p.entry.key === entry!.key && p.entry.gloss[0] === entry!.gloss[0]);
  if (same) { skipped.push({ tok, why: `the same word as ${same.entry.text}, written another way` }); continue; }
  picked.push({ entry: { ...entry, gloss: pick?.gloss ?? short(entry.gloss) }, count: n });
}
if (missing.length) {
  console.error(`Add a PICK in scripts/lib/stub-extras.ts for:\n${missing.join('\n')}`);
  console.error(`Words so far: ${picked.map((p) => p.entry.text).join(' ')}`);
  process.exit(1);
}

// 3. Example sentences ────────────────────────────────────────────────────────────────────────
const tatoebaCode = lang === 'ja' ? 'jpn' : 'cmn';
const sentences = new Map<string, string>();
for (const line of readFileSync(`${RAW}${tatoebaCode}_sentences.tsv`, 'utf8').split('\n')) {
  const [id, , text] = line.split('\t');
  // Plain sentences only: no digits, Latin letters, spaces or quotation marks (a quoted word is talked
  // about, not used), and none that are crude or only one word.
  const t = text?.trim() ?? '';
  const chars = [...t].filter(isWordChar).length;
  if (chars >= MIN_WORD_CHARS && [...t].length <= MAX_SENTENCE && !/[0-9０-９A-Za-zＡ-Ｚａ-ｚ\s“”"'‘’「」『』]/.test(t)) sentences.set(id, t);
}
// Chinese: Tatoeba mixes simplified and traditional; drop a sentence with any traditional-only character.
const tradOnly = new Set<string>();
if (lang === 'zh') {
  for (const line of readFileSync(RAW + 'cedict.txt', 'utf8').split('\n')) {
    const m = /^(\S+) (\S+) /.exec(line);
    if (!m || [...m[1]].length !== [...m[2]].length) continue;
    const t = [...m[1]];
    const s = [...m[2]];
    t.forEach((ch, i) => { if (ch !== s[i]) tradOnly.add(ch); });
  }
  for (const ch of '的我你了是在他不吗好有这么说都去很想人会来对没做让给') tradOnly.delete(ch);
}
const links = new Map<string, string[]>();
for (const line of readFileSync(`${RAW}${tatoebaCode}-eng_links.tsv`, 'utf8').split('\n')) {
  const [a, b] = line.trim().split('\t');
  if (a && b && sentences.has(a)) links.set(a, [...(links.get(a) ?? []), b]);
}
const wanted = new Set([...links.values()].flat());
const english = new Map<string, string>();
const rl = createInterface({ input: createReadStream('data/raw/tatoeba/eng_sentences.tsv', 'utf8'), crlfDelay: Infinity });
for await (const line of rl) {
  const [id, , text] = line.split('\t');
  if (wanted.has(id)) english.set(id, text);
}

/** Where `word` stands on its own in `text`: not inside a longer dictionary word, not next to kanji. */
function ownSpot(text: string, word: string): number {
  for (let i = text.indexOf(word); i >= 0; i = text.indexOf(word, i + 1)) {
    const end = i + word.length;
    let inside = false;
    for (let a = Math.max(0, i - 3); a <= i && !inside; a++) {
      for (let b = end; b <= Math.min(text.length, end + 3) && !inside; b++) {
        if ((a < i || b > end) && longForms.has(text.slice(a, b))) {
          const extra = [text.slice(a, i), text.slice(end, b)].filter(Boolean);
          // Chinese only: Japanese frequent tokens are pieces (だ, て), so だから would pass as だ + から.
          if (lang === 'ja' || !extra.every((x) => frequent.has(x))) inside = true;
        }
      }
    }
    // Japanese: kanji next to a kanji word make a compound; a kana word right after kanji is an ending (痛そう).
    if (lang === 'ja') {
      if (HAN.test(word.at(-1)!) && HAN.test(text[end] ?? '')) inside = true;
      if (HAN.test(text[i - 1] ?? '')) inside = true;
    }
    if (!inside) return i;
  }
  return -1;
}

const examplesFor = (word: string): Example[] => {
  const found: Example[] = [];
  const cands = [...sentences].filter(([id, text]) => links.has(id) && text.includes(word)).sort((a, b) => a[1].length - b[1].length);
  for (const [id, text] of cands) {
    if (found.length >= EXAMPLES_PER_WORD) break;
    if ([...text].some((ch) => tradOnly.has(ch))) continue;
    if (found.some((f) => f.text === text)) continue;
    const at = ownSpot(text, word);
    const enId = links.get(id)!.find((e) => english.has(e));
    if (at < 0 || !enId || CRUDE.test(english.get(enId)!)) continue;
    found.push({ text, en: english.get(enId)!, src: `tatoeba:${id}/${enId}`, focus: [at, at + word.length] });
  }
  return found;
};

// 4. Pack ─────────────────────────────────────────────────────────────────────────────────────
const items: Item[] = picked.map(({ entry, count }, i) => {
  const examples = examplesFor(entry.text);
  if (!examples.length) console.warn(`warning: no example sentence for ${entry.text}`);
  return {
    id: `${lang}:w:${entry.text}:${entry.key}`,
    kind: 'word',
    order: i + 1,
    text: entry.text,
    ...(entry.reading && entry.reading !== entry.text ? { reading: entry.reading } : {}),
    ...(entry.pos ? { pos: entry.pos } : {}),
    gloss: entry.gloss,
    rank: i + 1,
    share: Number((count / total).toPrecision(4)),
    examples,
  };
});

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const freqYear = lang === 'ja' ? '2016' : '2018';
const pack: Pack = {
  schema: 1,
  lang,
  name: lang === 'ja' ? 'Japanese' : 'Chinese',
  nativeName: lang === 'ja' ? '日本語' : '中文',
  version: today,
  tts: lang === 'ja' ? 'ja-JP' : 'zh-CN',
  matcher: lang,
  license: 'CC BY-SA 4.0',
  corpus: { name: `OpenSubtitles ${freqYear} (via FrequencyWords)`, tokens: total },
  sources: [
    { name: `FrequencyWords (OpenSubtitles ${freqYear})`, url: 'https://github.com/hermitdave/FrequencyWords', license: 'CC BY-SA 4.0', usedFor: 'word frequencies', version: fetched.freqSha.slice(0, 7) },
    lang === 'ja'
      ? { name: 'JMdict (EDRDG), via jmdict-simplified', url: 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project', license: 'CC BY-SA 4.0', usedFor: 'readings, English meanings, parts of speech', version: fetched.jmdictTag }
      : { name: 'CC-CEDICT', url: 'https://cc-cedict.org/wiki/', license: 'CC BY-SA 4.0', usedFor: 'pinyin and English meanings', version: fetched.fetchedAt },
    { name: 'Tatoeba', url: 'https://tatoeba.org', license: 'CC BY 2.0 FR', usedFor: 'example sentences and translations', version: fetched.fetchedAt },
  ],
  items,
};
writeFileSync(`public/packs/${lang}/pack.json`, `${JSON.stringify(pack)}\n`);

// 5. Report ───────────────────────────────────────────────────────────────────────────────────
const pct = (x: number) => `${(x * 100).toFixed(2)}%`;
const mark = (e: Example) => `${e.text.slice(0, e.focus![0])}**${e.text.slice(e.focus![0], e.focus![1])}**${e.text.slice(e.focus![1])}`;
const report = `# ${pack.name} starter pack: build report

Generated by \`npm run packs:build:${lang}\` on ${today}. A starter pack: the ${WORDS} most frequent words, no script primer or grammar.

- **Corpus:** ${total.toLocaleString('en')} word tokens from film and TV subtitles (FrequencyWords ${freqYear})${lang === 'ja' ? '. Japanese has no spaces, and this list was split by a tool that cuts words into pieces (い, て, っ), so shares are rough' : ''}
- **These ${items.length} words cover:** ${pct(items.reduce((s, it) => s + (it.share ?? 0), 0))} of tokens

## Words

| # | Word | Reading | Meaning | Share | Examples |
|---|---|---|---|---|---|
${items.map((it) => `| ${it.rank} | ${it.text} | ${it.reading ?? ''} | ${it.gloss.join('; ')} | ${pct(it.share ?? 0)} | ${it.examples.map((e) => `${mark(e)} — *${e.en}*`).join('<br>') || '**none**'} |`).join('\n')}

## Skipped on the way (more frequent than the last word kept)

| Token | Why |
|---|---|
${skipped.map((s) => `| ${s.tok} | ${s.why} |`).join('\n')}

## Hand table (scripts/lib/stub-extras.ts)

${Object.entries(PICK[lang]).map(([w, p]) => `- **${w}** → ${p.key}: ${p.why}`).join('\n') || '- none'}
`;
writeFileSync(`reports/${lang}-pack.md`, report);
console.log(`${lang}: ${items.length} words, ${items.reduce((s, it) => s + it.examples.length, 0)} examples, ${skipped.length} tokens skipped → public/packs/${lang}/pack.json, reports/${lang}-pack.md`);
