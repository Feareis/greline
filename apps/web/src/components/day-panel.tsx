"use client";

import { useAirQuality, useFleetSummary, useNow, useWeather } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { type AirQualityLevel, airQualityLevel, moonState, type TrafficLevel, trafficLevel, weatherCondition } from "@greline/services";
import { radii } from "@greline/theme";
import type { DisruptionSeverity, NetworkId } from "@greline/types";
import { type ReactNode, useState } from "react";
import { colors, glass, ICON_BUTTON } from "@/lib/theme-tokens";
import { ChevronIcon } from "./icons";
import { fleetLateText } from "./network-summary";

const PARIS_DAY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
const PARIS_TIME = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const TRAFFIC_COLOR: Record<TrafficLevel, string> = {
  smooth: colors.success,
  someDelays: colors.warning,
  disrupted: colors.danger,
};

// The same scale as traffic: green while the air is fine, amber when degraded, red beyond.
const AIR_COLOR: Record<AirQualityLevel, string> = {
  good: colors.success,
  fair: colors.success,
  moderate: colors.warning,
  poor: colors.danger,
  veryPoor: colors.danger,
  extremelyPoor: colors.danger,
};

const muted = { color: colors.textMuted };

/** One labeled row. `wideOnly` rows are left out on phones, where the panel must stay small. */
function Row({ label, wideOnly = false, children }: { label: string; wideOnly?: boolean; children: ReactNode }) {
  return (
    <div className={wideOnly ? "hidden sm:contents" : "contents"}>
      <dt style={muted}>{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-[-1px]" style={{ background: color }} />;
}

function WeatherRows() {
  const { data: weather, isError } = useWeather();
  if (isError) {
    return (
      <Row label={fr.day.rows.weather}>
        <span style={muted}>{fr.day.weatherUnavailable}</span>
      </Row>
    );
  }
  if (!weather) return null;
  return (
    <>
      <Row label={fr.day.rows.weather}>
        {fr.day.conditions[weatherCondition(weather.weatherCode)]} ·{" "}
        <strong className="font-semibold">{fr.day.temperature(weather.temperature)}</strong>{" "}
        <span style={muted}>({fr.day.feelsLike(weather.apparentTemperature)})</span>
      </Row>
      <Row label={fr.day.rows.sun} wideOnly>
        {fr.day.sunTimes(weather.sunrise, weather.sunset)}
      </Row>
    </>
  );
}

function AirQualityRow() {
  const { data, isError } = useAirQuality();
  if (isError) {
    return (
      <Row label={fr.day.rows.air}>
        <span style={muted}>{fr.day.airUnavailable}</span>
      </Row>
    );
  }
  if (!data) return null;
  const level = airQualityLevel(data.index);
  return (
    <Row label={fr.day.rows.air}>
      <span title={fr.day.airIndex(data.index)}>
        <Dot color={AIR_COLOR[level]} />
        <span className="inline-block first-letter:uppercase">{fr.day.airLevels[level]}</span>
        <span className="sr-only"> ({fr.day.airIndex(data.index)})</span>
      </span>
    </Row>
  );
}

interface TrafficProps {
  networks: readonly NetworkId[];
  /** Severities of the official disruptions in effect on the shown networks. */
  ongoingSeverities: readonly DisruptionSeverity[];
}

/**
 * Two facts, each with its own dot: the delays measured on the vehicles, worded as in the network
 * panel, then the official disruptions, worded as in the banner (works on a line are not delays;
 * a cut line is red).
 */
function TrafficRow({ networks, ongoingSeverities }: TrafficProps) {
  const { summary, delaysAvailable } = useFleetSummary(networks);
  const disruptions = ongoingSeverities.filter((severity) => severity !== "info").length;
  if (!summary && disruptions === 0) {
    return (
      <Row label={fr.day.rows.traffic}>
        <span style={muted}>{fr.day.trafficUnknown}</span>
      </Row>
    );
  }
  return (
    <Row label={fr.day.rows.traffic}>
      {summary && (
        <span className="block font-semibold">
          <Dot color={delaysAvailable ? TRAFFIC_COLOR[summary.level] : colors.textMuted} />
          {fleetLateText(summary, delaysAvailable)}
        </span>
      )}
      {disruptions > 0 && (
        <span className="block">
          <Dot color={TRAFFIC_COLOR[trafficLevel("smooth", ongoingSeverities)]} />
          {fr.disruptions.ongoing(disruptions)}
        </span>
      )}
    </Row>
  );
}

/**
 * Bottom-left helper: the time in Grenoble in large, then labeled rows for the weather, sun, air,
 * moon and traffic of the shown networks.
 */
export function DayPanel({ networks, ongoingSeverities }: TrafficProps) {
  const now = useNow(1_000);
  const moon = moonState(now);
  const [expanded, setExpanded] = useState(true);
  return (
    <section
      aria-label={fr.day.label}
      className="absolute bottom-3 left-3 z-10 w-72 max-w-[calc(100vw-5rem)] p-3 shadow-xl backdrop-blur sm:w-[19rem] sm:p-3.5"
      style={{ ...glass, borderRadius: radii.md }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {/* Server and browser clocks differ by a few seconds: the text is expected to change. */}
          <p className="text-sm font-medium first-letter:uppercase" style={muted} suppressHydrationWarning>
            {PARIS_DAY.format(now)}
          </p>
          <time className="block text-xl font-semibold leading-tight tabular-nums sm:text-2xl" suppressHydrationWarning>
            {PARIS_TIME.format(now)}
          </time>
        </div>
        {/* Points the way the panel moves: down to fold the rows away, up to bring them back. */}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="day-details"
          aria-label={expanded ? fr.day.collapse : fr.day.expand}
          title={expanded ? fr.day.collapse : fr.day.expand}
          onClick={() => setExpanded(!expanded)}
          className={`${ICON_BUTTON} -mt-1 -mr-1`}
          style={muted}
        >
          <span className={`transition-transform duration-300 motion-reduce:transition-none ${expanded ? "" : "rotate-180"}`}>
            <ChevronIcon />
          </span>
        </button>
      </div>
      {/* Anchored at the bottom: shrinking the rows to nothing lowers the panel's top edge, growing them raises it.
          Folded rows are inert, out of reach of keyboards and screen readers. The clipping box is also the
          containing block: absolutely placed text inside (sr-only) would otherwise stick out below the screen. */}
      <div
        id="day-details"
        inert={!expanded}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="relative min-h-0 overflow-hidden">
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <WeatherRows />
            <AirQualityRow />
            <Row label={fr.day.rows.moon} wideOnly>
              <span suppressHydrationWarning>
                <span aria-hidden>{fr.day.moonIcon[moon.phase]} </span>
                {fr.day.moon[moon.phase]} · {fr.day.moonLit(Math.round(moon.illumination * 100))}
              </span>
            </Row>
            <TrafficRow networks={networks} ongoingSeverities={ongoingSeverities} />
          </dl>
        </div>
      </div>
    </section>
  );
}
