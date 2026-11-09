import { type ReactNode, type Ref, useEffect, useRef } from "react";
import { colors, ICON_BUTTON } from "@/lib/theme-tokens";

/** Closes on Escape and on a press outside of the returned element (the popovers of the top bar). */
export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) close();
    };
    const onPointer = (event: PointerEvent) => {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);
  return ref;
}

/** Fill of the placeholders shown while external data is on its way. */
export const SKELETON_FILL = `color-mix(in srgb, ${colors.textMuted} 22%, transparent)`;

/**
 * A gray block standing in for content still loading, sized by `className`. It pulses unless the
 * visitor asked for reduced motion. Decorative: whoever uses it announces the loading in words.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block rounded motion-safe:animate-pulse ${className}`} style={{ background: SKELETON_FILL }} />;
}

/** Lines of a list being fetched: the panel keeps its shape, screen readers hear `label`. */
export function SkeletonRows({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div role="status" className="mt-2 space-y-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 2 === 0 ? "w-full" : "w-2/3"}`} />
      ))}
    </div>
  );
}

/** Small capitals that title a section of a panel, set apart from the content below. */
export const SECTION_TITLE = "text-xs font-semibold uppercase tracking-wider";

/** Title of one section of a panel. The first of a block sits at its top, the others are spaced. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className={`mt-5 mb-2 first:mt-0 ${SECTION_TITLE}`} style={{ color: colors.textMuted }}>
      {children}
    </h3>
  );
}

/** The "×" of a panel. The panels focus it when they open, so Escape and Tab start from there. */
export function CloseButton({ label, onClick, ref }: { label: string; onClick: () => void; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`${ICON_BUTTON} text-2xl`}
      style={{ color: colors.textMuted }}
    >
      ×
    </button>
  );
}
