import { isPotentialDuplicate, removeDuplicateActivities } from "@/lib/duplicates";
import { sampleActivities } from "@/data/sample";

describe("duplicate detection", () => {
  it("detects same-day same-category similar entries", () => {
    const duplicate = { ...sampleActivities[0], id: "copy", durationMinutes: 125 };
    expect(isPotentialDuplicate(sampleActivities[0], duplicate)).toBe(true);
  });

  it("removes duplicate activities", () => {
    expect(removeDuplicateActivities([sampleActivities[0], { ...sampleActivities[0], id: "copy" }])).toHaveLength(1);
  });
});

