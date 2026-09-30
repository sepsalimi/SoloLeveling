// Guards the three-tab product navigation and keeps utility screens out of primary chrome.
import { readFileSync } from "node:fs";

const layout = readFileSync("app/(tabs)/_layout.tsx", "utf8");

it("shows only Plan, Check in, and Analytics as primary tabs", () => {
  expect(layout).toContain('name="tasks" options={{ title: "Plan"');
  expect(layout).toContain('name="check-in" options={{ title: "Check in"');
  expect(layout).toContain('name="analytics" options={{ title: "Analytics"');
  expect(layout).toContain('name="home" options={{ href: null }}');
  expect(layout).toContain('name="history" options={{ href: null }}');
  expect(layout).toContain('name="settings" options={{ href: null }}');
});
