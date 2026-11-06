// git commit-msg hook: rejects messages that break the project rules (README, Contribuer).
import fs from "node:fs";
import { validateMessage } from "./commit-rules.mjs";

const file = process.argv[2];
const problems = validateMessage(fs.readFileSync(file, "utf8"));

if (problems.length > 0) {
  console.error("\n\u2716 Commit rejected (see the README, section Contribuer):");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("");
  process.exit(1);
}
