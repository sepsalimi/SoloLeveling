// Exercises authenticated, rate-limited conversational organization and strict plan-output validation.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(readFileSync("supabase/functions/reason-life/index.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const result = {
  goals: [{ title: "Change careers", area: "Career" }],
  projects: [{ title: "Job search", area: "Career", goalTitles: ["Change careers"] }],
  tasks: [{
    title: "Update resume",
    area: "Career",
    projectTitle: "Job search",
    goalTitles: ["Change careers"],
    priority: "medium",
    prioritySource: "inferred",
    estimatedHours: 1.5,
    estimateSource: "inferred",
    dueDate: null,
    dueDateSource: null,
    recurrence: null,
  }],
  contextNotes: ["Works a nine-to-five"],
  clarificationQuestion: null,
};

function server(output: unknown = result, authStatus = 200, rateLimited = false) {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ id: "user-1" }, { status: authStatus }))
    .mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(output) } }] }));
  const enforceRateLimit = vi.fn(() => {
    if (rateLimited) throw new Error("Too many requests. Wait a moment and try again.");
  });
  let handler: (request: Request) => Promise<Response>;
  runInNewContext(source, {
    exports: {},
    require: (path: string) => {
      if (path === "../_shared/rateLimit.ts") return { enforceRateLimit };
      throw new Error(`Unexpected import: ${path}`);
    },
    Deno: {
      env: { get: (name: string) => name === "DEEPSEEK_API_KEY" ? "key" : name === "SUPABASE_URL" ? "https://example.supabase.co" : name === "DEEPSEEK_MODEL" ? undefined : "anon" },
      serve: (fn: typeof handler) => handler = fn,
    },
    fetch,
    Response,
    AbortSignal,
  });
  const call = () => handler(new Request("https://example.com", {
    method: "POST",
    headers: { Authorization: "Bearer user" },
    body: JSON.stringify({
      conversationId: "conversation-1",
      transcript: "I work a nine-to-five and want a better job.",
      timezone: "America/Toronto",
      current: { goals: [], projects: [], tasks: [] },
    }),
  }));
  return { call, fetch, enforceRateLimit };
}

it("authenticates before organizing personal context", async () => {
  const app = server(result, 401);
  expect((await app.call()).status).toBe(401);
  expect(app.fetch).toHaveBeenCalledTimes(1);
});

it("returns validated goals, projects, and tasks with the current model", async () => {
  const app = server();
  const response = await app.call();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.tasks[0]).toMatchObject({ title: "Update resume", dueDate: null, prioritySource: "inferred" });
  expect(body.model).toBe("deepseek-v4-flash");
});

it("rate limits paid planning by authenticated user", async () => {
  const app = server();
  expect((await app.call()).status).toBe(200);
  expect(app.enforceRateLimit).toHaveBeenCalledWith("reason-life:user-1", 10, 60_000);

  const limited = server(result, 200, true);
  expect((await limited.call()).status).toBe(429);
  expect(limited.fetch).toHaveBeenCalledTimes(1);
});

it("rejects fabricated or malformed dates", async () => {
  const app = server({ ...result, tasks: [{ ...result.tasks[0], dueDate: "2026-02-30", dueDateSource: "inferred" }] });
  expect((await app.call()).status).toBe(502);
});
