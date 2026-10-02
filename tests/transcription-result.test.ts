import { functionErrorMessage } from "../src/lib/functionError";
import { transcriptFromInvoke, transcriptionFailure } from "../src/lib/transcriptionResult";

it("reads the function error body", async () => {
  const message = await functionErrorMessage({ context: { json: async () => ({ error: "OPENAI_API_KEY is not configured." }) } });
  expect(message).toBe("OPENAI_API_KEY is not configured.");
  expect(transcriptionFailure(message)).toBe("Voice transcription is not set up yet. Type below for now.");
});

it("returns one trimmed transcript and rejects an empty one", async () => {
  await expect(transcriptFromInvoke({ transcript: "  I need to study the branch.  " }, null)).resolves.toBe("I need to study the branch.");
  await expect(transcriptFromInvoke({ transcript: "   " }, null)).rejects.toThrow("No speech was detected");
});

it("surfaces a provider rejection instead of submitting", async () => {
  const error = { context: { json: async () => ({ error: "The transcription provider rejected the recording (401)." }) } };
  await expect(transcriptFromInvoke(null, error)).rejects.toThrow("The transcription provider rejected the recording (401).");
});
