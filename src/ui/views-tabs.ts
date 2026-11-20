// The four tabs (Today, Progress, Grammar, Settings), the Sources page and the app frame around them.
import type { Item } from '../core/types.ts';
import { cardKey, dayKey, shiftDay } from '../core/progress.ts';
import { isKnown } from '../core/srs.ts';
import { coverage, packCurve } from '../core/coverage.ts';
import { reviewsByDay } from '../core/stats.ts';
import { html, type Html } from './html.ts';
import { icon, mascot } from './icons.ts';
import { count, dayLabel, hourLabel, longDate, pct } from './format.ts';
import { pastLessons, topics, TOPIC_RUN } from '../core/practice.ts';
import { exampleCard, ring, tl } from './parts.ts';
import { canSpeak } from './speech.ts';
import { LANGS, langInfo, type Data, type Route } from './state.ts';

const TABS = [
  { tab: 'today', label: 'Today', icon: 'home' },
  { tab: 'progress', label: 'Progress', icon: 'chart' },
  { tab: 'grammar', label: 'Grammar', icon: 'book' },
  { tab: 'settings', label: 'Settings', icon: 'sliders' },
] as const;

/** The frame: sidebar (wide screens) or tab bar (phones), the page, and the session side panel. */
export function frame(d: Data, route: Route, page: Html, opts: { inSession: boolean; right?: Html }): Html {
  const cov = coverage(d.pack.items, d.cards);
  const current = (t: string) => (!opts.inSession && route.tab === t ? 'page' : 'false');
  return html`<div class="app ${opts.inSession ? 'in-session' : 'tabs-on'}">
    <nav class="side" aria-label="Sections">
      <div class="brand">${mascot('happy', 40)}Pareto-Lingo</div>
      ${TABS.map((t) => html`<a class="nav" href="#${t.tab}" aria-current="${current(t.tab)}">${icon(t.icon)}${t.label}</a>`)}
      <div class="cov">${ring(cov.share, 44, false)}<div><b>≈ ${pct(cov.share)}</b><span>everyday ${d.pack.name}</span></div></div>
    </nav>
    <main class="main" id="main">${page}</main>
    ${opts.right ? html`<aside class="rightpanel" aria-label="This session">${opts.right}</aside>` : ''}
    ${opts.inSession ? '' : html`<nav class="tabbar" aria-label="Tabs">${TABS.map((t) => html`<a class="tab" href="#${t.tab}" aria-current="${current(t.tab)}">${icon(t.icon)}${t.label}</a>`)}</nav>`}
  </div>`;
}

const MILESTONES = [100, 250, 500, 1000, 2000, 3000, 4000, 5000];

/** The next milestone above `known` words and the coverage it brings. */
function nextMilestone(d: Data, known: number) {
  const words = d.kindTotal.word ?? 0;
  const next = MILESTONES.find((m) => m > known && m <= words);
  if (!next) return undefined;
  return packCurve(d.pack.items, [next])[0];
}

export interface Plan {
  reviews: number;
  fresh: number;
  minutes: number;
  /** New items left in the pack after today's. */
  moreLeft: boolean;
  /** New items tomorrow: the daily number, or what's left of the pack. */
  newTomorrow: number;
  streak: number;
  /** Today has reviews already (so it counts toward the streak). */
  studiedToday: boolean;
  dueTomorrow: number;
}

