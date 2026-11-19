// Pack format, schema 1. A pack is read-only content shipped as public/packs/<lang>/pack.json.
// Progress never lives in a pack: it joins to items by `id` only, so an id must never change
// between pack builds (ids come from pinned source data; see DATA_SOURCES.md).

export type ItemKind = 'letter' | 'word' | 'grammar';

export interface Example {
  /** Target-language sentence; Russian may carry stress marks (U+0301). */
  text: string;
  /** English translation. */
  en: string;
  /** Provenance, e.g. "tatoeba:5410/1277" (sentence id / translation id). */
  src: string;
  /**
   * Where the word being taught (or the grammar pattern's key word) sits in `text`, as [start, end)
   * UTF-16 offsets: highlighted on reading cards, blanked out on typing cards.
   */
  focus?: [number, number];
}

export interface Item {
  /** Stable id, e.g. "ru:w:verb:сказа'ть", "ru:l:ж", "ru:g:u-menya-est". */
  id: string;
  kind: ItemKind;
  /** 1-based introduction order: the payoff order new items are taught in. */
  order: number;
  /** Plain text without marks: "собака". */
  text: string;
  /** Text with stress marks (U+0301): "соба́ка". */
  stressed?: string;
  /** Japanese kana / Chinese pinyin with tone marks. */
  reading?: string;
  /** noun, verb, adj, other, pron. */
  pos?: string;
  /** Short grammar info: "f", "pf · ↔ говорить". */
  info?: string;
  /** English meanings, most common first. */
  gloss: string[];
  /** Words only: frequency rank (1 = most frequent). */
  rank?: number;
  /** Words only: share of corpus tokens this word accounts for (all forms merged). */
  share?: number;
  examples: Example[];
  /** Grammar and letters: short title, e.g. "Having: у меня есть". */
  title?: string;
  /** Grammar: explanation. Letters: sound hint. */
  note?: string;
}

export interface PackSource {
  name: string;
  url: string;
  license: string;
  usedFor: string;
  version?: string;
}

export interface Pack {
  schema: 1;
  /** "ru" */
  lang: string;
  /** "Russian" */
  name: string;
  /** "Русский" */
  nativeName: string;
  /** Build date, YYYY-MM-DD. */
  version: string;
  /** BCP-47 language for speech synthesis, "ru-RU". */
  tts: string;
  /** Which answer matcher in src/lang to use. */
  matcher: 'ru' | 'ja' | 'zh';
  /** License of the pack data as a whole. */
  license: string;
  /** The corpus the frequencies come from, and its size in tokens (the coverage denominator). */
  corpus: { name: string; tokens: number };
  sources: PackSource[];
  /** Sorted by `order`. */
  items: Item[];
}
