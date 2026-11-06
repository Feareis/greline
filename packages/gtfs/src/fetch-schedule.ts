import type { TransitSchedule } from "@greline/types";
import { type FetchLike, M_API_ORIGIN, MApiError } from "./fetch-network";
import { buildSchedule, GTFS_SCHEDULE_FILES } from "./schedule";
import { readZipText } from "./zip";

const GTFS_URL = "https://data.mobilites-m.fr/api/gtfs/SEM";
/** The archive weighs ~6.5 MB: far more time than the JSON endpoints need. */
const GTFS_TIMEOUT_MS = 60_000;

/** Downloads the network GTFS feed and extracts the tram schedule of a service day ("YYYY-MM-DD"). */
export async function fetchSchedule(serviceDate: string, fetchFn: FetchLike = fetch): Promise<TransitSchedule> {
  const response = await fetchFn(GTFS_URL, {
    headers: { origin: M_API_ORIGIN },
    signal: AbortSignal.timeout(GTFS_TIMEOUT_MS),
  });
  if (!response.ok) throw new MApiError(`M API answered ${response.status} for ${GTFS_URL}`);
  const archive = new Uint8Array(await response.arrayBuffer());
  try {
    return buildSchedule(await readZipText(archive, GTFS_SCHEDULE_FILES), serviceDate);
  } catch (error) {
    throw new MApiError(`M API sent an unusable GTFS archive: ${(error as Error).message}`, { cause: error });
  }
}
