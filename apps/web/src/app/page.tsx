import { fr } from "@greline/i18n";
import { buildSchematicMap } from "@greline/schematic";
import { colors } from "@greline/theme";
import type { TramNetwork } from "@greline/types";
import { connection } from "next/server";
import { Suspense } from "react";
import { LINE_SPACING } from "@/components/map-style";
import { TramMap } from "@/components/tram-map";
import { getTramNetwork } from "@/lib/tram-network";

async function loadNetwork(): Promise<TramNetwork | null> {
  try {
    return await getTramNetwork();
  } catch (error) {
    console.error("Home page: M API unavailable", error);
    return null;
  }
}

async function TramMapSection() {
  // Render at request time so an M API outage during the build is never frozen into the page.
  await connection();
  const network = await loadNetwork();
  if (!network) {
    return (
      <p role="alert" className="m-auto max-w-sm p-6 text-center" style={{ color: colors.textMuted }}>
        {fr.map.unavailable}
      </p>
    );
  }
  // The layout is computed on the server: the browser only receives ready-to-draw coordinates.
  return <TramMap map={buildSchematicMap(network, { lineSpacing: LINE_SPACING })} network={network} />;
}

export default function HomePage() {
  return (
    <main className="flex h-dvh flex-col" style={{ background: colors.background, color: colors.text }}>
      <header className="flex flex-wrap items-baseline gap-x-3 px-4 pt-3">
        <h1 className="text-xl font-bold tracking-tight">{fr.app.name}</h1>
        <p className="text-sm" style={{ color: colors.textMuted }}>
          {fr.map.hint}
        </p>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <Suspense
          fallback={
            <p className="m-auto" style={{ color: colors.textMuted }}>
              {fr.map.loading}
            </p>
          }
        >
          <TramMapSection />
        </Suspense>
      </div>
      <footer className="px-4 pb-3 text-xs" style={{ color: colors.textMuted }}>
        {fr.app.unofficial} {fr.app.dataCredit}
      </footer>
    </main>
  );
}
