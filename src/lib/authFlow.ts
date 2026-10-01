// Pure routing and callback decisions for email, recovery, and Google sign-in.
export function authReturnUrl(location?: { origin: string; pathname: string }) {
  if (location?.origin) {
    const base = location.pathname.startsWith("/SoloLeveling") ? "/SoloLeveling/" : "/";
    return location.origin + base;
  }
  return "lifeanalytics://";
}

export function authCallbackFromUrl(href: string) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const code = url.searchParams.get("code");
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const type = url.searchParams.get("type") ?? hash.get("type");
  const recovery = type === "recovery" || url.pathname.includes("reset-password");
  return {
    code,
    accessToken,
    refreshToken,
    recovery: recovery && Boolean(code || (accessToken && refreshToken)),
  };
}

export function startupDestination(input: {
  configured: boolean;
  signedIn: boolean;
  onboardingCompleted: boolean;
  accountRecovery: boolean;
}) {
  if (input.accountRecovery) return "/reset-password";
  if (input.configured && !input.signedIn) return "/auth";
  if (!input.onboardingCompleted) return "/onboarding";
  return "/(tabs)/tasks";
}
