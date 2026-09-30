// Exercises authentication, per-user limits, DeepSeek request shape, and server-side output validation.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(readFileSync("supabase/functions/reason-check-in/index.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const validActivity = {
  title: "Workout",
  minutes: 30,
  category: "Health",
  source: "I worked out for 30 minutes",
  occurredOn: "2026-09-30",
  outcome: "completed",
};

function server(key = "test-key", authStatus = 200, result: unknown = {
  choices: [{
    finish_reason: "stop",
    message: {
      content: JSON.stringify({ activities: [validActivity], clarificationQuestion: null }),
      reasoning_content: "private reasoning",
    },
  }],
}, rateLimited = false) {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ id: "user-1" }, { status: authStatus })).mockResolvedValueOnce(Response.json(result));
  const enforceRateLimit = vi.fn(() => {
    if (rateLimited) throw new Error("Too many requests. Wait a moment and try again.");
  });
  let handler: (req: Request) => Promise<Response>;
  runInNewContext(source, {
    exports: {},
    require: (path: string) => {
      if (path === "../_shared/rateLimit.ts") return { enforceRateLimit };
      throw new Error(`Unexpected import: ${path}`);
    },
    Deno: {
      env: {
        get: (name: string) => name === "DEEPSEEK_API_KEY" ? key : name === "DEEPSEEK_MODEL" ? undefined : name === "SUPABASE_URL" ? "https://example.supabase.co" : "test-anon",
      },
      serve: (fn: typeof handler) => handler = fn,
    },
    fetch,
    Response,
    AbortSignal,
  });
  return {
    fetch,
    enforceRateLimit,
    call: () => handler(new Request("https://example.com", {
      method: "POST",
      headers: { Authorization: "Bearer user-session" },
      body: JSON.stringify({
        transcript: "I worked out for 30 minutes",
        captureDate: "2026-09-30",
        capturedAt: "2026-09-30T18:00:00.000Z",
        timezone: "UTC",
        context: { tasks: [], projects: [], goals: [] },
      }),
    })),
  };
}

it("authenticates before calling DeepSeek", async () => {
  const app = server("test", 401);
  expect((await app.call()).status).toBe(401);
  expect(app.fetch).toHaveBeenCalledTimes(1);
});

it("reports missing server secrets without calling the provider", async () => {
  const app = server("");
  expect((await app.call()).status).toBe(503);
  expect(app.fetch).toHaveBeenCalledTimes(1);
});

it("rate limits paid extraction by authenticated user", async () => {
  const app = server();
  expect((await app.call()).status).toBe(200);
  expect(app.enforceRateLimit).toHaveBeenCalledWith("reason-check-in:user-1", 10, 60_000);

  const limited = server("test", 200, undefined, true);
  expect((await limited.call()).status).toBe(429);
  expect(limited.fetch).toHaveBeenCalledTimes(1);
});

it("uses the current configurable model and returns no reasoning trace", async () => {
  const app = server();
  const response = await app.call();
  expect(response.status).toBe(200);
  const payload = JSON.parse(app.fetch.mock.calls[1][1].body);
  expect(payload.model).toBe("deepseek-v4-flash");
  expect(payload.thinking).toEqual({ type: "enabled" });
  expect(payload.reasoning_effort).toBe("high");
  expect(payload.response_format).toEqual({ type: "json_object" });
  expect(payload.messages[0].content).toContain("twenty hours, sorry, two hours");
  const data = await response.json();
  expect(data.activities[0]).toMatchObject({ minutes: 30, occurredOn: "2026-09-30" });
  expect(JSON.stringify(data)).not.toContain("private reasoning");
});

it("rejects incomplete, future-dated, and invalid-duration output", async () => {
  const incomplete = server("test", 200, { choices: [{ finish_reason: "length", message: { content: "{}" } }] });
  expect((await incomplete.call()).status).toBe(502);
  const future = server("test", 200, { choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ activities: [{ ...validActivity, occurredOn: "2026-10-01" }], clarificationQuestion: null }) } }] });
  expect((await future.call()).status).toBe(502);
  const duration = server("test", 200, { choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ activities: [{ ...validActivity, minutes: -30 }], clarificationQuestion: null }) } }] });
  expect((await duration.call()).status).toBe(502);
});
