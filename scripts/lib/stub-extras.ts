// Hand table for the Japanese and Chinese starter packs. Only two kinds of entry, each with a reason:
// PICK chooses which dictionary entry a written form means when the dictionary has several readings,
// and SKIP drops a frequency-list token that is not a word on its own. Never invented vocabulary.

export interface Pick {
  /** Kana (ja) or pinyin with tone numbers and no spaces (zh), as the build prints the options. */
  key: string;
  why: string;
  /** Replaces the dictionary's meanings when they lead with a rare sense. */
  gloss?: string[];
}

export const PICK: Record<'ja' | 'zh', Record<string, Pick>> = {
  ja: {
    私: { key: 'わたし', why: 'the standard word for "I"; あたし is a casual variant' },
    何: { key: 'なに', why: 'the dictionary form; なん is the same word before d-, t- and n- sounds' },
    人: { key: 'ひと', why: '"person"; じん and にん are suffixes (日本人, 三人), never alone' },
    君: { key: 'きみ', why: '"you"; くん is the name suffix, written after a name, never alone' },
  },
  zh: {
    的: { key: 'de5', why: 'the particle; the other readings only occur inside rarer words' },
    了: { key: 'le5', why: 'the particle; liǎo "to understand" is mostly inside 了解' },
    吗: { key: 'ma5', why: 'the yes-no question particle; má "what?" is colloquial and rare' },
    好: { key: 'hao3', why: '"good"; hào "to be fond of" is mostly inside other words' },
    吧: { key: 'ba5', why: 'the suggestion particle; bā "bar" is a loanword' },
    这: { key: 'zhe4', why: 'the standard reading; zhèi is a colloquial variant', gloss: ['this; these'] },
    说: { key: 'shuo1', why: '"to say"; shuì "to persuade" is literary' },
    都: { key: 'dou1', why: '"all; both"; dū "capital city" is mostly inside place names' },
  },
};

export const SKIP: Record<'ja' | 'zh', Record<string, string>> = {
  ja: {
    言: 'the stem of 言う "to say", cut off by the word splitter',
    行: 'the stem of 行く "to go", cut off by the word splitter',
    よう: 'mostly the "let\'s" ending of verbs (捨てよう "let\'s throw it out"), cut off by the word splitter',
    って: 'mostly the て-form ending of verbs (下がって "step back"), cut off by the word splitter',
    じゃ: 'mostly the じゃ of じゃない "is not", which the word splitter cut in two',
  },
  zh: {},
};
