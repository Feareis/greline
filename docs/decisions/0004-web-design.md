# 0004 — Web design: floating controls, credits in a modal, weather

- Status: accepted
- Date: 2026-11-06

## Decision

- The map fills the screen. A transparent top bar floats over it: site name on the left; theme
  switch, "locate me", "Sources" and the version badge on the right.
- Credits, licences, the "unofficial" notice and the developer live in the "Sources" modal. The
  map keeps MapLibre's attribution control, folded to its "i" button at load.
- The version badge reads `apps/web/package.json` and `VERCEL_ENV` at build time: `PROD` on the
  Vercel production deployment, `DEV` everywhere else.
- Weather comes from Open-Meteo (free, no key, CC BY 4.0) through our `/api/weather` route,
  cached 15 min. Moon phase is computed locally (mean lunation, ~half a day accuracy).
- The "traffic" indicator is derived from realtime tram delays (share of trams more than
  2 min late) until an official disruption feed is available.
- Light and dark themes share one palette definition (`@greline/theme`) exposed to the web app
  as CSS variables; the base map switches between OpenFreeMap `positron` and `dark`.

## Rationale

- OpenStreetMap and ODbL require attribution on the map itself: a folded "i" is the accepted
  minimum, so the credits cannot move entirely into the modal.
- CSS variables let every component follow the theme without re-rendering, and an inline script
  applies the saved theme before the first paint (no flash).
