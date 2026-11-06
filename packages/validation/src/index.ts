import { z } from "zod";
import type { Line } from "@greline/types";

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
});
