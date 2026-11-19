// The study session (new item, reading test, typing test), its side panel on wide screens, and the
// summary at the end. These only draw the current state; app.ts grades and moves on.
import type { Example, Item } from '../core/types.ts';
import { AGAIN, type Grade } from '../core/srs.ts';
import { cardKey, type CardRecord } from '../core/progress.ts';
import { SAME_SESSION_MINUTES } from '../core/study.ts';
import { VERDICT_GRADE } from '../core/answer.ts';
import { canGoBack, currentStep, sessionProgress } from '../core/session.ts';
import { html, raw, type Html } from './html.ts';
import { icon, mascot } from './icons.ts';
import { count, interval, pct, wordTags } from './format.ts';
import { exampleCard, sentence, speakButton } from './parts.ts';
import { langInfo, pickExample, writeTask, type Data, type Done, type Run } from './state.ts';

export const GRADE_LABEL: Record<Grade, string> = { 1: 'Forgot', 2: 'Hard', 3: 'Got it', 4: 'Easy' };
const GRADE_COLOR: Record<Grade, string> = { 1: 'coral', 2: 'lemon', 3: 'mint', 4: 'sky' };
const GRADES: Grade[] = [1, 2, 3, 4];

/** Marks the element that gets focus when a screen opens, so a screen reader starts there. */
const FOCUS = raw(' data-focus tabindex="-1"');
const focusIf = (on: boolean) => (on ? FOCUS : '');

const wordOf = (item: Item) => item.stressed ?? item.text;
const meaningOf = (item: Item) => item.gloss.slice(0, 3).join(' · ');
/** Kana under a kanji word, pinyin under a Chinese word. */
const readingLang = (d: Data) => (d.pack.lang === 'zh' ? 'zh-Latn-pinyin' : d.pack.lang);
const reading = (d: Data, item: Item) => (item.reading ? html`<div class="reading" lang="${readingLang(d)}">${item.reading}</div>` : '');

function progressBar(run: Run): Html {
  const { at, steps } = run.s;
  const w = steps.length ? (100 * at) / steps.length : 0;
  return html`<div class="sessionbar">
    <button class="x back" data-act="back" aria-label="Back one card"${raw(canGoBack(run.s) ? '' : ' disabled')}>${icon('back')}</button>
    <button class="x" data-act="end" aria-label="End session">${icon('x')}</button>
    <div class="bar" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${at}"><i style="width:${w.toFixed(1)}%"></i></div>
    <span aria-hidden="true">${at}/${steps.length}</span>
    <button class="x restart" data-act="restart" aria-label="Restart lesson"${raw(canGoBack(run.s) ? '' : ' disabled')}>${icon('restart')}</button>
  </div>`;
}

/** The big word, with read aloud; `meaning` adds the meaning and grammar tags; `extra` goes inside the card. */
function wordCard(d: Data, item: Item, chips: Html, o: { meaning: boolean; focus: 'word' | 'meaning'; extra?: Html }): Html {
  const tags = o.meaning ? wordTags(item.pos, item.info) : [];
  return html`<div class="card">
    <div class="chips">${chips}</div>
    <div class="wordrow"><div class="word" lang="${d.pack.lang}"${focusIf(o.focus === 'word')}>${wordOf(item)}</div>${speakButton(d, wordOf(item))}</div>
    ${reading(d, item)}
    ${o.meaning ? html`<div class="meaning"${focusIf(o.focus === 'meaning')}>${meaningOf(item)}</div>` : ''}
    ${tags.length ? html`<div class="tags">${tags.map((t) => html`<span>${t}</span>`)}</div>` : ''}
    ${o.extra ?? ''}
  </div>`;
}

const exampleWord = (d: Data, ex: Example) =>
  html`<div class="card exword"><span class="w" lang="${d.pack.lang}">${ex.text}</span>${speakButton(d, ex.text, true)}<span class="en">${ex.en}</span></div>`;

/** Example cards, with the source credit on the last one. */
const examples = (d: Data, list: Example[]) => list.map((e, i) => exampleCard(d, e, i === list.length - 1));

