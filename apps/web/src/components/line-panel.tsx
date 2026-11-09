"use client";

import { useFleetSummary } from "@greline/hooks";
import { fr } from "@greline/i18n";
import { sharedSelectionSearch } from "@greline/services";
import { radii, toCssColor } from "@greline/theme";
import type { Disruption, Line, NetworkLine, Stop } from "@greline/types";
import { useEffect, useMemo, useRef } from "react";
import { colors, panel, SIDE_PANEL } from "@/lib/theme-tokens";
import { DisruptionList } from "./disruption-list";
import { CloseButton, SectionTitle, SkeletonRows } from "./panel-ui";
import { ShareButton } from "./share-button";

/** Vehicles of this line running now, and how many are late. */
function LineFleet({ line }: { line: NetworkLine }) {
  const networks = useMemo(() => [line.network], [line.network]);
  const { summary, isLoading, isError, delaysAvailable } = useFleetSummary(networks);
  const muted = { color: colors.textMuted };
  if (isError) return <p className="text-sm" style={muted}>{fr.line.vehiclesUnavailable}</p>;
  if (isLoading || !summary) return <SkeletonRows label={fr.line.vehiclesLoading} rows={1} />;
  const late = summary.lateByLine[line.id] ?? 0;
  return (
    <p className="text-sm" style={{ color: late > 0 ? colors.late : colors.text }}>
      {fr.line.vehicles(summary.byLine[line.id] ?? 0, late)}
      {!delaysAvailable && <span style={muted}> · {fr.fleet.delaysUnavailable}</span>}
    </p>
  );
}

/** The stops in travel order, on a rail of the line's color. */
function StopRail({ line, stopsById, onShowStop }: { line: NetworkLine; stopsById: ReadonlyMap<string, Stop>; onShowStop: (stopId: string) => void }) {
  const stops = line.stopIds.flatMap((id) => stopsById.get(id) ?? []);
  return (
    <>
      <SectionTitle>{fr.line.stopsTitle(stops.length)}</SectionTitle>
      <ol className="border-l-4 pl-3" style={{ borderColor: toCssColor(line.color) }}>
        {stops.map((stop) => (
          <li key={stop.id}>
            <button
              type="button"
              onClick={() => onShowStop(stop.id)}
              aria-label={fr.mine.showOnMap(stop.name)}
              className="w-full rounded px-2 py-0.5 text-left text-sm hover:bg-[color-mix(in_srgb,var(--g-text)_8%,transparent)] focus-visible:outline-2"
            >
              {stop.name}
              {stop.city !== "Grenoble" && <span style={{ color: colors.textMuted }}> · {stop.city}</span>}
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

interface LinePanelProps {
  line: NetworkLine;
  stopsById: ReadonlyMap<string, Stop>;
  /** Ongoing or later-today disruptions of the line, information included. */
  disruptions: readonly Disruption[];
  linesById: ReadonlyMap<string, Line>;
  now: Date;
  onShowStop: (stopId: string) => void;
  onClose: () => void;
}

/** Details of one line: running vehicles, disruptions and every stop. Non-modal, like a stop's panel. */
export function LinePanel({ line, stopsById, disruptions, linesById, now, onShowStop, onClose }: LinePanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [line.id, onClose]);

  const name = fr.station.line(line.shortName);
  return (
    <aside
      aria-labelledby="line-panel-title"
      className={SIDE_PANEL}
      style={panel}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center px-2 text-base font-bold"
          style={{ background: toCssColor(line.color), color: toCssColor(line.textColor), borderRadius: radii.pill }}
        >
          {line.shortName}
        </span>
        <h2 id="line-panel-title" className="min-w-0 flex-1 pt-1 text-base font-semibold leading-tight">
          <span className="sr-only">{name} : </span>
          {line.longName}
        </h2>
        <ShareButton name={name} search={sharedSelectionSearch({ kind: "line", id: line.id })} />
        <CloseButton ref={closeButtonRef} label={fr.line.close} onClick={onClose} />
      </div>
      <div className="mt-3">
        <LineFleet line={line} />
      </div>
      {disruptions.length > 0 && (
        <>
          <SectionTitle>{fr.line.disruptionsTitle}</SectionTitle>
          <DisruptionList disruptions={disruptions} linesById={linesById} now={now} />
        </>
      )}
      <StopRail line={line} stopsById={stopsById} onShowStop={onShowStop} />
    </aside>
  );
}
