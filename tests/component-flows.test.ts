import { readFileSync } from "node:fs";

describe("recording and review flow surfaces", () => {
  it("exposes the expected recording controls", () => {
    const source = readFileSync("app/(tabs)/check-in.tsx", "utf8");
    for (const label of ["Record", "Pause", "Cancel", "Finish", "Extract activities"]) {
      expect(source).toContain(label);
    }
  });

  it("exposes expected review actions", () => {
    const source = readFileSync("app/review.tsx", "utf8");
    for (const label of ["Approve all", "Add", "Merge", "Split", "Save check-in", "Retry"]) {
      expect(source).toContain(label);
    }
  });
});