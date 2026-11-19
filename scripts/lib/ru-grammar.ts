// Core Russian grammar patterns; ORDER at the end sets the teaching order. The titles and notes are
// AI-written (no openly licensed, frequency-ranked grammar list exists) and need a human review; see
// reports/ru-pack.md. Example sentences are not written here: the build picks them from Tatoeba with `find`.
import { ruKey } from '../../src/lang/ru.ts';
import type { Tok } from './ru-tokens.ts';

export interface Pattern {
  id: string;
  title: string;
  note: string;
  /** Dictionary forms that must be introduced first; the pattern is taught right after the last of them. */
  needs: string[];
  /**
   * Returns the word that shows the pattern in a Tatoeba sentence (or undefined if it doesn't).
   * Chosen examples must differ in this word, so three examples show three different cases.
   */
  find: (t: Tok[], text: string) => Tok | undefined;
  /** Examples differ in the focus word's form instead of its dictionary word (for patterns about one word, like свой). */
  byForm?: boolean;
}

const keys = (s: string) => new Set(s.split(' ').map(ruKey));
const isKey = (t: Tok | undefined, set: Set<string>) => !!t && set.has(t.key);
const has = (t: Tok | undefined, ...slots: string[]) => !!t && slots.some((s) => t.slots.has(s));
const PRESFUT = ['sg1', 'sg2', 'sg3', 'pl1', 'pl2', 'pl3'].map((p) => `verb:presfut_${p}`);
const PAST = ['m', 'f', 'n', 'pl'].map((p) => `verb:past_${p}`);
/** The likeliest reading of a word (names have none). */
const main = (t: Tok | undefined) => t?.lemmas[0];
const isVerb = (t: Tok | undefined) => main(t)?.pos === 'verb';
const isNoun = (t: Tok | undefined) => main(t)?.pos === 'noun';
const finite = (t: Tok | undefined) => isVerb(t) && has(t, ...PRESFUT, ...PAST);
const aspect = (t: Tok | undefined) => (main(t)?.info.startsWith('pf') ? 'pf' : main(t)?.info.startsWith('impf') ? 'impf' : '');
const lemmaIs = (t: Tok | undefined, ...bare: string[]) => !!main(t) && bare.includes(main(t)!.bare);
const gender = (t: Tok | undefined) => (isNoun(t) ? main(t)!.info.charAt(0) : '');
const nounNom = (t: Tok | undefined) => isNoun(t) && has(t, 'noun:sg_nom', 'noun:pl_nom');
/** First word satisfying `f`; returns what `f` picks (a focus word) or undefined. */
const scan = (t: Tok[], f: (x: Tok, i: number) => Tok | undefined | false) => {
  for (let i = 0; i < t.length; i++) {
    const r = f(t[i], i);
    if (r) return r;
  }
  return undefined;
};
const short = (t: Tok[], max: number) => t.length <= max && !t.some((x) => x.abbr);
/** The word d places after t[i], if only spaces lie between (so «Привет, мам» doesn't read as one phrase). */
const nx = (t: Tok[], i: number, d = 1): Tok | undefined => {
  for (let k = 1; k <= d; k++) if (!t[i + k]?.joined) return undefined;
  return t[i + d];
};
/** The word before t[i], if only spaces lie between. */
const pv = (t: Tok[], i: number): Tok | undefined => (t[i]?.joined ? t[i - 1] : undefined);
/** A noun for a thing or place, not a person or animal («пошла в отца» means “takes after her father”). */
const inanimate = (t: Tok | undefined) => isNoun(t) && !main(t)!.animate;

