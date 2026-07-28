// Verifies that temporary local extraction handles fixtures without inventing durations.
import { extractLocalActivities } from "@/services/localExtraction";
import { transcriptFixtures } from "./fixtures/transcripts";

describe("local text extraction", () => {
  it.each(transcriptFixtures)("extracts the expected activity from $transcript", async ({ transcript, expected }) => {
    const result = await extractLocalActivities(transcript);
    expect(result.activities).toEqual(expect.arrayContaining([expect.objectContaining(expected)]));
  });

  it("reports a missing duration instead of inventing one", async () => {
    const result = await extractLocalActivities("I worked on a presentation.");
    expect(result.activities).toHaveLength(0);
    expect(result.unresolvedIssues[0]).toContain("duration");
  });
});
