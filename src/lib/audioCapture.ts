// One microphone take. Stop returns a single audio file and releases the mic.
const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

export type RecordedAudio = {
  blob: Blob;
  name: string;
  type: string;
};

type RecorderState = "inactive" | "recording" | "paused";

export type MediaRecorderLike = {
  state: RecorderState;
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: (() => void) | null;
  start(timeslice?: number): void;
  stop(): void;
};

export type AudioRecorderDeps = {
  getUserMedia(): Promise<{ getTracks(): { stop(): void }[] }>;
  createRecorder(stream: { getTracks(): { stop(): void }[] }, mimeType?: string): MediaRecorderLike;
  isTypeSupported(type: string): boolean;
};

export function supportedRecordingType(isTypeSupported: (type: string) => boolean) {
  return preferredTypes.find((type) => isTypeSupported(type));
}

export function recordedAudio(blob: Blob): RecordedAudio {
  const raw = blob.type.toLowerCase();
  if (raw.includes("mp4") || raw.includes("m4a") || raw.includes("aac")) {
    return { blob, name: "note.m4a", type: "audio/mp4" };
  }
  if (raw.includes("wav")) return { blob, name: "note.wav", type: "audio/wav" };
  if (raw.includes("mpeg") || raw.includes("mp3")) return { blob, name: "note.mp3", type: "audio/mpeg" };
  return { blob, name: "note.webm", type: "audio/webm" };
}

export function createAudioRecorder(deps: AudioRecorderDeps) {
  let stream: { getTracks(): { stop(): void }[] } | null = null;
  let recorder: MediaRecorderLike | null = null;
  let chunks: Blob[] = [];
  let stopping = false;
  let aborted = false;

  function release() {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    recorder = null;
    chunks = [];
    stopping = false;
  }

  return {
    async start() {
      if (aborted || (recorder && recorder.state === "recording")) return;
      const nextStream = await deps.getUserMedia();
      if (aborted) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = nextStream;
      try {
        const mimeType = supportedRecordingType(deps.isTypeSupported);
        const next = deps.createRecorder(nextStream, mimeType);
        chunks = [];
        next.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        recorder = next;
        next.start(250);
      } catch (error) {
        release();
        throw error;
      }
    },
    stop() {
      const current = recorder;
      if (!current || current.state === "inactive") throw new Error("Recording has not started.");
      stopping = true;
      const captured = chunks;
      return new Promise<Blob>((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => finish(() => reject(new Error("The recording did not finish. Tap to try again or type."))), 10000);
        function finish(settle: () => void) {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          release();
          settle();
        }
        current.onerror = () => finish(() => reject(new Error("Recording failed. Tap to try again or type.")));
        current.onstop = () => {
          const blob = new Blob(captured, { type: current.mimeType || "audio/webm" });
          if (blob.size === 0) finish(() => reject(new Error("No audio was captured. Tap to try again or type.")));
          else finish(() => resolve(blob));
        };
        try {
          current.stop();
        } catch {
          finish(() => reject(new Error("Recording failed. Tap to try again or type.")));
        }
      });
    },
    abort() {
      aborted = true;
      if (stopping) return;
      const current = recorder;
      if (current && current.state !== "inactive") {
        current.onstop = null;
        current.onerror = null;
        current.stop();
      }
      release();
    },
  };
}

export function browserAudioRecorder() {
  const media = globalThis.navigator?.mediaDevices;
  const RecorderCtor = (globalThis as { MediaRecorder?: { new (stream: MediaStream, options?: { mimeType?: string }): MediaRecorder; isTypeSupported(type: string): boolean } }).MediaRecorder;
  if (!media?.getUserMedia || typeof RecorderCtor !== "function") {
    throw new Error("This browser cannot record audio. Type below.");
  }
  return createAudioRecorder({
    getUserMedia: () => media.getUserMedia({ audio: true }),
    createRecorder: (stream, mimeType) => {
      const recorder = mimeType
        ? new RecorderCtor(stream as MediaStream, { mimeType })
        : new RecorderCtor(stream as MediaStream);
      return recorder as unknown as MediaRecorderLike;
    },
    isTypeSupported: (type) => RecorderCtor.isTypeSupported(type),
  });
}
