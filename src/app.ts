// The app: loads the pack and your progress, draws the screen for the current tab or session step, and
// handles taps and keys. Screens are plain functions of the state below (src/ui/views-*.ts); every
// change redraws the screen, then focus goes to where a screen reader should start.
import type { Item, Pack } from './core/types.ts';
import { pastLessons, practiceSteps, topics, TOPIC_RUN } from './core/practice.ts';
import { GOOD, makeSrs, type Grade } from './core/srs.ts';
import { cardKey, dayKey, ymd, type CardRecord, type ReviewEntry, type Settings } from './core/progress.ts';
import { buildSession, newToday } from './core/queue.ts';
import { gradeCard } from './core/study.ts';
import { checkAnswer, VERDICT_GRADE } from './core/answer.ts';
import { coverage } from './core/coverage.ts';
import { forecast, streak } from './core/stats.ts';
import { backupName, makeBackup, readBackup, type Backup } from './core/backup.ts';
import { canGoBack, stepBack, currentStep, estimateMinutes, introSeen, isOver, planCounts, startSession, summarize, testGraded, testedNew, type Session } from './core/session.ts';
import { matcherFor } from './lang/index.ts';
import { openStore, type Store } from './store.ts';
import type { Html } from './ui/html.ts';
import { injectSprite } from './ui/icons.ts';
import { count, dayLabel } from './ui/format.ts';
import { canSpeak, initSpeech, speak, unlockSpeech } from './ui/speech.ts';
import { openFile, saveFile } from './ui/files.ts';
import { errorView, frame, grammarDetailView, grammarView, loadingView, progressView, settingsView, sourcesView, todayView, type Plan } from './ui/views-tabs.ts';
import { sessionPanel, sessionView, summaryView } from './ui/views-session.ts';
import { LANGS, langInfo, pickExample, sayable, writeTask, type Data, type Done, type Route, type Run } from './ui/state.ts';

let root: HTMLElement;
let store: Store;
let d: Data | undefined;
let route: Route = { tab: 'today' };
let run: Run | undefined;
let done: Done | undefined;
/** "Learn 5 more" raises today's cap on new items. Kept in memory only: it is for this sitting. */
let moreCap = { day: '', n: 0 };
/** Words whose typing card this session unlocked, for the summary. */
let unlocked: string[] = [];

/* ---------- Loading ---------- */

export async function boot(el: HTMLElement): Promise<void> {
  root = el;
  injectSprite();
  initSpeech();
  makeToast();
  listen();
  paint(loadingView('Loading…'));
  try {
    store = await openStore();
  } catch {
    paint(errorView('This browser won’t let the app keep your progress: its storage is blocked (private browsing can do this).'));
    return;
  }
  await load();
}

