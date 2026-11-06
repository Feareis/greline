export const fr = {
  app: {
    name: "Greline",
    tagline: "Grenoble en temps réel",
    unofficial: "Projet indépendant, non officiel.",
    dataCredit: "Données : M – Mobilités de l'agglomération grenobloise (ODbL)",
  },
  views: {
    label: "Type de vue",
    plan: "Plan",
    map: "Carte",
  },
  geoMap: {
    ariaLabel: "Carte géographique des lignes de tram de Grenoble",
    loading: "Chargement de la carte…",
    osmCredit: "© contributeurs OpenStreetMap",
    dataCredit: "Données : M (ODbL)",
  },
  locate: {
    button: "Me localiser",
    locating: "Localisation…",
    youAreHere: "Vous êtes ici",
    nearestTitle: "Arrêts de tram les plus proches",
    denied: "Localisation refusée. Autorisez-la dans les réglages du navigateur pour voir les arrêts proches.",
    unavailable: "Position introuvable pour le moment. Réessayez dans un instant.",
    timeout: "La localisation a pris trop de temps. Réessayez.",
    unsupported: "La géolocalisation n'est pas disponible ici (elle nécessite un navigateur compatible et une connexion HTTPS).",
    distance: (meters: number) =>
      meters < 1000
        ? `${Math.round(meters / 10) * 10} m`
        : `${(meters / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`,
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
  departures: {
    title: "Prochains passages",
    loading: "Chargement des passages…",
    empty: "Aucun passage prévu pour le moment.",
    unavailable: "Passages indisponibles pour le moment.",
    unknownStop: "Cette station est inconnue.",
    retry: "Réessayer",
    staleWarning: (time: string) => `Mise à jour impossible : données de ${time}.`,
    updatedAt: (time: string) => `Mis à jour à ${time}`,
    direction: (headsign: string) => `Direction ${headsign}`,
    approaching: "À l'approche",
    minutes: (minutes: number) => `${minutes} min`,
    realtime: "Temps réel",
    scheduled: "Horaire théorique",
  },
} as const;
