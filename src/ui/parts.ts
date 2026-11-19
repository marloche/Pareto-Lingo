// Small pieces shared by the screens.
import type { Example } from '../core/types.ts';
import { html, type Html } from './html.ts';
import { icon } from './icons.ts';
import { sayable, type Data } from './state.ts';

/** Target-language text, tagged with its language so screen readers switch voice. */
export const tl = (d: Data, text: string | Html) => html`<span lang="${d.pack.lang}">${text}</span>`;

/** A sentence with the taught word highlighted, or blanked out for a typing test. */
export function sentence(d: Data, ex: Example, mode: 'mark' | 'blank' = 'mark'): Html {
  if (!ex.focus) return tl(d, ex.text);
  const [a, b] = ex.focus;
  const word = ex.text.slice(a, b);
  const mid =
    mode === 'mark'
      ? html`<mark>${word}</mark>`
      : html`<span class="blank" style="width:${Math.max(3, [...word].length) * 0.62}em" role="img" aria-label="blank"></span>`;
  return tl(d, html`${ex.text.slice(0, a)}${mid}${ex.text.slice(b)}`);
}

/** Round "read aloud" button; app.ts speaks `text` when it is tapped. */
export const speakButton = (d: Data, text: string, small = false) =>
  html`<button class="speak ${small ? 'sm' : ''}" data-act="speak" data-say="${sayable(d, text)}" aria-label="Read aloud">${icon('speaker')}</button>`;

const CREDIT: Record<string, string> = { tatoeba: 'Sentences: Tatoeba (CC BY 2.0 FR)' };

/** Example sentence card: sentence (highlighted) and its translation; `credit` adds where it's from. */
export function exampleCard(d: Data, ex: Example, credit = false): Html {
  const from = credit ? CREDIT[ex.src.split(':')[0]] : undefined;
  return html`<div class="card ex"><p class="ru">${sentence(d, ex)}</p><p class="en">${ex.en}</p>${from ? html`<p class="src">${from}</p>` : ''}</div>`;
}

/** Coverage ring, `share` 0–1. */
export function ring(share: number, size = 96, label = true): Html {
  const c = 2 * Math.PI * 38;
  return html`<svg class="ring" width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <circle cx="48" cy="48" r="38" fill="none" stroke="var(--track)" stroke-width="12"/>
    ${share > 0 ? html`<circle cx="48" cy="48" r="38" fill="none" stroke="var(--primary)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(share * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 48 48)"/>` : ''}
    ${label ? html`<text x="48" y="54" text-anchor="middle" font-size="18" font-weight="900" fill="var(--ink)">${Math.round(share * 100)}%</text>` : ''}
  </svg>`;
}
