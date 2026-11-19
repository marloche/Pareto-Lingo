// Downloads the raw sources for the Japanese or Chinese starter pack into data/raw/<lang> (gitignored).
// Run: npm run packs:fetch:ja   or   npm run packs:fetch:zh      (add -- --force to download again)
// English Tatoeba sentences are shared by both and go to data/raw/tatoeba.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchAll, localDate, type RawFile } from './lib/fetch.ts';

const lang = process.argv[2];
if (lang !== 'ja' && lang !== 'zh') {
  console.error('Usage: node scripts/fetch-stub.ts ja|zh');
  process.exit(1);
}
const FORCE = process.argv.includes('--force');

// GitHub sources are pinned (a commit or a release tag) so a rebuild gives the same pack.
// CC-CEDICT and Tatoeba only publish the current snapshot, so their download date is recorded instead.
const FREQ_SHA = '525f9b560de45753a5ea01069454e72e9aa541c6'; // hermitdave/FrequencyWords
const JMDICT_TAG = '3.6.2+20261116213322'; // scriptin/jmdict-simplified (JMdict as JSON)
const freq = (path: string) => `https://raw.githubusercontent.com/hermitdave/FrequencyWords/${FREQ_SHA}/content/${path}`;
const tatoeba = (code: string): RawFile[] => [
  { url: `https://downloads.tatoeba.org/exports/per_language/${code}/${code}_sentences.tsv.bz2`, name: `${code}_sentences.tsv.bz2` },
  { url: `https://downloads.tatoeba.org/exports/per_language/${code}/${code}-eng_links.tsv.bz2`, name: `${code}-eng_links.tsv.bz2` },
];

const FILES: Record<'ja' | 'zh', RawFile[]> = {
  // The 2016 Japanese list keeps kana words (私 is there; the 2018 list dropped most hiragana).
  ja: [
    { url: freq('2016/ja/ja_full.txt'), name: 'ja_full.txt' },
    {
      url: `https://github.com/scriptin/jmdict-simplified/releases/download/${encodeURIComponent(JMDICT_TAG)}/jmdict-eng-common-${encodeURIComponent(JMDICT_TAG)}.json.tgz`,
      name: 'jmdict-eng-common.json.tgz',
    },
    ...tatoeba('jpn'),
  ],
  zh: [
    { url: freq('2018/zh_cn/zh_cn_full.txt'), name: 'zh_cn_full.txt' },
    { url: 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz', name: 'cedict.txt.gz' },
    ...tatoeba('cmn'),
  ],
};

const RAW = join('data/raw', lang);
const SHARED = 'data/raw/tatoeba';
mkdirSync(RAW, { recursive: true });
mkdirSync(SHARED, { recursive: true });
await fetchAll(RAW, FILES[lang], FORCE);
await fetchAll(SHARED, [{ url: 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2', name: 'eng_sentences.tsv.bz2' }], FORCE);
writeFileSync(join(RAW, 'fetched.json'), JSON.stringify({ fetchedAt: localDate(new Date()), freqSha: FREQ_SHA, jmdictTag: lang === 'ja' ? JMDICT_TAG : undefined }, null, 2));
console.log('done: raw sources are in', RAW);
