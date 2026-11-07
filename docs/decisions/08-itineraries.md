# 08 — Itineraries from the M planner

## Decision

- Itineraries come from the M API's own planner, an OpenTripPlanner instance:
  `GET https://data.mobilites-m.fr/api/routers/default/plan?fromPlace=lat,lon&toPlace=lat,lon`
  (no key, same `origin` header). It already knows walking paths, changes and every operator of
  the M network: no routing is computed on our side.
- `/api/itineraries?from=<stop id>&to=<stop id>` places each stop at its position from our
  network, asks for 3 itineraries leaving now, and is cached 30 s per pair of stops.
- Only what is shown is kept (`toItineraries` in `@greline/gtfs`): start and end of the trip,
  total walking time, and each ride (line name and colors, headsign, stops, times). Stop names
  lose their "City, " prefix, as on the map.
- The planner always lists walking all the way, often first even when it takes an hour (Gares to
  Grand'place: 58 min on foot before a 23 min tram ride): it is dropped when a ride arrives sooner.
- The search runs on the usual trip ("My stops" panel): its two stops are the itinerary's ends,
  under the direct departures. No other search form.

## Not done (yet)

- Leaving later or arriving by a given time, and starting from the user's position or any point
  of the map: the planner accepts them, the interface does not ask yet.
- Drawing the chosen itinerary on the map: the planner sends each leg's geometry, unused for now.
- Realtime: on real data every leg came back `realTime: false`, so the times are scheduled ones
  and are shown as such (muted).
