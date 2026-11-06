import { GrelineApiError, type GrelineApiClient } from "@greline/services";
import { createContext, type ReactNode, use } from "react";

/** Injected by each app: which API to call, and how often to refresh live data. */
export interface ApiConfig {
  client: GrelineApiClient;
  departuresRefreshMs?: number;
  delaysRefreshMs?: number;
}

const ApiConfigContext = createContext<ApiConfig | null>(null);

export function ApiConfigProvider({ config, children }: { config: ApiConfig; children: ReactNode }) {
  return <ApiConfigContext value={config}>{children}</ApiConfigContext>;
}

export function useApiConfig(): ApiConfig {
  const config = use(ApiConfigContext);
  if (!config) throw new Error("Greline hooks must be used inside an <ApiConfigProvider>");
  return config;
}

const MAX_RETRIES = 2;

/** A 4xx (unknown station, bad id) will not fix itself; a 5xx (M API down) may. */
export function retryServerErrors(failureCount: number, error: Error): boolean {
  return failureCount < MAX_RETRIES && !(error instanceof GrelineApiError && error.status < 500);
}