const SUBJ = keys('я ты он она оно мы вы они это');
const POSSESSIVE = keys('мой моя моё мои твой твоя твоё наш наша наше ваш ваша ваше его её их');
const OBL_PRON = keys('меня тебя его её нас вас их');
const U_PRON = keys('меня тебя него неё нас вас них');
const BUDU = keys('буду будешь будет будем будете будут');
const QWORDS = keys('кто что где куда когда почему как зачем');
const LOC_PREP = keys('в во на');
const MOTION = ['идти', 'пойти', 'ехать', 'поехать', 'ходить', 'бежать', 'прийти', 'приехать', 'вернуться', 'уйти', 'уехать', 'войти'];
const TWO_FOUR = keys('два две три четыре');
const FIVE_UP = keys('пять шесть семь восемь девять десять двадцать сто много сколько несколько');
const DAT_PRON = keys('мне тебе ему ей нам вам им');
const IMPERSONAL = keys('нравится нравятся нравился нравилась нравилось нужно нужен нужна нужны надо жаль холодно можно нельзя пора');
const WITH = keys('с со');
const INST_PRON = keys('мной тобой ним ней нами вами ними собой');
const MODAL_WORDS = keys('надо нужно можно нельзя должен должна должны');
const MOI: Record<string, string> = { [ruKey('мой')]: 'm', [ruKey('моя')]: 'f', [ruKey('моё')]: 'n' };
/** Verbs whose present tense doesn't follow the regular pattern, so they make poor examples of it. */
const IRREGULAR = ['мочь', 'хотеть', 'есть', 'дать', 'бежать', 'быть', 'жить', 'идти', 'ехать', 'брать', 'звать', 'ждать', 'спать', 'писать'];
const DETERMINERS = ['этот', 'тот', 'мой', 'твой', 'свой', 'наш', 'ваш', 'весь', 'какой', 'такой', 'который', 'один', 'сам', 'самый', 'каждый', 'никакой', 'любой', 'другой', 'какой-то', 'должный'];
/** Regular present of a verb: the form starts with the infinitive's stem and has one of the endings. */
const regularPresent = (x: Tok, infEnd: RegExp, cut: number, endings: RegExp) => {
  const l = main(x);
  return !!l && l.pos === 'verb' && aspect(x) === 'impf' && has(x, ...PRESFUT) && infEnd.test(l.bare)
    && !IRREGULAR.includes(l.bare) && x.key.startsWith(ruKey(l.bare).slice(0, -cut)) && endings.test(x.key);
};

