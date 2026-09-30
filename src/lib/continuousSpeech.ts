export type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [i: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type Callbacks = { onFinal(text: string): void; onInterim(text: string): void; onStopped(): void; onError(message: string): void };
/** Keep one browser speech-service session user-controlled and preserve words if the service ends it. */
export function continuousSpeech(Constructor: new () => Recognition, callbacks: Callbacks) {
  let wanted = false;
  let current: Recognition | null = null;
  let pending = "";
  let stopDeadline: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let stopping = false;
  let cycleCount = 0;
  let committedWords: string[] = [];
  let atCycleBoundary = false;
  const deliver = (raw: string) => {
    const words = raw.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;
    let overlap = 0;
    if (atCycleBoundary && committedWords.length) {
      const normalized = words.map((word) => word.toLocaleLowerCase());
      const limit = Math.min(committedWords.length, normalized.length);
      for (let size = limit; size > 0; size--) {
        if (committedWords.slice(-size).every((word, index) => word === normalized[index])) {
          overlap = size;
          break;
        }
      }
    }
    const novel = words.slice(overlap);
    if (!novel.length) return;
    callbacks.onFinal(novel.join(" "));
    committedWords = [...committedWords, ...novel.map((word) => word.toLocaleLowerCase())];
    atCycleBoundary = false;
  };
  const flush = () => {
    const value = pending.trim();
    if (value) deliver(value); pending = ""; callbacks.onInterim("");
  };
  const detach = () => {
    const speech = current; current = null;
    if (speech) { speech.onend = null; speech.onresult = null; speech.onerror = null; }
    return speech;
  };
  const clear = () => { clearTimeout(stopDeadline); };
  const complete = () => {
    clear(); wanted = false; stopping = false;
    const speech = detach(); flush();
    try { speech?.abort(); } catch { /* Already stopped by the browser. */ }
    callbacks.onStopped();
  };
  const fail = (message: string) => {
    clear(); wanted = false; stopping = false;
    const speech = detach(); flush();
    try { speech?.abort(); } catch { /* Already stopped. */ }
    callbacks.onError(message);
  };
  const cycle = () => {
    if (!wanted) return;
    let speech: Recognition;
    try { speech = new Constructor(); } catch { fail("Voice is unavailable in this browser. Your captured words are kept."); return; }
    cycleCount++;
    atCycleBoundary = cycleCount > 1;
    current = speech;
    const delivered = new Set<number>();
    speech.continuous = true; speech.interimResults = true; speech.lang = "en-US";
    const ended = (trigger: string) => {
      if (current !== speech) return;
      if (!wanted) { complete(); return; }
      fail(trigger === "error:no-speech"
        ? "No speech was detected. Your words are kept. Tap to try again or type."
        : "Voice connection paused. Your words are kept. Tap to continue or type.");
    };
    speech.onresult = event => {
      if (current !== speech) return;
      failures = 0;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal && !delivered.has(i)) {
          delivered.add(i); deliver(event.results[i][0].transcript);
        }
      }
      pending = "";
      for (let i = 0; i < event.results.length; i++) if (!event.results[i].isFinal) pending += event.results[i][0].transcript + " ";
      callbacks.onInterim(pending.trim());
    };
    speech.onend = () => ended("onend");
    speech.onerror = event => {
      if (current !== speech) return;
      if (!wanted) { complete(); return; }
      if (event.error === "no-speech" || (event.error === "network" && ++failures <= 3)) {
        ended("error:" + event.error); return;
      }
      fail(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone access was denied. Enable it in your browser to keep talking."
        : "Voice connection stopped (" + event.error + "). Your words are kept. Tap to reconnect or type.");
    };
    try { speech.start(); } catch { fail("Could not start the microphone. Your words are kept. Tap to retry."); }
  };
  return {
    start() { if (wanted || current) return; wanted = true; stopping = false; failures = 0; cycle(); },
    stop() {
      if (stopping) return;
      stopping = true; wanted = false;
      if (!current) { complete(); return; }
      // Some mobile engines never deliver onend after stop. Do not trap the UI.
      stopDeadline = setTimeout(complete, 1800);
      try { current.stop(); } catch { complete(); }
    },
    abort() { clear(); wanted = false; stopping = false; const speech = detach(); flush(); try { speech?.abort(); } catch { /* Closed service. */ } },
  };
}
