// Web app versioning rule (README, section Contribuer): 1.<stage>.<commits touching the site>.

export const WEB_PACKAGE = "apps/web/package.json";

// Shared packages are bundled into the site, so a change there is a change to the site.
const WEB_PATHS = ["apps/web/", "packages/"];
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** Returns the version the commit must carry, or null when the staged version stays as is. */
export function nextWebVersion({ files, headVersion, stagedVersion }) {
  const match = SEMVER.exec(stagedVersion);
  if (!match) throw new Error(`${WEB_PACKAGE}: version "${stagedVersion}" is not MAJOR.MINOR.PATCH`);

  const touchesWeb = files.some((file) => WEB_PATHS.some((path) => file.startsWith(path)));
  // A version that differs from HEAD was set by hand (new stage): keep it.
  if (!touchesWeb || stagedVersion !== headVersion) return null;

  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

/** Rewrites the version field of a package.json text, leaving the rest byte for byte. */
export function setVersion(json, version) {
  return json.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);
}
