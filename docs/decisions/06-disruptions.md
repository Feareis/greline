# 06 — Disruptions from the M events feed

## Decision

- Source: `GET https://data.mobilites-m.fr/api/dyn/evtTC/json` (no key), the only published
  disruption feed (the GTFS-RT feed is not available). One event per line (`listeLigne`:
  "SEM_A"); events of other lines are ignored.
- Severity (`nsv_id`), inferred from published events: 3 = line cut ("ne circule pas entre..."),
  2 = works and detours, 0/1/4 = information.
- Dates are Grenoble wall-clock times ("07/11/2026 12:00"); the texts' leading validity period is
  dropped since the dates are shown.
- The feed lists no affected stops. When the text says "entre les stations X et Y" and both
  names match stops of the line (ignoring case, accents, dashes and spacing), only that stretch
  is dashed; otherwise the whole line. On real data, 15 of 24 events were matched.
- Each event is validated on its own: a malformed one is skipped and counted, never hiding the
  others. `/api/disruptions` is cached 2 minutes.
- Display: a banner (cut and disrupted lines, ongoing and later today), dashed lines on the map
  edged with the severity color (gaps cut into the line itself, readable on any line color), the
  stop panel (information included), and the traffic level of the day panel.
- Push notifications move to Proto 7 (favorites): they need server-side storage for subscriptions.
