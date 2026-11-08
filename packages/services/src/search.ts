import type { Line, Stop } from "@greline/types";

export type SearchResult = { kind: "line"; line: Line } | { kind: "stop"; stop: Stop };

/** Lower case, without accents, every run of punctuation or spaces turned into one space. */
export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const words = (normalized: string): string[] => normalized.split(" ");
const everyWordStarts = (queryWords: readonly string[], target: readonly string[]): boolean =>
  queryWords.every((q) => target.some((word) => word.startsWith(q)));

/** Lower is better; null when the line does not match. Only short names: long ones list termini. */
function lineRank(line: Line, query: string): number | null {
  const name = normalizeName(line.shortName);
  if (name === query) return 0;
  return name.startsWith(query) ? 1 : null;
}

/**
 * Lower is better; null when the stop does not match. "grandp" finds Grand'place (spaces
 * ignored), "hugo vic" finds Victor Hugo (words in any order), "bourg meylan" tells homonyms
 * apart with the city.
 */
function stopRank(stop: Stop, query: string): number | null {
  const name = normalizeName(stop.name);
  if (name.startsWith(query) || name.replaceAll(" ", "").startsWith(query.replaceAll(" ", ""))) return 2;
  const queryWords = words(query);
  if (everyWordStarts(queryWords, words(name))) return 3;
  return everyWordStarts(queryWords, words(`${name} ${normalizeName(stop.city)}`)) ? 4 : null;
}

interface Ranked {
  result: SearchResult;
  rank: number;
  label: string;
}

/**
 * Lines and stops matching what the user typed, best first: the line named exactly, lines
 * starting with it, then stops (name start, then words anywhere). ~450 stops: a full scan per
 * keystroke is well under a millisecond.
 */
export function searchNetwork(
  query: string,
  network: { lines: readonly Line[]; stops: readonly Stop[] },
  limit = 8,
  { lines = true }: { lines?: boolean } = {},
): SearchResult[] {
  const normalized = normalizeName(query);
  if (!normalized) return [];
  const ranked: Ranked[] = [];
  if (lines) {
    for (const line of network.lines) {
      const rank = lineRank(line, normalized);
      if (rank !== null) ranked.push({ result: { kind: "line", line }, rank, label: line.shortName });
    }
  }
  for (const stop of network.stops) {
    const rank = stopRank(stop, normalized);
    if (rank !== null) ranked.push({ result: { kind: "stop", stop }, rank, label: `${stop.name} ${stop.city}` });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, "fr"));
  return ranked.slice(0, limit).map(({ result }) => result);
}
