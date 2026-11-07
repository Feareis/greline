// pre-commit hook: counts the commit in the web app version when it touches the site.
// `git commit --amend` would count the same commit twice: set GRELINE_KEEP_VERSION=1 for it.
import { execSync } from "node:child_process";
import fs from "node:fs";
import { WEB_PACKAGE, nextWebVersion, setVersion } from "./version-rules.mjs";

if (process.env.GRELINE_KEEP_VERSION === "1") process.exit(0);

const git = (args, input) => execSync(`git ${args}`, { encoding: "utf8", input });

const files = git("diff --cached --name-only").split("\n").filter(Boolean);
const stagedJson = git(`show :${WEB_PACKAGE}`);
const version = nextWebVersion({
  files,
  headVersion: JSON.parse(git(`show HEAD:${WEB_PACKAGE}`)).version,
  stagedVersion: JSON.parse(stagedJson).version,
});
if (version === null) process.exit(0);

// Write the staged blob directly so unstaged edits of package.json never sneak into the commit.
const blob = git("hash-object -w --stdin", setVersion(stagedJson, version)).trim();
git(`update-index --cacheinfo 100644,${blob},${WEB_PACKAGE}`);
fs.writeFileSync(WEB_PACKAGE, setVersion(fs.readFileSync(WEB_PACKAGE, "utf8"), version));
console.log(`Web version: ${version}`);
