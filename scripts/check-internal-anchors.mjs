import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const violations = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;
    const source = await readFile(path, "utf8");
    if (/<a\b[^>]*\bhref\s*=\s*["']\//i.test(source)) violations.push(path);
  }
}

await scan(root);
if (violations.length > 0) {
  console.error("Internal anchors must use React Router Link/navigate:");
  for (const path of violations) console.error(`- ${path}`);
  process.exit(1);
}
console.log("Internal-anchor regression check passed.");
