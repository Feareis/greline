"use client";

import { NETWORK_IDS, type NetworkId } from "@greline/types";
import { storedValue, useStoredValue } from "./stored-value";

/** Trams and Chrono buses: the backbone of the network, readable at a glance. */
const DEFAULT_NETWORKS: readonly NetworkId[] = ["tram", "chrono"];

const networks = storedValue<readonly NetworkId[]>(
  "greline-networks",
  (raw) => {
    if (!Array.isArray(raw)) return null;
    const valid = NETWORK_IDS.filter((id) => raw.includes(id));
    return valid.length > 0 ? valid : null;
  },
  DEFAULT_NETWORKS,
);

/** Networks shown on the map, remembered across visits. The server renders the defaults. */
export function useNetworkFilter(): [readonly NetworkId[], (networks: readonly NetworkId[]) => void] {
  return [useStoredValue(networks), networks.set];
}
