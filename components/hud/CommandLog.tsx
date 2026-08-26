"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Terminal } from "lucide-react";

import type { LogEntry, LogLevel } from "@/lib/useCommandLog";

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: "text-hud-300/70",
  ok: "text-acid/80",
  warn: "text-ember/85",
  voice: "text-plasma",
};

const LEVEL_TAG: Record<LogLevel, string> = {
  info: "SYS",
  ok: "OK ",
  warn: "WRN",
  voice: "VOX",
};

/** Log discreto de comandos e eventos recentes, no rodapé do HUD. */
export function CommandLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="hud-label mb-1.5 flex items-center gap-2">
        <Terminal className="h-3 w-3" strokeWidth={1.6} />
        Log de comandos
        <span className="ml-auto text-hud-300/40">{entries.length} eventos</span>
      </div>

      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 font-mono text-[10px] leading-relaxed">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.li
              key={entry.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex min-w-0 gap-2 whitespace-nowrap"
            >
              <span className="shrink-0 text-hud-400/45 tabular-nums">
                {entry.time}
              </span>
              <span className={`shrink-0 ${LEVEL_COLOR[entry.level]}`}>
                [{LEVEL_TAG[entry.level]}]
              </span>
              <span className="min-w-0 truncate text-hud-100/65">{entry.text}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
