# 09 — Air quality from Open-Meteo

## Decision

- The day panel shows the current air quality in Grenoble next to the weather: "Air : bon /
  moyen / dégradé / mauvais / très mauvais / extrêmement mauvais".
- Source: Open-Meteo's air quality API (`air-quality-api.open-meteo.com`), same provider as the
  weather, no key, CC BY 4.0. Its data comes from the Copernicus Atmosphere Monitoring Service
  (CAMS), credited in the "Sources" modal.
- Only the European air quality index (`european_aqi`) is kept. Its six bands (EEA: 20, 40, 60,
  80, 100) match the six words of the French ATMO scale, so the familiar words are shown
  (`airQualityLevel` in `@greline/services`); the index itself is in the tooltip.
- `/api/air-quality` is its own route, cached 30 min by the server and the CDN (the index is
  computed hourly): a failing air quality source never takes the weather down with it.

## Not done

- The official ATMO index of Atmo Auvergne-Rhône-Alpes: it needs an account and an API key,
  for the same six words.
- Pollutant details (PM2.5, NO2, ozone) and pollution alerts.
