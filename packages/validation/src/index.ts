import { z } from "zod";
import type { Departure, Line } from "@greline/types";

const hexColor = z.string().regex(/^[0-9A-Fa-f]{6}$/, "expected a 6-digit hex color without #");

export const lineSchema = z.object({
  id: z.string().min(1),
  shortName: z.string().min(1),
  longName: z.string(),
  mode: z.enum(["tram", "bus"]),
  color: hexColor,
  textColor: hexColor,
}) satisfies z.ZodType<Line>;

export const departureSchema = z.object({
  lineId: z.string().min(1),
  stopId: z.string().min(1),
  headsign: z.string(),
  departureTime: z.iso.datetime({ offset: true }),
  realtime: z.boolean(),
}) satisfies z.ZodType<Departure>;

/**
 * A station id as used in our URLs: the M API cluster code ("SEM:GENGAR"). Same pattern the
 * M API enforces, which also keeps path separators and spaces out of upstream URLs.
 */
export const stopIdSchema = z.string().regex(/^[A-Z0-9]{3}:[0-9a-zA-Z-]{1,128}$/, "expected a cluster code like SEM:GENGAR");

/** Body of `GET /api/stops/{id}/departures`. */
export const departuresResponseSchema = z.object({ departures: z.array(departureSchema) });
export type DeparturesResponse = z.infer<typeof departuresResponseSchema>;

export * from "./m-api";
