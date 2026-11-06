import { fetchTransitNetwork } from "@greline/gtfs";
import type { TransitNetwork } from "@greline/types";
import { cacheLife } from "next/cache";

const ONE_DAY_S = 24 * 60 * 60;

/**
 * The tram network, fetched from the M API at most once a day per server instance.
 * Shared by the /api/network/trams route and the home page so both serve the same data.
 */
export async function getTransitNetwork(): Promise<TransitNetwork> {
  "use cache";
  cacheLife({ revalidate: ONE_DAY_S, expire: 7 * ONE_DAY_S });
  return fetchTransitNetwork();
}
