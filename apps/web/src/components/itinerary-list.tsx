"use client";

import { useItineraries } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { formatClockTime } from "@greline/services";
import type { Itinerary } from "@greline/types";
import { colors } from "@/lib/theme-tokens";
import { StatusMessage } from "./departure-list";
import { LineChip } from "./disruption-list";
import { SkeletonRows } from "./panel-ui";

const clock = (iso: string) => formatClockTime(new Date(iso));
const minutesBetween = (start: string, end: string) => Math.round((Date.parse(end) - Date.parse(start)) / 60_000);

/** Times, duration, changes and walking time, on one line. */
function summary(itinerary: Itinerary): string {
  const parts = [
    fr.mine.itineraryTimes(clock(itinerary.departureTime), clock(itinerary.arrivalTime)),
    fr.mine.duration(minutesBetween(itinerary.departureTime, itinerary.arrivalTime)),
  ];
  if (itinerary.rides.length === 0) return [...parts, fr.mine.walkOnly].join(" · ");
  const walkMinutes = Math.round(itinerary.walkSeconds / 60);
  return [...parts, fr.mine.changes(itinerary.rides.length - 1), ...(walkMinutes > 0 ? [fr.mine.walk(walkMinutes)] : [])].join(" · ");
}

/** The M planner's best itineraries leaving now, changes included, refreshed every minute. */
export function ItineraryList({ from, to }: { from: string; to: string }) {
  const { data, isPending } = useItineraries(from, to);
  if (isPending) return <SkeletonRows label={fr.mine.itinerariesLoading} />;
  if (!data) return <StatusMessage>{fr.mine.itinerariesUnavailable}</StatusMessage>;
  if (data.length === 0) return <StatusMessage>{fr.mine.noItinerary}</StatusMessage>;
  return (
    <ol className="space-y-3">
      {data.map((itinerary, i) => (
        <li key={`${itinerary.departureTime}-${i}`}>
          <p className="text-xs font-semibold">{summary(itinerary)}</p>
          <ul className="mt-1 space-y-1">
            {itinerary.rides.map((ride, j) => (
              <li
                key={`${ride.departureTime}-${j}`}
                className="flex items-center gap-2 text-xs"
                title={fr.mine.rideLabel(ride.shortName, ride.headsign, clock(ride.departureTime))}
              >
                <LineChip line={ride} />
                <span className="min-w-0 flex-1 truncate">{fr.mine.ride(ride.from, ride.to)}</span>
                <span style={{ color: ride.realtime ? colors.text : colors.textMuted }}>{clock(ride.departureTime)}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
