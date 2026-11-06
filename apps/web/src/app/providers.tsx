"use client";

import { type ApiConfig, ApiConfigProvider } from "@greline/hooks";
import { createApiClient } from "@greline/services";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

// Same-origin: the web app calls its own /api routes, never the M API.
const apiConfig: ApiConfig = { client: createApiClient({ baseUrl: "" }) };

export function Providers({ children }: { children: ReactNode }) {
  // One QueryClient per browser session (useState keeps it stable across re-renders).
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ApiConfigProvider config={apiConfig}>{children}</ApiConfigProvider>
    </QueryClientProvider>
  );
}
