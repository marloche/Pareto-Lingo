# Data sources and licenses

Every piece of language data in this repo, where it comes from, and its license. The Russian pack (`public/packs/ru/pack.json`) is a derived work of CC BY-SA 4.0 sources, so **the pack as a whole is CC BY-SA 4.0**. Each pack also lists its sources inside the file (`sources`), and the app shows them on its About screen.

Raw downloads live in `data/raw/` (git-ignored). `npm run packs:fetch` pins each source to a fixed version, so rebuilding gives the same pack and the same item IDs.

## Russian

| Source | What we use | License | Version pinned |
|---|---|---|---|
| [FrequencyWords](https://github.com/hermitdave/FrequencyWords) by Hermit Dave, built from [OpenSubtitles](https://www.opensubtitles.org) 2018 | `content/2018/ru/ru_full.txt`: how often each spelling appears in film and TV subtitles | Content CC BY-SA 4.0 (code MIT) | commit `525f9b5` |
| [OpenRussian.org](https://en.openrussian.org) dictionary data, via [Badestrand/russian-dictionary](https://github.com/Badestrand/russian-dictionary) | `nouns.csv`, `verbs.csv`, `adjectives.csv`, `others.csv`: dictionary forms, stress marks, English meanings, every inflected form, gender, aspect, animacy | CC BY-SA 4.0 | commit `50e210c` |
| [Tatoeba](https://tatoeba.org) | `rus_sentences`, `eng_sentences`, `rus-eng_links`: example sentences and their English translations | CC BY 2.0 FR (some sentences CC0) | the weekly export of the fetch date, recorded in `data/raw/ru/fetched.json` and in the pack's `sources` |
| [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ru-02-%D0%B1%D1%83%D0%BA%D0%B2%D0%B0-%D0%91.ogg): `Ru-01-буква-А.ogg` … `Ru-33-буква-Я.ogg`, recorded by Cherus | the name of each letter, spoken (converted to mono .m4a with ffmpeg, silence trimmed, volume evened) | CC BY-SA 3.0 | per-file author, license and page in `scripts/lib/ru-letter-audio.json` |
| Pareto-Lingo hand table (`scripts/lib/ru-extras.ts`, `ru-alphabet.ts`, `ru-grammar.ts`) | see below | CC BY-SA 4.0 | this repo |

### How the sources are changed
- **Frequency per dictionary word.** FrequencyWords counts spellings (я, меня and мне are separate rows). Each spelling's count is credited to the OpenRussian word(s) that have it as a form; when a spelling belongs to several words, it is split by how often each word's unambiguous forms appear. Coverage is the sum of the credited shares.
- **Example sentences.** For each word, the build picks the Tatoeba sentence with the fewest words the learner hasn't met yet, and adds stress marks (and ё) to every word whose stress is unambiguous. Each example keeps its Tatoeba IDs in `src` (`tatoeba:<Russian id>/<English id>`), so it can be traced and credited: `https://tatoeba.org/sentences/show/<id>`.
- **Glosses.** English meanings are cut to at most four short senses.

### Hand table
Written for this project and released under CC BY-SA 4.0. It holds only standard textbook facts about very common words, each added to fix a gap or error the build report showed. Nothing here is invented vocabulary.
- **Missing forms:** pronoun forms after prepositions and in the instrumental (него, ней, ними, мной…), the future of быть (буду, будешь…), наш / ваш, case forms of один, два, три, оба, никто, кто-то, что-то.
- **Better English** for very common words whose dictionary gloss misleads a beginner (a grammar label, or a rare sense listed first).
- **Data fixes:** removing duplicate or mis-tagged entries that took counts from the real word (a noun «перед» meaning "before", a noun «рада» meaning "glad", «ага» as "cane toad"…), removing names that look like dictionary words (Генри "henry", Боб "bean"…), capitalising proper nouns written in lowercase, and requiring есть "there is" examples to be the «у меня есть» kind so they aren't "to eat".
- **Alphabet hints:** the sound of each of the 33 letters, in English terms. The "Sound" button has the device voice say a consonant before а (ба), й after а (ай), and vowels on their own; ъ and ь have no sound. No recording of bare letter sounds exists as a full set (Commons has two), so none is used.
- **Letter example words:** picked by the build, not by hand: the most frequent pack word (a noun first, then a verb) with the letter at the start, in the middle and at the end.
- **Grammar notes:** the titles and explanations of the 28 grammar patterns are AI-written and reviewed by the owner. Their example sentences come from Tatoeba, as above.

## Japanese and Chinese starter packs

Each is the 20 most frequent words, with reading, meaning and two example sentences; no script primer or grammar yet. Built by `scripts/build-stub.ts` (`npm run packs:fetch:ja` then `npm run packs:build:ja`, same for `zh`); the human check is `reports/ja-pack.md` and `reports/zh-pack.md`. Both packs are CC BY-SA 4.0.

| Source | License | Used for | Version |
|---|---|---|---|
| [FrequencyWords](https://github.com/hermitdave/FrequencyWords) `2016/ja`, `2018/zh_cn` | CC BY-SA 4.0 | word frequency order | commit `525f9b5` |
| [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project) (EDRDG), via [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) `jmdict-eng-common` | CC BY-SA 4.0 (EDRDG licence) | Japanese readings, meanings, parts of speech | release `3.6.2+20261116213322` |
| [CC-CEDICT](https://cc-cedict.org/wiki/) (MDBG export) | CC BY-SA 4.0 | Chinese pinyin and meanings | download date (published daily, not versioned) |
| [Tatoeba](https://tatoeba.org) `jpn`, `cmn` + English links | CC BY 2.0 FR | example sentences and translations | download date |

What the build does to them, and why:
- **Japanese word order is rough.** Japanese has no spaces, and FrequencyWords split its subtitles into pieces (い, て, っ are pieces, not words). The build keeps only tokens that are common JMdict words, skips single kana, and a hand list (`scripts/lib/stub-extras.ts`) drops verb stems the splitter cut off (言 of 言う, 行 of 行く) and endings (よう, って, じゃ). The 2016 list is used because the 2018 one dropped most kana words (私 is missing from it). A full Japanese pack needs proper word counts first.
- **Readings with several meanings** (的 de / dí / dì, 私 わたし / あたし) are chosen in the same hand list, each with a reason; the build stops if a word has several readings and no choice.
- **Meanings** are the dictionary's, shortened to fit a card: CC-CEDICT notes and cross-references in brackets are dropped.
- **Sentences** are the shortest Tatoeba sentences where the word stands on its own (not inside a longer dictionary word), with an English translation, and without digits, Latin letters or quotation marks. Chinese sentences with traditional characters are left out, since the pack is simplified Chinese.

## Software
Bundled into the app: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT) for scheduling and [idb](https://github.com/jakearchibald/idb) (ISC) for storage.