const gotIt = html`<button class="btn primary" data-act="next">Got it</button>`;

function intro(d: Data, run: Run, item: Item): Html {
  const lang = d.pack.lang;
  if (item.kind === 'letter') {
    const ex = item.examples[0];
    return html`<div class="chips"><span class="chip lemon caps">Alphabet · ${d.kindIndex.get(item.id)} of ${d.kindTotal.letter}</span></div>
      <div class="card letter"><div class="glyph" lang="${lang}"${FOCUS}>${item.text}</div><p class="note">${item.note}</p></div>
      ${ex ? exampleWord(d, ex) : ''}
      <div class="spacer"></div>
      ${mascot('happy', 96, 'mid')}
      ${gotIt}`;
  }
  if (item.kind === 'grammar') {
    return html`<div><div class="chips"><span class="chip lav caps">Grammar · ${d.kindIndex.get(item.id)} of ${d.kindTotal.grammar}</span></div><h2 class="gtitle"${FOCUS}>${item.title}</h2></div>
      <p class="note">${item.note}</p>
      <div class="exs">${examples(d, item.examples.slice(0, 3))}</div>
      <div class="spacer"></div>
      ${gotIt}`;
  }
  // How many cards until this word's first test (fewer near the end of a session).
  const { s } = run;
  const test = s.steps.findIndex((x, i) => i > s.at && x.kind === 'test' && x.itemId === item.id);
  const gap = test - s.at - 1;
  const when = test < 0 ? '' : gap <= 0 ? 'comes next' : gap === 1 ? 'comes after the next card' : `comes in ${gap} cards`;
  const chips = html`<span class="chip pink caps">New word</span>${item.rank ? html`<span class="chip caps">#${item.rank} most common</span>` : ''}`;
  return html`${wordCard(d, item, chips, { meaning: true, focus: 'word' })}
    ${examples(d, item.examples.slice(0, 2))}
    <div class="spacer"></div>
    ${when ? html`<p class="hint">A quick check on this one ${when}.</p>` : ''}
    ${gotIt}`;
}

/** Grade buttons, each showing when the card would come back. */
function grades(d: Data, card: CardRecord | undefined, now: Date): Html {
  const base = card?.srs ?? d.preview.newCard(now);
  return html`<p class="hint" id="grade-q">How well did you know it?</p>
    <div class="grades" role="group" aria-labelledby="grade-q">
      ${GRADES.map((g) => {
        const ms = d.preview.review({ ...base }, g, now).dueAt.getTime() - now.getTime();
        const when = interval(ms, g === AGAIN || ms <= SAME_SESSION_MINUTES * 60_000);
        const label = `${GRADE_LABEL[g]}: back ${when === 'soon' ? 'soon' : `in ${when}`}`;
        return html`<button class="g ${GRADE_COLOR[g]}" data-act="grade" data-g="${g}" aria-label="${label}"><kbd aria-hidden="true">${g}</kbd><b>${GRADE_LABEL[g]}</b><small>${when}</small></button>`;
      })}
    </div>`;
}

