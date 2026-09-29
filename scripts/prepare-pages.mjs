import { copyFile, mkdir, writeFile } from "node:fs/promises";
// GitHub Pages has no SPA fallback. Real route shells make phone deep links return 200.
const routes = ["auth", "onboarding", "home", "tasks", "check-in", "analytics", "history", "settings", "review"];
for (const route of routes) {
  await mkdir("dist/" + route, { recursive: true });
  await copyFile("dist/index.html", "dist/" + route + "/index.html");
}
await copyFile("dist/index.html", "dist/404.html");
await writeFile("dist/.nojekyll", "");
