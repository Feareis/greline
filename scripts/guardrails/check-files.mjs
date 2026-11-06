// File guardrails (see the README, section Contribuer). Usage:
//   node scripts/guardrails/check-files.mjs --staged   (pre-commit hook)
//   node scripts/guardrails/check-files.mjs --all      (CI / pnpm check)
import { execSync } from "node:child_process";
import fs from "node:fs";

const mode = process.argv.includes("--all") ? "all" : "staged";

const files = (
  mode === "all"
    ? execSync("git ls-files", { encoding: "utf8" })
    : execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf8" })
)
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean);

const read = (file) =>
  mode === "all"
    ? fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
    : execSync(`git show ":${file}"`, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const LOCALES = /(^|\/)locales\//;
const ACCENTS = /[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0152\u0153]/;
const PLATFORM_IMPORT =
  /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)["'](react-dom|react-native|next|expo)([/"'-]|["'])/;
const ENV_FILE = /(^|\/)\.env(\..+)?$/;

const errors = [];

for (const file of files) {
  if (ENV_FILE.test(file) && !file.endsWith(".env.example")) {
    errors.push(`${file}: env files must not be committed (use .env.example)`);
    continue;
  }
  if (!CODE.test(file)) continue;

  const lines = read(file).split("\n");
  lines.forEach((line, i) => {
    if (!LOCALES.test(file) && ACCENTS.test(line)) {
      errors.push(
        `${file}:${i + 1}: non-English text in code. Write code/comments in English; put French UI text in packages/i18n/src/locales/`,
      );
    }
    if (file.startsWith("packages/") && PLATFORM_IMPORT.test(line)) {
      errors.push(`${file}:${i + 1}: shared packages must not import react-dom, next, react-native or expo`);
    }
  });
}

if (errors.length > 0) {
  console.error("\n\u2716 Guardrails failed (see the README, section Contribuer):");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("");
  process.exit(1);
}
console.log(`Guardrails OK (${files.length} file(s) checked).`);