function readTest(d: Data, run: Run, item: Item, now: Date): Html {
  const lang = d.pack.lang;
  const card = d.cards.get(cardKey(item.id, 'read'));
  const back = run.revealed;
  const kind = run.s.newIds.has(item.id) ? html`<span class="chip pink caps">Quick check</span>` : html`<span class="chip sky caps">Review</span>`;
  const foot = (question: string, show: string) =>
    back
      ? grades(d, card, now)
      : html`${mascot('happy', 120, 'mid')}<p class="hint">${question}</p><button class="btn soft" data-act="reveal">${show}</button>`;

  if (item.kind === 'letter') {
    const ex = item.examples[0];
    return html`<div class="chips"><span class="chip lemon caps">Alphabet</span>${kind}</div>
      <div class="card letter"><div class="glyph" lang="${lang}"${focusIf(!back)}>${item.text}</div>${back ? html`<p class="note"${FOCUS}>${item.note}</p>` : ''}</div>
      ${back && ex ? exampleWord(d, ex) : ''}
      <div class="spacer"></div>
      ${foot('What sound does it make? Think, then check.', 'Show sound')}`;
  }

  const ex = pickExample(item, card);
  if (item.kind === 'grammar') {
    const body = back
      ? html`<h2 class="gtitle"${FOCUS}>${item.title}</h2><p class="note">${item.note}</p>${ex ? exampleCard(d, ex) : ''}`
      : html`<div class="card"><p class="ru"${FOCUS}>${ex ? sentence(d, ex) : ''}</p></div>`;
    return html`<div class="chips"><span class="chip lav caps">Grammar</span>${kind}</div>
      ${body}
      <div class="spacer"></div>
      ${foot('Which pattern is this? Think, then check.', 'Show pattern')}`;
  }

  const inCard = !back && ex ? html`<p class="ru" style="margin-top:1.125rem">${sentence(d, ex)}</p>` : undefined;
  return html`${wordCard(d, item, kind, { meaning: back, focus: back ? 'meaning' : 'word', ...(inCard ? { extra: inCard } : {}) })}
    ${back && ex ? exampleCard(d, ex) : ''}
    <div class="spacer"></div>
    ${foot('What does it mean? Think, then check.', 'Show meaning')}`;
}

function feedback(d: Data, run: Run, item: Item, answer: string): Html {
  const v = run.verdict ?? 'wrong';
  const lang = d.pack.lang;
  const typed = run.typed.trim();
  const head =
    v === 'right' ? html`<b>Right!</b>`
    : v === 'close' ? html`<b>Close!</b> ${run.dictForm ? 'That’s the dictionary form; this sentence needs another form.' : run.tonesOff ? 'Check the tones.' : 'One letter off.'}`
    : typed ? html`<b>Not quite.</b>`
    : html`<b>The answer:</b>`;
  const mine = typed && v !== 'right' ? html`<span class="sr-only">You typed</span><s lang="${lang}">${typed}</s>` : '';
  return html`<div class="feedback ${v}"${FOCUS}>
    ${head}
    <div class="row"><span lang="${lang}">${answer}</span>${item.reading && answer === item.text ? html`<span class="reading" lang="${readingLang(d)}">${item.reading}</span>` : ''}${mine}</div>
    Counted as ${GRADE_LABEL[VERDICT_GRADE[v]]}.
  </div>`;
}

function writeTest(d: Data, run: Run, item: Item): Html {
  const { ex, answer } = writeTask(item, d.cards.get(cardKey(item.id, 'write')));
  const v = run.verdict;
  const lang = langInfo(d.pack.lang);
  return html`<div class="card">
      <div class="chips"><span class="chip mint caps">Type it</span><span class="chip">${meaningOf(item)}</span></div>
      ${ex ? html`<p class="en prompt">${ex.en}</p><p class="ru" style="margin-top:0.625rem">${sentence(d, ex, v ? 'mark' : 'blank')}</p>` : ''}
    </div>
    <form class="answer" id="answer-form" data-form="answer" autocomplete="off">
      <input id="answer" lang="${d.pack.lang}" value="${run.typed}" aria-label="The missing ${lang.name} word" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"${raw(v ? ' readonly' : ' data-focus')}>
      <span class="kb" aria-hidden="true">${d.pack.lang.toUpperCase()} keyboard</span>
    </form>
    ${v ? feedback(d, run, item, answer) : ''}
    <div class="spacer"></div>
    ${v
      ? html`<div class="duo">${v !== 'right' ? html`<button class="link" data-act="override">I was right</button>` : ''}<button class="btn primary" data-act="continue">Continue</button></div>`
      : html`<div class="duo"><button class="link" data-act="giveup">Show answer</button><button class="btn primary" type="submit" form="answer-form">Check</button></div>`}`;
}

