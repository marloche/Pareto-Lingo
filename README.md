# Pareto-Lingo

A small language-practice app for phone and computer, built on the Pareto principle: learn the words and grammar that do most of the work first, and measure progress as **coverage**, the share of everyday speech you'd recognize. Russian first, then Japanese and Chinese. It's an installable web app (PWA): it runs full-screen from the iPhone home screen and in a desktop browser, works offline, and needs no account.

**App:** https://marloche.github.io/Pareto-Lingo/

**Status:** Russian works end to end: alphabet, words, grammar, reading and typing tests, progress, offline use and backup (81 unit tests, plus a scripted browser run of every screen). Japanese and Chinese have starter packs (20 words each) to try the app with; not yet tried on an iPhone.

## The method

| Piece | How it works |
|---|---|
| Word order | Words come in order of how often they're used in film and TV subtitles, with all forms of a word counted together (иду, шёл and идти are one word). |
| Coverage | The first 100 words cover about 50% of what's said, 1,000 about 77%, 2,000 about 82%, 5,000 about 88%. The app shows your coverage as you go. |
| Words in context | Every word is taught in a real sentence (from Tatoeba) where nearly every other word is one you already know. |
| Grammar | 28 core patterns (no "is" in the present, не, у меня есть, cases, aspect…), each placed right after the words it needs, with three example sentences. |
| Alphabet | The 33 Cyrillic letters come first, each with a sound hint and an example word. |
| Review | FSRS spaced repetition. Each word starts as a reading card; a typing card unlocks once you know it well (review interval of 3 weeks or more). |
| Sessions | 10–15 minutes a day: due reviews first, then a few new items. |

## Using it

| | |
|---|---|
| iPhone | Open the site in Safari → Share → Add to Home Screen. The home-screen app keeps its own storage, apart from Safari. |
| Windows | Open the site in Chrome → Install (the icon in the address bar). |
| Typing tests | Use the device's own keyboard for the language (a one-time setup in the system settings). Russian: stress marks, ё/е and capitals never count against you. Japanese: kana in either script, or the kanji. Chinese: hanzi, or pinyin with tone numbers (ni3) or marks (nǐ); pinyin without tones counts as Hard. |
| Read aloud | Uses a voice installed on the device only, so nothing you study leaves it. iPhone: Settings → Accessibility → Spoken Content → Voices. Windows: Settings → Time & language → Speech → Add voices. |
| Back and Restart | The arrow left of X steps back one card (and takes its grade back, so you can answer again). The circle arrow restarts the lesson from card 1 and takes back every answer in it; it is also on the summary until you leave it. Earlier lessons are never changed. |
| Practice | Progress → Practice: repeat a past day's lesson (the last 7 study days), or a topic (Alphabet, Words 1–50, 51–100…, Grammar; 20 random cards at a time). Practice never changes when cards come back. |
| Letters | Name plays a recording of the letter's name; Sound has the device voice say it before a vowel (б → ба). Three common words show the letter at the start, middle and end. |
| Keys (computer) | Space next / show answer · 1–4 grade · Enter check · Backspace back one card · R read aloud (on a letter: its name) · Esc end session |
| Backup | Settings → Export progress saves one JSON file; Import progress replaces this device's progress with it. Export shows when you last backed up. Once an answer that's in no backup is 7 days old, Today shows a "Back up your progress" chip that opens Export; idle days never trigger it. |

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (no offline mode in dev)
npm test           # unit tests (Vitest)
npm run check      # type check the app and the pack scripts
npm run build      # check + production build into dist/
npm run preview    # serve dist/ at http://localhost:4173 with the service worker
```

## Language packs

A pack is one JSON file per language in `public/packs/<lang>/pack.json`. The app reads it; your progress lives separately in the browser (IndexedDB) and refers to items only by their `id`.

```bash
npm run packs:fetch   # download the pinned sources into data/raw/ru (needs bzip2; Git for Windows has it)
npm run packs:build   # build public/packs/ru/pack.json and reports/ru-pack.md (~15 s)
npm run packs:fetch:audio   # the 33 letter-name recordings into public/audio/ru (needs ffmpeg), then packs:build again
npm run packs:fetch:ja && npm run packs:build:ja   # Japanese starter pack (same for zh)
```

The daily limit on new items counts each language separately.

`reports/ru-pack.md` is the human check: coverage curve, top 100 words, every grammar note with its examples, the hand-table words, and the most common spellings that matched no word.

### Pack format (schema 1)

```
pack.json
├─ schema 1, lang, name, nativeName, version (build date)
├─ tts        voice language for the Web Speech API, e.g. "ru-RU"
├─ matcher    "ru" | "ja" | "zh": how typed answers are compared
├─ license, corpus {name, tokens}, sources [{name, url, license, usedFor, version}]
└─ items[]    in teaching order (order = 1…n)
   ├─ letter   id ru:l:<letter>         title, note (sound hint), 1 example word
   ├─ word     id ru:w:<pos>:<form>     text, stressed, pos, info, gloss[], rank, share, ≤2 examples
   │           id ja:w:<text>:<kana>, zh:w:<hanzi>:<pinyin>   + reading (kana / pinyin)
   └─ grammar  id ru:g:<pattern>        title, note, ≤3 examples

