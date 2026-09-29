import { describe, expect, it } from "vitest";
import { categorizeTask, draftTasks, plannedHours, taskType } from "../src/lib/tasks";
import { normalizeSteamProfile } from "../src/lib/steam";
describe("Notion task formula", () => {
  it.each(["medium", "high"])("uses the one-hour boundary for %s priority", priority => {
    expect(taskType(priority, 0.5)).toBe("🍒 Low Hanging");
    expect(taskType(priority, 1)).toBe("🍒 Low Hanging");
    expect(taskType(priority, 1.01)).toBe("🪨 Big Rock");
  });
  it("classifies low priorities and missing or invalid values", () => {
    expect(taskType("low", 1)).toBe("☕️ Nice to Do");
    expect(taskType("low", 2)).toBe("🐌 Time Sink");
    for (const hours of [null, undefined, 0, -1, NaN, Infinity]) expect(taskType("high", hours)).toBe("⚠️ No Hours Set");
    expect(taskType("other", 1)).toBe("⚠️ Unknown Priority");
  });
});
describe("task suggestions and workload", () => {
  it("extracts separate tasks, spoken durations, categories and priority without inventing hours", () => {
    const tasks = draftTasks("I need to pay my bill, high priority, fifteen minutes. Play games, low priority, two hours. Renew my passport");
    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({ category: "Finance", priority: "high", estimatedHours: 0.25 });
    expect(tasks[1]).toMatchObject({ category: "Leisure", priority: "low", estimatedHours: 2 });
    expect(tasks[2]).toMatchObject({ category: "Life Admin", estimatedHours: null });
    expect(new Set(tasks.map(t => t.id)).size).toBe(3);
  });
  it("preserves decimals and combined hours/minutes", () => {
    expect(draftTasks("Study 1.5 hours. Clean for 1 hour 30 minutes")[0].estimatedHours).toBe(1.5);
    expect(draftTasks("Study 1.5 hours. Clean for 1 hour 30 minutes")[1].estimatedHours).toBe(1.5);
    expect(draftTasks("Read for one and a half hours")[0].estimatedHours).toBe(1.5);
    expect(draftTasks("Call for half an hour")[0].estimatedHours).toBe(0.5);
  });
  it("does not treat not urgent as high priority", () => expect(draftTasks("Clean, not urgent")[0].priority).toBe("low"));
  it("excludes completed and unestimated tasks from the pie", () => {
    const tasks = draftTasks("Pay bills 1 hour. Budget 2 hours. Renew passport");
    tasks[1].status = "Done";
    expect(plannedHours(tasks)).toEqual({ Finance: 1 });
    expect(plannedHours([])).toEqual({});
  });
  it("keeps staple categories", () => {
    expect(categorizeTask("Renew passport")).toBe("Life Admin");
    expect(categorizeTask("Play a game")).toBe("Leisure");
    expect(categorizeTask("Prepare taxes")).toBe("Finance");
  });
});
describe("Steam URL validation", () => {
  it("accepts vanity and numeric profiles", () => {
    expect(normalizeSteamProfile("https://steamcommunity.com/id/example/?x=1")).toBe("https://steamcommunity.com/id/example");
    expect(normalizeSteamProfile("https://steamcommunity.com/profiles/76561198000000000")).toContain("/profiles/");
  });
  it.each(["https://evil.example/id/name", "http://steamcommunity.com/id/name", "https://steamcommunity.com.evil.example/id/name", "https://steamcommunity.com/id/a/other", "https://steamcommunity.com/profiles/123", "https://user@steamcommunity.com/id/a", "javascript:alert(1)"])("rejects unsafe or invalid URL %s", value => {
    expect(() => normalizeSteamProfile(value)).toThrow();
  });
});