/** Reads settings and progress, fetches the language pack, and shows the current route. */
async function load(): Promise<void> {
  const settings = await store.settings();
  let pack: Pack;
  try {
    const res = await fetch(`./packs/${settings.lang}/pack.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pack = (await res.json()) as Pack;
  } catch {
    paint(errorView(`The ${langInfo(settings.lang).name} pack didn’t load. Check the connection, then try again.`));
    return;
  }
  const [cards, log, srs, preview] = await Promise.all([store.cards(), store.log(), makeSrs(settings.retention, true), makeSrs(settings.retention, false)]);
  d = { pack, ...indexPack(pack), settings, cards, log, srs, preview, matcher: matcherFor(pack.matcher), store };
  // Ask the browser not to clear progress when space runs low (granted quietly, or not, by most browsers).
  navigator.storage?.persist?.().catch(() => undefined);
  route = parseHash(location.hash);
  show();
}

function indexPack(pack: Pack) {
  const byId = new Map<string, Item>();
  const wordsBefore = new Map<string, number>();
  const kindIndex = new Map<string, number>();
  const kindTotal: Record<string, number> = {};
  let words = 0;
  for (const i of pack.items) {
    byId.set(i.id, i);
    kindTotal[i.kind] = (kindTotal[i.kind] ?? 0) + 1;
    kindIndex.set(i.id, kindTotal[i.kind]);
    if (i.kind === 'word') words++;
    else wordsBefore.set(i.id, words);
  }
  return { byId, wordsBefore, kindIndex, kindTotal };
}

/** Cards of the language in use (progress in other languages stays stored, untouched). */
const packCards = (data: Data): CardRecord[] => [...data.cards.values()].filter((c) => data.byId.has(c.itemId));

/* ---------- Routes and drawing ---------- */

function parseHash(hash: string): Route {
  const [tab = '', rest] = hash.replace(/^#/, '').split('/');
  if (tab === 'progress') return { tab };
  if (tab === 'grammar') {
    if (!rest) return { tab };
    try {
      return { tab, id: decodeURIComponent(rest) };
    } catch {
      return { tab };
    }
  }
  if (tab === 'settings') return rest === 'sources' || rest === 'backup' ? { tab, page: rest } : { tab };
  return { tab: 'today' };
}

const paint = (view: Html) => {
  root.innerHTML = view.__html;
};

function render(data: Data): void {
  const now = new Date();
  if (run) paint(frame(data, route, sessionView(data, run, now), { inSession: true, right: sessionPanel(run, now) }));
  else if (done) paint(frame(data, route, summaryView(data, done), { inSession: true }));
  else paint(frame(data, route, tabPage(data, now), { inSession: false }));
}

function tabPage(data: Data, now: Date): Html {
  switch (route.tab) {
    case 'today':
      return todayView(data, plan(data, now).plan, now);
    case 'progress':
      return progressView(data, now);
    case 'grammar':
      return route.id ? grammarDetailView(data, route.id) : grammarView(data);
    case 'settings':
      return route.page === 'sources' ? sourcesView(data) : settingsView(data, now, route.page === 'backup');
  }
}

/**
 * Draws the screen. 'screen': a new screen, so focus moves to its start (a [data-focus] element or the
 * heading). 'keep': the same screen with a value changed, so the focused control keeps focus.
 */
function show(focus: 'screen' | 'keep' = 'screen'): void {
  if (!d) return;
  const keep = focus === 'keep' ? focusedSelector() : undefined;
  render(d);
  if (focus === 'keep') {
    if (keep) root.querySelector<HTMLElement>(keep)?.focus({ preventScroll: true });
    return;
  }
  window.scrollTo(0, 0);
  (root.querySelector<HTMLElement>('[data-focus]') ?? root.querySelector<HTMLElement>('h1'))?.focus({ preventScroll: true });
  if (route.tab === 'settings' && route.page === 'backup') root.querySelector('#backup')?.scrollIntoView({ block: 'center' });
}

/** A selector that finds the focused control again after a redraw. */
function focusedSelector(): string | undefined {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || !root.contains(el)) return undefined;
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (!el.dataset.act) return undefined;
  const lang = el.dataset.lang ? `[data-lang="${CSS.escape(el.dataset.lang)}"]` : '';
  return `[data-act="${CSS.escape(el.dataset.act)}"]${lang}`;
}

/* ---------- Today ---------- */

function plan(data: Data, now: Date): { steps: ReturnType<typeof buildSession>; plan: Plan } {
  const h = data.settings.dayStartHour;
  const today = dayKey(now, h);
  const newPerDay = Math.max(data.settings.newPerDay, moreCap.day === today ? moreCap.n : 0);
  const steps = buildSession(data.pack.items, data.cards, now, { ...data.settings, newPerDay }, data.srs);
  const { reviews, fresh } = planCounts(steps);
  const last = data.log.at(-1);
  const left = data.pack.items.filter((i) => !data.cards.has(cardKey(i.id, 'read'))).length;
  return {
    steps,
    plan: {
      reviews,
      fresh,
      minutes: estimateMinutes(steps, data.log),
      moreLeft: left > 0,
      newTomorrow: Math.min(data.settings.newPerDay, left),
      streak: streak(data.log, now, h),
      studiedToday: !!last && dayKey(last.at, h) === today,
      dueTomorrow: forecast(packCards(data), now, h, 2)[1],
    },
  };
}

/* ---------- Session ---------- */

const freshRun = (s: Session): Run => ({ s, revealed: false, typed: '' });

function start(): void {
  if (!d) return;
  if (d.settings.speak) unlockSpeech(); // must happen inside the tap on iPhone
  const now = new Date();
  const { steps } = plan(d, now);
  if (!steps.length) return show();
  run = freshRun(startSession(steps, now.getTime(), coverage(d.pack.items, d.cards).share));
  done = undefined;
  unlocked = [];
  undos = [];
  show();
  autoSpeak('step');
}

/**
 * Practice a past day's lesson ("day:2026-11-18") or a topic ("topic:letters"). The cards are tested
 * like reviews, but nothing is saved: the schedule stays as it is.
 */
function startPractice(id: string): void {
  if (!d) return;
  if (d.settings.speak) unlockSpeech();
  const data = d;
  const set = [...pastLessons(data.log, (i) => data.byId.has(i), data.settings.dayStartHour, Infinity), ...topics(data.pack.items, (k) => data.cards.has(k))].find((s) => s.id === id);
  if (!set) return toast('Nothing to practice there yet.');
  const isDay = id.startsWith('day:');
  const steps = practiceSteps(set.keys, isDay ? Infinity : TOPIC_RUN);
  const day = isDay ? dayLabel(set.title, new Date(), data.settings.dayStartHour) : '';
  const title = !isDay ? set.title : day === 'Today' || day === 'Yesterday' ? `${day}’s lesson` : `the lesson of ${day}`;
  run = freshRun(startSession(steps, Date.now(), coverage(data.pack.items, data.cards).share, title));
  done = undefined;
  unlocked = [];
  undos = [];
  show();
  autoSpeak('step');
}

function learnMore(): void {
  if (!d) return;
  const now = new Date();
  const h = d.settings.dayStartHour;
  moreCap = { day: dayKey(now, h), n: newToday(packCards(d), now, h) + 5 };
  start();
}

/** Moves to the next step, or to the summary when the session is over. */
function advance(): void {
  if (!run) return;
  run = freshRun(run.s);
  if (isOver(run.s)) return finish();
  show();
  autoSpeak('step');
}

/** Back one step. Going back over a graded card takes the grade back too, so it can be answered again. */
function back(): void {
  if (!d || !run || !canGoBack(run.s)) return;
  undoStep(run.s);
  run = freshRun(run.s);
  show();
}

/** Takes one step of a session back, with its grade (cards, review history, and the database). */
function undoStep(s: Session): void {
  if (!d) return;
  const step = stepBack(s);
  const u = step?.kind === 'test' ? undos.pop() : undefined;
  if (u) {
    for (const [k, c] of u.before) {
      if (c) d.cards.set(k, c);
      else d.cards.delete(k);
    }
    const i = d.log.lastIndexOf(u.entry);
    if (i >= 0) d.log.splice(i, 1);
    if (u.unlocked) unlocked.pop();
    const store = d.store;
    const restore = u.before.flatMap(([, c]) => (c ? [c] : []));
    const remove = u.before.flatMap(([k, c]) => (c ? [] : [k]));
    writes = writes
      .then(() => u.saved)
      .then((id) => store.undoGrade(restore, remove, id))
      .catch(() => toast('Going back couldn’t be saved on this device.'));
  }
}

/**
 * Restarts the lesson from its first card, taking back every answer given in it. Works mid-session and
 * from its summary (until you leave the summary). Earlier sessions are never touched.
 */
function restart(): void {
  const s = run?.s ?? ended;
  if (!d || !s || !canGoBack(s)) return;
  if (!s.practice && !confirm('Restart this lesson? Your answers in it are taken back, and it starts again from the first card.')) return;
  while (canGoBack(s)) undoStep(s);
  s.startedAt = Date.now();
  ended = undefined;
  done = undefined;
  run = freshRun(s);
  show();
  autoSpeak('step');
}

function next(): void {
  if (!run || currentStep(run.s)?.kind !== 'intro') return;
  introSeen(run.s);
  advance();
}

function reveal(): void {
  const step = run && currentStep(run.s);
  if (!run || step?.kind !== 'test' || step.mode !== 'read' || run.revealed) return;
  run.revealed = true;
  show();
  autoSpeak('reveal');
}

/** What a grade changed, so Back can undo it: the cards as they were (undefined = created), and the saved review. */
interface GradeUndo {
  before: [string, CardRecord | undefined][];
  entry: ReviewEntry;
  saved: Promise<number | undefined>;
  unlocked: boolean;
}
let undos: GradeUndo[] = [];
/** The session the summary is showing, kept so it can still be restarted from there. */
let ended: Session | undefined;
/** Database writes run one after another, so an undo never lands before the save it undoes. */
let writes: Promise<unknown> = Promise.resolve();

function grade(g: Grade): void {
  const step = run && currentStep(run.s);
  if (!d || !run || step?.kind !== 'test') return;
  if (step.mode === 'read' ? !run.revealed : !run.verdict) return; // grade only once the answer shows
  const item = d.byId.get(step.itemId);
  if (!item) return;
  const res = gradeCard(d.srs, d.cards, item, step.mode, g, new Date(), d.settings.dayStartHour);
  if (run.s.practice) {
    // Practice: the session still sends a missed card round again, but the grade isn't kept.
    testGraded(run.s, res);
    return advance();
  }
  const before = res.save.map((c): [string, CardRecord | undefined] => [c.key, d!.cards.get(c.key)]);
  for (const c of res.save) d.cards.set(c.key, c);
  d.log.push(res.entry);
  const store = d.store;
  const saved = writes.then(() => store.saveGrade(res)).catch(() => {
    toast('That review couldn’t be saved on this device.');
    return undefined;
  });
  writes = saved;
  undos.push({ before, entry: res.entry, saved, unlocked: !!res.unlocked });
  testGraded(run.s, res);
  if (res.unlocked) unlocked.push(item.stressed ?? item.text);
  advance();
}

/** Typing test: checks the typed word (or, giving up, shows the answer). */
function check(giveUp = false): void {
  const step = run && currentStep(run.s);
  if (!d || !run || step?.kind !== 'test' || step.mode !== 'write') return;
  if (run.verdict) return cont();
  const item = d.byId.get(step.itemId);
  if (!item) return;
  const input = root.querySelector<HTMLInputElement>('#answer');
  const typed = giveUp ? '' : (input?.value ?? run.typed);
  if (!giveUp && !typed.trim()) return input?.focus(); // an empty Enter is not a wrong answer
  const { accepted } = writeTask(item, d.cards.get(cardKey(item.id, 'write')));
  const dictionary = item.stressed ?? item.text;
  const m = d.matcher;
  run.typed = typed;
  run.verdict = checkAnswer(m, typed, accepted, [dictionary]);
  run.dictForm = run.verdict === 'close' && m.key(typed) === m.key(dictionary);
  run.tonesOff = run.verdict === 'close' && !run.dictForm && !!m.loose && accepted.some((a) => m.loose!(a) === m.loose!(typed));
  show();
  autoSpeak('check');
}

const cont = () => {
  if (run?.verdict) grade(VERDICT_GRADE[run.verdict]);
};

const NOUNS: Record<string, [string, string]> = {
  word: ['word', 'words'],
  letter: ['letter', 'letters'],
  grammar: ['pattern', 'patterns'],
  mixed: ['item', 'items'],
};

function finish(): void {
  if (!d || !run) return;
  const s = run.s;
  run = undefined;
  if (!s.first.size) return show(); // ended before grading anything: nothing was saved
  ended = s;
  const now = new Date();
  const h = d.settings.dayStartHour;
  const learned = testedNew(s).map((id) => d!.byId.get(id)?.kind ?? 'mixed');
  const kinds = new Set(learned);
  const [one, many] = NOUNS[kinds.size === 1 ? learned[0] : kinds.size ? 'mixed' : 'word'];
  done = {
    summary: summarize(s, now.getTime()),
    coverageBefore: s.coverageBefore,
    coverageAfter: coverage(d.pack.items, d.cards).share,
    streak: streak(d.log, now, h),
    dueTomorrow: forecast(packCards(d), now, h, 2)[1],
    newWhat: learned.length === 1 ? one : many,
    unlocked,
    ...(s.practice ? { practice: s.practice } : {}),
  };
  show();
}

/** Leaves the session or summary for a tab: Today, or Progress (where practice lives). */
function home(to: 'today' | 'progress' = 'today'): void {
  run = undefined;
  done = undefined;
  ended = undefined;
  const hash = `#${to}`;
  if ((location.hash || '#today') !== hash) {
    location.hash = hash; // hashchange draws the tab
    return;
  }
  route = { tab: to };
  show();
}

/* ---------- Read aloud ---------- */

function say(text: string, quiet = false): void {
  if (!d || !text) return;
  if (!canSpeak(d.pack.tts)) {
    if (!quiet) toast(`No ${d.pack.name} voice on this device yet. Settings says how to add one.`);
    return;
  }
  speak(sayable(d, text), d.pack.tts);
}

/** One player for the letter recordings (bundled with the app, so they work offline). */
const player = typeof Audio === 'undefined' ? undefined : new Audio();
function play(src: string, quiet = false): void {
  if (!player || !src) return;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  player.src = src;
  player.play().catch(() => quiet || toast('That recording couldn’t play.'));
}

/** What read aloud says on the current session screen; never something that gives the answer away. */
function readAloudText(): string | undefined {
  const step = run && currentStep(run.s);
  const item = step && d?.byId.get(step.itemId);
  if (!d || !run || !step || !item) return undefined;
  const card = step.kind === 'test' ? d.cards.get(cardKey(item.id, step.mode)) : undefined;
  if (step.kind === 'test' && step.mode === 'write') return run.verdict ? writeTask(item, card).ex?.text : undefined;
  if (item.kind === 'letter') return step.kind === 'intro' || run.revealed ? item.examples[0]?.text : undefined;
  if (item.kind === 'grammar') return (step.kind === 'intro' ? item.examples[0] : pickExample(item, card))?.text;
  return item.stressed ?? item.text;
}

/** With read aloud on: new words and letters, a word's reading test, and the sentence after a typing check. */
function autoSpeak(on: 'step' | 'reveal' | 'check'): void {
  const step = run && currentStep(run.s);
  const item = step && d?.byId.get(step.itemId);
  if (!d?.settings.speak || !step || !item) return;
  const now =
    on === 'check' ||
    (on === 'reveal' && item.kind === 'letter') ||
    (on === 'step' && item.kind !== 'grammar' && (step.kind === 'intro' || (step.mode === 'read' && item.kind === 'word')));
  // Letters play their recorded name; other items are read by the device voice.
  if (now && item.kind === 'letter' && item.audio && (step.kind === 'intro' || run!.revealed)) return play(item.audio, true);
  const text = now ? readAloudText() : undefined;
  if (text) say(text, true);
}

/* ---------- Settings and backup ---------- */

async function saveSettings(patch: Partial<Settings>): Promise<void> {
  if (!d) return;
  d.settings = { ...d.settings, ...patch };
  show('keep');
  try {
    await d.store.saveSettings(d.settings);
  } catch {
    toast('That setting couldn’t be saved on this device.');
  }
}

async function switchLang(code: string): Promise<void> {
  if (!d || code === d.pack.lang || !LANGS.some((l) => l.code === code && l.ready)) return;
  await store.saveSettings({ ...d.settings, lang: code });
  paint(loadingView(`Loading ${langInfo(code).name}…`));
  await load();
}

async function exportProgress(): Promise<void> {
  if (!d) return;
  const now = new Date();
  const name = backupName(now);
  if (!(await saveFile(name, JSON.stringify(makeBackup(d.settings, d.cards.values(), d.log, now))))) return;
  toast(`Saved ${name}`);
  await saveSettings({ lastBackup: now.getTime() }); // ends the reminder until new answers are a week old
}

async function importProgress(): Promise<void> {
  if (!d) return;
  const text = await openFile();
  if (text === undefined) return;
  let b: Backup;
  try {
    b = readBackup(text);
  } catch (e) {
    toast((e as Error).message);
    return;
  }
  const at = new Date(b.exportedAt);
  const from = Number.isNaN(at.getTime()) ? '' : ` from ${ymd(at)}`;
  const ok = confirm(
    `Replace all progress on this device with the backup${from}? It has ${count(b.cards.length, 'card')} and ${count(b.log.length, 'review')}. This can’t be undone.`,
  );
  if (!ok) return;
  try {
    // The imported progress is exactly what that file holds, so it counts as backed up from then.
    await store.restore(Number.isNaN(at.getTime()) ? b : { ...b, settings: { ...b.settings, lastBackup: at.getTime() } });
  } catch {
    toast('The backup couldn’t be written to this device’s storage. Nothing was changed.');
    return;
  }
  run = undefined;
  done = undefined;
  await load();
  toast('Progress imported.');
}

/* ---------- Toast ---------- */

let toastEl: HTMLElement | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function makeToast(): void {
  toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.hidden = true;
  document.body.append(toastEl);
}

const hideToast = () => {
  if (toastEl) toastEl.hidden = true;
};

/** A short message at the bottom; with an action, a button too (and it stays longer). */
export function toast(text: string, action?: { label: string; run: () => void }): void {
  if (!toastEl) return;
  const msg = document.createElement('span');
  msg.textContent = text;
  toastEl.replaceChildren(msg);
  if (action) {
    const b = document.createElement('button');
    b.textContent = action.label;
    b.addEventListener('click', () => {
      hideToast();
      action.run();
    });
    toastEl.append(b);
  }
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 15_000 : 4_000);
}

/* ---------- Events ---------- */

function listen(): void {
  root.addEventListener('click', onClick);
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.dataset.change === 'day-start') void saveSettings({ dayStartHour: Number(t.value) });
  });
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (run && t.id === 'answer') run.typed = t.value;
  });
  root.addEventListener('submit', (e) => {
    if ((e.target as HTMLElement).dataset.form !== 'answer') return;
    e.preventDefault();
    check();
  });
  document.addEventListener('keydown', onKey);
  addEventListener('hashchange', () => {
    run = undefined;
    done = undefined;
    route = parseHash(location.hash);
    show();
  });
  // Back in the app after a while (the study day may have turned over): refresh the numbers.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !run && !done) show('keep');
  });
}

