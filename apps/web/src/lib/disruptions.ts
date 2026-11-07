import { fetchDisruptions } from "@greline/gtfs";
import type { Disruption } from "@greline/types";
import { cacheLife } from "next/cache";
import { getTransitNetwork } from "@/lib/transit-network";

const REFRESH_S = 120;

/** Ongoing and upcoming disruptions of our lines, cached 2 min: one M API request per window. */
export async function getDisruptions(): Promise<Disruption[]> {
  "use cache";
  cacheLife({ stale: REFRESH_S, revalidate: REFRESH_S, expire: 4 * REFRESH_S });
  const { disruptions, invalidEvents } = await fetchDisruptions(await getTransitNetwork());
  if (invalidEvents > 0) console.warn(`Disruptions: ${invalidEvents} M API event(s) skipped (unexpected shape)`);
  return disruptions;
}
