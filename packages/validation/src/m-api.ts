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
