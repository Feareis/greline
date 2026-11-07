import { parisDate, serviceDayOrigin } from "@greline/services";
import type { TransitNetwork } from "@greline/types";
import { mLineShapesSchema, mRoutesSchema, type MTimesheet, mTimesheetSchema } from "@greline/validation";
import { isShownRoute, M_NETWORK_TYPES, shapeIdOf, toTransitNetwork } from "./to-network";

const M_API_BASE = "https://data.mobilites-m.fr/api";

/** The M API rejects requests without an `origin` header naming the client application. */
export const M_API_ORIGIN = "greline";

const REQUEST_TIMEOUT_MS = 10_000;
/**
 * A cold server builds the network from ~28 parallel requests: one hiccup used to blank the whole
 * map. Transient failures (network error, timeout, 5xx, 429) are retried, the rest fail at once.
 */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

const isTransientStatus = (status: number) => status >= 500 || status === 429;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchOnce = (url: string, fetchFn: FetchLike) =>
  fetchFn(url, { headers: { origin: M_API_ORIGIN }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

/** `fetchFn` with retries on transient failures; the last attempt's answer or error is passed on. */
async function fetchWithRetry(url: string, fetchFn: FetchLike): Promise<Response> {
  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchOnce(url, fetchFn);
      if (!isTransientStatus(response.status)) return response;
      console.warn(`M API answered ${response.status} for ${url}, retrying (${attempt}/${MAX_ATTEMPTS})`);
    } catch (error) {
      console.warn(`M API request failed for ${url}, retrying (${attempt}/${MAX_ATTEMPTS})`, error);
    }
    await wait(RETRY_DELAY_MS * attempt);
  }
  return fetchOnce(url, fetchFn);
}

/** A point on the map, in degrees. */
export interface Place {
  lat: number;
  lon: number;
}

const ITINERARY_COUNT = 3;

/** M API endpoints (license: ODbL). Server-side use only: clients call our own API. */
export const M_API = {
  routes: `${M_API_BASE}/routers/default/index/routes?reseaux=${Object.values(M_NETWORK_TYPES).flat().join(",")}`,
  lineShapes: (shapeIds: readonly string[]) =>
    `${M_API_BASE}/lines/json?types=ligne&codes=${shapeIds.map(encodeURIComponent).join(",")}`,
  events: `${M_API_BASE}/dyn/evtTC/json`,
  /** Best itineraries leaving now (OpenTripPlanner), walks and changes included. */
  plan: (from: Place, to: Place) =>
    `${M_API_BASE}/routers/default/plan?fromPlace=${from.lat},${from.lon}&toPlace=${to.lat},${to.lon}&mode=WALK,TRANSIT&numItineraries=${ITINERARY_COUNT}`,
  /** `time` (Unix ms) picks the trips listed; their stops give each line's stop order. */
  timesheet: (routeId: string, time: number) =>
    `${M_API_BASE}/ficheHoraires/json?route=${encodeURIComponent(routeId)}&time=${time}`,
} as const;

/** The M API answered with an HTTP error or with a payload we do not understand. */
export class MApiError extends Error {
  override name = "MApiError";
}

/** Minimal `fetch` signature, so tests (and other runtimes) can inject their own. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

interface Parser<T> {
  parse(data: unknown): T;
}

/**
 * GETs a M API endpoint and validates the JSON body; throws MApiError on any surprise.
 * `whenEmpty` is returned for a 204 answer (no body), which some endpoints use for "nothing".
 */
export async function fetchFromMApi<T>(
  url: string,
  schema: Parser<T>,
  fetchFn: FetchLike,
  whenEmpty?: T,
): Promise<T> {
  const response = await fetchWithRetry(url, fetchFn);
  if (!response.ok) throw new MApiError(`M API answered ${response.status} for ${url}`);
  if (response.status === 204) {
    if (whenEmpty === undefined) throw new MApiError(`M API answered 204 (no content) for ${url}`);
    return whenEmpty;
  }
  const body: unknown = await response.json();
  try {
    return schema.parse(body);
  } catch (error) {
    throw new MApiError(`M API sent an unexpected payload for ${url}`, { cause: error });
  }
}

const HALF_DAY_S = 12 * 3600;

/**
 * Noon in Grenoble on the day of `now`, in Unix ms. Timesheets list the trips after their `time`
 * (now by default): at night that is none (204) and the network would have no stop at all.
 */
function noonInGrenoble(now: Date): number {
  return (serviceDayOrigin(parisDate(now)) + HALF_DAY_S) * 1000;
}

/** A line without service that day keeps its shape and simply lists no stop. */
const NO_SERVICE: MTimesheet = {};

/** Fetches our lines, their shapes and timesheets from the M API (~28 requests, once a day). */
export async function fetchTransitNetwork(fetchFn: FetchLike = fetch, now: Date = new Date()): Promise<TransitNetwork> {
  const noon = noonInGrenoble(now);
  const routes = (await fetchFromMApi(M_API.routes, mRoutesSchema, fetchFn)).filter(isShownRoute);
  const [shapes, timesheets] = await Promise.all([
    fetchFromMApi(M_API.lineShapes(routes.map((r) => shapeIdOf(r.id))), mLineShapesSchema, fetchFn),
    Promise.all(routes.map((r) => fetchFromMApi(M_API.timesheet(r.id, noon), mTimesheetSchema, fetchFn, NO_SERVICE))),
  ]);
  return toTransitNetwork({
    routes,
    shapes,
    timesheets: new Map(routes.map((r, i) => [r.id, timesheets[i]!])),
  });
}
