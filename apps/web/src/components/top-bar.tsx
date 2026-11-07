"use client";

import { fr } from "@greline/i18n";
import type { Stop } from "@greline/types";
import { setTheme, useTheme } from "@/lib/theme";
import { colors, FLOATING_BUTTON, glass } from "@/lib/theme-tokens";
import { AboutDialog } from "./about-dialog";
import { MoonIcon, StarIcon, SunIcon } from "./icons";
import { LocateButton, type UserLocation } from "./locate-button";

// Inlined at build time from next.config.ts.
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const ENVIRONMENT = process.env.NEXT_PUBLIC_APP_ENV === "prod" ? "prod" : "dev";
const VERSION_TEXT = `${fr.topBar.environment[ENVIRONMENT]}@v${VERSION}`;

function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === "light" ? fr.topBar.themeToLight : fr.topBar.themeToDark}
      title={next === "light" ? fr.topBar.themeToLight : fr.topBar.themeToDark}
      className={FLOATING_BUTTON}
      style={glass}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/** "DEV@v0.4.0" in red, "PROD@v1.0.0" in green. */
function VersionBadge() {
  return (
    <span
      title={fr.topBar.versionLabel(fr.topBar.environment[ENVIRONMENT], VERSION)}
      className="flex h-9 items-center rounded-full px-3 font-mono text-xs font-bold text-white shadow-lg"
      style={{ background: ENVIRONMENT === "prod" ? colors.success : colors.danger }}
    >
      <span className="sr-only">{fr.topBar.versionLabel(fr.topBar.environment[ENVIRONMENT], VERSION)}</span>
      {/* Small screens: the environment only; the version stays in the tooltip and in Sources. */}
      <span aria-hidden className="sm:hidden">
        {fr.topBar.environment[ENVIRONMENT]}
      </span>
      <span aria-hidden className="hidden sm:inline">
        {VERSION_TEXT}
      </span>
    </span>
  );
}

interface TopBarProps {
  stops: readonly Stop[];
  onSelect: (stopId: string) => void;
  onLocated: (location: UserLocation | null) => void;
  mineOpen: boolean;
  onToggleMine: () => void;
}

/** Transparent bar over the map: site name on the left, controls and version on the right. */
export function TopBar({ stops, onSelect, onLocated, mineOpen, onToggleMine }: TopBarProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
      {/* No logo yet: the name stands in for it. */}
      <h1
        className="pointer-events-auto text-xl font-bold tracking-tight sm:text-2xl"
        style={{ color: colors.text, textShadow: `0 0 6px ${colors.background}, 0 0 2px ${colors.background}` }}
      >
        {fr.app.name}
      </h1>
      <nav aria-label={fr.topBar.label} className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        <LocateButton stops={stops} onSelect={onSelect} onLocated={onLocated} />
        <button
          type="button"
          onClick={onToggleMine}
          aria-pressed={mineOpen}
          aria-label={fr.mine.buttonLabel}
          title={fr.mine.buttonLabel}
          className={FLOATING_BUTTON}
          style={glass}
        >
          <StarIcon filled={mineOpen} />
          <span className="hidden sm:inline">{fr.mine.button}</span>
        </button>
        <AboutDialog versionText={VERSION_TEXT} />
        <VersionBadge />
      </nav>
    </header>
  );
}
