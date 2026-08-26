"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Gauge, Radar, X } from "lucide-react";

import { CampaignConsole } from "@/components/hud/CampaignConsole";
import type { LogLevel } from "@/lib/useCommandLog";
import { MetricGauge } from "@/components/hud/MetricGauge";
import {
  SALON_MODULES,
  STATUS_META,
  type ModuleId,
  type ModuleStatus,
  type SalonModule,
} from "@/lib/modules";

interface ModulePanelProps {
  module: SalonModule | null;
  onClose: () => void;
  onSelect: (module: SalonModule) => void;
  /** Classes extras — a gaveta mobile usa para ficar opaca sobre o mapa. */
  className?: string;
  /** Status em runtime por módulo — sobrescreve o declarado em modules.ts. */
  statusOverrides?: Partial<Record<ModuleId, ModuleStatus>>;
  /** Progresso da Onda 2 já formatado, ex.: "100/598". */
  onda2Label?: string;
  /** Encaminha eventos dos módulos live para o log de comandos. */
  onLog?: (text: string, level: LogLevel) => void;
}

/** Rail lateral: detalha o módulo selecionado ou mostra a visão geral. */
export function ModulePanel({
  module,
  onClose,
  onSelect,
  className = "",
  statusOverrides,
  onda2Label,
  onLog,
}: ModulePanelProps) {
  return (
    <aside
      className={`hud-panel hud-corners relative flex h-full w-full flex-col overflow-hidden ${className}`}
    >
      {/* Scanline decorativa percorrendo o painel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scanline bg-gradient-to-b from-transparent via-hud-300/[0.06] to-transparent"
      />

      <AnimatePresence mode="wait">
        {module ? (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="flex h-full flex-col"
          >
            <ModuleHeader
              module={module}
              status={statusOverrides?.[module.id]}
              onClose={onClose}
            />

            {module.live === "onda2" ? (
              <CampaignConsole onLog={onLog} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 px-3">
                  {module.metrics?.map((metric, i) => (
                    <MetricGauge
                      key={metric.label}
                      metric={metric}
                      accent={module.accent}
                      delay={i * 0.06}
                    />
                  ))}
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                  <div className="hud-label mb-2 flex items-center gap-2">
                    <Radar className="h-3 w-3" strokeWidth={1.6} />
                    Leitura do módulo
                  </div>

                  <ul className="space-y-1.5">
                    {module.feed?.map((line, i) => (
                      <motion.li
                        key={line}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.07 }}
                        className="flex gap-2 rounded border-l-2 bg-abyss-800/40 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-hud-100/80"
                        style={{ borderColor: `rgb(${module.accent})` }}
                      >
                        <ChevronRight
                          className="mt-0.5 h-3 w-3 shrink-0"
                          style={{ color: `rgb(${module.accent})` }}
                          strokeWidth={2}
                        />
                        <span>{line}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full flex-col"
          >
            <div className="border-b border-hud-400/15 px-4 py-3">
              <div className="hud-label">Painel de módulos</div>
              <h2 className="mt-1 font-display text-sm tracking-[0.2em] text-hud-100 text-glow">
                VISÃO GERAL
              </h2>
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-hud-300/60">
                Selecione um nó orbital para expandir a telemetria do módulo.
              </p>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {SALON_MODULES.map((m) => {
                const Icon = m.icon;
                const status = STATUS_META[statusOverrides?.[m.id] ?? m.status];

                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(m)}
                      className="group flex w-full items-center gap-3 rounded border border-transparent px-2.5 py-2 text-left transition-colors hover:border-hud-400/25 hover:bg-abyss-800/50"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        strokeWidth={1.5}
                        style={{ color: `rgb(${m.accent})` }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[11px] tracking-[0.14em] text-hud-100">
                          {m.label}
                        </span>
                        <span className="block truncate font-mono text-[9px] text-hud-300/50">
                          {m.tagline}
                        </span>
                      </span>
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            <SystemSummary onda2Label={onda2Label} statusOverrides={statusOverrides} />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

/** Resumo operacional do dia, no rodapé da visão geral. */
function SystemSummary({
  onda2Label,
  statusOverrides,
}: {
  onda2Label?: string;
  statusOverrides?: Partial<Record<ModuleId, ModuleStatus>>;
}) {
  const alerts = SALON_MODULES.filter(
    (m) => (statusOverrides?.[m.id] ?? m.status) !== "nominal",
  ).length;

  const cells = [
    { label: "Ocupação", value: "87%", tone: "text-hud-100" },
    { label: "Faturado hoje", value: "R$ 4,8k", tone: "text-hud-100" },
    // Único número real desta linha: vem do ONDA2_app.html.
    { label: "Onda 2", value: onda2Label ?? "—", tone: "text-plasma" },
  ];

  return (
    <div className="border-t border-hud-400/15 px-3 py-3">
      <div className="hud-label mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Gauge className="h-3 w-3" strokeWidth={1.6} />
          Resumo do turno
        </span>
        <span className="text-ember">{alerts} alertas</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded border border-hud-400/15 bg-abyss-800/40 px-2 py-1.5"
          >
            <div className="hud-label truncate text-[9px]">{cell.label}</div>
            <div className={`mt-0.5 hud-value text-sm font-semibold ${cell.tone}`}>
              {cell.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleHeader({
  module,
  status: statusOverride,
  onClose,
}: {
  module: SalonModule;
  status?: ModuleStatus;
  onClose: () => void;
}) {
  const Icon = module.icon;
  const status = STATUS_META[statusOverride ?? module.status];

  return (
    <div
      className="mb-3 flex items-start gap-3 border-b px-4 py-3"
      style={{
        borderColor: `rgba(${module.accent}, 0.25)`,
        background: `linear-gradient(180deg, rgba(${module.accent},0.12), rgba(3,16,28,0))`,
      }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded border"
        style={{
          borderColor: `rgba(${module.accent}, 0.4)`,
          background: `rgba(${module.accent}, 0.12)`,
        }}
      >
        <Icon
          className="h-4 w-4"
          strokeWidth={1.6}
          style={{ color: `rgb(${module.accent})` }}
        />
      </span>

      <div className="min-w-0 flex-1">
        <h2 className="font-display text-sm font-semibold tracking-[0.18em] text-hud-100 text-glow">
          {module.label}
        </h2>
        <p className="mt-0.5 truncate font-mono text-[10px] text-hud-300/60">
          {module.tagline}
        </p>
        <p
          className={`mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] ${status.color}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar módulo"
        className="shrink-0 rounded p-1 text-hud-300/60 transition-colors hover:bg-hud-400/10 hover:text-hud-100"
      >
        <X className="h-4 w-4" strokeWidth={1.6} />
      </button>
    </div>
  );
}
