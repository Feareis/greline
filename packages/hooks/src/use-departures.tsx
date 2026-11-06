import { GrelineApiError, type GrelineApiClient } from "@greline/services";
import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, use } from "react";

export const DEFAULT_DEPARTURES_REFRESH_MS = 15_000;
const MAX_RETRIES = 2;

/** Injected by each app: which API to call, and how often. */
export interface DeparturesConfig {
  client: GrelineApiClient;
  refetchIntervalMs?: number;
}

/** TanStack Query options for a station's departures (pure, so it is testable without React). */
export function departuresQueryOptions(
  stopId: string | null,
  { client, refetchIntervalMs = DEFAULT_DEPARTURES_REFRESH_MS }: DeparturesConfig,
) {
  return queryOptions({
    queryKey: ["departures", stopId] as const,
    queryFn: stopId === null ? skipToken : ({ signal }) => client.getDepartures(stopId, signal),
    refetchInterval: refetchIntervalMs,
    // Interval refetches pause while the page is hidden. TanStack's focusManager listens to
    // `visibilitychange` on the web; the mobile app must bind it to React Native's AppState.
    refetchIntervalInBackground: false,
    staleTime: refetchIntervalMs,
    // A 4xx (unknown station, bad id) will not fix itself; a 5xx (M API down) may.
    retry: (failureCount, error) =>
      failureCount < MAX_RETRIES && !(error instanceof GrelineApiError && error.status < 500),
  });
}

const DeparturesConfigContext = createContext<DeparturesConfig | null>(null);

export function DeparturesConfigProvider({ config, children }: { config: DeparturesConfig; children: ReactNode }) {
  return <DeparturesConfigContext value={config}>{children}</DeparturesConfigContext>;
}

/** Live departures of a station (null = nothing selected, no request). */
export function useDepartures(stopId: string | null) {
  const config = use(DeparturesConfigContext);
  if (!config) throw new Error("useDepartures must be used inside a <DeparturesConfigProvider>");
  return useQuery(departuresQueryOptions(stopId, config));
}
