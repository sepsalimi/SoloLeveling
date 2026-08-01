// Simple per-user sliding window used by Edge Functions to blunt abuse and cost spikes.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (existing.count >= limit) {
    throw new Error("Too many requests. Wait a moment and try again.");
  }
  existing.count += 1;
  buckets.set(key, existing);
}
