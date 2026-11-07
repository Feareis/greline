"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Back and forward buttons change the query string without us.
  addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    removeEventListener("popstate", listener);
  };
}

/**
 * Replaces, rather than pushes, the history entry: "back" leaves the site instead of stepping
 * through every stop clicked.
 */
function setLinkSearch(search: string): void {
  if (location.search === search) return;
  history.replaceState(history.state, "", `${location.pathname}${search}`);
  for (const listener of listeners) listener();
}

const getSearch = () => location.search;
// The server renders the bare map: the page is the same for every link.
const getServerSearch = () => "";

/** The address bar's query string ("?stop=..."), and how to change it. */
export function useLinkSearch(): [string, (search: string) => void] {
  return [useSyncExternalStore(subscribe, getSearch, getServerSearch), setLinkSearch];
}