function onClick(e: MouseEvent): void {
  const t = e.target as Element;
  const link = t.closest<HTMLAnchorElement>('a[href^="#"]');
  if (link && root.contains(link)) {
    // A link to the address already showing fires no hashchange: leave the session here instead.
    if ((run || done) && link.getAttribute('href') === (location.hash || '#today')) {
      e.preventDefault();
      run = undefined;
      done = undefined;
      show();
    }
    return;
  }
  const el = t.closest<HTMLElement>('[data-act]');
  if (el && root.contains(el)) act(el.dataset.act ?? '', el);
}

function act(name: string, el: HTMLElement): void {
  const s = d?.settings;
  switch (name) {
    case 'start':
      return start();
    case 'more':
      return learnMore();
    case 'practice':
      return startPractice(el.dataset.set ?? '');
    case 'next':
      return next();
    case 'reveal':
      return reveal();
    case 'grade': {
      const g = Number(el.dataset.g);
      if (g >= 1 && g <= 4) grade(g as Grade);
      return;
    }
    case 'giveup':
      return check(true);
    case 'continue':
      return cont();
    case 'override':
      return grade(GOOD);
    case 'speak':
      return say(el.dataset.say ?? '');
    case 'play':
      return play(el.dataset.src ?? '');
    case 'back':
      return back();
    case 'restart':
      return restart();
    case 'end':
      return finish();
    case 'home':
      return home(el.dataset.to === 'progress' ? 'progress' : 'today');
    case 'lang':
      return void switchLang(el.dataset.lang ?? '');
    case 'new-dec':
      if (s) void saveSettings({ newPerDay: Math.max(1, s.newPerDay - 1) });
      return;
    case 'new-inc':
      if (s) void saveSettings({ newPerDay: Math.min(50, s.newPerDay + 1) });
      return;
    case 'speak-toggle':
      if (s) void saveSettings({ speak: !s.speak });
      return;
    case 'export':
      return void exportProgress();
    case 'import':
      return void importProgress();
    case 'reload':
      return location.reload();
  }
}

