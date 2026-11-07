# 05 — Buses: Chrono and Proximo, one schedule per network

## Decision

- Lines carry a `network`: `tram`, `chrono` (M types CHRONO and CHRONO_PERI) or `proximo`.
  Only SEM lines are shown: our GTFS feed is SEM's, other operators publish their own.
- Flexo lines are left out for now: they run on reservation, so scheduled positions would
  often show buses that do not run.
- `/api/network` serves every shown line (shapes simplified to 2 m, ~31 KB gzipped).
  `/api/network/schedule?network=` serves one network's schedule of the day; the GTFS archive
  is read once for all networks and cached 6 h. The client loads only the shown networks.
- One `/api/network/delays` covers every network. Probe stations are chosen so each line has
  one at least every 8 stops (trams) or 12 stops (buses, less frequent), preferring stations
  shared by several lines: 35 probes instead of ~70 with fixed sampling.
- On the map, buses are thinner lines under the trams; all Chrono lines share one color, so
  line numbers are drawn along the lines and next to the buses from zoom 14. Bus-only stops are
  a clickable map layer (from zoom 13); tram stations stay buttons.
- The network filter (default: tram + Chrono) is remembered in local storage.

## Consequences

- Bus-only stops are not reachable with the keyboard yet (canvas layer); "Locate me" lists the
  nearest shown stops as buttons.
- ~70 M API requests per minute per server instance for delays (35 probes every 30 s).
