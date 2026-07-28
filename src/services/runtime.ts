// Selects the temporary local-only runtime without conflating it with production.
export const isLocalMode = process.env.EXPO_PUBLIC_LOCAL_MODE === "true";
