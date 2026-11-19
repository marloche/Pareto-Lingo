import { describe, expect, it } from 'vitest';
import { numbersToMarks, zhKey } from './zh.ts';

describe('Chinese answers', () => {
  it('tone marks and tone numbers give the same key', () => {
    expect(zhKey('nǐ hǎo')).toBe('nihao|33');
    expect(zhKey('ni3hao3')).toBe('nihao|33');
    expect(zhKey('Ni3 Hao3')).toBe('nihao|33');
  });

  it('ü can be typed as ü, v or u:', () => {
    expect(zhKey('lǜ')).toBe('lü|4');
    expect(zhKey('lv4')).toBe('lü|4');
    expect(zhKey('lu:4')).toBe('lü|4');
  });

  it('ignores the neutral tone', () => {
    expect(zhKey('māma')).toBe(zhKey('ma1ma5'));
    expect(zhKey('ma1ma')).toBe('mama|1');
  });

  it('a missing or wrong tone does not match', () => {
    expect(zhKey('nihao')).not.toBe(zhKey('ni3hao3'));
    expect(zhKey('ni2hao3')).not.toBe(zhKey('ni3hao3'));
  });

  it('hanzi keys drop spaces and punctuation', () => {
    expect(zhKey('你好！')).toBe('你好');
    expect(zhKey(' 你 好 ')).toBe('你好');
  });

  it('puts tone marks where pinyin puts them', () => {
    expect(numbersToMarks('ni3 hao3')).toBe('nǐ hǎo');
    expect(numbersToMarks('xue2')).toBe('xué');
    expect(numbersToMarks('gou3')).toBe('gǒu');
    expect(numbersToMarks('liu2')).toBe('liú');
    expect(numbersToMarks('gui4')).toBe('guì');
    expect(numbersToMarks('lv4')).toBe('lǜ');
    expect(numbersToMarks('nu:3')).toBe('nǚ');
    expect(numbersToMarks('ma5')).toBe('ma');
    expect(numbersToMarks('Zhong1 guo2')).toBe('Zhōng guó');
  });
});
