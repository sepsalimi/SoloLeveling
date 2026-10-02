import { createAudioRecorder, MediaRecorderLike, recordedAudio, supportedRecordingType } from "../src/lib/audioCapture";

class FakeRecorder implements MediaRecorderLike {
  state: MediaRecorderLike["state"] = "inactive";
  mimeType = "audio/webm;codecs=opus";
  ondataavailable: MediaRecorderLike["ondataavailable"] = null;
  onstop: MediaRecorderLike["onstop"] = null;
  onerror: MediaRecorderLike["onerror"] = null;
  start = vi.fn(() => { this.state = "recording"; });
  stop = vi.fn(() => {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio"], { type: this.mimeType }) });
    this.onstop?.();
  });
}

it("picks a recording type the transcription API accepts", () => {
  expect(supportedRecordingType((type) => type === "audio/mp4")).toBe("audio/mp4");
  expect(supportedRecordingType(() => false)).toBeUndefined();
});

it("names a webm take as one webm file", () => {
  const audio = recordedAudio(new Blob(["audio"], { type: "audio/webm;codecs=opus" }));
  expect(audio).toMatchObject({ name: "note.webm", type: "audio/webm" });
});

it("returns one blob when the user stops and releases the microphone", async () => {
  const tracks = [{ stop: vi.fn() }];
  let recorder: FakeRecorder | undefined;
  const capture = createAudioRecorder({
    getUserMedia: async () => ({ getTracks: () => tracks }),
    createRecorder: () => {
      recorder = new FakeRecorder();
      return recorder;
    },
    isTypeSupported: (type) => type === "audio/webm;codecs=opus",
  });
  await capture.start();
  const blob = await capture.stop();
  expect(recorder?.start).toHaveBeenCalledWith(250);
  expect(blob.size).toBeGreaterThan(0);
  expect(blob.type).toBe("audio/webm;codecs=opus");
  expect(tracks[0].stop).toHaveBeenCalledTimes(1);
});

it("discards an in-progress take on abort", async () => {
  const tracks = [{ stop: vi.fn() }];
  const capture = createAudioRecorder({
    getUserMedia: async () => ({ getTracks: () => tracks }),
    createRecorder: () => new FakeRecorder(),
    isTypeSupported: () => true,
  });
  await capture.start();
  capture.abort();
  expect(tracks[0].stop).toHaveBeenCalledTimes(1);
  expect(() => capture.stop()).toThrow("Recording has not started.");
});

it("does not start the recorder if the take was cancelled while waiting for the microphone", async () => {
  let allow: (stream: { getTracks(): { stop(): void }[] }) => void = () => undefined;
  const tracks = [{ stop: vi.fn() }];
  const created = vi.fn(() => new FakeRecorder());
  const capture = createAudioRecorder({
    getUserMedia: () => new Promise((resolve) => { allow = resolve; }),
    createRecorder: created,
    isTypeSupported: () => true,
  });
  const starting = capture.start();
  capture.abort();
  allow({ getTracks: () => tracks });
  await starting;
  expect(created).not.toHaveBeenCalled();
  expect(tracks[0].stop).toHaveBeenCalledTimes(1);
});