export function todayView(d: Data, plan: Plan, now: Date): Html {
  const lang = langInfo(d.pack.lang);
  const cov = coverage(d.pack.items, d.cards);
  const next = nextMilestone(d, cov.known);
  const nextGrammar = d.pack.items.find((i) => i.kind === 'grammar' && !d.cards.has(cardKey(i.id, 'read')));
  const head = html`<div><p class="date">${longDate(now)}</p><h1 class="large" tabindex="-1">Today</h1></div>`;
  const coverCard = html`<div class="card cover">${ring(cov.share)}<div>
      <div class="big">≈ ${pct(cov.share)}</div>
      <p class="sub">of everyday ${d.pack.name} you’d recognize<br>${count(cov.known, 'word')}${next ? html` · next: ${pct(next.share, 0)} at ${next.words.toLocaleString('en-US')}` : ''}</p>
    </div></div>`;

  if (!plan.reviews && !plan.fresh) {
    const tomorrow = [plan.dueTomorrow ? count(plan.dueTomorrow, 'review') : '', plan.newTomorrow ? `${plan.newTomorrow} new` : '']
      .filter(Boolean)
      .join(' and ');
    return html`<div class="view">${head}
      <div class="spacer"></div>
      ${mascot('sleepy', 170, 'mid')}
      <div class="center"><h2 style="font-size:1.6rem;font-weight:900">All done for today</h2>
        <p class="sub" style="margin-top:0.5rem">${tomorrow ? `Come back tomorrow: ${tomorrow}.` : 'Nothing is due tomorrow.'}${plan.streak && plan.studiedToday ? html`<br>Today counts for your ${plan.streak}-day streak.` : ''}</p></div>
      ${coverCard}
      <div class="spacer"></div>
      ${plan.moreLeft ? html`<button class="btn soft" data-act="more">Learn 5 more</button>` : ''}
    </div>`;
  }

  // First visit to this language: no cards yet for its items (other languages may have some).
  const first = ![...d.cards.keys()].some((k) => k.startsWith(`${d.pack.lang}:`));
  const todo = [plan.reviews ? count(plan.reviews, 'review') : '', plan.fresh ? `${plan.fresh} new ${plan.fresh === 1 ? 'one' : 'ones'}` : '']
    .filter(Boolean)
    .join(' and ');
  const bubble = first
    ? d.kindTotal.letter
      ? html`${tl(d, lang.hello)} Let’s start with the alphabet: ${count(plan.fresh, 'letter')} today.`
      : html`${tl(d, lang.hello)} Let’s start with the most common words: ${plan.fresh} today.`
    : html`${tl(d, lang.hello)} ${todo} today.`;
  return html`<div class="view">${head}
    <div class="card hello">${mascot('happy', 78)}<p class="bubble">${bubble}</p></div>
    ${coverCard}
    <div class="card plan">
      <div class="stats3">
        <div><b>${plan.reviews}</b><span>${plan.reviews === 1 ? 'review' : 'reviews'}</span></div>
        <div><b>${plan.fresh}</b><span>new</span></div>
        <div><b>~${plan.minutes}</b><span>${plan.minutes === 1 ? 'minute' : 'minutes'}</span></div>
      </div>
      <button class="btn primary" data-act="start">${icon('play')}Start session</button>
    </div>
    <div class="chips">
      ${plan.streak ? html`<span class="chip lemon caps">${icon('spark')}${plan.streak}-day streak</span>` : ''}
      ${nextGrammar ? html`<span class="chip lav">Next grammar: ${nextGrammar.title}</span>` : ''}
    </div>
  </div>`;
}

/** The Pareto curve of the pack (√ scale on words so the steep start is visible), with you on it. */
function curve(d: Data, known: number, share: number): Html {
  const words = d.kindTotal.word ?? 0;
  const x0 = 34, x1 = 310, y0 = 150;
  const X = (n: number) => x0 + (x1 - x0) * Math.sqrt(n / Math.max(1, words));
  const Y = (s: number) => y0 - 138 * s;
  const marks = [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 3000, 4000, 5000].filter((m) => m <= words);
  const pts = [{ words: 0, share: 0 }, ...packCurve(d.pack.items, marks)];
  const line = pts.map((p) => `${X(p.words).toFixed(1)},${Y(p.share).toFixed(1)}`).join(' ');
  const ticks = [100, 500, 1000, 2000].filter((t) => t < words);
  return html`<svg class="chart" viewBox="0 0 320 172" role="img" aria-label="Coverage curve: ${packCurve(d.pack.items, [100, 1000, words].filter((m) => m <= words)).map((p) => `${p.words.toLocaleString('en-US')} words cover ${pct(p.share, 0)}`).join(', ')}. You know ${known} words.">
    ${[0.25, 0.5, 0.75].map((s) => html`<line class="gridline" x1="${x0}" x2="${x1}" y1="${Y(s)}" y2="${Y(s)}"/><text x="28" y="${Y(s) + 3.5}" text-anchor="end">${pct(s, 0)}</text>`)}
    <line class="gridline" x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}"/>
    <polygon points="${line} ${x1},${y0}" fill="var(--pink)" opacity=".7"/>
    <polyline points="${line}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linejoin="round"/>
    ${ticks.map((t) => html`<text x="${X(t)}" y="165" text-anchor="middle">${t >= 1000 ? `${t / 1000}k` : t}</text>`)}
    <text x="316" y="165" text-anchor="end">${words >= 1000 ? `${Math.round(words / 1000)}k` : words} words</text>
    ${known > 0 ? html`<circle cx="${X(known)}" cy="${Y(share)}" r="6" fill="var(--mint-ink)" stroke="var(--card)" stroke-width="2.5"/>
      <text class="you" x="${Math.min(X(known) + 7, 236)}" y="${Math.min(Y(share) + 21, 140)}">you · ${known.toLocaleString('en-US')} words</text>` : ''}
  </svg>`;
}

