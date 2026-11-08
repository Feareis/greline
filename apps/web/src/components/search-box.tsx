"use client";

import { fr } from "@greline/i18n";
import type { SearchResult } from "@greline/services";
import { radii } from "@greline/theme";
import type { TransitNetwork } from "@greline/types";
import { useEffect, useState } from "react";
import { colors, FLOATING_BUTTON, glass } from "@/lib/theme-tokens";
import { SearchIcon } from "./icons";
import { type ItineraryEnds, ItinerarySearch, NO_ENDS } from "./itinerary-search";
import { NetworkCombobox } from "./network-combobox";

type SearchMode = "place" | "itinerary";

const SHORTCUT = "/";

/** True when a key press is meant for a text field, not for a page shortcut. */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']") !== null;
}

interface SearchBoxProps {
  network: TransitNetwork;
  onPick: (result: SearchResult) => void;
}

function ModeSwitch({ mode, onChange }: { mode: SearchMode; onChange: (mode: SearchMode) => void }) {
  const chip = (pressed: boolean) => ({
    background: pressed ? colors.accent : "transparent",
    color: pressed ? colors.background : colors.text,
    borderColor: pressed ? colors.accent : colors.textMuted,
  });
  const modes: [SearchMode, string][] = [
    ["place", fr.itinerary.searchTab],
    ["itinerary", fr.itinerary.tab],
  ];
  return (
    <div role="group" aria-label={fr.itinerary.modes} className="mb-2 flex gap-1.5">
      {modes.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={mode === id}
          onClick={() => onChange(id)}
          className="rounded-full border px-2.5 py-0.5 text-xs font-medium focus-visible:outline-2"
          style={chip(mode === id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * "Search" button of the top bar, also opened with "/": below the bar, a field finds a stop or
 * a line by name, or two fields search an itinerary. Spans the bar on phones, sits on the right
 * on wider screens. The itinerary ends are kept while the box is closed.
 */
export function SearchBox({ network, onPick }: SearchBoxProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("place");
  const [ends, setEnds] = useState<ItineraryEnds>(NO_ENDS);

  useEffect(() => {
    const openOnShortcut = (event: KeyboardEvent) => {
      if (event.key !== SHORTCUT || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener("keydown", openOnShortcut);
    return () => document.removeEventListener("keydown", openOnShortcut);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? fr.search.close : fr.search.label}
        title={`${fr.search.label} (${SHORTCUT})`}
        className={FLOATING_BUTTON}
        style={glass}
      >
        <SearchIcon />
      </button>
      {open && (
        <div
          className="absolute inset-x-3 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto p-2 shadow-lg backdrop-blur sm:left-auto sm:w-80"
          style={{ ...glass, borderRadius: radii.md }}
        >
          <ModeSwitch mode={mode} onChange={setMode} />
          {mode === "place" ? (
            <NetworkCombobox
              network={network}
              label={fr.search.label}
              placeholder={fr.search.placeholder}
              withLines
              focusOnMount
              onEscape={() => setOpen(false)}
              onPick={(result) => {
                setOpen(false);
                onPick(result);
              }}
            />
          ) : (
            <ItinerarySearch network={network} ends={ends} onChange={setEnds} />
          )}
        </div>
      )}
    </>
  );
}