const ALL: Pattern[] = [
  {
    id: 'no-to-be',
    title: 'No “is” in the present',
    note: 'Russian drops am / is / are in the present tense. «Я студент» is simply “I (am a) student”, and «Это мой дом» is “This (is) my house”.',
    needs: ['я', 'это'],
    find: (t, s) => {
      if (!short(t, 4) || t.length < 2 || !isKey(t[0], SUBJ) || t.some(isVerb) || !s.trim().endsWith('.')) return undefined;
      const n = isKey(t[1], POSSESSIVE) ? t[2] : t[1];
      return nounNom(n) && t.slice(1).every((x) => x === n || isKey(x, POSSESSIVE) || main(x)?.pos === 'adj') ? n : undefined;
    },
  },
  {
    id: 'ne',
    title: 'Not: не',
    note: 'Put не right before the word it negates, usually the verb: «Я не знаю» — I don’t know. There is no helper verb like “don’t”.',
    needs: ['не', 'знать'],
    find: (t) => (short(t, 5) ? scan(t, (x, i) => x.key === 'не' && finite(nx(t, i)) && nx(t, i)) : undefined),
  },
  {
    id: 'net-genitive',
    title: 'There’s no…: нет + genitive',
    note: '«Нет» alone means “no”. Followed by a noun it means “there is no …”, and the noun goes into the genitive case: время → «Нет времени» (there’s no time).',
    needs: ['нет', 'время'],
    find: (t) => (short(t, 6) ? scan(t, (x, i) => {
      const n = nx(t, i);
      return x.key === 'нет' && isNoun(n) && has(n, 'noun:sg_gen', 'noun:pl_gen') && !nounNom(n) && n;
    }) : undefined),
  },
  {
    id: 'question-words',
    title: 'Question words',
    note: 'кто who · что what · где where · куда where to · когда when · почему why · как how. Word order stays as in a statement; a yes/no question is just a statement said with rising intonation.',
    needs: ['что', 'кто', 'где', 'почему', 'когда'],
    find: (t, s) => (short(t, 5) && isKey(t[0], QWORDS) && s.trim().endsWith('?') ? t[0] : undefined),
  },
  {
    id: 'u-menya-est',
    title: 'Having: у меня есть',
    note: 'Russian says “at me there is”: у + the person (genitive) + есть + the thing. «У меня есть собака» — I have a dog. Use у тебя, у него, у неё, у нас, у вас, у них for others.',
    needs: ['у', 'меня', 'есть', 'него'],
    find: (t) => (short(t, 6) ? scan(t, (x, i) => x.key === 'у' && isKey(nx(t, i), U_PRON) && nx(t, i, 2)?.key === 'есть' && nx(t, i)) : undefined),
  },
  {
    id: 'gender',
    title: 'Noun gender from the ending',
    note: 'Most nouns show their gender: a consonant ending is masculine (дом), -а / -я is feminine (мама, неделя), -о / -е is neuter (дело, море). Words ending in -ь can be either. мой / моя / моё follow the noun.',
    needs: ['мой', 'дом', 'мама'],
    find: (t) => (short(t, 5) ? scan(t, (x, i) => !!MOI[x.key] && nounNom(nx(t, i)) && gender(nx(t, i)) === MOI[x.key] && nx(t, i)) : undefined),
  },
  {
    id: 'present-e',
    title: 'Present tense: -ю, -ешь, -ет…',
    note: 'Verbs like знать take these endings: я знаю, ты знаешь, он знает, мы знаем, вы знаете, они знают. Learn the я and ты forms of each new verb; the rest follow.',
    needs: ['знать', 'думать'],
    find: (t) => (short(t, 5) ? scan(t, (x) => regularPresent(x, /[ая]ть$/, 2, /(ю|ешь|ет|ем|ете|ют)$/) && x) : undefined),
  },
  {
    id: 'present-i',
    title: 'Present tense: -ю, -ишь, -ит…',
    note: 'The second big group, like говорить: я говорю, ты говоришь, он говорит, мы говорим, вы говорите, они говорят. The ты form tells you which group a verb is in.',
    needs: ['говорить', 'видеть'],
    find: (t) => (short(t, 5) ? scan(t, (x) => regularPresent(x, /[ие]ть$/, 3, /(ишь|ит|им|ите|ят|ат)$/) && x) : undefined),
  },
  {
    id: 'past',
    title: 'Past tense: -л, -ла, -ло, -ли',
    note: 'Drop -ть from the infinitive and add -л. The ending agrees with the subject’s gender and number, not the person: он был, она была, оно было, они были. «Я сказала» is a woman speaking.',
    needs: ['быть', 'сказать'],
    find: (t) => (short(t, 5) ? scan(t, (x) => isVerb(x) && has(x, ...PAST) && x) : undefined),
  },
  {
    id: 'future-budu',
    title: 'Future: буду + infinitive',
    note: 'For an ongoing or repeated action in the future, use буду / будешь / будет … + an imperfective infinitive: «Я буду ждать» — I’ll be waiting. Perfective verbs don’t need it (see aspect).',
    needs: ['будет', 'ждать'],
    find: (t) => (short(t, 6) ? scan(t, (x, i) => isKey(x, BUDU) && isVerb(nx(t, i)) && has(nx(t, i), 'verb:inf') && nx(t, i)) : undefined),
  },
  {
    id: 'aspect',
    title: 'Aspect: делать vs сделать',
    note: 'Most verbs come in pairs. Imperfective (делать) is the process or a habit; perfective (сделать) is one finished result. A perfective verb has no present tense: «Я сделаю» already means “I will do it”.',
    needs: ['делать', 'сделать'],
    find: (t) => (short(t, 5) ? scan(t, (x) => isVerb(x) && has(x, ...PRESFUT) && aspect(x) === 'pf' && x) : undefined),
  },
  {
    id: 'accusative',
    title: 'The object: accusative',
    note: 'The thing or person you act on goes into the accusative. Feminine -а → -у and -я → -ю: мама → «Я люблю маму». Masculine things and neuter nouns don’t change; masculine people take -а: «Я вижу брата».',
    needs: ['любить', 'мама', 'видеть'],
    find: (t) => (short(t, 5) ? scan(t, (x, i) => {
      const n = nx(t, i);
      return finite(x) && isNoun(n) && has(n, 'noun:sg_acc') && /[ую]$/.test(n!.key) && gender(n) === 'f' && n;
    }) : undefined),
  },
  {
    id: 'location',
    title: 'Where: в / на + prepositional',
    note: 'For location, в (in) and на (on, at) take the prepositional case, mostly ending in -е: дом → «в доме», работа → «на работе». Some places take на rather than в: на работе, на улице.',
    needs: ['в', 'на', 'работа'],
    find: (t) => (short(t, 5) ? scan(t, (x, i) => {
      const n = nx(t, i);
      return isKey(x, LOC_PREP) && isNoun(n) && has(n, 'noun:sg_prep') && !has(n, 'noun:sg_acc', 'noun:sg_nom') && /е$/.test(n!.key) && n;
    }) : undefined),
  },
  {
    id: 'direction',
    title: 'Where to: в / на + accusative',
    note: 'With motion the same prepositions take the accusative: «Я иду в школу» (to school) but «Я в школе» (at school). The question words split the same way: где? (where) vs куда? (where to).',
    needs: ['идти', 'школа', 'куда'],
    find: (t) => (short(t, 6) ? scan(t, (x, i) => {
      if (!lemmaIs(x, ...MOTION)) return undefined;
      for (const d of [1, 2]) {
        const n = nx(t, i, d + 1);
        if (isKey(nx(t, i, d), LOC_PREP) && inanimate(n) && has(n, 'noun:sg_acc') && !has(n, 'noun:sg_prep')) return n;
      }
      return undefined;
    }) : undefined),
  },
  {
    id: 'genitive-of',
    title: '“Of”: the genitive',
    note: 'Where English says “of” or “’s”, Russian puts the second noun in the genitive: «машина отца» — father’s car, «конец дня» — the end of the day.',
    needs: ['отец', 'машина', 'конец'],
    find: (t) => (short(t, 6) ? scan(t, (x, i) => {
      const n = nx(t, i);
      return nounNom(x) && isNoun(n) && has(n, 'noun:sg_gen', 'noun:pl_gen') && !nounNom(n) && !has(n, 'noun:sg_acc') && n;
    }) : undefined),
  },
  {
    id: 'numbers',
    title: 'Counting: 2–4 and 5+',
    note: 'After 1 the noun stays as it is (один час). After 2, 3, 4 it takes the genitive singular (два часа). From 5 up, and after много / сколько / несколько, the genitive plural (пять часов, много людей).',
    needs: ['два', 'час', 'много'],
    find: (t) => (short(t, 6) ? scan(t, (x, i) => {
      const n = nx(t, i);
      // The focus is the number, so the examples show 2–4 and 5+ rather than one number three times.
      return isNoun(n) && ((isKey(x, TWO_FOUR) && has(n, 'noun:sg_gen')) || (isKey(x, FIVE_UP) && has(n, 'noun:pl_gen'))) && x;
    }) : undefined),
  },
  {
    id: 'dative-like',
    title: 'Likes and needs: мне нравится, мне нужно',
    note: 'Russian turns these around and puts the person in the dative. «Мне нравится музыка» — music is pleasing to me (I like music). The same goes for мне нужно (I need to), мне жаль (I’m sorry), мне холодно (I’m cold).',
    needs: ['мне', 'нравиться', 'нужно'],
    find: (t) => (short(t, 5) ? scan(t, (x, i) => isKey(x, DAT_PRON) && [nx(t, i), nx(t, i, 2)].find((y) => isKey(y, IMPERSONAL))) : undefined),
  },
  {
    id: 'instrumental-with',
    title: 'With: с + instrumental',
    note: 'с (with) takes the instrumental case: друг → «с другом», мама → «с мамой», я → «со мной». The instrumental alone means “by means of”: «писать ручкой» — to write with a pen.',
    needs: ['с', 'друг', 'мной'],
    find: (t) => (short(t, 5) ? scan(t, (x, i) => {
      const n = nx(t, i);
      return isKey(x, WITH) && ((isNoun(n) && has(n, 'noun:sg_inst', 'noun:pl_inst')) || isKey(n, INST_PRON)) && n;
    }) : undefined),
  },
  {
    id: 'modal-infinitive',
    title: 'Want / can / must + infinitive',
    note: 'хотеть (want), мочь (can), должен (must), надо / нужно (need to), можно (may), нельзя (mustn’t) are followed by the infinitive: «Я хочу спать», «Можно войти?».',
    needs: ['хотеть', 'мочь', 'надо', 'должный'],
    find: (t) => (short(t, 5) ? scan(t, (x, i) => {
      const v = nx(t, i);
      return (lemmaIs(x, 'хотеть', 'мочь') || isKey(x, MODAL_WORDS)) && isVerb(v) && has(v, 'verb:inf') && v!.key !== 'быть' && x;
    }) : undefined),
  },
  {
    id: 'imperative',
    title: 'Commands: -й / -и, polite -те',
    note: 'The command form ends in -й or -и: скажи! (say!), подожди! (wait!), давай! (come on!). Add -те for вы, to be polite or to speak to several people: скажите, подождите.',
    needs: ['сказать', 'подождать'],
    find: (t) => (short(t, 4) ? scan(t, (x) => isVerb(x) && has(x, 'verb:imperative_sg', 'verb:imperative_pl') && !has(x, ...PRESFUT, ...PAST) && x) : undefined),
  },
  {
    id: 'reflexive',
    title: '-ся verbs',
    note: 'Verbs ending in -ся (-сь after a vowel) often turn the action back on the subject or make it happen by itself: мыть (wash something) → мыться (wash oneself), начинать → начинаться (to begin). Many just have to be learned as they are: бояться (to fear), нравиться (to please).',
    needs: ['нравиться', 'казаться'],
    find: (t) => (short(t, 5) ? scan(t, (x) => isVerb(x) && (has(x, ...PRESFUT, ...PAST, 'verb:inf')) && /(ся|сь)$/.test(x.key) && x) : undefined),
  },
  {
    id: 'menya-zovut',
    title: 'Names: меня зовут…',
    note: 'To give your name, say «Меня зовут …» — literally “they call me …”. Ask with «Как тебя зовут?» (or «Как вас зовут?» to be polite).',
    needs: ['меня', 'звать', 'как'],
    find: (t) => (short(t, 5) ? scan(t, (x, i) => x.key === 'зовут' && isKey(pv(t, i), OBL_PRON) && pv(t, i)) : undefined),
  },
  {
    id: 'ty-vy',
    title: 'ты and вы',
    note: 'ты is “you” for one friend, child or family member. вы is for several people, and for one person you speak to politely (strangers, elders, at work). Verbs agree: ты знаешь / вы знаете.',
    needs: ['ты', 'вы'],
    find: (t) => (short(t, 5) && t.some((x) => x.key === 'вы') ? scan(t, (x) => isVerb(x) && has(x, 'verb:presfut_pl2', 'verb:imperative_pl') && x) : undefined),
  },
  {
    id: 'adjective-agreement',
    title: 'Adjectives agree with nouns',
    note: 'Adjectives change their ending to match the noun’s gender and number: новый дом, новая машина, новое дело, новые друзья.',
    needs: ['новый', 'хороший', 'машина'],
    find: (t) => (short(t, 5) ? scan(t, (x, i) => {
      const a = main(x);
      const n = nx(t, i);
      if (!a || a.pos !== 'adj' || DETERMINERS.includes(a.bare) || !isNoun(n) || !has(n, 'noun:sg_nom')) return undefined;
      const g = gender(n);
      const ok = (has(x, 'adj:decl_m_nom') && g === 'm') || (has(x, 'adj:decl_f_nom') && g === 'f') || (has(x, 'adj:decl_n_nom') && g === 'n');
      return ok ? x : undefined;
    }) : undefined),
  },
  {
    id: 'chtoby',
    title: 'In order to: чтобы',
    note: 'чтобы + infinitive means “in order to”: «Я пришёл, чтобы помочь». With a different subject it takes the past tense: «Я хочу, чтобы ты знал» — I want you to know.',
    needs: ['чтобы'],
    find: (t) => (short(t, 7) ? scan(t, (x, i) => {
      if (x.key !== 'чтобы') return undefined;
      const a = nx(t, i);
      const b = nx(t, i, 2);
      return (isVerb(a) && has(a, 'verb:inf') && a) || (isVerb(b) && has(b, ...PAST) && b);
    }) : undefined),
  },
  {
    id: 'by-would',
    title: 'Would: бы',
    note: 'бы + past tense makes “would”: «Я бы хотел …» — I would like … . With если it makes an unreal condition: «Если бы я знал …» — if I had known …',
    needs: ['бы', 'хотеть'],
    find: (t) => (short(t, 6) ? scan(t, (x, i) => {
      if (x.key !== 'бы') return undefined;
      const a = nx(t, i);
      const b = pv(t, i);
      return (isVerb(a) && has(a, ...PAST) && a) || (isVerb(b) && has(b, ...PAST) && b);
    }) : undefined),
  },
  {
    id: 'svoy',
    title: 'One’s own: свой',
    note: 'свой means “one’s own” and points back to the subject, whoever it is: «Он любит свою работу» — he loves his (own) job. «его работу» would be someone else’s.',
    needs: ['свой'],
    byForm: true,
    find: (t) => (short(t, 6) ? scan(t, (x, i) => lemmaIs(x, 'свой') && isNoun(nx(t, i)) && x) : undefined),
  },
  {
    id: 'idti-hodit',
    title: 'Going: идти vs ходить',
    note: 'идти is one trip in one direction, now: «Я иду домой». ходить is a habit or a round trip: «Я хожу в школу» (I go to school, regularly). Driving splits the same way: ехать / ездить.',
    needs: ['идти', 'ходить'],
    byForm: true,
    find: (t) => (short(t, 6) ? scan(t, (x) => lemmaIs(x, 'ходить', 'ездить') && has(x, ...PRESFUT) && x) : undefined),
  },
];

/** Pattern k (0-based) is taught no earlier than word GRAMMAR_SPACING × k, and after the words it needs. */
export const GRAMMAR_SPACING = 15;

/**
 * Teaching order, beginner to intermediate. With the spacing rule this spreads grammar over the first
 * few hundred words, and advanced patterns (бы, чтобы) wait their turn even though their words are common.
 */
const ORDER = [
  'no-to-be', 'ne', 'question-words', 'ty-vy', 'present-e', 'gender', 'u-menya-est', 'past',
  'net-genitive', 'modal-infinitive', 'present-i', 'accusative', 'location', 'future-budu', 'aspect',
  'menya-zovut', 'dative-like', 'instrumental-with', 'imperative', 'adjective-agreement', 'direction',
  'genitive-of', 'numbers', 'reflexive', 'svoy', 'idti-hodit', 'chtoby', 'by-would',
];
if (ORDER.length !== ALL.length || new Set(ORDER).size !== ALL.length) throw new Error('ORDER must list every grammar pattern exactly once');

export const PATTERNS: Pattern[] = ORDER.map((id) => {
  const p = ALL.find((x) => x.id === id);
  if (!p) throw new Error(`ORDER names an unknown grammar pattern: ${id}`);
  return p;
});
