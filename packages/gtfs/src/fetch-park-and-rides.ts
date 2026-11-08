import type { ParkAndRide } from "@greline/types";
import { mParkingCountsSchema, mParkingsSchema } from "@greline/validation";
import { type FetchLike, fetchFromMApi, M_API } from "./fetch-network";
import { toParkAndRides } from "./to-park-and-rides";

/** The P+R car parks with their live counts, from two M API requests made together. */
export async function fetchParkAndRides(fetchFn: FetchLike = fetch): Promise<ParkAndRide[]> {
  const [parkings, counts] = await Promise.all([
    fetchFromMApi(M_API.parkings, mParkingsSchema, fetchFn),
    // No content means no car park counted right now: every P+R then shows its capacity only.
    fetchFromMApi(M_API.parkingCounts, mParkingCountsSchema, fetchFn, {}),
  ]);
  return toParkAndRides(parkings, counts);
}
