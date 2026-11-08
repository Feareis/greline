"use client";

import { fr } from "@greline/i18n";
import { type SearchResult, searchNetwork } from "@greline/services";
import { radii } from "@greline/theme";
import type { TransitNetwork } from "@greline/types";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { colors } from "@/lib/theme-tokens";
import { LineChip } from "./disruption-list";

const MAX_RESULTS = 8;

const resultKey = (result: SearchResult) => (result.kind === "line" ? result.line.id : result.stop.id);

function ResultLabel({ result }: { result: SearchResult }) {
  if (result.kind === "line") {
    return (
      <>
        <LineChip line={result.line} />
        <span className="min-w-0 truncate">{result.line.longName}</span>
      </>
    );
  }
  return (
    <span className="min-w-0 truncate">
      {result.stop.name} <span style={{ color: colors.textMuted }}>· {result.stop.city}</span>
    </span>
  );
}

interface NetworkComboboxProps {
  network: TransitNetwork;
  /** Accessible name of the field. */
  label: string;
  placeholder: string;
  /** Offer lines too, not only stops. */
  withLines: boolean;
  onPick: (result: SearchResult) => void;
  onEscape?: () => void;
  /** Focus the field once shown: for fields opened on demand. */
  focusOnMount?: boolean;
}

/**
 * Text field listing matching stops (and lines) as the user types: arrows move through the
 * list, Enter picks, Escape leaves. ARIA 1.2 combobox pattern; focus stays in the field.
 */
export function NetworkCombobox({ network, label, placeholder, withLines, onPick, onEscape, focusOnMount = false }: NetworkComboboxProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchNetwork(query, network, MAX_RESULTS, { lines: withLines }), [query, network, withLines]);
  const activeIndex = Math.min(active, results.length - 1);

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  const pick = (result: SearchResult) => {
    setQuery("");
    setActive(0);
    onPick(result);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      // Handled here: panels behind skip an Escape already handled (React listens on the
      // document itself, so stopping propagation would not reach their listeners).
      event.preventDefault();
      if (query) setQuery("");
      else onEscape?.();
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(results[Math.max(activeIndex, 0)]!);
    }
  };

  const expanded = query.trim() !== "";
  return (
    <div>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label={label}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={results.length > 0 ? `${listId}-${activeIndex}` : undefined}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        className="w-full border px-3 py-2 text-sm focus-visible:outline-2"
        style={{ background: colors.background, color: colors.text, borderColor: colors.textMuted, borderRadius: radii.md }}
      />
      <ul id={listId} role="listbox" aria-label={label} className="mt-1 space-y-0.5" hidden={!expanded}>
        {results.map((result, i) => (
          <li
            key={resultKey(result)}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === activeIndex}
            // mousedown, not click: picking must not blur the field first.
            onMouseDown={(event) => {
              event.preventDefault();
              pick(result);
            }}
            onMouseEnter={() => setActive(i)}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm"
            style={{ background: i === activeIndex ? `color-mix(in srgb, ${colors.accent} 20%, transparent)` : undefined }}
          >
            <ResultLabel result={result} />
          </li>
        ))}
      </ul>
      {expanded && results.length === 0 && (
        <p role="status" className="mt-2 px-2 text-sm" style={{ color: colors.textMuted }}>
          {fr.search.noResult}
        </p>
      )}
    </div>
  );
}
