import type { Itinerary } from "@greline/types";
import { mPlanSchema } from "@greline/validation";
import { type FetchLike, fetchFromMApi, M_API, type Place } from "./fetch-network";
import { toItineraries } from "./to-itineraries";

/** The M planner's best itineraries leaving now from one place to another, changes included. */
export async function fetchItineraries(from: Place, to: Place, fetchFn: FetchLike = fetch): Promise<Itinerary[]> {
  const plan = await fetchFromMApi(M_API.plan(from, to), mPlanSchema, fetchFn);
  // "Nothing found" is an answer, not a failure; its reason is only worth a trace.
  if (plan.error) console.warn(`M planner found no itinerary: ${plan.error.message}`);
  return toItineraries(plan);
}
