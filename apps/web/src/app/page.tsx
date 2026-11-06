import { fr } from "@greline/i18n";
import { colors } from "@/lib/theme-tokens";
import type { TramNetwork } from "@greline/types";
import { connection } from "next/server";
import { Suspense } from "react";
import { NetworkView } from "@/components/network-view";
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
  return <NetworkView network={network} />;
}

export default function HomePage() {
  // Full-screen map; the top bar and the helpers float over it (credits live in "Sources").
  return (
    <main className="relative flex h-dvh" style={{ background: colors.background, color: colors.text }}>
      <Suspense
        fallback={
          <p className="m-auto" style={{ color: colors.textMuted }}>
            {fr.map.loading}
          </p>
        }
      >
        <TramMapSection />
      </Suspense>
    </main>
  );
}
