// Turns a failed Supabase function response into the message the user should see.
export async function functionErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("context" in error)) return undefined;
  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== "object" || typeof (context as { json?: unknown }).json !== "function") return undefined;
  const body = await (context as { json: () => Promise<unknown> }).json();
  if (!body || typeof body !== "object") return undefined;
  const record = body as { error?: unknown; message?: unknown; msg?: unknown };
  for (const value of [record.error, record.message, record.msg]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
