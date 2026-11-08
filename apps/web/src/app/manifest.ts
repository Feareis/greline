import { fr } from "@greline/i18n";
import { palettes } from "@greline/theme";
import type { MetadataRoute } from "next";

/**
 * Web app manifest, served at /manifest.webmanifest: phones and Chrome can install the site as an
 * app that opens without the browser bar. No service worker: the app needs live data anyway, and
 * Chrome no longer requires one to install (see docs/decisions/10-pwa.md).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: fr.app.name,
    short_name: fr.app.name,
    description: fr.app.tagline,
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // The splash screen and window bar match the dark theme, the default one.
    background_color: palettes.dark.background,
    theme_color: palettes.dark.background,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full bleed: Android crops it into its own shape (circle, squircle).
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
