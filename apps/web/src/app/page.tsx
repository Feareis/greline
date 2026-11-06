import { fr } from "@greline/i18n";
import { colors } from "@greline/theme";

export default function HomePage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ background: colors.background, color: colors.text }}
    >
      <h1 className="text-5xl font-bold tracking-tight">{fr.app.name}</h1>
      <p className="text-xl" style={{ color: colors.accent }}>
        {fr.app.tagline}
      </p>
      <p className="text-sm" style={{ color: colors.textMuted }}>
        {fr.app.unofficial} {fr.app.dataCredit}
      </p>
    </main>
  );
}
