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
