import { describe, expect, it } from 'vitest';
import { matcherFor } from '../lang/index.ts';
import { AGAIN, GOOD, HARD } from './srs.ts';
import { VERDICT_GRADE, checkAnswer, editDistance } from './answer.ts';

const ru = matcherFor('ru');

describe('typed answers', () => {
  it('ignores stress marks, ё/е, case, spaces and punctuation', () => {
    expect(checkAnswer(ru, 'Знаю', ['зна́ю'])).toBe('right');
    expect(checkAnswer(ru, 'еще', ['ещё'])).toBe('right');
    expect(checkAnswer(ru, ' знаю! ', ['знаю'])).toBe('right');
  });

  it('a one-letter slip in a word of 4+ letters is close; short words must be exact', () => {
    expect(checkAnswer(ru, 'знаеш', ['знаешь'])).toBe('close');
    expect(checkAnswer(ru, 'мои', ['мой'])).toBe('wrong');
  });

  it('the dictionary form when the sentence needs another form is close', () => {
    expect(checkAnswer(ru, 'знать', ['знаю'], ['знать'])).toBe('close');
  });

  it('Japanese: kana in either script, or the kanji spelling', () => {
    const ja = matcherFor('ja');
    expect(checkAnswer(ja, 'わたし', ['私', 'わたし'])).toBe('right');
    expect(checkAnswer(ja, 'ワタシ', ['私', 'わたし'])).toBe('right');
    expect(checkAnswer(ja, '私', ['私', 'わたし'])).toBe('right');
    expect(checkAnswer(ja, 'あなた', ['私', 'わたし'])).toBe('wrong');
  });

  it('Chinese: hanzi or pinyin; pinyin without its tones is close', () => {
    const zh = matcherFor('zh');
    expect(checkAnswer(zh, 'zhi1dao4', ['知道', 'zhīdào'])).toBe('right');
    expect(checkAnswer(zh, 'zhīdào', ['知道', 'zhīdào'])).toBe('right');
    expect(checkAnswer(zh, '知道', ['知道', 'zhīdào'])).toBe('right');
    expect(checkAnswer(zh, 'zhidao', ['知道', 'zhīdào'])).toBe('close');
    expect(checkAnswer(zh, 'de5', ['的', 'de'])).toBe('right');
    expect(checkAnswer(zh, 'zhi2dao3', ['知道', 'zhīdào'])).toBe('close');
    expect(checkAnswer(zh, 'shuo1', ['知道', 'zhīdào'])).toBe('wrong');
  });

  it('empty or unrelated answers are wrong', () => {
    expect(checkAnswer(ru, '', ['знаю'])).toBe('wrong');
    expect(checkAnswer(ru, 'кошка', ['знаю'])).toBe('wrong');
  });

  it('edit distance counts inserts, deletes and swaps', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('', 'abc')).toBe(3);
    expect(editDistance('знаю', 'знаю')).toBe(0);
  });

  it('each verdict suggests a grade', () => {
    expect(VERDICT_GRADE).toEqual({ right: GOOD, close: HARD, wrong: AGAIN });
  });
});
