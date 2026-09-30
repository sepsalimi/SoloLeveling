import { continuousSpeech, Recognition } from "../src/lib/continuousSpeech";
class Speech implements Recognition {
  static instances: Speech[] = [];
  continuous = false; interimResults = false; lang = "";
  onresult: Recognition["onresult"] = null; onerror: Recognition["onerror"] = null; onend: Recognition["onend"] = null;
  start = vi.fn(); stop = vi.fn(); abort = vi.fn();
  constructor() { Speech.instances.push(this); }
  emit(text: string, final = false) { this.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: final, 0: { transcript: text } } } }); }
}
beforeEach(() => { vi.useFakeTimers(); Speech.instances = []; });
afterEach(() => vi.useRealTimers());
function setup() {
  const callbacks = { onFinal: vi.fn(), onInterim: vi.fn(), onStopped: vi.fn(), onError: vi.fn() };
  const control = continuousSpeech(Speech, callbacks); control.start();
  return { control, callbacks };
}
it("restarts browser sessions without ending the user's recording", () => {
  const { control, callbacks } = setup();
  Speech.instances[0].emit("I worked out for 30 minutes");
  Speech.instances[0].onend?.();
  expect(callbacks.onStopped).not.toHaveBeenCalled();
  vi.advanceTimersByTime(150);
  expect(Speech.instances).toHaveLength(2);
  Speech.instances[1].emit("and studied for an hour", true);
  control.stop(); Speech.instances[1].onend?.();
  expect(callbacks.onFinal.mock.calls.flat()).toEqual(["I worked out for 30 minutes", "and studied for an hour"]);
  expect(callbacks.onStopped).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(600000);
  expect(Speech.instances).toHaveLength(2);
});
it("stops during a restart gap without restarting", () => {
  const { control, callbacks } = setup();
  Speech.instances[0].onend?.(); control.stop(); vi.advanceTimersByTime(5000);
  expect(Speech.instances).toHaveLength(1); expect(callbacks.onStopped).toHaveBeenCalledTimes(1);
});
it("escapes a browser that never signals stop and retains partial words", () => {
  const { control, callbacks } = setup();
  Speech.instances[0].emit("I walked for 20 minutes");
  control.stop(); control.stop(); vi.advanceTimersByTime(1800);
  expect(callbacks.onFinal).toHaveBeenCalledWith("I walked for 20 minutes");
  expect(callbacks.onStopped).toHaveBeenCalledTimes(1); expect(Speech.instances[0].stop).toHaveBeenCalledTimes(1);
});
it("does not duplicate final results and preserves words on abort", () => {
  const { control, callbacks } = setup();
  Speech.instances[0].emit("I ran", true); Speech.instances[0].emit("I ran", true);
  expect(callbacks.onFinal).toHaveBeenCalledTimes(1);
  control.abort(); vi.advanceTimersByTime(600000); expect(callbacks.onStopped).not.toHaveBeenCalled();
});
it("retries silence but reports permission failure without looping", () => {
  const { callbacks } = setup();
  Speech.instances[0].onerror?.({ error: "no-speech" }); vi.advanceTimersByTime(150);
  Speech.instances[1].onerror?.({ error: "not-allowed" }); vi.advanceTimersByTime(600000);
  expect(Speech.instances).toHaveLength(2); expect(callbacks.onError).toHaveBeenCalledTimes(1);
  expect(callbacks.onStopped).not.toHaveBeenCalled();
});
it("remains active after five minutes", () => {
  const { callbacks } = setup(); vi.advanceTimersByTime(600000);
  expect(callbacks.onStopped).not.toHaveBeenCalled(); expect(Speech.instances[0].stop).not.toHaveBeenCalled();
});
