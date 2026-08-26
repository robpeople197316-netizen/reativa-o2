"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Waves } from "lucide-react";

import { AudioWaveform } from "@/components/hud/AudioWaveform";
import { CommandLog } from "@/components/hud/CommandLog";
import type { MicStatus } from "@/lib/useMicLevel";
import type { LogEntry } from "@/lib/useCommandLog";

interface VoiceHUDProps {
  listening: boolean;
  onToggle: () => void;
  micStatus: MicStatus;
  dataRef: React.RefObject<Uint8Array | null>;
  entries: LogEntry[];
}

const MIC_HINT: Record<MicStatus, string> = {
  idle: "microfone em repouso",
  requesting: "solicitando permissão…",
  live: "captura de áudio ativa",
  denied: "permissão negada · onda simulada",
  unsupported: "sem suporte a áudio · onda simulada",
};

/** Painel inferior: waveform reativa, botão de microfone e log de comandos. */
export function VoiceHUD({
  listening,
  onToggle,
  micStatus,
  dataRef,
  entries,
}: VoiceHUDProps) {
  return (
    <section className="relative z-20 border-t border-hud-400/15 bg-abyss-950/70 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-hud-300/50 to-transparent" />

      <div className="mx-auto grid max-w-[1800px] gap-3 px-3 py-3 sm:px-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(260px,24rem)] lg:items-center">
        {/* Waveform */}
        <div className="hud-panel hud-corners order-2 h-24 min-w-0 overflow-hidden px-3 py-2 lg:order-1">
          <div className="flex items-center justify-between">
            <span className="hud-label flex shrink-0 items-center gap-1.5">
              <Waves className="h-3 w-3" strokeWidth={1.6} />
              Audio input
            </span>
            <span
              className={`ml-2 truncate font-mono text-[9px] tracking-[0.18em] ${
                listening ? "text-acid" : "text-hud-300/50"
              }`}
            >
              {MIC_HINT[micStatus].toUpperCase()}
            </span>
          </div>

          <div className="h-14">
            <AudioWaveform active={listening} dataRef={dataRef} />
          </div>
        </div>

        {/* Botão central de microfone */}
        <div className="order-1 flex flex-col items-center gap-1.5 lg:order-2">
          <motion.button
            type="button"
            onClick={onToggle}
            whileTap={{ scale: 0.94 }}
            aria-pressed={listening}
            aria-label={
              listening ? "Parar captura de voz" : "Iniciar captura de voz"
            }
            className="relative grid h-16 w-16 place-items-center rounded-full border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-hud-300/70"
            style={{
              borderColor: listening
                ? "rgba(124,255,155,0.8)"
                : "rgba(79,227,255,0.4)",
              background: listening
                ? "radial-gradient(circle at 50% 40%, rgba(124,255,155,0.35), rgba(3,16,28,0.95) 70%)"
                : "radial-gradient(circle at 50% 40%, rgba(79,227,255,0.2), rgba(3,16,28,0.95) 70%)",
              boxShadow: listening
                ? "0 0 40px -6px rgba(124,255,155,0.8)"
                : "0 0 26px -10px rgba(79,227,255,0.8)",
            }}
          >
            {listening && (
              <>
                <span className="absolute inset-0 animate-pulse-ring rounded-full border border-acid/60" />
                <span
                  className="absolute inset-0 animate-pulse-ring rounded-full border border-acid/40"
                  style={{ animationDelay: "1s" }}
                />
              </>
            )}

            {listening ? (
              <Mic className="h-6 w-6 text-acid drop-shadow-glow" strokeWidth={1.6} />
            ) : (
              <MicOff className="h-6 w-6 text-hud-200/80" strokeWidth={1.6} />
            )}
          </motion.button>

          <span
            className={`font-display text-[10px] font-semibold tracking-[0.28em] ${
              listening ? "text-acid text-glow" : "text-hud-200/70"
            }`}
          >
            {listening ? "LISTENING" : "STANDBY"}
          </span>
        </div>

        {/* Log */}
        <div className="hud-panel hud-corners order-3 h-24 min-w-0 overflow-hidden px-3 py-2">
          <CommandLog entries={entries} />
        </div>
      </div>
    </section>
  );
}
