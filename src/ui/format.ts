// How numbers and dates read on screen.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** How long until a card comes back: "soon", "10 min", "14 h", "8 days", "3 mo", "2 yr". */
export function interval(ms: number, soon = false): string {
  if (soon) return 'soon';
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MIN))} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  const days = Math.round(ms / DAY);
  if (days < 60) return days === 1 ? '1 day' : `${days} days`;
  if (days < 730) return `${Math.round(days / 30.4)} mo`;
  return `${Math.round(days / 365)} yr`;
}

/** 0.5136 → "51.4%". */
export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

/** "1 review", "3 reviews". */
export const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Tuesday, 17 November". */
export const longDate = (d: Date) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** 0 → "midnight", 4 → "4:00 AM". */
export const hourLabel = (h: number) => (h === 0 ? 'midnight' : `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`);

/** Grammar info for a word, as tags: "impf · ↔ захотеть" → ["imperfective", "pair: захотеть"]. */
export function wordTags(pos: string | undefined, info: string | undefined): string[] {
  const tags: string[] = [];
  const POS: Record<string, string> = { noun: 'noun', verb: 'verb', adj: 'adjective', pron: 'pronoun' };
  if (pos && POS[pos]) tags.push(POS[pos]);
  const INFO: Record<string, string> = { m: 'masculine', f: 'feminine', n: 'neuter', pf: 'perfective', impf: 'imperfective', 'indecl.': 'doesn’t change', 'pl only': 'plural only' };
  for (const part of (info ?? '').split(' · ')) {
    const p = part.trim();
    if (!p) continue;
    if (p.startsWith('↔')) tags.push(`pair: ${p.slice(1).trim()}`);
    else if (INFO[p]) tags.push(INFO[p]);
    else if (!tags.includes(p)) tags.push(p);
  }
  return [...new Set(tags)];
}
