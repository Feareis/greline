# 02 — Base map tiles

## Decision

The geographic map uses MapLibre GL JS (through `react-map-gl/maplibre`) with the **OpenFreeMap**
`dark` style (`https://tiles.openfreemap.org/styles/dark`): OpenStreetMap data as vector tiles.

## Rationale

- OpenFreeMap is free, with no API key, no registration, no cookies and no request quota.
- Vector tiles can be restyled: the background and water colors are aligned with `@greline/theme`
  when the style loads.
- `tile.openstreetmap.org` was rejected: raster tiles in the standard light OSM style only, and the
  OSMF tile policy offers no SLA and may block heavy users without notice; it asks regular users
  to rely on an alternative OSM-derived service or to self-host.

## Consequences

- Attribution "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" comes from the tiles; we add
  "© contributeurs OpenStreetMap" and "Données : M (ODbL)". The control is never collapsed.
- MapLibre 6 resolves its web worker relative to its own module URL, which breaks once bundled:
  `setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href)` makes
  Turbopack emit the worker file and gives MapLibre its real URL.
- If OpenFreeMap's public instance ever becomes unreliable, it can be self-hosted (open source,
  weekly planet downloads) without changing the client code beyond the style URL.
