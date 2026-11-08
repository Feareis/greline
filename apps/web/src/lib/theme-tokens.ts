import { type Palette, palettes, radii } from "@greline/theme";

export const THEME_STORAGE_KEY = "greline-theme";

/** Theme colors as CSS variables: components follow the active theme without re-rendering. */
export const colors = Object.fromEntries(Object.keys(palettes.dark).map((key) => [key, `var(--g-${key})`])) as Record<
  keyof Palette,
  string
>;

const declarations = (palette: Palette): string =>
  Object.entries(palette)
    .map(([key, value]) => `--g-${key}:${value}`)
    .join(";");

/** CSS variables of both themes; dark is also the default when scripts are disabled. */
export const themeCss =
  `:root,:root[data-theme="dark"]{color-scheme:dark;${declarations(palettes.dark)}}` +
  `:root[data-theme="light"]{color-scheme:light;${declarations(palettes.light)}}`;

/**
 * Runs before the first paint (inline in <head>): applies the saved theme, or the system one,
 * so the page never flashes the wrong colors. Blocked storage (private mode) means no saved theme.
 */
export const themeScript = `(function(){var t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){t=null}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t})()`;

/** Thin edge so panels and buttons stand out from the map, a light map under a light theme included. */
const EDGE = `1px solid color-mix(in srgb, ${colors.text} 14%, transparent)`;

/** Translucent surface for controls floating over the map. */
export const glass = {
  background: `color-mix(in srgb, ${colors.surface} 92%, transparent)`,
  color: colors.text,
  border: EDGE,
} as const;

/** Opaque surface of the side panels (stop, line, my stops), whose text must stay easy to read. */
export const panel = {
  background: colors.surface,
  color: colors.text,
  border: EDGE,
  borderRadius: radii.md,
} as const;

/** Side panels: on the right on wide screens, a bottom sheet on phones. */
export const SIDE_PANEL =
  "absolute inset-x-3 bottom-3 z-10 max-h-[60%] overflow-y-auto p-4 shadow-2xl sm:inset-x-auto sm:right-3 sm:top-16 sm:bottom-auto sm:max-h-[calc(100dvh-5rem)] sm:w-[22rem]";

/** Shared look of the round controls floating over the map. */
export const FLOATING_BUTTON =
  "flex h-9 min-w-9 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-medium shadow-lg backdrop-blur hover:opacity-90 focus-visible:outline-2 disabled:opacity-60";

/** Small round buttons inside the panels (close, share, favorite): one size, a visible hover. */
export const ICON_BUTTON =
  "flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-full px-1.5 leading-none hover:bg-[color-mix(in_srgb,var(--g-text)_10%,transparent)] focus-visible:outline-2";

/** Filter chips (networks, trip, search modes): pressed ones filled with the accent color. */
export const chip = (pressed: boolean) =>
  ({
    background: pressed ? colors.accent : "transparent",
    color: pressed ? colors.background : colors.text,
    borderColor: pressed ? colors.accent : colors.textMuted,
  }) as const;

export const CHIP = "rounded-full border px-2.5 py-0.5 text-sm font-medium focus-visible:outline-2";
