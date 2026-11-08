"use client";

import { fr } from "@greline/i18n";
import type { GeoPoint } from "@greline/services";

const GEOLOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 };

function failureMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) return fr.locate.denied;
  if (error.code === error.TIMEOUT) return fr.locate.timeout;
  return fr.locate.unavailable;
}

/**
 * The user's position, asked for only when they request it. Rejects with an Error whose message
 * is ready to show (permission denied, timeout, no geolocation).
 */
export function currentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    // Also covers insecure (http) pages, where browsers hide the geolocation API.
    if (!("geolocation" in navigator)) {
      reject(new Error(fr.locate.unsupported));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
      (error) => reject(new Error(failureMessage(error))),
      GEOLOCATION_OPTIONS,
    );
  });
}
