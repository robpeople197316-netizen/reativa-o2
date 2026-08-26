"use client";

import { Activity, CloudSun, Database, Droplets, PanelLeft } from "lucide-react";

import { StatusPill } from "@/components/hud/StatusPill";
import { useClock } from "@/lib/useClock";
import { useVaultSync } from "@/lib/useVaultSync";
import { useWeather } from "@/lib/useWeather";

const VAULT_META = {
  sinc: { text: "SINC", dot: "bg-acid", pulse: false },
  sincronizando: { text: "SINCRONIZANDO…", dot: "bg-ember", pulse: true },
  offline: { text: "OFFLINE", dot: "bg-rose", pulse: true },
} as const;

interface JarvisHeaderProps {
  consoleOpen?: boolean;
  onToggleConsole?: () => void;
}

export function JarvisHeader({
  consoleOpen = false,
  onToggleConsole,
}: JarvisHeaderProps) {
  const clock = useClock();
  const weather = useWeather();
  const vault = useVaultSync();
  const vaultMeta = VAULT_META[vault.phase];

  return (
    <header className="relative z-20 border-b border-hud-400/15 bg-abyss-950/60 backdrop-blur-md">
      {/* Fio de luz que marca a borda inferior do header */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-hud-300/60 to-transparent" />

      <div className="mx-auto flex max-w-[1800px] flex-col gap-2 px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:gap-3 lg:py-3">
        {/* Identidade do núcleo */}
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-hud-300/60" />
            <span className="absolute inset-1 rounded-full bg-hud-400/15" />
            <Activity
              className="relative h-5 w-5 text-hud-200 drop-shadow-glow"
              strokeWidth={1.5}
            />
          </div>

          <div className="leading-tight">
            <h1 className="font-display text-sm font-semibold tracking-[0.3em] text-hud-100 text-glow-strong">
              JARVIS CORE
            </h1>
            <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.28em] text-acid">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-acid shadow-[0_0_8px_#7cff9b]" />
              ONLINE
            </p>
          </div>

          {onToggleConsole && (
            <button
              type="button"
              onClick={onToggleConsole}
              aria-pressed={consoleOpen}
              aria-label="Alternar console do JARVIS"
              title="Console do JARVIS (tecla J)"
              className={`ml-auto flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1.5 font-display text-[9px] tracking-[0.18em] transition-colors lg:ml-0 ${
                consoleOpen
                  ? "border-plasma/70 bg-plasma/15 text-hud-100"
                  : "border-hud-400/25 text-hud-200/75 hover:border-hud-300/50 hover:text-hud-100"
              }`}
            >
              <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              CONSOLE
            </button>
          )}
        </div>

        <div className="hidden h-8 w-px bg-hud-400/20 lg:block" />

        {/* Telemetria */}
        <div className="grid w-full min-w-0 flex-1 grid-cols-2 gap-2 md:grid-cols-4">
          <StatusPill label="Data local">
            <span className={clock.ready ? "" : "opacity-40"}>{clock.date}</span>
          </StatusPill>

          <StatusPill label="Hora do sistema" dot="bg-hud-300" pulsing>
            <span className="text-sm text-glow tabular-nums">
              {clock.time}
              <span className="text-hud-400/70">:{clock.seconds}</span>
            </span>
          </StatusPill>

          <StatusPill label={weather.city}>
            <span className="flex items-center gap-2">
              <CloudSun className="h-3.5 w-3.5 text-hud-300" strokeWidth={1.6} />
              <span className="tabular-nums">
                {weather.ready ? `${weather.temp}°C` : "--°C"}
              </span>
              <Droplets className="h-3 w-3 text-hud-400/70" strokeWidth={1.6} />
              <span className="tabular-nums text-hud-300/70">
                {weather.ready ? `${weather.humidity}%` : "--%"}
              </span>
              <span className="hidden truncate text-[10px] text-hud-300/60 xl:inline">
                {weather.condition}
              </span>
            </span>
          </StatusPill>

          <StatusPill
            label="Obsidian Local Vault"
            dot={vaultMeta.dot}
            pulsing={vaultMeta.pulse}
          >
            <span className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-hud-300" strokeWidth={1.6} />
              <span className="tracking-[0.18em]">{vaultMeta.text}</span>
              <span className="text-[10px] text-hud-300/60">
                {vault.notes} notas · {vault.lastSync}
              </span>
            </span>
          </StatusPill>
        </div>
      </div>
    </header>
  );
}
