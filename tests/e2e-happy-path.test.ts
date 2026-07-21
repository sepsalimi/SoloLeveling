import { extractActivitiesMock } from "@/services/mockExtraction";
import { summarizeActivities } from "@/lib/analytics";

describe("happy path", () => {
  it("extracts, saves conceptually, and updates analytics from a text check-in", async () => {
    const result = await extractActivitiesMock("I worked from nine to eleven at around 80 percent efficiency.");
    expect(result.activities[0]).toMatchObject({
      primaryCategory: "work",
      durationMinutes: 120,
      efficiencyPercent: 80
    });
    expect(summarizeActivities(result.activities).effectiveFocusedMinutes).toBe(96);
  });
});