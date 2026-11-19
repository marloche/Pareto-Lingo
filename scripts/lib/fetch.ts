// Shared download helpers for the fetch scripts: download once, unpack .bz2 / .gz / .tgz.
import { createWriteStream, existsSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';

export interface RawFile {
  url: string;
  name: string;
}

function findBzip2(): string {
  const candidates = [
    'bzip2',
    'C:\\Program Files\\Git\\usr\\bin\\bzip2.exe',
    'C:\\Program Files\\Git\\ucrt64\\bin\\bzip2.exe',
    'C:\\Program Files\\Git\\mingw64\\bin\\bzip2.exe',
  ];
  for (const c of candidates) {
    const r = spawnSync(c, ['--help'], { stdio: 'ignore' });
    if (!r.error) return c;
  }
  throw new Error('bzip2 not found. Install Git for Windows (it includes bzip2) or run this from Git Bash.');
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const tmp = `${dest}.part`;
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmp));
  // Rename only after a complete download, so a cut-off file is never mistaken for a good one.
  renameSync(tmp, dest);
}

/** The first file inside a .tar (the archives used here hold one file each). */
function firstTarEntry(tar: Buffer): Buffer {
  const size = parseInt(tar.subarray(124, 136).toString('ascii').replace(/\0/g, '').trim(), 8);
  return tar.subarray(512, 512 + size);
}

/** Downloads each file into `dir` (skipping ones already there unless `force`) and unpacks it. */
export async function fetchAll(dir: string, files: RawFile[], force: boolean): Promise<void> {
  let bzip2: string | undefined;
  for (const f of files) {
    const dest = join(dir, f.name);
    if (existsSync(dest) && !force) {
      console.log(`skip  ${f.name} (already here)`);
    } else {
      process.stdout.write(`fetch ${f.name} … `);
      await download(f.url, dest);
      console.log(`${(statSync(dest).size / 1e6).toFixed(1)} MB`);
    }
    const out = dest.replace(/\.(bz2|gz|tgz)$/, '');
    if (out === dest || (existsSync(out) && !force)) continue;
    process.stdout.write(`unzip ${f.name} … `);
    if (dest.endsWith('.bz2')) {
      bzip2 ??= findBzip2();
      const r = spawnSync(bzip2, ['-dkf', dest], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error(`bzip2 failed on ${dest}`);
    } else {
      const raw = gunzipSync(readFileSync(dest));
      writeFileSync(out, dest.endsWith('.tgz') ? firstTarEntry(raw) : raw);
    }
    console.log(`${(statSync(out).size / 1e6).toFixed(1)} MB`);
  }
}

/** YYYY-MM-DD in local time, so an evening fetch isn't stamped with tomorrow's UTC date. */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
