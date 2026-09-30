// Verifies the authenticated production extraction boundary and OpenAI-shaped nullable output.
import { extractActivities } from "@/services/extraction";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/services/supabase", () => ({
  supabase: { functions: { invoke } }
}));

describe("production extraction", () => {
  it("normalizes nullable Structured Output fields", async () => {
    invoke.mockResolvedValue({
      data: {
        activities: [
          {
            id: "model-1",
            title: "Focused work",
            description: null,
            activityDate: "2026-07-28",
            startTime: "09:00",
            endTime: "11:00",
            durationMinutes: 120,
            primaryCategory: "work",
            socialContext: "solo",
            purposeTags: ["productive"],
            efficiencyPercent: 80,
            energyLevel: null,
            mood: null,
            confidence: 0.9,
            sourceTranscriptSegment: null,
            needsReview: false
          }
        ],
        unresolvedIssues: []
      },
      error: null
    });

    const result = await extractActivities("Worked from nine to eleven.", [], "2026-07-28");

    expect(invoke).toHaveBeenCalledWith("process-check-in", {
      body: {
        transcript: "Worked from nine to eleven.",
        existingActivities: [],
        activityDate: "2026-07-28"
      }
    });
    expect(result.activities[0]).toMatchObject({
      durationMinutes: 120,
      description: undefined,
      energyLevel: undefined
    });
  });
});
