"use client";

import { fr } from "@greline/i18n";
import type { SearchResult } from "@greline/services";
import type { Stop, TransitNetwork } from "@greline/types";
import Image from "next/image";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import logoDark from "../../../../assets/logo/svg/greline-logo-dark.svg";
import logoLight from "../../../../assets/logo/svg/greline-logo-light.svg";
import symbol from "../../../../assets/logo/svg/greline-symbol.svg";
import { setTheme, useTheme } from "@/lib/theme";
import { colors, FLOATING_BUTTON, glass } from "@/lib/theme-tokens";
import { AboutDialog } from "./about-dialog";
import { MoonIcon, StarIcon, SunIcon } from "./icons";
import { LocateButton, type UserLocation } from "./locate-button";
import { RefreshIndicator } from "./refresh-indicator";
import { SearchBox } from "./search-box";

// Inlined at build time from next.config.ts.
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const ENVIRONMENT = process.env.NEXT_PUBLIC_APP_ENV === "prod" ? "prod" : "dev";
// Production shows the version alone; elsewhere it is prefixed with the environment ("DEV@v1.7.5").
const VERSION_TEXT = ENVIRONMENT === "prod" ? `v${VERSION}` : `${fr.topBar.environment.dev}@v${VERSION}`;
// The heading spans the free width of the bar: only the logo itself catches the pointer, not the map around it.
const LOGO_SIZE = "pointer-events-auto h-auto max-h-10 w-auto max-w-full";

/** Sun or moon: switches to the other theme. In the bar on wide screens, in the "⋯" menu on phones. */
export function ThemeToggle() {
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

/**
 * "DEV@v1.7.5" in red, or "v1.7.5" in green in production. Left out on phones, where the buttons
 * need the whole bar: the version is also in Sources.
 */
function VersionBadge() {
  return (
    <span
      title={fr.topBar.versionLabel(fr.topBar.environment[ENVIRONMENT], VERSION)}
      className="hidden h-9 items-center rounded-full px-3 font-mono text-xs font-bold text-white shadow-lg sm:flex"
      style={{ background: ENVIRONMENT === "prod" ? colors.success : colors.danger }}
    >
      <span className="sr-only">{fr.topBar.versionLabel(fr.topBar.environment[ENVIRONMENT], VERSION)}</span>
      <span aria-hidden>{VERSION_TEXT}</span>
    </span>
  );
}

interface TopBarProps {
  network: TransitNetwork;
  /** Stops "locate me" may offer: those drawn on the map. */
  stops: readonly Stop[];
  onSearchPick: (result: SearchResult) => void;
  onSelect: (stopId: string) => void;
  onLocated: (location: UserLocation | null) => void;
  mineOpen: boolean;
  onToggleMine: () => void;
  /**
   * Floats in the middle of the bar on wide screens (the disruption banner), placed with the
   * `--bar-free-start` / `--bar-free-end` variables; elsewhere on narrower ones.
   */
  center?: ReactNode;
  /** Phones only: the "⋯" menu, last in the bar, holding what the bar has no room for. */
  phoneMenu?: ReactNode;
}

/** Transparent bar over the map: site name on the left, controls and version on the right. */
const FREE_ROOM_GAP_PX = 8;

/**
 * Publishes, as CSS variables on the bar, where the free room between the logo and the buttons
 * starts and ends: what floats in the middle stays centered on the page as far as that room allows.
 */
function useFreeRoom() {
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLHeadingElement>(null);
  const navRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const header = headerRef.current;
    const heading = logoRef.current;
    const nav = navRef.current;
    if (!header || !heading || !nav) return;
    const measure = () => {
      const origin = header.getBoundingClientRect().left;
      const logo = [...heading.querySelectorAll("img")].find((img) => img.offsetWidth > 0) ?? heading;
      header.style.setProperty("--bar-free-start", `${logo.getBoundingClientRect().right - origin + FREE_ROOM_GAP_PX}px`);
      header.style.setProperty("--bar-free-end", `${nav.getBoundingClientRect().left - origin - FREE_ROOM_GAP_PX}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);
  return { headerRef, logoRef, navRef };
}

export function TopBar({ network, stops, onSearchPick, onSelect, onLocated, mineOpen, onToggleMine, center, phoneMenu }: TopBarProps) {
  const { headerRef, logoRef, navRef } = useFreeRoom();
  return (
    // Above the left column (z-20): the disruption banner and the search unfold over it.
    <header ref={headerRef} className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3">
      {/* Phones and small tablets show the symbol alone, wider screens the logo of the theme. Every image is in the page and CSS
          picks one: the theme is only known in the browser. The logo shrinks, keeping its proportions, when
          the buttons need the room. */}
      <h1 ref={logoRef} className="min-w-0 flex-1" style={{ filter: `drop-shadow(0 0 3px ${colors.background})` }}>
        <Image src={symbol} alt={fr.app.name} priority className="pointer-events-auto h-auto max-h-8 w-auto max-w-full md:hidden" />
        <Image src={logoDark} alt={fr.app.name} priority className={`hidden ${LOGO_SIZE} md:block md:in-data-[theme=light]:hidden`} />
        <Image src={logoLight} alt={fr.app.name} priority className={`hidden ${LOGO_SIZE} md:in-data-[theme=light]:block`} />
      </h1>
      {center}
      <nav ref={navRef} aria-label={fr.topBar.label} className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        <SearchBox network={network} onPick={onSearchPick} />
        {/* Phones find it in the "⋯" menu. */}
        <div className="hidden sm:contents">
          <ThemeToggle />
        </div>
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
        <RefreshIndicator />
        <VersionBadge />
        {phoneMenu}
      </nav>
    </header>
  );
}
