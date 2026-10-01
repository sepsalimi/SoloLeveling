import { appendFileSync } from "node:fs";
import { createServer } from "node:http";

const port = Number(process.env.AGENT_DEBUG_PORT || 7357);
const logPath = "/opt/cursor/logs/debug.log";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers).end();
    return;
  }
  if (request.method !== "POST") {
    response.writeHead(405, headers).end();
    return;
  }
  let body = "";
  request.on("data", (chunk) => {
    if (body.length < 65536) body += chunk;
  });
  request.on("end", () => {
    try {
      const entry = JSON.parse(body);
      if (!entry || typeof entry.hypothesisId !== "string" || typeof entry.location !== "string") throw new Error("Invalid log entry");
      // #region agent log
      appendFileSync(logPath, JSON.stringify(entry) + "\n");
      // #endregion
      response.writeHead(204, headers).end();
    } catch {
      response.writeHead(400, headers).end();
    }
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`Agent debug collector listening on ${port}`);
});