example = { text (stress-marked), en, src: "tatoeba:<ru id>/<en id>" | "pack" }
```

- `share` is the word's fraction of all corpus tokens; coverage is the sum of `share` over words you know.
- **IDs are stable** and progress depends on them. Don't rename them; the sources are pinned so rebuilding keeps them.

### Layout

```
scripts/fetch-ru.ts        download + unpack the sources (pinned versions)
scripts/fetch-stub.ts      the same for the Japanese or Chinese sources
scripts/build-stub.ts      Japanese / Chinese starter pack: top 20 words, readings, sentences
scripts/lib/fetch.ts       download and unpack helpers
scripts/lib/stub-extras.ts hand table for the starter packs: reading choices, skipped pieces
scripts/build-ru.ts        credit counts → rank → pick examples → place grammar → write pack + report
scripts/lib/ru-data.ts     read OpenRussian and FrequencyWords, credit spellings to dictionary words
scripts/lib/ru-tokens.ts   split sentences into words, look them up, spot names
scripts/lib/ru-extras.ts   hand table: missing forms, better glosses, data fixes
scripts/lib/ru-grammar.ts  the 28 grammar patterns and how to spot them in a sentence
scripts/lib/ru-alphabet.ts the 33 letters
src/core/types.ts          the pack format
src/core/srs.ts            FSRS scheduling (ts-fsrs) and card state
src/core/study.ts          grading a card; unlocking its typing card
src/core/queue.ts          building a session: due reviews, then new items
src/core/coverage.ts       coverage % from the words you know
src/core/stats.ts          reviews per day, streak, 7-day forecast
src/core/progress.ts       progress records, settings, study-day dates
src/core/backup.ts         export / import file
src/core/answer.ts         checking typed answers
src/core/session.ts        one session step by step: requeues, progress, summary, pace
src/lang/                  per-language answer keys (ru, ja, zh)
src/store.ts               IndexedDB storage (idb)
src/main.ts                entry: styles, service worker, update notice
src/app.ts                 loading, routes, drawing, taps and keys, grading, backup
src/ui/views-tabs.ts       Today, Progress, Grammar, Settings, Sources
src/ui/views-session.ts    new item, reading test, typing test, summary
src/ui/state.ts            what the screens read (pack, progress, the running session)
src/ui/parts.ts            shared pieces: sentences, read-aloud button, coverage ring
src/ui/html.ts             html`` template that escapes every value
src/ui/icons.ts            SVG sprite: the mochi mascot and the icons
src/ui/speech.ts           read aloud with on-device voices only
src/ui/files.ts            save / open the backup file
src/ui/format.ts           intervals, percentages, dates, word tags
src/style.css              the look (tokens for light and dark)
sw.js                      service worker template (offline cache)
public/manifest.webmanifest, public/icons/   install name and icons
```

## Data and licenses

See [DATA_SOURCES.md](DATA_SOURCES.md). The packs are CC BY-SA 4.0. Russian is built from FrequencyWords (CC BY-SA 4.0), OpenRussian.org (CC BY-SA 4.0) and Tatoeba (CC BY 2.0 FR); Japanese from FrequencyWords, JMdict (CC BY-SA 4.0) and Tatoeba; Chinese from FrequencyWords, CC-CEDICT (CC BY-SA 4.0) and Tatoeba. The code is MIT ([LICENSE](LICENSE)).
