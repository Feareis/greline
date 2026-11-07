"use client";

import { fr } from "@greline/i18n";
import { radii } from "@greline/theme";
import type { Disruption, Line } from "@greline/types";
import { colors, glass } from "@/lib/theme-tokens";
import { DisruptionList, LineChip, SEVERITY_COLOR } from "./disruption-list";

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" aria-hidden className="shrink-0">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

interface DisruptionBannerProps {
  /** Ongoing disruptions to show (lines cut or disrupted, of the shown networks). */
  ongoing: readonly Disruption[];
  /** Same, starting later today. */
  upcoming: readonly Disruption[];
  linesById: ReadonlyMap<string, Line>;
  now: Date;
}

/**
 * Under the top bar: how many lines are disrupted right now, with their numbers; unfolds into the
 * official texts. Hidden when nothing is disrupted today.
 */
export function DisruptionBanner({ ongoing, upcoming, linesById, now }: DisruptionBannerProps) {
  if (ongoing.length === 0 && upcoming.length === 0) return null;
  const headline = ongoing[0] ?? upcoming[0]!;
  const lineIds = [...new Set((ongoing.length > 0 ? ongoing : upcoming).map((d) => d.lineId))];
  return (
    <details
      aria-label={fr.disruptions.label}
      className="group absolute inset-x-3 top-[7.5rem] z-10 max-h-[50dvh] overflow-y-auto text-sm shadow-lg backdrop-blur sm:top-16 sm:right-auto sm:left-1/2 sm:w-96 sm:-translate-x-1/2"
      style={{ ...glass, borderRadius: radii.md, border: `1px solid ${SEVERITY_COLOR[headline.severity]}` }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium focus-visible:outline-2">
        <WarningIcon color={SEVERITY_COLOR[headline.severity]} />
        <span className="grow">
          {ongoing.length > 0 ? fr.disruptions.ongoing(ongoing.length) : fr.disruptions.upcomingOnly(upcoming.length)}
        </span>
        <span className="flex flex-wrap justify-end gap-1">
          {lineIds.map((id) => {
            const line = linesById.get(id);
            return line ? <LineChip key={id} line={line} /> : null;
          })}
        </span>
      </summary>
      <div className="space-y-3 px-3 pb-3">
        <DisruptionList disruptions={ongoing} linesById={linesById} now={now} />
        {upcoming.length > 0 && (
          <>
            <h3 className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>
              {fr.disruptions.upcomingTitle}
            </h3>
            <DisruptionList disruptions={upcoming} linesById={linesById} now={now} />
          </>
        )}
      </div>
    </details>
  );
}
