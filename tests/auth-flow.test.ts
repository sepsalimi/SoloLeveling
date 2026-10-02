// Covers the sign-in redirect race, Google return URL, recovery routing, and button order.
import { readFileSync } from "node:fs";
import { authCallbackFromUrl, authReturnUrl, startupDestination } from "../src/lib/authFlow";

it("keeps the GitHub Pages prefix in the provider return URL", () => {
  expect(authReturnUrl({ origin: "https://sepsalimi.github.io", pathname: "/SoloLeveling/auth" }))
    .toBe("https://sepsalimi.github.io/SoloLeveling/");
});

it("routes a signed-in user onward instead of back to login", () => {
  expect(startupDestination({ configured: true, signedIn: true, onboardingCompleted: false, accountRecovery: false }))
    .toBe("/onboarding");
  expect(startupDestination({ configured: true, signedIn: false, onboardingCompleted: false, accountRecovery: false }))
    .toBe("/auth");
});

it("places Google after the email actions", () => {
  const screen = readFileSync("app/auth.tsx", "utf8");
  expect(screen.indexOf("Sign in")).toBeLessThan(screen.indexOf("Continue with Google"));
  expect(screen).toContain("Google sign-in is not turned on yet. Use email for now.");
});

it("recognizes a Google or email callback without treating an ordinary visit as recovery", () => {
  const callback = authCallbackFromUrl("https://sepsalimi.github.io/SoloLeveling/?code=abc");
  expect(callback).toMatchObject({ code: "abc", recovery: false });
  expect(authCallbackFromUrl("https://sepsalimi.github.io/SoloLeveling/reset-password?code=abc").recovery).toBe(true);
  expect(authCallbackFromUrl("https://sepsalimi.github.io/SoloLeveling/?token_hash=hash&type=signup")).toMatchObject({ tokenHash: "hash", otpType: "signup" });
  expect(authCallbackFromUrl("https://sepsalimi.github.io/SoloLeveling/").recovery).toBe(false);
});
