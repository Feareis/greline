import { type Palette, palettes } from "@greline/theme";

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
