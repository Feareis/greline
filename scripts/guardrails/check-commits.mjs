// CI check: validates every commit message in a git range (e.g. origin/main..HEAD).
import { execSync } from "node:child_process";
import { validateMessage } from "./commit-rules.mjs";

const range = process.argv[2] ?? "HEAD";
const raw = execSync(`git log --format=%H%x00%B%x1e ${range}`, { encoding: "utf8" });
let failed = false;

for (const entry of raw.split("\x1e")) {
  const [sha, message] = entry.trim().split("\x00");
  if (!sha) continue;
  const problems = validateMessage(message ?? "");
  if (problems.length > 0) {
    failed = true;
    console.error(`\u2716 ${sha.slice(0, 8)} ${(message ?? "").split("\n")[0]}`);
    for (const p of problems) console.error(`    - ${p}`);
  }
}

if (failed) process.exit(1);
console.log("All commit messages follow the project rules.");
