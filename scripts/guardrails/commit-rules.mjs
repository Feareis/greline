// Shared commit message rules (used by the commit-msg hook and by CI).

const TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"];
const HEADER = new RegExp(`^(${TYPES.join("|")})(\\([a-z0-9][a-z0-9-]*\\))?!?: \\S.*$`);
const MAX_HEADER = 72;

const FORBIDDEN = [
  { re: /^co-authored-by:/im, why: "co-author trailers are not allowed" },
  { re: /^claude-session:/im, why: "session trailers are not allowed" },
  { re: /^signed-off-by:.*(claude|copilot|chatgpt|openai|anthropic|cursor|codex|gemini)/im, why: "tool sign-offs are not allowed" },
  { re: /generated (with|by) .*(claude|copilot|chatgpt|cursor|codex|gemini|ai\b)/i, why: "generated-by attribution lines are not allowed" },
  { re: /noreply@anthropic\.com|copilot@github\.com/i, why: "tool attribution e-mails are not allowed" },
  { re: /\u{1F916}/u, why: "robot emoji attribution is not allowed" },
];

// Latin letters with diacritics (French accents, ligatures): a strong signal of a non-English message.
const NON_ENGLISH = /[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0152\u0153]/;

/** Removes git comments and everything below the scissors line. */
export function cleanMessage(raw) {
  const scissors = raw.indexOf("# ------------------------ >8 ------------------------");
  const body = scissors === -1 ? raw : raw.slice(0, scissors);
  return body
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .join("\n")
    .trim();
}

/** Returns a list of problems (empty when the message is valid). */
export function validateMessage(raw) {
  const message = cleanMessage(raw);
  const problems = [];
  if (!message) return ["commit message is empty"];

  const header = message.split("\n")[0];
  const isAutomatic = /^(Merge|Revert|fixup!|squash!|amend!) /.test(header);

  if (!isAutomatic) {
    if (!HEADER.test(header)) {
      problems.push(
        `header must follow Conventional Commits: "type(scope): subject" (types: ${TYPES.join(", ")})`,
      );
    }
    if (header.length > MAX_HEADER) {
      problems.push(`header is ${header.length} characters long (max ${MAX_HEADER})`);
    }
  }

  for (const { re, why } of FORBIDDEN) {
    if (re.test(message)) problems.push(why);
  }
  if (NON_ENGLISH.test(message)) {
    problems.push("commit messages must be written in English (accented characters found)");
  }
  return problems;
}
