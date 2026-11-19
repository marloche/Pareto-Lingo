// Hand-written additions that fill gaps in the OpenRussian data. Everything here is a standard,
// textbook form of a very common word (checked against the unmatched-spellings report the build prints),
// not invented vocabulary. Listed in DATA_SOURCES.md as "hand table".
import type { ExtraWord, PatchInput, Pos } from './ru-data.ts';

/**
 * Changes to words that already exist in OpenRussian, found by their dictionary form: a better English
 * gloss, a display form (должен for должный), extra forms, or removing a data artifact (drop / dropSlots).
 */
export type Patch = PatchInput;

const G = (bare: string, en: string, pos?: Pos): Patch => ({ bare, en, ...(pos ? { pos } : {}) });

export const PATCHES: Patch[] = [
  // есть ("there is", the present of быть) gets its own card: you can't recognise it from быть.
  { bare: 'быть', pos: 'verb', dropSlots: ['presfut_sg1', 'presfut_sg2', 'presfut_sg3', 'presfut_pl1', 'presfut_pl2', 'presfut_pl3'] },
  // It is spelled like есть "to eat", so its examples must be the у меня есть kind.
  { bare: 'есть', pos: 'other', en: 'there is; there are; у меня есть = I have', examplesWith: ['у'] },
  // Glosses for very common words where OpenRussian's English misleads a beginner
  // (grammar labels like "genetive of he", a rare sense listed first, or a stray Uzbek word).
  G('что', 'what; that (conjunction)'),
  G('всё', 'everything; all; still (всё ещё)', 'other'),
  G('мне', '(to) me'),
  G('меня', 'me (genitive / accusative of я)'),
  G('тебя', 'you (object: тебя, of you)'),
  G('тебе', '(to) you'),
  G('его', 'him, it; his, its'),
  G('её', 'her; hers'),
  G('ему', '(to) him, it'),
  G('ей', '(to) her'),
  G('им', '(to) them; (by) him'),
  G('нас', 'us'),
  G('нам', '(to) us'),
  G('вас', 'you (object; plural / polite)'),
  G('вам', '(to) you (plural / polite)'),
  G('чём', '(about) what: о чём'),
  G('она', 'she; it'),
  G('говорить', 'speak; talk; say', 'verb'),
  G('просто', 'just; simply; (it’s) simple'),
  G('хорошо', 'good; well; OK'),
  G('ничего', 'nothing; it’s OK, never mind'),
  G('же', '(emphasis: really, after all); same (тот же)'),
  G('свой', 'one’s own (my, your, his…)', 'adj'),
  G('сам', 'oneself (myself, yourself…); by oneself', 'adj'),
  G('себя', 'oneself (myself, yourself…)'),
  G('у', 'at, by; у меня (есть) = I have'),
  G('ещё', 'still; yet; more, else (ещё раз = once more)'),
  G('куда', 'where (to)'),
  G('порядок', 'order (в порядке = OK)', 'noun'),
  G('смочь', 'be able, manage (perfective of мочь)', 'verb'),
  G('пора', 'time; it’s time (to)', 'noun'),
  G('папа', 'dad', 'noun'),
  G('доктор', 'doctor', 'noun'),
  G('точно', 'exactly; for sure'),
  G('больше', 'more; bigger'),
  G('вот', 'here (is), there (is)'),
  G('там', 'there'),
  G('уже', 'already'),
  G('рад', 'glad (рад, рада, рады)', 'adj'),
  G('то', 'that, it (то, что = what); then (если…, то)'),
  G('на', 'on; at (на работе); to (на работу)'),
  G('к', 'to, towards (+ dative: к тебе)'),
  G('за', 'behind; for (спасибо за…); at (за столом)'),
  G('по', 'along; by, on (по телефону); around (по городу)'),
  G('от', 'from (away from: от дома, от тебя)'),
  G('до', 'until, till; up to; before (до обеда)'),
  G('стать', 'become; begin (to)', 'verb'),
  G('чего', 'what (genitive of что: чего ты хочешь?)'),
  // Future of быть: one card, since буд- is recognisable across the paradigm once learned.
  { bare: 'будет', en: 'will be (future of быть: буду, будешь, будет…)', forms: ['бу\'ду', 'бу\'дешь', 'бу\'дем', 'бу\'дете', 'бу\'дут'] },
  { bare: 'себе', en: '(to) oneself, myself, yourself… (dative of себя)' },
  { bare: 'один', forms: ['одна\'', 'одно\'', 'одни\'', 'одного\'', 'одно\'й', 'одному\'', 'одни\'м', 'одно\'м', 'одну\'', 'одни\'х', 'одни\'ми', 'одно\'ю'] },
  { bare: 'с', forms: ['со'] },
  { bare: 'в', forms: ['во'] },
  { bare: 'год', pos: 'noun', forms: ['го\'ды', 'годо\'в', 'года\'м', 'года\'ми', 'года\'х'] },
  { bare: 'говорить', pos: 'verb', forms: ['говоря\''] },
  { bare: 'наконец', forms: ['наконе\'ц-то'] },
  { bare: 'должный', pos: 'adj', show: 'до\'лжен', en: 'must, have to; to owe (должен, должна, должны)' },
  // Artifacts: a case form listed as its own "adjective" with a wrong gloss ("двух = both").
  { bare: 'двух', pos: 'adj', drop: true },
  { bare: 'два', forms: ['две', 'двух', 'дву\'м', 'двумя\''] },
  { bare: 'три', forms: ['трёх', 'трём', 'тремя\''] },
  { bare: 'оба', forms: ['о\'бе', 'обо\'их', 'обе\'их', 'обо\'им', 'обе\'им', 'обо\'ими', 'обе\'ими'] },
  // рад (glad) has its own entry; the long adjective радостный (joyful) must not swallow its short forms.
  { bare: 'радостный', pos: 'adj', dropSlots: ['short_m', 'short_f', 'short_n', 'short_pl'] },
  // никто / ничто come without case forms, so the archaic adjective никой was taking никого, никому…
  { bare: 'никто', forms: ['никого\'', 'никому\'', 'нике\'м', 'нико\'м'] },
  // Entries that took corpus counts away from the real word (found via the build's "skipped" list):
  // a second перед filed as a noun meaning "before" (the real noun is перёд, "front"), which split the count in half;
  { bare: 'перед', pos: 'noun', drop: true },
  { bare: 'перед', pos: 'other', en: 'in front of; before (+ instrumental)', forms: ['пе\'редо'] },
  // a noun рада glossed "glad": that is the short adjective рад / рада / рады;
  { bare: 'рада', pos: 'noun', drop: true },
  // тем (тем более, тем не менее) as its own word: it is the instrumental of тот and is taught with it;
  { bare: 'тем', pos: 'other', drop: true },
  // мена (barter), which only ranks high because Ukrainian мене (me) turns up in the subtitles;
  { bare: 'мена', pos: 'noun', drop: true },
  // the noun стать (build, figure), which scores only from the idiom «с какой стати» and would show as a second «стать»;
  { bare: 'стать', pos: 'noun', drop: true },
  // a noun а́га "cane toad": the word in use is the interjection ага́ "uh-huh" (added below, with its own stress).
  { bare: 'ага', pos: 'noun', drop: true },
  // Names that look like dictionary words, found by the report's "Possible names" check: Генри "henry",
  // Боб "bean", Мари, Виктория "pine strawberries", Марсель "topsail", Холмс, and том "volume" (the name Том).
  ...['генри', 'боб', 'мари', 'виктория', 'марсель', 'холмс', 'том'].map((bare): Patch => ({ bare, pos: 'noun', drop: true })),
  // ничего is filed as a noun; it is a pronoun / adverb.
  { bare: 'ничего', pos: 'noun', setPos: 'other' },
  // Proper nouns the dictionary writes in lowercase.
  { bare: 'америка', pos: 'noun', show: 'Аме\'рика' },
  { bare: 'китай', pos: 'noun', show: 'Кита\'й' },
  { bare: 'африка', pos: 'noun', show: 'А\'фрика' },
  { bare: 'рождество', pos: 'noun', show: 'Рождество\'' },
  { bare: 'господь', pos: 'noun', show: 'Госпо\'дь' },
  { bare: 'библия', pos: 'noun', show: 'Би\'блия' },
  { bare: 'сми', show: 'СМИ' },
];

