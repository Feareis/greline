"use client";

import { useFleetSummary, useNow, useWeather } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { moonState, type TrafficLevel, weatherCondition } from "@greline/services";
import { radii } from "@greline/theme";
import type { NetworkId } from "@greline/types";
import { colors, glass } from "@/lib/theme-tokens";

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

function WeatherLines() {
  const { data: weather, isError } = useWeather();
  if (isError) return <p style={{ color: colors.textMuted }}>{fr.day.weatherUnavailable}</p>;
  if (!weather) return null;
  return (
    <>
      <p>
        {fr.day.conditions[weatherCondition(weather.weatherCode)]} · {fr.day.temperature(weather.temperature)}{" "}
        <span style={{ color: colors.textMuted }}>({fr.day.feelsLike(weather.apparentTemperature)})</span>
      </p>
      <p className="hidden sm:block" style={{ color: colors.textMuted }}>
        {fr.day.sun(weather.sunrise, weather.sunset)}
      </p>
    </>
  );
}

function TrafficLine({ networks }: { networks: readonly NetworkId[] }) {
  const { summary, delaysAvailable } = useFleetSummary(networks);
  if (!summary || !delaysAvailable) return <p style={{ color: colors.textMuted }}>{fr.day.trafficUnknown}</p>;
  return (
    <p className="flex items-center gap-1.5 font-medium">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: TRAFFIC_COLOR[summary.level] }} />
      {fr.day.traffic[summary.level]}
    </p>
  );
}

/** Bottom-left helper: today's date and time in Grenoble, weather, moon and traffic of the shown networks. */
export function DayPanel({ networks }: { networks: readonly NetworkId[] }) {
  const now = useNow(1_000);
  const moon = moonState(now);
  return (
    <section
      aria-label={fr.day.label}
      className="absolute bottom-3 left-3 z-10 w-64 max-w-[calc(100vw-5rem)] space-y-0.5 px-3 py-2 text-xs shadow-lg backdrop-blur"
      style={{ ...glass, borderRadius: radii.md }}
    >
      {/* Server and browser clocks differ by a few seconds: the text is expected to change. */}
      <p className="text-sm font-medium first-letter:uppercase" suppressHydrationWarning>
        {PARIS_DAY.format(now)} · <time suppressHydrationWarning>{PARIS_TIME.format(now)}</time>
      </p>
      <WeatherLines />
      <p className="hidden sm:block" style={{ color: colors.textMuted }} suppressHydrationWarning>
        <span aria-hidden>{fr.day.moonIcon[moon.phase]} </span>
        {fr.day.moon[moon.phase]} · {fr.day.moonLit(Math.round(moon.illumination * 100))}
      </p>
      <TrafficLine networks={networks} />
    </section>
  );
}
