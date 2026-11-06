/** Design tokens shared by web and mobile (values only, no components). */

/** One color theme. Line colors come from the M API and are the same in both themes. */
export interface Palette {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  station: string;
  /** Ring around stations, so white dots stay visible on a light map. */
  stationOutline: string;
  /** Outline of a tram running late. */
  late: string;
  /** Development environment badge. */
  danger: string;
  /** Production environment badge. */
  success: string;
}

export type ThemeName = "dark" | "light";

export const palettes: Record<ThemeName, Palette> = {
  dark: {
    background: "#0B0F14",
    surface: "#151B23",
    text: "#F5F7FA",
    textMuted: "#9AA4B2",
    accent: "#4CC3FF",
    station: "#FFFFFF",
    stationOutline: "#0B0F14",
    late: "#FF3B30",
    danger: "#E5484D",
    success: "#30A46C",
  },
  light: {
    background: "#F3F5F8",
    surface: "#FFFFFF",
    text: "#0F172A",
    textMuted: "#556070",
    accent: "#0369A1",
    station: "#FFFFFF",
    stationOutline: "#0F172A",
    late: "#E5281E",
    danger: "#D93036",
    success: "#24804D",
  },
};

/** The default (dark) theme. */
export const colors: Palette = palettes.dark;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  pill: 999,
} as const;

/** Prefixes a M API hex color ("E2001A") with "#". */
export const toCssColor = (hex: string): string => (hex.startsWith("#") ? hex : `#${hex}`);
