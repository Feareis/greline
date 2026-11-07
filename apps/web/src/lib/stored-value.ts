"use client";

import { useSyncExternalStore } from "react";

/** A value kept in localStorage and shared by every component that reads it. */
export interface StoredValue<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
  fallback: T;
}

/**
 * `parse` turns what was stored (already JSON-decoded) into a valid value, or null to use
 * `fallback`. The value is read once, then kept in memory: snapshots must stay the same object.
 */
export function storedValue<T>(key: string, parse: (raw: unknown) => T | null, fallback: T): StoredValue<T> {
  const listeners = new Set<() => void>();
  let current: T | undefined;
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return (raw === null ? null : parse(JSON.parse(raw))) ?? fallback;
    } catch (error) {
      // Blocked storage or a corrupted value: start from the fallback.
      console.warn(`Stored "${key}" ignored`, error);
      return fallback;
    }
  };
  return {
    fallback,
    get: () => (current ??= read()),
    set(next) {
      current = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (error) {
        console.warn(`"${key}" not saved`, error);
      }
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The current value; the server (and the first client render) sees the fallback. */
export function useStoredValue<T>(store: StoredValue<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.fallback);
}
