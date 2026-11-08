# 10 — Installable web app, without a service worker

## Decision

- The site ships a web app manifest (`apps/web/src/app/manifest.ts`, served at
  `/manifest.webmanifest`): name, French description, `display: standalone`, dark theme colors,
  and the logo icons (192 and 512 px, plus a full-bleed "maskable" 512 px one that Android crops
  into its own shape). Installed, Greline opens from the home screen without the browser bar.
- iPhone: `appleWebApp` metadata and a 180 px `apple-icon.png`, square and opaque since iOS
  rounds it itself. The tab icon is `icon.svg`, with a `favicon.ico` (16, 32, 48 px) for the rest.
- The status bar color follows the system theme (`viewport.themeColor`).
- All icons come from the logo sources in `assets/logo/svg/`.

## No service worker

- Chrome no longer requires a service worker to offer "Install app" (since Chrome 108 on mobile,
  112 on desktop), and iOS never did. Only Chrome's automatic install banner still needs one.
- Every screen of Greline shows live data (vehicles, departures, disruptions): an offline copy
  would show stale positions as if they were live. A service worker would add cache rules to keep
  right for no gain.

## Not done

- The automatic install banner, and an "Install" button of our own (`beforeinstallprompt`).
- Offline mode, push notifications (they would need a service worker, see the ideas list).
- The status bar color does not follow the theme chosen in the site, only the system one.
