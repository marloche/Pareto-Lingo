// Recordings of the 33 Russian letter names from Wikimedia Commons ("Ru-02-буква-Б.ogg" and so on),
// converted to small mono .m4a files that every browser plays, iPhone Safari included.
// Run: node scripts/fetch-letter-audio.ts   (needs ffmpeg on PATH; downloads go to data/raw/commons)
// Writes public/audio/ru/letter-01.m4a … letter-33.m4a and scripts/lib/ru-letter-audio.json (file, author, license, page).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { LETTERS } from './lib/ru-alphabet.ts';

const RAW = 'data/raw/commons';
const OUT = 'public/audio/ru';
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'pareto-lingo-pack-build/1.0 (https://github.com/marloche/Pareto-Lingo)' };
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

const ffmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
if (ffmpeg.error) throw new Error('ffmpeg not found on PATH (winget install Gyan.FFmpeg).');

const titles = LETTERS.map((L, i) => `File:Ru-${String(i + 1).padStart(2, '0')}-буква-${L.upper}.ogg`);
const strip = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

interface Meta { letter: string; file: string; page: string; author: string; license: string; licenseUrl: string }
const meta: Meta[] = [];
for (let k = 0; k < titles.length; k += 20) {
  const batch = titles.slice(k, k + 20);
  const url = `${API}?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&titles=${encodeURIComponent(batch.join('|'))}`;
  const res = (await (await fetch(url, { headers: UA })).json()) as any;
  const pages = Object.values(res.query.pages) as any[];
  const norm = new Map<string, string>((res.query.normalized ?? []).map((n: any) => [n.to, n.from]));
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info) throw new Error(`missing on Commons: ${p.title}`);
    const m = info.extmetadata;
    const title = norm.get(p.title) ?? p.title;
    const i = titles.indexOf(title);
    if (i < 0) throw new Error(`unexpected title ${p.title}`);
    const license = strip(m.LicenseShortName?.value);
    if (!/^(CC BY(-SA)? [34]\.0|CC0|Public domain)/i.test(license)) throw new Error(`${title}: license "${license}" isn't one we can use`);
    const raw = join(RAW, `letter-${String(i + 1).padStart(2, '0')}.ogg`);
    if (!existsSync(raw)) {
      // Commons rate-limits quick downloads (HTTP 429): go slowly and wait it out.
      let r = await fetch(info.url, { headers: UA });
      for (let wait = 5; r.status === 429 && wait <= 80; wait *= 2) {
        console.log(`${title}: rate-limited, waiting ${wait}s`);
        await new Promise((ok) => setTimeout(ok, wait * 1000));
        r = await fetch(info.url, { headers: UA });
      }
      if (!r.ok) throw new Error(`${title}: HTTP ${r.status}`);
      await new Promise((ok) => setTimeout(ok, 1500));
      writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
    }
    const out = join(OUT, `letter-${String(i + 1).padStart(2, '0')}.m4a`);
    // Mono AAC at 48 kb/s, silence trimmed from the start, loudness evened out across the set.
    const c = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,loudnorm=I=-18:TP=-2', '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '48k', '-movflags', '+faststart', out]);
    if (c.status !== 0) throw new Error(`${title}: ffmpeg failed: ${c.stderr}`);
    meta[i] = { letter: LETTERS[i].lower, file: title.slice(5), page: info.descriptionurl, author: strip(m.Artist?.value) || 'unknown', license, licenseUrl: m.LicenseUrl?.value ?? '' };
  }
}
writeFileSync('scripts/lib/ru-letter-audio.json', JSON.stringify(meta, null, 1) + '\n');
const authors = [...new Set(meta.map((m) => m.author))];
const licenses = [...new Set(meta.map((m) => m.license))];
console.log(`wrote ${meta.length} files to ${OUT}; authors: ${authors.join(', ')}; licenses: ${licenses.join(', ')}`);
