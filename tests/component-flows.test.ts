import { readFileSync } from "node:fs";
describe("check-in surfaces", () => {
  it("exposes review and save without interrupting capture", () => {
    const source = readFileSync("app/(tabs)/check-in.tsx", "utf8");
    expect(source).toContain("Send my check-in");
    expect(source).toContain("Save my day");
    expect(source).toContain("!!text.trim() && !capturing");
    expect(source).toContain("onInterim={setInterim}");
  });
  it("keeps the older manual review actions", () => {
    const source = readFileSync("app/review.tsx", "utf8");
    for (const label of ["Approve all", "Add", "Merge", "Split", "Save check-in", "Retry"]) expect(source).toContain(label);
  });
});
