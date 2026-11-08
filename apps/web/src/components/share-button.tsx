"use client";

import { fr } from "@greline/i18n";
import { useEffect, useState } from "react";
import { colors, ICON_BUTTON } from "@/lib/theme-tokens";
import { LinkIcon } from "./icons";

const FEEDBACK_MS = 2_000;

type ShareStatus = "copied" | "failed" | null;

/**
 * Shares a link to this page with `search` as query string: the system share sheet on touch
 * screens, the clipboard elsewhere (a desktop share sheet rarely offers "copy").
 */
export function ShareButton({ name, search }: { name: string; search: string }) {
  const [status, setStatus] = useState<ShareStatus>(null);

  useEffect(() => {
    if (status === null) return;
    const timer = setTimeout(() => setStatus(null), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const share = async () => {
    const url = `${location.origin}${location.pathname}${search}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: `${name} · ${fr.app.name}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch (error) {
      // Closing the share sheet rejects with AbortError: the user changed their mind.
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.warn("Sharing the link failed", error);
      setStatus("failed");
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={fr.share.label(name)}
      title={fr.share.label(name)}
      className={`${ICON_BUTTON} text-xs`}
      style={{ color: status === "failed" ? colors.danger : colors.textMuted }}
    >
      <LinkIcon />
      <span aria-live="polite">{status === null ? "" : fr.share[status]}</span>
    </button>
  );
}
