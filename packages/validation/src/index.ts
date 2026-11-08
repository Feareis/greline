import { z } from "zod";
import { type Departure, type Disruption, type Itinerary, type ItineraryEnd, type ItineraryRide, type Line, NETWORK_IDS, type TransitSchedule, type Weather, type AirQuality, type ParkAndRide } from "@greline/types";

const hexColor = z.string().regex(/^[0-9A-Fa-f]{6}$/, "expected a 6-digit hex color without #");

export const lineSchema = z.object({
  id: z.string().min(1),
  shortName: z.string().min(1),
  longName: z.string(),
  mode: z.enum(["tram", "bus"]),
  network: z.enum(NETWORK_IDS),
  color: hexColor,
  textColor: hexColor,
}) satisfies z.ZodType<Line>;

export const departureSchema = z.object({
  lineId: z.string().min(1),
  stopId: z.string().min(1),
  direction: z.string(),
  headsign: z.string(),
  departureTime: z.iso.datetime({ offset: true }),
  realtime: z.boolean(),
}) satisfies z.ZodType<Departure>;

/**
 * A station id as used in our URLs: the M API cluster code ("SEM:GENGAR"). Same pattern the
 * M API enforces, which also keeps path separators and spaces out of upstream URLs.
 */
export const stopIdSchema = z.string().regex(/^[A-Z0-9]{3}:[0-9a-zA-Z-]{1,128}$/, "expected a cluster code like SEM:GENGAR");

/**
 * Rounds a coordinate to 3 decimals, about 100 m: close positions share one cached itinerary,
 * and a user's exact position never leaves the browser.
 */
export const roundToHundredMeters = (degrees: number): number => Math.round(degrees * 1000) / 1000;

const COORDINATES = /^(-?\d{1,3}(?:\.\d{1,8})?),(-?\d{1,3}(?:\.\d{1,8})?)$/;

/** One end of `GET /api/itineraries`: a stop id, or "lat,lon" in decimal degrees. */
export const itineraryEndParamSchema = z.union([
  stopIdSchema.transform((stopId): ItineraryEnd => ({ kind: "stop", stopId })),
  z
    .string()
    .regex(COORDINATES, "expected a stop id or lat,lon")
    .transform((value) => value.split(",").map(Number) as [number, number])
    .refine(([lat, lon]) => Math.abs(lat) <= 90 && Math.abs(lon) <= 180, "coordinates out of range")
    .transform(([lat, lon]): ItineraryEnd => ({ kind: "position", lat: roundToHundredMeters(lat), lon: roundToHundredMeters(lon) })),
]);

/** Body of `GET /api/air-quality`. */
export const airQualitySchema = z.object({ index: z.number().nonnegative() }) satisfies z.ZodType<AirQuality>;

/** Body of `GET /api/park-and-rides`. */
export const parkAndRidesResponseSchema = z.object({
  parkAndRides: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      city: z.string(),
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      capacity: z.number().int().positive(),
      free: z.number().int().nonnegative().nullable(),
      updatedAt: z.iso.datetime().nullable(),
    }) satisfies z.ZodType<ParkAndRide>,
  ),
});

/** Body of `GET /api/stops/{id}/departures`. */
export const departuresResponseSchema = z.object({ departures: z.array(departureSchema) });
export type DeparturesResponse = z.infer<typeof departuresResponseSchema>;

/** Body of `GET /api/network/schedule?network=...`. */
export const transitScheduleSchema = z
  .object({
    serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    shapes: z.array(z.array(z.tuple([z.number(), z.number()])).min(2)),
    patterns: z.array(
      z.object({
        lineId: z.string().min(1),
        headsign: z.string(),
        stopIds: z.array(z.string().min(1)).min(2),
        shape: z.number().int().nonnegative(),
        stopDistances: z.array(z.number().nonnegative()).min(2),
      }),
    ),
    trips: z.array(
      z.object({
        id: z.string().min(1),
        pattern: z.number().int().nonnegative(),
        start: z.number().int(),
        offsets: z.array(z.number().int().nonnegative()).min(2),
      }),
    ),
  })
  .refine((schedule) => schedule.trips.every((trip) => trip.pattern < schedule.patterns.length), {
    message: "a trip refers to a missing pattern",
  })
  .refine(
    (schedule) =>
      schedule.patterns.every((p) => p.shape < schedule.shapes.length && p.stopDistances.length === p.stopIds.length),
    { message: "a pattern refers to a missing shape or has one distance per stop missing" },
  ) satisfies z.ZodType<TransitSchedule>;

/** Body of `GET /api/network/delays`: seconds, keyed by trip id. */
export const tripDelaysResponseSchema = z.object({ delays: z.record(z.string(), z.number().int()) });

/** Body of `GET /api/disruptions`. */
export const disruptionsResponseSchema = z.object({
  disruptions: z.array(
    z.object({
      id: z.string().min(1),
      lineId: z.string().min(1),
      severity: z.enum(["interrupted", "disrupted", "info"]),
      title: z.string(),
      description: z.string(),
      start: z.iso.datetime(),
      end: z.iso.datetime(),
      stretch: z.array(z.tuple([z.number(), z.number()])).min(2).nullable(),
    }) satisfies z.ZodType<Disruption>,
  ),
});

const itineraryRideSchema = z.object({
  shortName: z.string().min(1),
  color: hexColor,
  textColor: hexColor,
  headsign: z.string(),
  from: z.string(),
  to: z.string(),
  departureTime: z.iso.datetime(),
  arrivalTime: z.iso.datetime(),
  realtime: z.boolean(),
}) satisfies z.ZodType<ItineraryRide>;

/** Body of `GET /api/itineraries?from=...&to=...`. */
export const itinerariesResponseSchema = z.object({
  itineraries: z.array(
    z.object({
      departureTime: z.iso.datetime(),
      arrivalTime: z.iso.datetime(),
      walkSeconds: z.number().nonnegative(),
      rides: z.array(itineraryRideSchema),
    }) satisfies z.ZodType<Itinerary>,
  ),
});

/** One of our networks, e.g. in `?network=chrono`. */
export const networkIdSchema = z.enum(NETWORK_IDS);

/** Body of `GET /api/weather`. */
export const weatherSchema = z.object({
  temperature: z.number(),
  apparentTemperature: z.number(),
  weatherCode: z.number().int(),
  isDay: z.boolean(),
  windSpeed: z.number().nonnegative(),
  sunrise: z.string().regex(/^\d{2}:\d{2}$/),
  sunset: z.string().regex(/^\d{2}:\d{2}$/),
}) satisfies z.ZodType<Weather>;

export * from "./m-api";
export * from "./open-meteo";
