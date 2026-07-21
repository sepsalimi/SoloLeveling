import { validateExtractionResponse } from "@/lib/validation";
import { sampleActivities } from "@/data/sample";

describe("transcript extraction validation", () => {
  it("accepts valid structured output", () => {
    expect(validateExtractionResponse({ activities: sampleActivities, unresolvedIssues: [] }).success).toBe(true);
  });

  it("rejects invalid categories", () => {
    const invalid = { ...sampleActivities[0], primaryCategory: "judgment_score" };
    expect(validateExtractionResponse({ activities: [invalid], unresolvedIssues: [] }).success).toBe(false);
  });
});

