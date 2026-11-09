"use client";

import { fr } from "@greline/i18n";
import { radii } from "@greline/theme";
import type { Disruption, Line } from "@greline/types";
import { useCallback, useState } from "react";
import { colors, FLOATING_BUTTON, glass } from "@/lib/theme-tokens";
import { DisruptionList, SEVERITY_COLOR } from "./disruption-list";
import { MoreIcon } from "./icons";
import { ParkAndRidePanel } from "./park-and-ride-panel";
import { CloseButton, SectionTitle, useDismiss } from "./panel-ui";
import { ThemeToggle } from "./top-bar";

interface DisruptionsProps {
  /** Disruptions in effect on the shown networks (lines cut or disrupted). */
  ongoing: readonly Disruption[];
  /** Same, starting later today. */
  upcoming: readonly Disruption[];
  linesById: ReadonlyMap<string, Line>;
  now: Date;
}

interface MoreMenuProps extends DisruptionsProps {
  parkAndRidesShown: boolean;
  onParkAndRidesShownChange: (shown: boolean) => void;
}

/** The disruptions of the day, ongoing first; a short line when there are none. */
function DisruptionsSection({ ongoing, upcoming, linesById, now }: DisruptionsProps) {
  return (
    <>
      <SectionTitle>{fr.disruptions.label}</SectionTitle>
      {ongoing.length === 0 && upcoming.length === 0 ? (
        <p style={{ color: colors.textMuted }}>{fr.more.noDisruptions}</p>
      ) : (
        <div className="space-y-3">
          <DisruptionList disruptions={ongoing} linesById={linesById} now={now} />
          {upcoming.length > 0 && (
            <>
              <h4 className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>
                {fr.disruptions.upcomingTitle}
              </h4>
              <DisruptionList disruptions={upcoming} linesById={linesById} now={now} />
            </>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Phones only: a "⋯" button, last in the top bar, opening a panel with what the screen has no room
 * for: the theme, the P+R and the disruptions. A badge on the button counts the ongoing
 * disruptions, so they are not missed while folded away.
 */
export function MoreMenu({ parkAndRidesShown, onParkAndRidesShownChange, ...disruptions }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const count = disruptions.ongoing.length;
  const label = count > 0 ? fr.more.buttonWithDisruptions(count) : fr.more.button;
  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="more-panel"
        aria-label={label}
        title={label}
        className={`relative ${FLOATING_BUTTON}`}
        style={glass}
      >
        <MoreIcon />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white"
            style={{ background: SEVERITY_COLOR[disruptions.ongoing[0]!.severity] }}
          >
            {count}
          </span>
        )}
      </button>
      {open && (
        <section
          id="more-panel"
          aria-labelledby="more-panel-title"
          className="absolute top-full right-0 mt-2 max-h-[calc(100dvh-5rem)] w-[calc(100vw-1.5rem)] overflow-y-auto p-3.5 text-sm shadow-xl backdrop-blur"
          style={{ ...glass, borderRadius: radii.md }}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <h2 id="more-panel-title" className="pt-1 font-semibold">
              {fr.more.title}
            </h2>
            <CloseButton label={fr.more.close} onClick={close} />
          </div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="font-semibold">{fr.more.theme}</span>
            <ThemeToggle />
          </div>
          <ParkAndRidePanel shown={parkAndRidesShown} onShownChange={onParkAndRidesShownChange} />
          <div className="mt-5">
            <DisruptionsSection {...disruptions} />
          </div>
        </section>
      )}
    </div>
  );
}
