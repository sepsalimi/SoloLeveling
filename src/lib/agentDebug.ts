type AgentDebugEntry = {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
};

/** Temporary runtime evidence sink for the authentication investigation. */
export function agentDebug(entry: AgentDebugEntry) {
  const payload = { ...entry, timestamp: Date.now() };
  // #region agent log
  console.info("[agent-debug]", JSON.stringify(payload));
  const endpoint = process.env.EXPO_PUBLIC_AGENT_DEBUG_URL;
  if (endpoint) void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}
