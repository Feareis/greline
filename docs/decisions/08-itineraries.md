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
  under the direct departures.
- A free search sits in the top bar's search box ("Itinéraire" mode): any stop to any stop, or
  from the user's position. Each end of `/api/itineraries` is then a stop id or "lat,lon"
  (`itineraryEndParamSchema`). Positions are rounded to 3 decimals (~100 m) by the browser and
  again by the server: close users share one cached answer, and an exact position never leaves
  the device. A position more than 2 km from every stop is refused (`outside_service_area`), so
  the route cannot be used as a free planner proxy for anywhere.

## Not done (yet)

- Leaving later or arriving by a given time, and any point of the map as an end: the planner
  accepts them, the interface does not ask yet. The position is offered as a start only.
- Drawing the chosen itinerary on the map: the planner sends each leg's geometry, unused for now.
- Realtime: on real data every leg came back `realTime: false`, so the times are scheduled ones
  and are shown as such (muted).
