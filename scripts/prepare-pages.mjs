import { copyFile, mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
// Pages artifact upload excludes hidden directories. Expo exports pnpm assets
// under .pnpm, so make those directories visible and rewrite bundle references.
async function prepareAssets(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    let file = path.join(directory, item.name);
    if (item.isDirectory()) {
      if (item.name === ".pnpm") {
        const target = path.join(directory, "pnpm");
        await rename(file, target);
        file = target;
      }
      await prepareAssets(file);
    } else if (/\.(js|json|html|css)$/.test(item.name)) {
      const text = await readFile(file, "utf8");
      const fixed = text.replaceAll(".pnpm/", "pnpm/");
      if (fixed !== text) await writeFile(file, fixed);
    }
  }
}
await prepareAssets("dist");
// Real route shells let direct phone links and reloads return HTTP 200.
for (const route of ["auth", "onboarding", "home", "tasks", "check-in", "analytics", "history", "settings", "review"]) {
  await mkdir("dist/" + route, { recursive: true });
  await copyFile("dist/index.html", "dist/" + route + "/index.html");
}
await copyFile("dist/index.html", "dist/404.html");
await writeFile("dist/.nojekyll", "");
