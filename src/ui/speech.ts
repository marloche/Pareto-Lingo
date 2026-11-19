// Read aloud with a voice that runs on the device (Web Speech API). Online voices (Chrome's "Google"
// voices, Edge's "Online (Natural)" ones) send the text to a server, so they are never used: the app
// makes no network calls beyond loading itself.

let voices: SpeechSynthesisVoice[] = [];

const synth = () => (typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis);

function load() {
  const s = synth();
  if (s) voices = s.getVoices();
}

/** Starts listening for the voice list, which some browsers fill in after page load. */
export function initSpeech(): void {
  const s = synth();
  if (!s) return;
  load();
  s.addEventListener?.('voiceschanged', load);
}

/** The on-device voice for a language ("ru-RU"), exact match first. */
export function voiceFor(lang: string): SpeechSynthesisVoice | undefined {
  const base = lang.split('-')[0].toLowerCase();
  const local = voices.filter((v) => v.localService);
  return local.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ?? local.find((v) => v.lang.toLowerCase().split(/[-_]/)[0] === base);
}

export const canSpeak = (lang: string) => !!synth() && !!voiceFor(lang);

export function speak(text: string, lang: string): void {
  const s = synth();
  const voice = voiceFor(lang);
  if (!s || !voice || !text.trim()) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice.lang;
  u.voice = voice;
  u.rate = 0.9;
  s.speak(u);
}

/** iPhone only lets speech start from a tap; one silent utterance during a tap unlocks it for the visit. */
export function unlockSpeech(): void {
  const s = synth();
  if (!s) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  s.speak(u);
}
