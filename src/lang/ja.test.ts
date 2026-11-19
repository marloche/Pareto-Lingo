import { describe, expect, it } from 'vitest';
import { jaKey, kataToHira } from './ja.ts';

describe('Japanese answers', () => {
  it('katakana and hiragana answers match', () => {
    expect(jaKey('カタカナ')).toBe(jaKey('かたかな'));
  });

  it('keeps the long-vowel mark', () => {
    expect(kataToHira('コーヒー')).toBe('こーひー');
  });

  it('ignores full-width letters, spaces and punctuation', () => {
    expect(jaKey('ＡＢＣ　です。')).toBe('abcです');
  });

  it('leaves kanji alone', () => {
    expect(jaKey('日本')).toBe('日本');
  });
});
