import { describe, expect, it } from 'vitest';
import { apostropheToAccent, ruKey, ruMatches, ruPlain } from './ru.ts';

describe('Russian text', () => {
  it('lookup key drops stress and ё but keeps й', () => {
    expect(ruKey('Соба́ка')).toBe('собака');
    expect(ruKey("соба'ка")).toBe('собака');
    expect(ruKey('ещё')).toBe('еще');
    expect(ruKey('мой')).toBe('мой');
  });

  it('turns OpenRussian apostrophes into stress marks, skipping one-vowel words and ё', () => {
    expect(apostropheToAccent("соба'ка")).toBe('соба́ка');
    expect(apostropheToAccent("до'м")).toBe('дом');
    expect(apostropheToAccent('ещё')).toBe('ещё');
  });

  it('plain form keeps ё and case', () => {
    expect(ruPlain('Соба́ка ещё')).toBe('Собака ещё');
  });

  it('matches answers regardless of stress marks', () => {
    expect(ruMatches('собака', ['соба́ка'])).toBe(true);
    expect(ruMatches('', ['а'])).toBe(false);
  });
});
