import type { ParkAndRide } from "@greline/types";
import type { MParkingCounts, MParkings } from "@greline/validation";

/** Linking words written in lower case inside a name ("Pont-de-Claix", "Pole d'Echange"). */
const LINKING_WORDS = new Set(["de", "du", "des", "et", "d'", "l'"]);

const capitalized = (word: string): string =>
  word.toLowerCase().replace(/(^|')(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());

/** "d'echange" -> "d'", "de" -> "de": what decides whether the word is a linking one. */
const linkingPart = (word: string): string => {
  const lower = word.toLowerCase();
  const apostrophe = lower.indexOf("'");
  return apostrophe >= 0 ? lower.slice(0, apostrophe + 1) : lower;
};

/**
 * The M API writes car park names in capitals ("EYBENS - LE VERDERET"). Every word gets a capital,
 * linking words inside a name keep a small letter; "Le", "La", "Les" belong to place names and
 * keep theirs ("Le Verderet").
 */
export function parkingName(raw: string): string {
  return raw
    .trim()
    .split(/([ -]+)/)
    .map((part, index) => {
      if (index % 2 === 1) return part; // a separator
      const word = capitalized(part);
      const link = linkingPart(part);
      if (index === 0 || !LINKING_WORDS.has(link)) return word;
      return link + word.slice(link.length);
    })
    .join("");
}

const countOf = (counts: MParkingCounts, id: string, capacity: number) => {
  const count = counts[id];
  if (count?.nb_pr_libres === null || count?.nb_pr_libres === undefined) return { free: null, updatedAt: null };
  // Sensors drift: a car park sometimes reports a space or two more than it has.
  const free = Math.min(Math.max(count.nb_pr_libres, 0), capacity);
  return { free, updatedAt: new Date(count.time).toISOString() };
};

/** The car parks with P+R spaces, each with its live count when its sensors report one. */
export function toParkAndRides(parkings: MParkings, counts: MParkingCounts): ParkAndRide[] {
  return parkings.features.flatMap(({ properties, geometry }) => {
    const capacity = properties.nb_pr ?? 0;
    if (capacity === 0) return [];
    const [lon, lat] = geometry.coordinates;
    return [
      {
        id: properties.id,
        name: parkingName(properties.nom),
        city: properties.commune,
        lat,
        lon,
        capacity,
        ...countOf(counts, properties.id, capacity),
      },
    ];
  });
}