export function progressView(d: Data, now: Date): Html {
  const cov = coverage(d.pack.items, d.cards);
  const known = (kind: Item['kind']) => d.pack.items.filter((i) => i.kind === kind && isKnownCard(d, i.id, 'read')).length;
  const typing = [...d.cards.values()].filter((c) => c.mode === 'write' && isKnown(c.srs) && d.byId.has(c.itemId)).length;
  const words = d.kindTotal.word ?? 0;
  const miles = packCurve(d.pack.items, MILESTONES.filter((m) => m <= words).slice(0, 5));
  const byDay = reviewsByDay(d.log, d.settings.dayStartHour);
  const today = dayKey(now, d.settings.dayStartHour);
  const days = Array.from({ length: 28 }, (_, i) => byDay.get(shiftDay(today, i - 27)) ?? 0);
  return html`<div class="view">
    <h1 class="large" tabindex="-1">Progress</h1>
    <div class="card" style="padding:0.875rem 0.875rem 0.5rem">
      <div style="display:flex;align-items:baseline;gap:0.5rem"><b style="font-size:1.875rem;font-weight:900">≈ ${pct(cov.share)}</b><span class="sub">of everyday ${d.pack.name}</span></div>
      ${curve(d, cov.known, cov.share)}
    </div>
    <div class="card mile">
      ${miles.map((m) => html`<div class="${cov.known >= m.words ? 'done' : ''}"><span class="dot">${cov.known >= m.words ? icon('check') : ''}</span>${m.words.toLocaleString('en-US')} words<b>${pct(m.share, 0)}</b></div>`)}
    </div>
    <div class="card mini">
      ${d.kindTotal.letter ? html`<div><b>${known('letter')}/${d.kindTotal.letter}</b><span>letters</span></div>` : ''}
      <div><b>${cov.known.toLocaleString('en-US')}</b><span>words</span></div>
      <div><b>${known('grammar')}/${d.kindTotal.grammar ?? 0}</b><span>grammar</span></div>
      <div><b>${typing}</b><span>typing</span></div>
    </div>
    ${practiceLists(d, now)}
    <div class="card" style="padding:0.75rem 0.875rem">
      <p class="sub" style="margin:0 0 0.5rem">Last 4 weeks</p>
      <div class="heat" role="img" aria-label="Studied on ${days.filter((n) => n > 0).length} of the last 28 days">
        ${days.map((n) => html`<i class="${n >= 20 ? 'l2' : n > 0 ? 'l1' : ''}"></i>`)}
      </div>
    </div>
  </div>`;
}