const P = (bare: string, accented: string, en: string): ExtraWord => ({ bare, accented, pos: 'other', en, info: 'pronoun' });

/** New words: pronoun forms you can't guess from the base word, so each gets its own card. */
export const EXTRAS: ExtraWord[] = [
  P('мной', 'мной', '(with/by) me (instrumental of я)'),
  P('тобой', 'тобо\'й', '(with/by) you (instrumental of ты)'),
  P('него', 'него\'', 'him, it (after a preposition: у него, для него)'),
  P('нему', 'нему\'', '(to) him, it (after a preposition: к нему)'),
  P('ним', 'ним', 'him, it (с ним); them (к ним)'),
  P('нём', 'нём', 'him, it (о нём)'),
  P('неё', 'неё', 'her (after a preposition: у неё, для неё)'),
  P('ней', 'ней', 'her (after a preposition: с ней, к ней, о ней)'),
  P('них', 'них', 'them (after a preposition: у них, о них)'),
  P('ними', 'ни\'ми', '(with) them (с ними)'),
  P('нами', 'на\'ми', '(with/by) us (instrumental of мы)'),
  P('вами', 'ва\'ми', '(with/by) you (instrumental of вы)'),
  P('собой', 'собо\'й', '(with) oneself, yourself… (instrumental of себя)'),
  P('кого', 'кого\'', 'whom (кто: accusative/genitive)'),
  P('кем', 'кем', '(by) whom, as whom (кто: instrumental)'),
  P('чему', 'чему\'', '(to) what (что: dative)'),
  { bare: 'ага', accented: 'ага\'', pos: 'other', en: 'uh-huh, yeah; aha' },
  { bare: 'наш', accented: 'наш', pos: 'adj', en: 'our, ours', forms: ['на\'ша', 'на\'ше', 'на\'ши', 'на\'шего', 'на\'шей', 'на\'шему', 'на\'шим', 'на\'шем', 'на\'шу', 'на\'ших', 'на\'шими', 'на\'шею'] },
  { bare: 'ваш', accented: 'ваш', pos: 'adj', en: 'your, yours (plural / polite)', forms: ['ва\'ша', 'ва\'ше', 'ва\'ши', 'ва\'шего', 'ва\'шей', 'ва\'шему', 'ва\'шим', 'ва\'шем', 'ва\'шу', 'ва\'ших', 'ва\'шими', 'ва\'шею'] },
  { bare: 'кто-то', accented: 'кто\'-то', pos: 'other', en: 'someone, somebody', forms: ['кого\'-то', 'кому\'-то', 'ке\'м-то', 'ко\'м-то'] },
  { bare: 'кто-нибудь', accented: 'кто\'-нибудь', pos: 'other', en: 'anyone, anybody', forms: ['кого\'-нибудь', 'кому\'-нибудь', 'ке\'м-нибудь', 'ко\'м-нибудь'] },
  { bare: 'какой-то', accented: 'како\'й-то', pos: 'adj', en: 'some (kind of), a certain', forms: ['кака\'я-то', 'како\'е-то', 'каки\'е-то', 'како\'го-то', 'каку\'ю-то', 'каки\'м-то', 'каки\'х-то', 'како\'му-то', 'како\'м-то', 'каки\'ми-то'] },
];

/** Forms added to an existing "-то / -нибудь" word when OpenRussian has it without its case forms. */
export const COMPOUND_FORMS: Record<string, string[]> = {
  'что-то': ['чего\'-то', 'чему\'-то', 'че\'м-то', 'чё\'м-то'],
  'что-нибудь': ['чего\'-нибудь', 'чему\'-нибудь', 'че\'м-нибудь'],
};
