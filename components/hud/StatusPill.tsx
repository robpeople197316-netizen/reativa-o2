"use client";

import type { ReactNode } from "react";

interface StatusPillProps {
  label: string;
  children: ReactNode;
  /** Cor do LED. Aceita qualquer classe de background do Tailwind. */
  dot?: string;
  pulsing?: boolean;
}

/** Bloco atômico do header: rótulo minúsculo em cima, valor destacado embaixo. */
export function StatusPill({
  label,
  children,
  dot,
  pulsing = false,
}: StatusPillProps) {
  return (
    <div className="hud-panel hud-corners flex min-w-0 items-center gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-3">
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {pulsing && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${dot}`}
            />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${dot} shadow-[0_0_8px_currentColor]`}
          />
        </span>
      )}
      <div className="min-w-0">
        <div className="hud-label truncate leading-none">{label}</div>
        <div className="mt-1 truncate font-mono text-[11px] text-hud-100 sm:text-xs">
          {children}
        </div>
      </div>
    </div>
  );
}
