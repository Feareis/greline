# 11 — Park and ride car parks (P+R)

## Decision

- The map shows the P+R car parks within 500 m (about 6 minutes on foot) of a stop of the
  network, any line, shown or not: 22 of the 51 the M API lists. Each is a "P+R" badge: green while spaces
  are left, amber when almost full (under 10 spaces or a tenth of the car park), red when full,
  grey without live count. A click opens a card with the free spaces, the capacity and the
  time of the count.
- A panel right under the network panel holds a switch for the badges (off by default: the map
  is about the lines first; the choice is remembered) and, unfolded, the list of the P+R: the
  counted ones with a bar filled as much as the car park is, in the same colors, then the others
  with their capacity. The list is only fetched once unfolded or when the badges are on.
- Both left panels share one column, capped above the day panel: each scrolls when the room runs
  out, the P+R list at most 16rem high.
- Source: the M API, as for the network (ODbL, already credited): `findType/json?types=parking`
  for the car parks and their P+R capacity (`nb_pr`), `dyn/parking/json` for the live counts
  (`nb_pr_libres`). The dataset page of the Métropole still points to `dyn/PAR/json`, which
  answers 404.
- The 29 others are 1.8 to 27 km from the network, mostly TransIsère stations (Voiron, Moirans,
  Rives, Pontcharra...): they serve other networks. The nearest one left out (Saint-Égrève San
  Marino-Barrage) is 581 m from a stop; the farthest kept 229 m.
- Of the 22 kept, 11 are counted live, the tram ones; the others show their capacity only:
  still useful to know a P+R is there.
- Sensors drift: a count above the capacity is shown as the capacity. Names come in capitals and
  are rewritten for reading ("Pont-de-Claix l'Étoile").
- `/api/park-and-rides` caches both answers together for 1 min (server and CDN), the pace of
  the counts; the filter uses the network of the daily cache (`parkAndRidesNearStops`).

## Not done

- City car parks without P+R spaces (Chavant...): not linked to the network.
- Prices, maximum height, bike and electric car spaces: in the data, left out of the card.
- The nearest tram stop of each P+R.
