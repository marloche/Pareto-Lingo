// One answer matcher per pack, chosen by the pack's `matcher` field. A matcher turns text into a key;
// two answers are the same when their keys are equal.
import type { Pack } from '../core/types.ts';
import { ruAnswerKey } from './ru.ts';
import { jaKey } from './ja.ts';
import { zhKey, zhLooseKey } from './zh.ts';

export interface Matcher {
  key(s: string): string;
  /** A looser key: answers equal here but not under `key` are close (Chinese pinyin without its tones). */
  loose?(s: string): string;
}

const MATCHERS: Record<Pack['matcher'], Matcher> = {
  ru: { key: ruAnswerKey },
  ja: { key: jaKey },
  zh: { key: zhKey, loose: zhLooseKey },
};

export const matcherFor = (kind: Pack['matcher']): Matcher => MATCHERS[kind];
