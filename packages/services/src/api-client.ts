import type { Departure } from "@greline/types";
import { departuresResponseSchema } from "@greline/validation";

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
  return {
    async getDepartures(stopId, signal) {
      const response = await fetchFn(`${root}/api/stops/${encodeURIComponent(stopId)}/departures`, { signal });
      if (!response.ok) throw new GrelineApiError(response.status, await errorCode(response));
      const parsed = departuresResponseSchema.safeParse(await jsonOrUndefined(response));
      if (!parsed.success) throw new GrelineApiError(response.status, "invalid_response");
      return parsed.data.departures;
    },
  };
}
