# 03 — Geographic map only, trams on their real track

## Decision

The site shows a single view: the geographic MapLibre map. The schematic plan view and the
`@greline/schematic` package are removed. Moving trams are drawn on the map as small SVG trams in
their line color, rotated along the track.

Tram positions follow the GTFS `shapes.txt` track of each trip: the schedule route ships each
tram track (simplified to 2 m, ~3 000 points for the whole network) and, for every pattern, the
distance in meters of each stop along it. The client interpolates a distance in time between
two stops and turns it into a point and a bearing.

## Rationale

- Users read the real map; the plan duplicated it without being used.
- Using the trip's own track also draws variants (night extensions, depot runs) that the
  canonical line geometry missed.
- One code path (no plan/map toggle, no schematic layout) is simpler to keep correct.

## Not possible

Telling rolling-stock models apart: neither the M API realtime stoptimes nor the GTFS feed say
which vehicle runs a trip (no vehicle id, no model), and the GTFS-RT feed is not published.

## Consequences

- The schedule payload grows from ~19 KB to ~28 KB gzipped.
- The geometry helpers the GTFS import still needs (local projection, distance to a polyline)
  moved to `@greline/services`.
- The schematic code remains in git history if a plan view is ever wanted again (e.g. mobile).
