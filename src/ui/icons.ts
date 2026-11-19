// SVG sprite: the mochi mascot (happy, cheer, sleepy) and the interface icons, drawn as in the signed-off
// mockups. Colours come from CSS variables, so both themes work. Injected once at startup.
import { html, raw, type Html } from './html.ts';

const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<symbol id="mascot-happy" viewBox="0 0 120 112">
  <path d="M60 24 V10" stroke="var(--stem)" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M60 12 C52 2 40 3 37 10 C45 16 55 16 60 12Z" fill="var(--leaf)"/>
  <path d="M60 12 C68 2 80 3 83 10 C75 16 65 16 60 12Z" fill="var(--leaf)"/>
  <path d="M60 22 C93 22 113 47 113 74 C113 98 91 108 60 108 C29 108 7 98 7 74 C7 47 27 22 60 22Z" fill="var(--mochi)" stroke="var(--mochi-line)" stroke-width="2.5"/>
  <ellipse cx="33" cy="79" rx="9.5" ry="6" fill="var(--blush)"/><ellipse cx="87" cy="79" rx="9.5" ry="6" fill="var(--blush)"/>
  <ellipse cx="44" cy="66" rx="5.5" ry="7" fill="var(--eye)"/><ellipse cx="76" cy="66" rx="5.5" ry="7" fill="var(--eye)"/>
  <circle cx="46" cy="62.5" r="2" fill="#fff"/><circle cx="78" cy="62.5" r="2" fill="#fff"/>
  <path d="M53 79 Q60 86 67 79" stroke="var(--eye)" stroke-width="3" fill="none" stroke-linecap="round"/>
</symbol>
<symbol id="mascot-cheer" viewBox="0 0 120 112">
  <path d="M60 24 V10" stroke="var(--stem)" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M60 12 C50 0 36 1 33 9 C42 16 54 17 60 12Z" fill="var(--leaf)"/>
  <path d="M60 12 C70 0 84 1 87 9 C78 16 66 17 60 12Z" fill="var(--leaf)"/>
  <path d="M60 22 C93 22 113 47 113 74 C113 98 91 108 60 108 C29 108 7 98 7 74 C7 47 27 22 60 22Z" fill="var(--mochi)" stroke="var(--mochi-line)" stroke-width="2.5"/>
  <ellipse cx="32" cy="78" rx="10" ry="6.5" fill="var(--blush)"/><ellipse cx="88" cy="78" rx="10" ry="6.5" fill="var(--blush)"/>
  <path d="M37 67 Q44 58 51 67" stroke="var(--eye)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M69 67 Q76 58 83 67" stroke="var(--eye)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M50 77 Q60 77 70 77 Q68 92 60 92 Q52 92 50 77Z" fill="var(--eye)"/>
  <path d="M54 86 Q60 83 66 86 Q63 91 60 91 Q57 91 54 86Z" fill="var(--blush)"/>
  <path d="M8 40 l4 -9 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4z" fill="#FFD27A"/>
  <path d="M104 30 l3 -7 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3z" fill="#FFD27A"/>
</symbol>
<symbol id="mascot-sleepy" viewBox="0 0 120 112">
  <path d="M60 24 C60 18 64 14 70 12" stroke="var(--stem)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M70 12 C76 4 88 6 90 13 C82 18 74 17 70 12Z" fill="var(--leaf)"/>
  <path d="M60 22 C93 22 113 47 113 74 C113 98 91 108 60 108 C29 108 7 98 7 74 C7 47 27 22 60 22Z" fill="var(--mochi)" stroke="var(--mochi-line)" stroke-width="2.5"/>
  <ellipse cx="33" cy="79" rx="9.5" ry="6" fill="var(--blush)"/><ellipse cx="87" cy="79" rx="9.5" ry="6" fill="var(--blush)"/>
  <path d="M37 66 Q44 72 51 66" stroke="var(--eye)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M69 66 Q76 72 83 66" stroke="var(--eye)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="60" cy="82" rx="4" ry="3.2" fill="var(--eye)"/>
  <path d="M93 28 h8 l-8 9 h8" stroke="var(--ink-soft)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M104 14 h6 l-6 7 h6" stroke="var(--ink-soft)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
<symbol id="i-speaker" viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></symbol>
<symbol id="i-home" viewBox="0 0 24 24"><path d="M3.5 11.2 12 4.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.3H9.2v5.3H5A1.5 1.5 0 0 1 3.5 19z" fill="currentColor"/></symbol>
<symbol id="i-chart" viewBox="0 0 24 24"><path d="M5 19.5v-6M12 19.5V5M19 19.5v-9.5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24"><path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 6.5v13.5" stroke="currentColor" stroke-width="2.2"/></symbol>
<symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 7h9M19 7h1M4 17h3M13 17h7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="16" cy="7" r="2.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="10" cy="17" r="2.6" fill="none" stroke="currentColor" stroke-width="2.2"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" stroke-width="2.4" fill="none"/></symbol>
<symbol id="i-dot" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/></symbol>
<symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 2.5l2.3 7.2 7.2 2.3-7.2 2.3L12 21.5l-2.3-7.2L2.5 12l7.2-2.3z" fill="currentColor"/></symbol>
<symbol id="i-chev" viewBox="0 0 24 24"><path d="M9 5.5l6.5 6.5L9 18.5" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-back" viewBox="0 0 24 24"><path d="M15 5.5L8.5 12l6.5 6.5" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-restart" viewBox="0 0 24 24"><path d="M5.5 12a6.5 6.5 0 1 0 2-4.7M5 4.5v3.8h3.8" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></symbol>
<symbol id="i-down" viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-up" viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</defs></svg>`;

export function injectSprite(): void {
  if (!document.getElementById('mascot-happy')) document.body.insertAdjacentHTML('afterbegin', SPRITE);
}

export type IconName = 'speaker' | 'x' | 'home' | 'chart' | 'book' | 'sliders' | 'check' | 'lock' | 'dot' | 'spark' | 'chev' | 'back' | 'restart' | 'play' | 'down' | 'up';

/** A decorative icon; the button or link around it carries the accessible name. */
export const icon = (name: IconName, cls = ''): Html =>
  html`<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

export type Mood = 'happy' | 'cheer' | 'sleepy';

/** The mascot, `w` pixels wide. Decorative. */
export const mascot = (mood: Mood, w: number, cls = ''): Html =>
  raw(`<svg class="mascot ${cls}" width="${w}" height="${Math.round((w * 112) / 120)}" viewBox="0 0 120 112" aria-hidden="true" focusable="false"><use href="#mascot-${mood}"></use></svg>`);
