"use client";

import { fr } from "@greline/i18n";
import { type DisruptionPeriod, disruptionPeriod } from "@greline/services";
import { toCssColor } from "@greline/theme";
import type { Disruption, DisruptionSeverity, Line } from "@greline/types";
import { colors } from "@/lib/theme-tokens";

export const SEVERITY_COLOR: Readonly<Record<DisruptionSeverity, string>> = {
  interrupted: colors.danger,
  disrupted: colors.warning,
  info: colors.accent,
};

function periodText(period: DisruptionPeriod): string {
  switch (period.kind) {
    case "untilTime":
      return fr.disruptions.untilTime(period.end);
    case "untilDate":
      return fr.disruptions.untilDate(period.end);
    case "fromTo":
      return fr.disruptions.fromTo(period.start, period.end);
    case "fromDate":
      return fr.disruptions.fromDate(period.start);
  }
}

export function LineChip({ line }: { line: Line }) {
  return (
    <span
      aria-label={fr.station.line(line.shortName)}
      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-bold"
      style={{ background: toCssColor(line.color), color: toCssColor(line.textColor) }}
    >
      {line.shortName}
    </span>
  );
}

interface DisruptionListProps {
  disruptions: readonly Disruption[];
  linesById: ReadonlyMap<string, Line>;
  now: Date;
}

/** Disruptions with their line, severity, period, title and the official text. */
export function DisruptionList({ disruptions, linesById, now }: DisruptionListProps) {
  return (
    <ul className="space-y-3">
      {disruptions.map((disruption) => {
        const line = linesById.get(disruption.lineId);
        return (
          <li key={disruption.id} className="border-l-2 pl-2 text-xs" style={{ borderColor: SEVERITY_COLOR[disruption.severity] }}>
            <p className="flex flex-wrap items-center gap-1.5">
              {line && <LineChip line={line} />}
              <span className="font-semibold" style={{ color: SEVERITY_COLOR[disruption.severity] }}>
                {fr.disruptions.severity[disruption.severity]}
              </span>
              <span style={{ color: colors.textMuted }}>{periodText(disruptionPeriod(disruption, now))}</span>
            </p>
            <p className="mt-1 font-medium first-letter:uppercase">{disruption.title}</p>
            {disruption.description && (
              <p className="mt-1 whitespace-pre-line leading-relaxed" style={{ color: colors.textMuted }}>
                {disruption.description}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
