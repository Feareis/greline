"use client";

import {
  AIR_QUALITY_REFRESH_MS,
  DEFAULT_DELAYS_REFRESH_MS,
  DEFAULT_DEPARTURES_REFRESH_MS,
  DISRUPTIONS_REFRESH_MS,
  ITINERARIES_REFRESH_MS,
  PARK_AND_RIDES_REFRESH_MS,
  SCHEDULE_REFRESH_MS,
  useApiConfig,
  useTripDelays,
  WEATHER_REFRESH_MS,
} from "@greline/hooks";
import { fr } from "@greline/i18n";
import { formatClockTime } from "@greline/services";
import { radii } from "@greline/theme";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useSyncExternalStore } from "react";
import { colors, FLOATING_BUTTON, glass } from "@/lib/theme-tokens";
import { RefreshIcon } from "./icons";
import { CloseButton, useDismiss } from "./panel-ui";

const MS_PER_SECOND = 1000;

interface Source {
  /** Query key prefix: every query of the source (one per stop, per network...) is looked at. */
  key: string;
  name: string;
  everyMs: number;
}

/** Last update of a source and whether anything on screen still uses it, read from the query cache. */
function useSourceState(key: string): { updatedAt: number; active: boolean } {
  const cache = useQueryClient().getQueryCache();
  const subscribe = useCallback((listener: () => void) => cache.subscribe(listener), [cache]);
  const snapshot = useCallback(() => {
    const queries = cache.findAll({ queryKey: [key] });
    const updatedAt = Math.max(0, ...queries.map((query) => query.state.dataUpdatedAt));
    const active = queries.some((query) => query.isActive());
    // A string: useSyncExternalStore needs the same value while nothing changed.
    return `${updatedAt}:${active ? 1 : 0}`;
  }, [cache, key]);
  const [updatedAt, active] = useSyncExternalStore(subscribe, snapshot, () => "0:0").split(":");
  return { updatedAt: Number(updatedAt), active: active === "1" };
}

function SourceRow({ source }: { source: Source }) {
  const { updatedAt, active } = useSourceState(source.key);
  const muted = { color: colors.textMuted };
  const status = !active
    ? fr.refresh.paused
    : updatedAt > 0
      ? fr.refresh.updatedAt(formatClockTime(new Date(updatedAt)))
      : fr.refresh.notLoaded;
  return (
    <li>
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{source.name}</span>
        <span className="shrink-0 text-xs" style={muted}>
          {fr.refresh.every(Math.round(source.everyMs / MS_PER_SECOND))}
        </span>
      </p>
      <span
        aria-hidden
        className="mt-1 block h-1 overflow-hidden rounded-full"
        style={{ background: `color-mix(in srgb, ${colors.textMuted} 25%, transparent)` }}
      >
        {active && updatedAt > 0 && (
          // Restarted by its key on every update. Once in the page, set back by the time already
          // elapsed (a ref callback: reading the clock has no place in the render).
          <span
            key={updatedAt}
            ref={(bar) => {
              if (bar) bar.style.animationDelay = `${updatedAt - Date.now()}ms`;
            }}
            className="refresh-fill block h-full origin-left rounded-full"
            style={{ background: colors.accent, animationDuration: `${source.everyMs}ms` }}
          />
        )}
      </span>
      <p className="mt-0.5 text-xs" style={muted}>
        {status}
      </p>
    </li>
  );
}

/** Thin ring around the button, filled up until the next realtime update. */
function CountdownRing({ updatedAt, everyMs }: { updatedAt: number; everyMs: number }) {
  return (
    <svg aria-hidden viewBox="0 0 36 36" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90">
      <circle cx="18" cy="18" r="16.5" fill="none" strokeWidth="2" style={{ stroke: `color-mix(in srgb, ${colors.textMuted} 25%, transparent)` }} />
      {/* Restarted by its key on every update; a CSS animation, no re-render per frame. */}
      {updatedAt > 0 && (
        <circle
          key={updatedAt}
          cx="18"
          cy="18"
          r="16.5"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={100}
          className="refresh-countdown"
          style={{ stroke: colors.accent, animationDuration: `${everyMs}ms` }}
        />
      )}
    </svg>
  );
}

/**
 * Round button whose thin ring fills up until the next realtime update (vehicles and delays, the
 * site's heartbeat). It opens a small panel listing every data refresh: when each was last done
 * and how long until the next. Nothing can be refreshed on demand: every visitor doing so at once
 * would hit the API.
 */
export function RefreshIndicator() {
  const config = useApiConfig();
  const delaysMs = config.delaysRefreshMs ?? DEFAULT_DELAYS_REFRESH_MS;
  const { dataUpdatedAt, isFetching } = useTripDelays();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const sources: Source[] = [
    { key: "trip-delays", name: fr.refresh.sources.vehicles, everyMs: delaysMs },
    { key: "departures", name: fr.refresh.sources.departures, everyMs: config.departuresRefreshMs ?? DEFAULT_DEPARTURES_REFRESH_MS },
    { key: "itineraries", name: fr.refresh.sources.itineraries, everyMs: ITINERARIES_REFRESH_MS },
    { key: "park-and-rides", name: fr.refresh.sources.parkAndRides, everyMs: PARK_AND_RIDES_REFRESH_MS },
    { key: "disruptions", name: fr.refresh.sources.disruptions, everyMs: DISRUPTIONS_REFRESH_MS },
    { key: "weather", name: fr.refresh.sources.weather, everyMs: WEATHER_REFRESH_MS },
    { key: "air-quality", name: fr.refresh.sources.airQuality, everyMs: AIR_QUALITY_REFRESH_MS },
    { key: "schedule", name: fr.refresh.sources.schedule, everyMs: SCHEDULE_REFRESH_MS },
  ];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="refresh-panel"
        aria-label={fr.refresh.button}
        title={fr.refresh.button}
        className={`relative ${FLOATING_BUTTON}`}
        style={glass}
      >
        <CountdownRing updatedAt={dataUpdatedAt} everyMs={delaysMs} />
        <span aria-hidden className={isFetching ? "motion-safe:animate-spin" : undefined} style={{ color: colors.textMuted }}>
          <RefreshIcon />
        </span>
      </button>
      {open && (
        <section
          id="refresh-panel"
          aria-labelledby="refresh-panel-title"
          className="absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] p-3.5 text-sm shadow-xl backdrop-blur"
          style={{ ...glass, borderRadius: radii.md }}
        >
          <div className="flex items-start justify-between gap-2">
            <h2 id="refresh-panel-title" className="pt-1 font-semibold">
              {fr.refresh.title}
            </h2>
            <CloseButton label={fr.refresh.close} onClick={close} />
          </div>
          <p className="mb-3 text-xs" style={{ color: colors.textMuted }}>
            {fr.refresh.intro}
          </p>
          <ul className="space-y-2.5">
            {sources.map((source) => (
              <SourceRow key={source.key} source={source} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
