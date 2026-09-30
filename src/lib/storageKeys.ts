// Pure tenant-scoped key builders shared by local persistence and isolation tests.
export const taskStorageKey = (scope: string) => `life.analytics.plan.v2:${scope}`;
