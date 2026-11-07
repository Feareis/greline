# 0007 — Favorite stops and the usual trip, on the device

- Status: accepted
- Date: 2026-11-07

## Decision

- Favorite stops and the usual trip ("home to work") are stored in the browser's local storage,
  with no account. Reading back validates them (`parseFavorites`, `parseTrip` in
  `@greline/services`): ids must look like stop ids, anything else is dropped.
- A trip is two stops. Its departures are those, at the start, of the lines whose direction
  passes the start and then the end (`directTripLegs`): direct trips only. Trips with changes
  belong to the itinerary search (Proto 8).
- Directions come from the M timesheets ("0", "1" with their stop order, now kept per line in
  `NetworkLine.directions`) and from the realtime pattern ids ("SEM:B:1:..."), which use the
  same numbering (checked on real data: B direction 1 ends at Plaine des Sports in both).
- The "My stops" panel opens on its own when there are favorites or a trip, until the user
  closes it; a stop picked there opens its panel and centers the map on it.
- Push notifications for favorite lines are not part of it: they need server-side storage for
  subscriptions and a periodic job.
