"use client";

import { NETWORK_IDS, type NetworkId } from "@greline/types";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "greline-networks";
/** Trams and Chrono buses: the backbone of the network, readable at a glance. */
const DEFAULT_NETWORKS: readonly NetworkId[] = ["tram", "chrono"];

function savedNetworks(): readonly NetworkId[] | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!Array.isArray(saved)) return null;
    const valid = NETWORK_IDS.filter((id) => saved.includes(id));
    return valid.length > 0 ? valid : null;
  } catch (error) {
    // Blocked storage or a corrupted value: fall back to the defaults.
    console.warn("Saved network filter ignored", error);
    return null;
  }
}

const listeners = new Set<() => void>();
let current: readonly NetworkId[] | null = null;

// Read once, then kept in memory: the snapshot must stay the same array between renders.
function snapshot(): readonly NetworkId[] {
  current ??= savedNetworks() ?? DEFAULT_NETWORKS;
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setNetworks(next: readonly NetworkId[]): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Network filter not saved", error);
  }
  for (const listener of listeners) listener();
}

/** Networks shown on the map, remembered across visits. The server renders the defaults. */
export function useNetworkFilter(): [readonly NetworkId[], (networks: readonly NetworkId[]) => void] {
  return [useSyncExternalStore(subscribe, snapshot, () => DEFAULT_NETWORKS), setNetworks];
}
