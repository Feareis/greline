import type { GrelineApiClient } from "@greline/services";
import { describe, expect, it, vi } from "vitest";
import { disruptionsQueryOptions } from "./use-disruptions";

describe("disruptionsQueryOptions", () => {
  it("asks the injected client and refreshes every 2 min while visible", async () => {
    const getDisruptions = vi.fn(async () => []);
    const options = disruptionsQueryOptions({ getDisruptions } as unknown as GrelineApiClient);
    const signal = new AbortController().signal;
    await (options.queryFn as (context: { signal: AbortSignal }) => unknown)({ signal });
    expect(getDisruptions).toHaveBeenCalledWith(signal);
    expect(options.refetchInterval).toBe(120_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });
});
