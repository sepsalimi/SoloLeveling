import { readFileSync } from "node:fs";
describe("check-in surfaces", () => {
  it("keeps the older manual review actions", () => {
    const source = readFileSync("app/review.tsx", "utf8");
    for (const label of ["Approve all", "Add", "Merge", "Split", "Save check-in", "Retry"]) expect(source).toContain(label);
  });
});
