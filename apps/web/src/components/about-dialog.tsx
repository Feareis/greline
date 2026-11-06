"use client";

import { fr } from "@greline/i18n";
import { radii } from "@greline/theme";
import { useRef } from "react";
import { colors, FLOATING_BUTTON, glass } from "@/lib/theme-tokens";
import { InfoIcon } from "./icons";

const LINKS = {
  transit: "https://data.mobilites-m.fr",
  osm: "https://www.openstreetmap.org/copyright",
  openMeteo: "https://open-meteo.com",
  repository: "https://github.com/Feareis/greline",
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

const linkStyle = { color: colors.accent } as const;

/** "Sources" button and its modal: data credits, licences, disclaimer, developer, version. */
export function AboutDialog({ versionText }: { versionText: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={fr.topBar.aboutLabel}
        aria-haspopup="dialog"
        className={FLOATING_BUTTON}
        style={glass}
      >
        <InfoIcon />
        <span className="hidden sm:inline">{fr.topBar.about}</span>
      </button>
      {/* Native modal: focus trap, Escape and the inert background come with the browser. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="about-title"
        // A click on the backdrop lands on the <dialog> itself, not on its content.
        onClick={(event) => event.target === dialogRef.current && close()}
        className="m-auto w-[min(32rem,calc(100%-1.5rem))] p-0 shadow-2xl backdrop:bg-black/50"
        style={{ background: colors.surface, color: colors.text, borderRadius: radii.md }}
      >
        <div className="max-h-[80dvh] overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id="about-title" className="text-lg font-semibold">
              {fr.about.title}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label={fr.about.close}
              className="-m-1 rounded p-1 text-xl leading-none hover:opacity-80 focus-visible:outline-2"
              style={{ color: colors.textMuted }}
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{fr.about.intro}</p>
          <p className="mt-2 text-sm font-medium leading-relaxed">{fr.about.unofficial}</p>
          <Section title={fr.about.usageTitle}>
            <p>{fr.about.usage}</p>
          </Section>
          <Section title={fr.about.sourcesTitle}>
            <p>
              <a href={LINKS.transit} target="_blank" rel="noreferrer" style={linkStyle}>
                {fr.about.transit}
              </a>
            </p>
            <p>
              <a href={LINKS.osm} target="_blank" rel="noreferrer" style={linkStyle}>
                {fr.about.baseMap}
              </a>
            </p>
            <p>
              <a href={LINKS.openMeteo} target="_blank" rel="noreferrer" style={linkStyle}>
                {fr.about.weather}
              </a>
            </p>
          </Section>
          <Section title={fr.about.developmentTitle}>
            <p>
              {fr.about.developer}{" "}
              <a href={LINKS.repository} target="_blank" rel="noreferrer" style={linkStyle}>
                {fr.about.sourceCode}
              </a>
            </p>
          </Section>
          <Section title={fr.about.versionTitle}>
            <p className="font-mono">{versionText}</p>
          </Section>
        </div>
      </dialog>
    </>
  );
}
