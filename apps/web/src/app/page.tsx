import { fr } from "@greline/i18n";
import { colors } from "@/lib/theme-tokens";
import type { TransitNetwork } from "@greline/types";
import { connection } from "next/server";
import { Suspense } from "react";
import { NetworkView } from "@/components/network-view";
import { getTransitNetwork } from "@/lib/transit-network";

const RETRY_AFTER_S = 30;

async function loadNetwork(): Promise<TransitNetwork | null> {
  try {
    return await getTransitNetwork();
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
      <>
        {/* Try again on its own: the outage is usually over in a minute (React hoists it to <head>). */}
        <meta httpEquiv="refresh" content={String(RETRY_AFTER_S)} />
        <p role="alert" className="m-auto max-w-sm p-6 text-center" style={{ color: colors.textMuted }}>
          {fr.map.unavailable(RETRY_AFTER_S)}
        </p>
      </>
    );
  }
  return <NetworkView network={network} />;
}

export default function HomePage() {
  // Full-screen map; the top bar and the helpers float over it (credits live in "Sources"). The page
  // itself never scrolls: whatever sticks out of the screen is cut, panels scroll on their own.
  return (
    <main className="relative flex h-dvh overflow-hidden" style={{ background: colors.background, color: colors.text }}>
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
