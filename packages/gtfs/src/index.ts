/** Open data endpoints of the M API (license: ODbL). Server-side use only. */
export const M_API = {
  gtfsSem: "https://data.mobilites-m.fr/api/gtfs/SEM",
  linesSem: "https://data.mobilites-m.fr/api/lines/json?types=ligne&reseaux=SEM",
  stopClusters: "https://data.mobilites-m.fr/api/points/json?types=clusters",
} as const;
