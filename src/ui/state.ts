// What the screens read: the loaded pack, your progress, and the running session. Owned by app.ts.
import type { Example, Item, Pack } from '../core/types.ts';
import type { CardRecord, ReviewEntry, Settings } from '../core/progress.ts';
import type { Srs } from '../core/srs.ts';
import type { Session, Summary } from '../core/session.ts';
import type { Verdict } from '../core/answer.ts';
import type { Matcher } from '../lang/index.ts';
import type { Store } from '../store.ts';
import { ruPlain } from '../lang/ru.ts';

export interface Data {
  pack: Pack;
  byId: Map<string, Item>;
  /** Letters and grammar: how many words come before the item in teaching order. */
  wordsBefore: Map<string, number>;
  /** Position among items of the same kind, 1-based (letter 8 of 33). */
  kindIndex: Map<string, number>;
  kindTotal: Record<string, number>;
  settings: Settings;
  cards: Map<string, CardRecord>;
  log: ReviewEntry[];
  /** Grades cards (spreads due dates a little). */
  srs: Srs;
  /** Shows each grade button's interval (no spreading, so the label is stable). */
  preview: Srs;
  matcher: Matcher;
  store: Store;
}

export type Route = { tab: 'today' } | { tab: 'progress' } | { tab: 'grammar'; id?: string } | { tab: 'settings'; page?: 'sources' };

export interface Run {
  s: Session;
  /** Reading test: the answer side is showing. */
  revealed: boolean;
  /** Typing test: the text typed so far, and the verdict once checked. */
  typed: string;
  verdict?: Verdict;
  /** The verdict was "close" because the dictionary form was typed. */
  dictForm?: boolean;
  /** The verdict was "close" because only the tones were wrong (Chinese pinyin). */
  tonesOff?: boolean;
}

export interface Done {
  summary: Summary;
  coverageBefore: number;
  coverageAfter: number;
  streak: number;
  dueTomorrow: number;
  /** What the new items were: "words", "letter", "items"… */
  newWhat: string;
  /** Words whose typing card this session unlocked. */
  unlocked: string[];
  /** A practice run's title; its summary says nothing was saved. */
  practice?: string;
}

/** Languages the app knows about; a language is offered once its pack exists. */
export const LANGS = [
  { code: 'ru', name: 'Russian', native: 'Русский', ready: true, hello: 'Приве́т!', cheer: 'Отли́чно!' },
  { code: 'ja', name: 'Japanese', native: '日本語', ready: true, hello: 'こんにちは！', cheer: 'よくできました！' },
  { code: 'zh', name: 'Chinese', native: '中文', ready: true, hello: '你好！', cheer: '太棒了！' },
] as const;

export const langInfo = (code: string) => LANGS.find((l) => l.code === code) ?? LANGS[0];

/** Text to read aloud: Russian without stress marks (they can confuse voices), other languages as is. */
export const sayable = (d: Data, text: string) => (d.pack.lang === 'ru' ? ruPlain(text) : text);

/** The example to show for a card, rotating as the card is reviewed so the context varies. */
export function pickExample(item: Item, card: CardRecord | undefined, needFocus = false): Example | undefined {
  const pool = needFocus ? item.examples.filter((e) => e.focus) : item.examples;
  if (!pool.length) return undefined;
  return pool[(card?.srs.reps ?? 0) % pool.length];
}

/**
 * A typing test: the sentence with the gap and the word that fills it (the plain word if no sentence marks
 * it). `accepted` adds the word's reading when the gap is the word itself, so kana or pinyin counts too.
 */
export function writeTask(item: Item, card: CardRecord | undefined): { ex?: Example; answer: string; accepted: string[] } {
  const ex = pickExample(item, card, true);
  const answer = ex?.focus ? ex.text.slice(ex.focus[0], ex.focus[1]) : (item.stressed ?? item.text);
  return { ex, answer, accepted: item.reading && answer === item.text ? [answer, item.reading] : [answer] };
}
