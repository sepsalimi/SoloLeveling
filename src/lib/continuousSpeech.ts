import { agentDebug } from "./agentDebug";

export type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [i: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type Callbacks = { onFinal(text: string): void; onInterim(text: string): void; onStopped(): void; onError(message: string): void };
/** Keep a user-controlled recording alive across browser speech-service sessions. */
export function continuousSpeech(Constructor: new () => Recognition, callbacks: Callbacks) {
  let wanted = false;
  let current: Recognition | null = null;
  let pending = "";
  let restart: ReturnType<typeof setTimeout> | undefined;
  let stopDeadline: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let stopping = false;
  let cycleId = 0;
  let resultEventId = 0;
  let lastObservedFinal = "";
  const flush = () => {
    const value = pending.trim();
    // #region agent log
    agentDebug({ hypothesisId: "B", location: "continuousSpeech.ts:flush", message: "Flushing pending browser speech", data: { cycleId, pendingLength: value.length, pendingWords: value ? value.split(/\s+/).length : 0, repeatsPreviousFinal: Boolean(value) && value === lastObservedFinal } });
    // #endregion
    if (value) callbacks.onFinal(value); pending = ""; callbacks.onInterim("");
  };
  const detach = () => {
    const speech = current; current = null;
    if (speech) { speech.onend = null; speech.onresult = null; speech.onerror = null; }
    return speech;
  };
  const clear = () => { clearTimeout(restart); clearTimeout(stopDeadline); };
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
    cycleId++;
    // #region agent log
    agentDebug({ hypothesisId: "A", location: "continuousSpeech.ts:cycle", message: "Starting browser recognition cycle", data: { cycleId, failures, wanted, visibility: typeof document === "undefined" ? "unavailable" : document.visibilityState, online: typeof navigator === "undefined" ? "unavailable" : navigator.onLine } });
    // #endregion
    current = speech;
    const delivered = new Set<number>();
    speech.continuous = true; speech.interimResults = true; speech.lang = "en-US";
    const ended = (trigger: string) => {
      if (current !== speech) return;
      // #region agent log
      agentDebug({ hypothesisId: "A", location: "continuousSpeech.ts:ended", message: "Browser recognition cycle ended", data: { cycleId, trigger, wanted, stopping, failures, pendingLength: pending.trim().length } });
      // #endregion
      detach(); flush();
      if (!wanted) { complete(); return; }
      restart = setTimeout(cycle, failures ? Math.min(500 * failures, 2000) : 150);
    };
    speech.onresult = event => {
      if (current !== speech) return;
      failures = 0;
      const finals: { index: number; length: number; repeatsPreviousFinal: boolean }[] = [];
      let interimLength = 0;
      for (let i = 0; i < event.results.length; i++) {
        const value = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) {
          finals.push({ index: i, length: value.length, repeatsPreviousFinal: Boolean(value) && value === lastObservedFinal });
          if (value) lastObservedFinal = value;
        } else {
          interimLength += value.length;
        }
      }
      // #region agent log
      agentDebug({ hypothesisId: "B", location: "continuousSpeech.ts:onresult", message: "Browser speech result received", data: { cycleId, resultEventId: ++resultEventId, resultIndex: event.resultIndex, resultCount: event.results.length, finals, interimLength } });
      // #endregion
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal && !delivered.has(i)) {
          delivered.add(i); callbacks.onFinal(event.results[i][0].transcript);
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
        ended("error:" + event.error); try { speech.abort(); } catch { /* Closed service. */ } return;
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
      stopping = true; wanted = false; clearTimeout(restart);
      if (!current) { complete(); return; }
      // Some mobile engines never deliver onend after stop. Do not trap the UI.
      stopDeadline = setTimeout(complete, 1800);
      try { current.stop(); } catch { complete(); }
    },
    abort() { clear(); wanted = false; stopping = false; const speech = detach(); flush(); try { speech?.abort(); } catch { /* Closed service. */ } },
  };
}
