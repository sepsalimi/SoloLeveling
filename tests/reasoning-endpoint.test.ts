import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const source = ts.transpileModule(readFileSync("supabase/functions/reason-check-in/index.ts","utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function server(key = "test-key", authStatus = 200, result: unknown = { choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ activities: [{ title: "Workout", minutes: 30, category: "exercise", source: "I worked out for 30 minutes" }] }), reasoning_content: "private reasoning" } }] }) {
  const fetch = vi.fn().mockResolvedValueOnce(new Response("{}",{status:authStatus})).mockResolvedValueOnce(Response.json(result));
  let handler: (req: Request) => Promise<Response>;
  runInNewContext(source,{ exports: {}, Deno:{env:{get:(name:string)=>name==="DEEPSEEK_API_KEY"?key:name==="DEEPSEEK_MODEL"?undefined:name==="SUPABASE_URL"?"https://example.supabase.co":"test-anon"},serve:(fn:typeof handler)=>handler=fn},fetch,Response,AbortSignal });
  return { fetch, call:()=>handler(new Request("https://example.com",{method:"POST",headers:{Authorization:"Bearer user-session"},body:JSON.stringify({transcript:"I worked out for 30 minutes",activityDate:"2026-09-29"})})) };
}
it("authenticates before calling DeepSeek",async()=>{
  const app=server("test",401);expect((await app.call()).status).toBe(401);expect(app.fetch).toHaveBeenCalledTimes(1);
});
it("reports missing server secrets without calling the provider",async()=>{
  const app=server("");expect((await app.call()).status).toBe(503);expect(app.fetch).toHaveBeenCalledTimes(1);
});
it("enables reasoning and returns only validated activity data",async()=>{
  const app=server();const response=await app.call();expect(response.status).toBe(200);
  const payload=JSON.parse(app.fetch.mock.calls[1][1].body);
  expect(payload.model).toBe("deepseek-flash");expect(payload.thinking).toEqual({type:"enabled"});expect(payload.reasoning_effort).toBe("high");
  expect(payload.response_format).toEqual({type:"json_object"});
  const data=await response.json();expect(data.activities[0].minutes).toBe(30);expect(JSON.stringify(data)).not.toContain("private reasoning");
});
it("rejects incomplete model output instead of silently saving it",async()=>{
  const app=server("test",200,{choices:[{finish_reason:"length",message:{content:'{"activities":[]}'}}]});
  expect((await app.call()).status).toBe(502);
});
it("rejects invalid provider durations",async()=>{
  const app=server("test",200,{choices:[{finish_reason:"stop",message:{content:JSON.stringify({activities:[{title:"Work",minutes:-30,category:"work",source:"work"}]})}}]});
  expect((await app.call()).status).toBe(502);
});
