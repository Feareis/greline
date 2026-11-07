import type { Departure, Disruption, NetworkId, TransitSchedule, Weather } from "@greline/types";
import { departuresResponseSchema, disruptionsResponseSchema, transitScheduleSchema, tripDelaysResponseSchema, weatherSchema } from "@greline/validation";

/** Our API answered with an error status, or with a body we cannot trust. */
export class GrelineApiError extends Error {
  override name = "GrelineApiError";

  constructor(
    readonly status: number,
    /** Machine-readable reason: the API `error` field, "http_error" or "invalid_response". */
    readonly code: string,
  ) {
    super(`Greline API error ${status} (${code})`);
  }
}

export type FetchFunction = (url: string, init?: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  /** Origin of our API: "" for same-origin web calls, the full URL for the mobile app. */
  baseUrl: string;
  fetch?: FetchFunction;
}

export interface GrelineApiClient {
  getDepartures(stopId: string, signal?: AbortSignal): Promise<Departure[]>;
  /** Today's schedule of one network. */
  getSchedule(network: NetworkId, signal?: AbortSignal): Promise<TransitSchedule>;
  /** Realtime delays in seconds, keyed by trip id. */
  getTripDelays(signal?: AbortSignal): Promise<Record<string, number>>;
  /** Current weather in Grenoble. */
  getWeather(signal?: AbortSignal): Promise<Weather>;
  /** Ongoing and upcoming official disruptions of our lines. */
  getDisruptions(signal?: AbortSignal): Promise<Disruption[]>;
}

interface Parser<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false };
}

// A body that is not JSON (e.g. an HTML page from a proxy) is an expected failure mode, not a
// bug: it becomes `undefined`, which the callers below turn into an explicit error code.
const jsonOrUndefined = (response: Response): Promise<unknown> => response.json().catch(() => undefined);

async function errorCode(response: Response): Promise<string> {
  const body = await jsonOrUndefined(response);
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
  return "http_error";
}

/** Client of the Greline API (never the M API): shared by the web and mobile apps. */
export function createApiClient({ baseUrl, fetch: fetchFn = fetch }: ApiClientOptions): GrelineApiClient {
  const root = baseUrl.replace(/\/+$/, "");
  async function getJson<T>(path: string, schema: Parser<T>, signal?: AbortSignal): Promise<T> {
    const response = await fetchFn(`${root}${path}`, { signal });
    if (!response.ok) throw new GrelineApiError(response.status, await errorCode(response));
    const parsed = schema.safeParse(await jsonOrUndefined(response));
    if (!parsed.success) throw new GrelineApiError(response.status, "invalid_response");
    return parsed.data;
  }
  return {
    async getDepartures(stopId, signal) {
      const body = await getJson(`/api/stops/${encodeURIComponent(stopId)}/departures`, departuresResponseSchema, signal);
      return body.departures;
    },
    getSchedule: (network, signal) => getJson(`/api/network/schedule?network=${network}`, transitScheduleSchema, signal),
    async getTripDelays(signal) {
      return (await getJson("/api/network/delays", tripDelaysResponseSchema, signal)).delays;
    },
    getWeather: (signal) => getJson("/api/weather", weatherSchema, signal),
    async getDisruptions(signal) {
      return (await getJson("/api/disruptions", disruptionsResponseSchema, signal)).disruptions;
    },
  };
}
