"use client";

import type { ThemeName } from "@greline/theme";
import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./theme-tokens";

const listeners = new Set<() => void>();

function currentTheme(): ThemeName {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // Storage can be blocked (private mode): the theme still applies, it just is not remembered.
    console.warn("Theme preference not saved", error);
  }
  for (const listener of listeners) listener();
}

/** The active theme. The server renders dark; the client corrects it right after hydration. */
export function useTheme(): ThemeName {
  return useSyncExternalStore(subscribe, currentTheme, () => "dark");
}
