/** Design tokens shared by web and mobile (values only, no components). */
export const colors = {
  background: "#0B0F14",
  surface: "#151B23",
  text: "#F5F7FA",
  textMuted: "#9AA4B2",
  accent: "#4CC3FF",
  station: "#FFFFFF",
  /** Outline of a tram running late. */
  late: "#FF9F1C",
} as const;

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