const isEnter = (e: KeyboardEvent) => e.key === 'Enter';
const isGo = (e: KeyboardEvent) => e.key === 'Enter' || e.key === ' ';

/** Keys in a session: Space/Enter next or show answer, 1–4 grade, Enter continue, R read aloud, Esc end. */
function onKey(e: KeyboardEvent): void {
  if (!d || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const t = e.target as HTMLElement;
  const field = t.matches('input, select, textarea');
  const control = field || t.matches('button, a[href], [role="switch"]');
  if (done) {
    if (e.key === 'Escape' || (isEnter(e) && !control)) {
      e.preventDefault();
      home();
    }
    return;
  }
  const step = run && currentStep(run.s);
  if (!run || !step) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    return finish();
  }
  if (field) return; // typing an answer: Enter submits the form, Backspace deletes
  if (e.key === 'Backspace') {
    e.preventDefault();
    return back();
  }
  if (e.key.toLowerCase() === 'r') {
    e.preventDefault();
    const item = d.byId.get(step.itemId);
    if (item?.kind === 'letter' && item.audio && (step.kind === 'intro' || run.revealed)) return play(item.audio);
    const text = readAloudText();
    if (text) say(text);
    return;
  }
  if (control && isGo(e)) return; // the focused button handles its own Enter and Space
  if (step.kind === 'intro') {
    if (isGo(e)) {
      e.preventDefault();
      next();
    }
    return;
  }
  if (step.mode === 'read' && !run.revealed && isGo(e)) {
    e.preventDefault();
    reveal();
  } else if (step.mode === 'read' && run.revealed && /^[1-4]$/.test(e.key)) {
    e.preventDefault();
    grade(Number(e.key) as Grade);
  } else if (step.mode === 'write' && run.verdict && isEnter(e)) {
    e.preventDefault();
    cont();
  }
}