/** Practice: repeat a past lesson or a topic. Nothing in a practice run is saved. */
function practiceLists(d: Data, now: Date): Html {
  const h = d.settings.dayStartHour;
  const days = pastLessons(d.log, (id) => d.byId.has(id), h, 7);
  const tops = topics(d.pack.items, (k) => d.cards.has(k));
  if (!days.length && !tops.length) return html``;
  const row = (set: string, label: string, meta: string) =>
    html`<button class="li" data-act="practice" data-set="${set}"><span class="ic now">${icon('restart')}</span><span>${label}</span><span class="meta">${meta}</span>${icon('chev', 'chev')}</button>`;
  return html`<p class="group-h" style="margin-top:0.5rem">Practice</p>
    <p class="sub" style="margin:-0.25rem 0 0 0.875rem">Repeat for extra practice. It doesn’t change when cards come back.</p>
    ${days.length
      ? html`<p class="group-h">Past lessons</p>
        <div class="list">${days.map((s) => row(s.id, dayLabel(s.title, now, h), `${count(s.keys.length, 'card')} · ${s.right} right`))}</div>`
      : ''}
    ${tops.length
      ? html`<p class="group-h">By topic</p>
        <div class="list">${tops.map((s) => row(s.id, s.title, s.keys.length > TOPIC_RUN ? `${TOPIC_RUN} of ${s.keys.length} cards` : count(s.keys.length, 'card')))}</div>`
      : ''}`;
}

const isKnownCard = (d: Data, itemId: string, mode: 'read' | 'write') => {
  const c = d.cards.get(cardKey(itemId, mode));
  return !!c && isKnown(c.srs);
};

type GrammarState = 'done' | 'now' | 'lock';
const grammarState = (d: Data, id: string): GrammarState => {
  const c = d.cards.get(cardKey(id, 'read'));
  return !c ? 'lock' : isKnown(c.srs) ? 'done' : 'now';
};

export function grammarView(d: Data): Html {
  const items = d.pack.items.filter((i) => i.kind === 'grammar');
  return html`<div class="view">
    <h1 class="large" tabindex="-1">Grammar</h1>
    <p class="sub" style="margin-top:-0.375rem">${items.length} patterns, each right after the words it needs.</p>
    <div class="list">
      ${items.map((g) => {
        const st = grammarState(d, g.id);
        const at = d.wordsBefore.get(g.id) ?? 0;
        const ic = html`<span class="ic ${st}">${icon(st === 'done' ? 'check' : st === 'now' ? 'dot' : 'lock')}</span>`;
        if (st === 'lock') return html`<div class="li locked">${ic}<span>${g.title}</span><span class="meta">at word ${at}</span></div>`;
        return html`<a class="li" href="#grammar/${encodeURIComponent(g.id)}">${ic}<span>${g.title}</span><span class="meta">${st === 'done' ? `word ${at}` : 'learning'}</span>${icon('chev', 'chev')}</a>`;
      })}
    </div>
  </div>`;
}

export function grammarDetailView(d: Data, id: string): Html {
  const g = d.byId.get(id);
  const back = html`<a class="back" href="#grammar">${icon('back')}Grammar</a>`;
  if (!g || g.kind !== 'grammar') return html`<div class="view">${back}<p class="notice">That pattern isn’t in this pack.</p></div>`;
  if (grammarState(d, id) === 'lock') {
    return html`<div class="view">${back}<h1 class="gtitle" tabindex="-1">${g.title}</h1><p class="notice">This one arrives after word ${d.wordsBefore.get(id) ?? 0}.</p></div>`;
  }
  return html`<div class="view">${back}
    <div><div class="chips"><span class="chip lav caps">Grammar · ${d.kindIndex.get(id)} of ${d.kindTotal.grammar}</span></div><h1 class="gtitle" tabindex="-1">${g.title}</h1></div>
    <p class="note">${g.note}</p>
    <div class="exs">${g.examples.map((e, i) => exampleCard(d, e, i === g.examples.length - 1))}</div>
  </div>`;
}

