import { z } from "zod";

// Schemas for the M API (data.mobilites-m.fr) responses. Only the fields we use are declared:
// unknown fields are stripped, so harmless additions on their side do not break us.

const hexColor = z.string().regex(/^[0-9A-Fa-f]{6}$/, "expected a 6-digit hex color without #");
const longitude = z.number().min(-180).max(180);
const latitude = z.number().min(-90).max(90);

/** One entry of `GET /api/routers/default/index/routes?reseaux=TRAM`. */
export const mRouteSchema = z.object({
  id: z.string().min(1),
  shortName: z.string().min(1),
  longName: z.string(),
  color: hexColor,
  textColor: hexColor,
  /** M network ("reseau"): TRAM, CHRONO, CHRONO_PERI, PROXIMO, FLEXO... */
  type: z.string().min(1),
});
export const mRoutesSchema = z.array(mRouteSchema);
export type MRoute = z.infer<typeof mRouteSchema>;

const lonLatSchema = z.tuple([longitude, latitude]);

/** `GET /api/lines/json?types=ligne&codes=...`: GeoJSON shapes, ids like "SEM_A". */
export const mLineShapesSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      properties: z.object({ id: z.string().min(1) }),
      geometry: z.object({
        type: z.literal("MultiLineString"),
        coordinates: z.array(z.array(lonLatSchema).min(2)).min(1),
      }),
    }),
  ),
});
export type MLineShapes = z.infer<typeof mLineShapesSchema>;

const mTimesheetStopSchema = z.object({
  stopId: z.string().min(1),
  lat: latitude,
  lon: longitude,
  parentStation: z.object({
    // The cluster *code* (e.g. "SEM:GENGAR") is the id accepted by the stoptimes endpoint;
    // the cluster *id* ("SEM:GAR") returns 204 there.
    code: z.string().min(1),
    name: z.string().min(1),
    city: z.string(),
    lat: latitude,
    lon: longitude,
  }),
});

/** `GET /api/ficheHoraires/json?route=SEM:A`: ordered stops per direction ("0", "1"). */
export const mTimesheetSchema = z.record(
  z.string(),
  z.object({ arrets: z.array(mTimesheetStopSchema) }),
);
export type MTimesheet = z.infer<typeof mTimesheetSchema>;

/** `GET /api/routers/default/index/clusters/{code}/stoptimes`: next departures per pattern. */
export const mStopTimesSchema = z.array(
  z.object({
    // Pattern id starts with the route id: "SEM:B:1:234041489" -> line "SEM:B", direction 1.
    pattern: z.object({ id: z.string().min(1), desc: z.string() }),
    times: z.array(
      z.object({
        tripId: z.string().min(1),
        scheduledDeparture: z.number().int().nonnegative(),
        realtimeDeparture: z.number().int().nonnegative(),
        realtime: z.boolean(),
        /** Unix seconds of the service day origin ("noon minus 12 h", see GTFS). */
        serviceDay: z.number().int().positive(),
      }),
    ),
  }),
);
export type MStopTimes = z.infer<typeof mStopTimesSchema>;

/** "07/11/2026 12:00": day/month/year hours:minutes, Grenoble time. */
const mDateTime = z.string().regex(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/, "expected DD/MM/YYYY HH:MM");

/** One event of `GET /api/dyn/evtTC/json` (disruptions and information of the transit lines). */
export const mEventSchema = z.object({
  code: z.string().min(1),
  titre: z.string(),
  description: z.string(),
  dateDebut: mDateTime,
  dateFin: mDateTime,
  /** One line per event, as "SEM_A". */
  listeLigne: z.string(),
  /** Severity level (see toDisruptions in @greline/gtfs). */
  nsv_id: z.number().int(),
  visibleTC: z.boolean(),
});
export type MEvent = z.infer<typeof mEventSchema>;

/** `GET /api/dyn/evtTC/json`: events keyed by code. Each is validated on its own (mEventSchema). */
export const mEventsSchema = z.record(z.string(), z.unknown());


/** Unix milliseconds. */
const mInstant = z.number().int().nonnegative();

const mPlanLegSchema = z.object({
  /** WALK, BUS, TRAM, RAIL... */
  mode: z.string().min(1),
  transitLeg: z.boolean(),
  startTime: mInstant,
  endTime: mInstant,
  realTime: z.boolean(),
  from: z.object({ name: z.string() }),
  to: z.object({ name: z.string() }),
  // Transit legs only.
  headsign: z.string().optional(),
  routeShortName: z.string().optional(),
  routeLongName: z.string().optional(),
  routeColor: hexColor.optional(),
  routeTextColor: hexColor.optional(),
});
export type MPlanLeg = z.infer<typeof mPlanLegSchema>;

/**
 * `GET /api/routers/default/plan?fromPlace=lat,lon&toPlace=lat,lon` (OpenTripPlanner). When
 * nothing is found, `itineraries` is empty and `error` says why ("PATH_NOT_FOUND").
 */
export const mPlanSchema = z.object({
  plan: z.object({
    itineraries: z.array(
      z.object({
        startTime: mInstant,
        endTime: mInstant,
        /** Seconds. */
        walkTime: z.number().nonnegative(),
        legs: z.array(mPlanLegSchema).min(1),
      }),
    ),
  }),
  error: z.object({ message: z.string() }).optional(),
});
export type MPlan = z.infer<typeof mPlanSchema>;

/** `GET /api/findType/json?types=parking`: car parks around Grenoble, P+R ones included. */
export const mParkingsSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      properties: z.object({
        id: z.string().min(1),
        nom: z.string().min(1),
        commune: z.string(),
        /** P+R spaces; absent or 0 for a car park that is not a P+R. */
        nb_pr: z.number().int().nonnegative().optional(),
      }),
      geometry: z.object({ type: z.literal("Point"), coordinates: lonLatSchema }),
    }),
  ),
});
export type MParkings = z.infer<typeof mParkingsSchema>;

/**
 * `GET /api/dyn/parking/json`: live counts by car park id. `nb_pr_libres` is null for a car park
 * without sensors; `time` (Unix ms) is then the time of the answer, not of a count.
 */
export const mParkingCountsSchema = z.record(
  z.string(),
  z.object({ time: z.number().int().positive(), nb_pr_libres: z.number().int().nullable().optional() }),
);
export type MParkingCounts = z.infer<typeof mParkingCountsSchema>;