export function sessionView(d: Data, run: Run, now: Date): Html {
  const step = currentStep(run.s);
  const item = step && d.byId.get(step.itemId);
  if (!step || !item) return html`<div class="view session">${progressBar(run)}</div>`;
  const body = step.kind === 'intro' ? intro(d, run, item) : step.mode === 'write' ? writeTest(d, run, item) : readTest(d, run, item, now);
  return html`<div class="view session">${progressBar(run)}${body}</div>`;
}

/** Wide screens: this session's numbers and the keyboard keys. */
export function sessionPanel(run: Run, now: Date): Html {
  const p = sessionProgress(run.s);
  const minutes = Math.max(0, Math.round((now.getTime() - run.s.startedAt) / 60_000));
  return html`<h3>This session</h3>
    <div class="split">
      <div><span>Reviews</span><b>${p.reviewsDone} / ${p.reviews}</b></div>
      <div><span>New</span><b>${p.newDone} / ${p.fresh}</b></div>
      <div><span>Time</span><b>${minutes} min</b></div>
    </div>
    <h3 style="margin-top:0.75rem">Keys</h3>
    <div class="keys">
      <div><kbd>Space</kbd>next · show answer</div>
      <div><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd>grade</div>
      <div><kbd>R</kbd>read aloud</div>
      <div><kbd>Enter</kbd>check typed answer</div>
      <div><kbd>⌫</kbd>back one card</div>
      <div><kbd>Esc</kbd>end session</div>
    </div>
    <div class="spacer"></div>
    ${mascot('happy', 110, 'mid')}`;
}

export function summaryView(d: Data, done: Done): Html {
  const s = done.summary;
  const did = [s.reviews ? count(s.reviews, 'review') : '', s.fresh ? `${s.fresh} new` : ''].filter(Boolean).join(' and ');
  const gain = done.coverageAfter - done.coverageBefore;
  const w = (x: number) => `${(Math.min(1, x) * 100).toFixed(1)}%`;
  return html`<div class="view session">
    ${mascot('cheer', 150, 'mid')}
    <div class="center">
      <h1 class="large" lang="${d.pack.lang}"${FOCUS}>${langInfo(d.pack.lang).cheer}</h1>
      <p class="sub" style="margin-top:0.375rem">Session done: ${did || 'nothing graded'} in ${count(s.minutes, 'minute')}.</p>
    </div>
    <div class="tiles">
      <div class="tile sky"><b>${s.reviews}</b><span>${s.reviews === 1 ? 'review' : 'reviews'}${s.remembered === null ? '' : ` · ${Math.round(s.remembered * 100)}% remembered`}</span></div>
      <div class="tile mint"><b>+${s.fresh}</b><span>new ${done.newWhat}</span></div>
      <div class="tile lemon"><b>${count(done.streak, 'day')}</b><span>streak</span></div>
      <div class="tile pink"><b>${done.dueTomorrow}</b><span>due tomorrow</span></div>
    </div>
    ${done.coverageAfter > 0
      ? html`<div class="card gain">
          <div class="row">Everyday ${d.pack.name} you know<span>${gain < 0 ? '−' : '+'}${pct(Math.abs(gain))}</span></div>
          <div class="bar" aria-hidden="true"><i class="new" style="width:${w(done.coverageAfter)}"></i><i style="width:${w(done.coverageBefore)}"></i></div>
          <p class="sub" style="margin-top:0.5rem">${pct(done.coverageBefore)} → ${pct(done.coverageAfter)}</p>
        </div>`
      : ''}
    ${done.unlocked.length
      ? html`<div class="card unlocked">
          <p><b>Typing unlocked</b> for ${count(done.unlocked.length, 'word')}: from now on you also type ${done.unlocked.length === 1 ? 'it' : 'them'} into sentences.</p>
          <p class="ru" lang="${d.pack.lang}">${done.unlocked.slice(0, 8).join(' · ')}${done.unlocked.length > 8 ? ' …' : ''}</p>
        </div>`
      : ''}
    <div class="spacer"></div>
    <button class="btn soft" data-act="restart">Restart this lesson</button>
    <button class="btn primary" data-act="home" style="margin-top:0.625rem">Back to Today</button>
  </div>`;
}