export function settingsView(d: Data): Html {
  const s = d.settings;
  const lang = langInfo(d.pack.lang);
  const hours = [0, 1, 2, 3, 4, 5, 6];
  return html`<div class="view">
    <h1 class="large" tabindex="-1">Settings</h1>
    <p class="group-h">Language</p>
    <div class="list">
      ${LANGS.map((l) =>
        l.ready
          ? html`<button class="li" data-act="lang" data-lang="${l.code}" aria-pressed="${l.code === d.pack.lang}">${l.name} · <span lang="${l.code}">${l.native}</span>${l.code === d.pack.lang ? html`<span class="val" style="color:var(--mint-ink)">${icon('check')}</span>` : ''}</button>`
          : html`<div class="li locked">${l.name} · <span lang="${l.code}">${l.native}</span><span class="meta">coming</span></div>`,
      )}
    </div>
    <p class="group-h">Study</p>
    <div class="list">
      <div class="li"><span id="npd">New items a day</span><span class="stepper" role="group" aria-labelledby="npd">
        <button data-act="new-dec" aria-label="Fewer new items a day">−</button><b aria-live="polite">${s.newPerDay}</b><button data-act="new-inc" aria-label="More new items a day">+</button>
      </span></div>
      <label class="li" for="day-start">Day starts at<select id="day-start" data-change="day-start">
        ${hours.map((h) => html`<option value="${h}" ${h === s.dayStartHour ? 'selected' : ''}>${hourLabel(h)}</option>`)}
      </select></label>
      <div class="li"><span id="ra">Read aloud</span><button class="switch" role="switch" aria-checked="${s.speak}" aria-labelledby="ra" data-act="speak-toggle"></button></div>
    </div>
    ${!canSpeak(d.pack.tts) ? html`<p class="foot">No ${lang.name} voice on this device yet. iPhone: Settings → Accessibility → Spoken Content → Voices. Windows: Settings → Time &amp; language → Speech → Add voices. Online voices aren’t used, so nothing you study leaves the device.</p>` : ''}
    <p class="group-h">Backup</p>
    <div class="list">
      <button class="li" data-act="export">${icon('down')}Export progress</button>
      <button class="li" data-act="import">${icon('up')}Import progress${icon('chev', 'chev')}</button>
    </div>
    <p class="foot">On iPhone the home-screen app keeps its own storage. Export a file to move or keep your progress.</p>
    <div class="list"><a class="li" href="#settings/sources">Sources &amp; licenses${icon('chev', 'chev')}</a></div>
    <p class="foot">Build ${__BUILD__} UTC · ${d.pack.name} pack ${d.pack.version}</p>
  </div>`;
}

export function sourcesView(d: Data): Html {
  return html`<div class="view">
    <a class="back" href="#settings">${icon('back')}Settings</a>
    <h1 class="large" tabindex="-1">Sources &amp; licenses</h1>
    <p class="sub">The ${d.pack.name} pack is ${d.pack.license}. It is built from:</p>
    <div class="sources">
      ${d.pack.sources.map((s) => html`<div class="card">
        <p><b>${s.url ? html`<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a>` : s.name}</b></p>
        <p class="sub">${s.license} · ${s.usedFor}${s.version ? ` · version ${s.version}` : ''}</p>
      </div>`)}
    </div>
    <p class="foot" style="margin:0">Every example sentence keeps its Tatoeba number, so it can be credited and found at tatoeba.org/sentences/show/&lt;number&gt;.</p>
    <p class="sub">The app</p>
    <div class="sources">
      <div class="card"><p><b>Pareto-Lingo code</b></p><p class="sub">MIT license</p></div>
      <div class="card"><p><b><a href="https://github.com/open-spaced-repetition/ts-fsrs" target="_blank" rel="noopener noreferrer">ts-fsrs</a></b></p><p class="sub">MIT license · review scheduling (FSRS)</p></div>
      <div class="card"><p><b><a href="https://github.com/jakearchibald/idb" target="_blank" rel="noopener noreferrer">idb</a></b></p><p class="sub">ISC license · storage on this device</p></div>
    </div>
  </div>`;
}

export const loadingView = (text: string) =>
  html`<div class="app"><main class="main"><div class="view" style="justify-content:center;min-height:100dvh">${mascot('happy', 110, 'mid')}<p class="hint" role="status">${text}</p></div></main></div>`;

export const errorView = (text: string) =>
  html`<div class="app"><main class="main"><div class="view" style="justify-content:center;min-height:100dvh">${mascot('sleepy', 120, 'mid')}<p class="notice" role="alert">${text}</p><button class="btn primary" data-act="reload">Try again</button></div></main></div>`;
