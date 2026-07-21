import { calculateDurationFromTimes, normalizeDuration } from "@/lib/duration";

describe("duration normalization", () => {
  it("calculates explicit time ranges", () => {
    expect(calculateDurationFromTimes("09:00", "11:00")).toBe(120);
    expect(normalizeDuration("I worked from nine to eleven")).toBe(120);
  });

  it("normalizes hour and minute phrases", () => {
    expect(normalizeDuration("for an hour")).toBe(60);
    expect(normalizeDuration("for 2.5 hours")).toBe(150);
    expect(normalizeDuration("for 40 minutes")).toBe(40);
    expect(normalizeDuration("two and a half hours")).toBe(150);
  });
});

