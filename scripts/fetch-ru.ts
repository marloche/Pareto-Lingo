// Downloads the raw Russian sources into data/raw/ru (gitignored), then unpacks the .bz2 files.
// Run: npm run packs:fetch            (skips files already downloaded)
//      npm run packs:fetch -- --force (downloads everything again)
// Needs bzip2: Git for Windows ships it; macOS and Linux have it.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchAll, localDate } from './lib/fetch.ts';

const RAW = 'data/raw/ru';
const FORCE = process.argv.includes('--force');

// GitHub sources are pinned to a commit so a rebuild gives the same pack.
// Tatoeba only publishes weekly snapshots, so its download date is recorded instead.
const FREQ_SHA = '525f9b560de45753a5ea01069454e72e9aa541c6'; // hermitdave/FrequencyWords
const OR_SHA = '50e210c4803237779cb562bc1abcea529066031c'; // Badestrand/russian-dictionary (openrussian.org)

const FILES = [
  { url: `https://raw.githubusercontent.com/hermitdave/FrequencyWords/${FREQ_SHA}/content/2018/ru/ru_full.txt`, name: 'ru_full.txt' },
  ...['nouns', 'verbs', 'adjectives', 'others'].map((n) => ({
    url: `https://raw.githubusercontent.com/Badestrand/russian-dictionary/${OR_SHA}/${n}.csv`,
    name: `openrussian-${n}.csv`,
  })),
  { url: 'https://downloads.tatoeba.org/exports/per_language/rus/rus_sentences.tsv.bz2', name: 'rus_sentences.tsv.bz2' },
  { url: 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2', name: 'eng_sentences.tsv.bz2' },
  { url: 'https://downloads.tatoeba.org/exports/per_language/rus/rus-eng_links.tsv.bz2', name: 'rus-eng_links.tsv.bz2' },
];

mkdirSync(RAW, { recursive: true });
await fetchAll(RAW, FILES, FORCE);

writeFileSync(
  join(RAW, 'fetched.json'),
  JSON.stringify({ fetchedAt: localDate(new Date()), freqSha: FREQ_SHA, openRussianSha: OR_SHA }, null, 2),
);
console.log('done: raw sources are in', RAW);
