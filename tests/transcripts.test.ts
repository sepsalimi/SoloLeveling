// Verifies the 50 KB transcript retention boundary used by check-in drafts.
import { describe, expect, it } from "vitest";
import { appendTranscript, retainedTranscript } from "@/lib/transcripts";

describe("transcript retention", () => {
  it("keeps transcripts under the size limit", () => {
    expect(retainedTranscript("I worked for one hour")).toBe("I worked for one hour");
    const result = appendTranscript([], [], "I worked for one hour");
    expect(result.transcripts).toEqual(["I worked for one hour"]);
    expect(result.transcriptRetentionNotices).toEqual([]);
  });

  it("drops oversized transcripts and records a notice", () => {
    const oversized = `I worked for one hour. ${"x".repeat(60_000)}`;
    expect(retainedTranscript(oversized)).toBeNull();
    const result = appendTranscript(["kept"], [], oversized);
    expect(result.transcripts).toEqual(["kept"]);
    expect(result.transcriptRetentionNotices[0]).toContain("exceeded 50 KB");
  });
});
