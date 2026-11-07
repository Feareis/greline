"use client";

import { fr } from "@greline/i18n";
import type { SearchResult } from "@greline/services";
import { radii } from "@greline/theme";
import type { TransitNetwork } from "@greline/types";
import { useEffect, useState } from "react";
import { FLOATING_BUTTON, glass } from "@/lib/theme-tokens";
import { SearchIcon } from "./icons";
import { NetworkCombobox } from "./network-combobox";

const SHORTCUT = "/";

/** True when a key press is meant for a text field, not for a page shortcut. */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']") !== null;
}

interface SearchBoxProps {
  network: TransitNetwork;
  onPick: (result: SearchResult) => void;
}

/**
 * "Search" button of the top bar, also opened with "/": a field below the bar finds a stop or
 * a line by name. The field spans the bar on phones, sits on the right on wider screens.
 */
export function SearchBox({ network, onPick }: SearchBoxProps) {
  const [open, setOpen] = useState(false);

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
        <div className="absolute inset-x-3 top-full p-2 shadow-lg backdrop-blur sm:left-auto sm:w-80" style={{ ...glass, borderRadius: radii.md }}>
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
        </div>
      )}
    </>
  );
}
