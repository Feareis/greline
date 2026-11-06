// Points git to the versioned hooks in .githooks (runs on `pnpm install`).
import { execSync } from "node:child_process";

try {
  execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
  console.log("git hooks installed (.githooks)");
} catch {
  // Not a git repository (e.g. CI tarball): nothing to do.
}
