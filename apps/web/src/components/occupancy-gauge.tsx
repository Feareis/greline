import { fr } from "@greline/i18n";
import type { Occupancy } from "@greline/types";
import { colors } from "@/lib/theme-tokens";

const LEVELS: Record<Occupancy, { bars: number; color: string }> = {
  low: { bars: 1, color: colors.success },
  medium: { bars: 2, color: colors.warning },
  high: { bars: 3, color: colors.danger },
};
const BAR_HEIGHTS = [5, 8, 11];

/** Expected occupancy as three rising bars, filled up to the level. The label tells it in words. */
export function OccupancyGauge({ occupancy }: { occupancy: Occupancy }) {
  const { bars, color } = LEVELS[occupancy];
  const label = fr.occupancy[occupancy];
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex items-end gap-px">
      {BAR_HEIGHTS.map((height, i) => (
        <span
          key={height}
          className="block w-[3px] rounded-sm"
          style={{ height, background: i < bars ? color : `color-mix(in srgb, ${colors.textMuted} 35%, transparent)` }}
        />
      ))}
    </span>
  );
}
