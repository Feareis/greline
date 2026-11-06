import type { TramNetwork } from "@greline/types";
import { mLineShapesSchema, mRoutesSchema, mTimesheetSchema } from "@greline/validation";
import { shapeIdOf, toTramNetwork } from "./to-network";

const M_API_BASE = "https://data.mobilites-m.fr/api";

/** The M API rejects requests without an `origin` header naming the client application. */
export const M_API_ORIGIN = "greline";

const REQUEST_TIMEOUT_MS = 10_000;

/** M API endpoints (license: ODbL). Server-side use only: clients call our own API. */
export const M_API = {
  tramRoutes: `${M_API_BASE}/routers/default/index/routes?reseaux=TRAM`,
  lineShapes: (shapeIds: readonly string[]) =>
    `${M_API_BASE}/lines/json?types=ligne&codes=${shapeIds.map(encodeURIComponent).join(",")}`,
  timesheet: (routeId: string) => `${M_API_BASE}/ficheHoraires/json?route=${encodeURIComponent(routeId)}`,
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

/** GETs a M API endpoint and validates the JSON body; throws MApiError on any surprise. */
export async function fetchFromMApi<T>(url: string, schema: Parser<T>, fetchFn: FetchLike): Promise<T> {
  const response = await fetchFn(url, {
    headers: { origin: M_API_ORIGIN },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new MApiError(`M API answered ${response.status} for ${url}`);
  const body: unknown = await response.json();
  try {
    return schema.parse(body);
  } catch (error) {
    throw new MApiError(`M API sent an unexpected payload for ${url}`, { cause: error });
  }
}

/** Fetches the tram lines, their shapes and timesheets from the M API (7 requests). */
export async function fetchTramNetwork(fetchFn: FetchLike = fetch): Promise<TramNetwork> {
  const routes = await fetchFromMApi(M_API.tramRoutes, mRoutesSchema, fetchFn);
  const [shapes, timesheets] = await Promise.all([
    fetchFromMApi(M_API.lineShapes(routes.map((r) => shapeIdOf(r.id))), mLineShapesSchema, fetchFn),
    Promise.all(routes.map((r) => fetchFromMApi(M_API.timesheet(r.id), mTimesheetSchema, fetchFn))),
  ]);
  return toTramNetwork({
    routes,
    shapes,
    timesheets: new Map(routes.map((r, i) => [r.id, timesheets[i]!])),
  });
}
