export const fr = {
  app: {
    name: "Greline",
    tagline: "Grenoble en temps réel",
    unofficial: "Projet indépendant, non officiel.",
    dataCredit: "Données : M – Mobilités de l'agglomération grenobloise (ODbL)",
  },
  map: {
    ariaLabel: "Plan schématique des lignes de tram de Grenoble",
    loading: "Chargement du plan…",
    unavailable: "Le plan est indisponible pour le moment : les données M ne répondent pas. Réessayez dans quelques minutes.",
    hint: "Molette ou pincement pour zoomer, glisser pour déplacer, clic sur une station pour le détail.",
  },
  station: {
    lines: "Lignes desservies",
    close: "Fermer le panneau",
    line: (shortName: string) => `Ligne ${shortName}`,
  },
} as const;
