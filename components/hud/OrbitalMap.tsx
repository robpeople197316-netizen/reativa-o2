"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

import { CoreOrb, type CoreState } from "@/components/hud/CoreOrb";
import { OrbitNode } from "@/components/hud/OrbitNode";
import {
  SALON_MODULES,
  type ModuleId,
  type ModuleStatus,
  type SalonModule,
} from "@/lib/modules";
import { useElementSize } from "@/lib/useElementSize";

interface OrbitalMapProps {
  coreState: CoreState;
  activeId: string | null;
  onSelect: (module: SalonModule) => void;
  onCoreActivate: () => void;
  /** Status em runtime por módulo — sobrescreve o declarado em modules.ts. */
  statusOverrides?: Partial<Record<ModuleId, ModuleStatus>>;
}

interface PlacedNode {
  module: SalonModule;
  x: number;
  y: number;
  angle: number;
}

interface RingGeometry {
  rx: number;
  ry: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const RING_FACTOR = [0.62, 1] as const;

export function OrbitalMap({
  coreState,
  activeId,
  onSelect,
  onCoreActivate,
  statusOverrides,
}: OrbitalMapProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const [hovered, setHovered] = useState<SalonModule | null>(null);
  const reduced = useReducedMotion();

  const compact = size.width > 0 && size.width < 720;

  const layout = useMemo(() => {
    const { width, height } = size;
    if (!width || !height) return null;

    const cx = width / 2;
    const cy = height / 2;

    const bound = Math.min(width, height);
    const nodeSize = clamp(bound * 0.11, 52, 84);
    const coreSize = clamp(bound * 0.28, 140, 264);

    // Elipse ocupa os dois eixos de forma independente, então o mapa se
    // espalha em telas largas em vez de ficar preso a um círculo.
    // A folga vertical é maior: o rótulo de cada nó fica abaixo dele.
    const rxOuter = width / 2 - nodeSize / 2 - 48;
    const ryOuter = height / 2 - nodeSize / 2 - 52;

    // O anel interno nunca encosta no núcleo, mesmo em telas baixas — a folga
    // extra reserva espaço para o rótulo que fica sob cada nó.
    const minInner = coreSize / 2 + nodeSize / 2 + 46;
    const rings: RingGeometry[] = RING_FACTOR.map((factor, i) => ({
      rx: i === 0 ? Math.max(rxOuter * factor, minInner) : rxOuter,
      ry: i === 0 ? Math.max(ryOuter * factor, minInner) : ryOuter,
    }));

    const grouped: SalonModule[][] = [[], []];
    for (const m of SALON_MODULES) grouped[m.ring].push(m);

    const nodes: PlacedNode[] = [];

    grouped.forEach((ringModules, ringIndex) => {
      const { rx, ry } = rings[ringIndex];
      const step = (Math.PI * 2) / ringModules.length;
      // Anel externo entra defasado, encaixando entre os nós do interno.
      const offset = -Math.PI / 2 + (ringIndex === 1 ? step / 2 : 0);

      ringModules.forEach((module, i) => {
        const angle = offset + step * i;
        nodes.push({
          module,
          angle,
          x: cx + Math.cos(angle) * rx,
          y: cy + Math.sin(angle) * ry,
        });
      });
    });

    return { cx, cy, nodes, nodeSize, coreSize, rings };
  }, [size]);

  const focusLabel = hovered?.label ?? undefined;

  return (
    <div ref={ref} className="relative h-full w-full">
      {/* Grade de fundo do palco central */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-hud bg-grid-hud opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
      />

      {compact ? (
        <CompactLayout
          coreState={coreState}
          activeId={activeId}
          focusLabel={focusLabel}
          onSelect={onSelect}
          onCoreActivate={onCoreActivate}
          onHover={setHovered}
        />
      ) : (
        layout && (
          <>
            {/* Camada de conexões */}
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              <defs>
                <radialGradient id="orbit-fade">
                  <stop offset="0%" stopColor="rgba(79,227,255,0.5)" />
                  <stop offset="100%" stopColor="rgba(79,227,255,0.05)" />
                </radialGradient>
              </defs>

              {/* Anéis orbitais */}
              {layout.rings.map((ring, i) => (
                <ellipse
                  key={i}
                  cx={layout.cx}
                  cy={layout.cy}
                  rx={ring.rx}
                  ry={ring.ry}
                  fill="none"
                  stroke="rgba(79,227,255,0.2)"
                  strokeWidth={1}
                  strokeDasharray={i === 0 ? "2 6" : "10 8 2 8"}
                  className={reduced ? undefined : "animate-dash-flow"}
                  style={{ animationDuration: `${14 + i * 9}s` }}
                />
              ))}

              {/* Linhas núcleo → nó */}
              {layout.nodes.map(({ module, x, y }) => {
                const isActive = activeId === module.id;
                const isHot = hovered?.id === module.id || isActive;

                return (
                  <g key={module.id}>
                    <line
                      x1={layout.cx}
                      y1={layout.cy}
                      x2={x}
                      y2={y}
                      stroke={`rgba(${module.accent}, ${isHot ? 0.85 : 0.3})`}
                      strokeWidth={isHot ? 1.4 : 0.8}
                      strokeDasharray="4 8"
                      className={reduced ? undefined : "animate-dash-flow"}
                      style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                    />

                    {/* Pacote de dados viajando do núcleo até o módulo */}
                    {!reduced && (
                      <motion.circle
                        r={isHot ? 3 : 2}
                        fill={`rgb(${module.accent})`}
                        initial={false}
                        animate={{ cx: [layout.cx, x], cy: [layout.cy, y] }}
                        transition={{
                          duration: isHot ? 1.4 : 3.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: module.ring * 0.4,
                        }}
                        style={{
                          filter: `drop-shadow(0 0 6px rgb(${module.accent}))`,
                        }}
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Núcleo */}
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: layout.cx, top: layout.cy }}
            >
              <CoreOrb
                size={layout.coreSize}
                state={coreState}
                focus={focusLabel}
                onActivate={onCoreActivate}
              />
            </div>

            {/* Nós */}
            {layout.nodes.map(({ module, x, y }, i) => (
              <OrbitNode
                key={module.id}
                module={module}
                x={x}
                y={y}
                size={layout.nodeSize}
                index={i}
                active={activeId === module.id}
                status={statusOverrides?.[module.id]}
                onSelect={onSelect}
                onHover={setHovered}
              />
            ))}
          </>
        )
      )}
    </div>
  );
}

/**
 * Abaixo de 720px o mapa orbital não cabe sem sobreposição de rótulos:
 * o núcleo sobe e os módulos viram uma grade tocável.
 */
function CompactLayout({
  coreState,
  activeId,
  focusLabel,
  onSelect,
  onCoreActivate,
  onHover,
}: {
  coreState: CoreState;
  activeId: string | null;
  focusLabel?: string;
  onSelect: (module: SalonModule) => void;
  onCoreActivate: () => void;
  onHover: (module: SalonModule | null) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center gap-5 overflow-y-auto px-3 py-5 [mask-image:linear-gradient(to_bottom,black_calc(100%-40px),transparent)]">
      <div className="shrink-0">
        <CoreOrb
          size={170}
          state={coreState}
          focus={focusLabel}
          onActivate={onCoreActivate}
        />
      </div>

      <div className="grid w-full grid-cols-2 gap-3 pb-4 sm:grid-cols-3">
        {SALON_MODULES.map((module, i) => {
          const Icon = module.icon;
          const active = activeId === module.id;

          return (
            <motion.button
              key={module.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(module)}
              onFocus={() => onHover(module)}
              onBlur={() => onHover(null)}
              className="hud-panel hud-corners flex flex-col items-start gap-2 p-3 text-left"
              style={{
                borderColor: `rgba(${module.accent}, ${active ? 0.85 : 0.2})`,
                boxShadow: active
                  ? `0 0 26px -8px rgba(${module.accent}, 0.9)`
                  : undefined,
              }}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={1.4}
                style={{ color: `rgb(${module.accent})` }}
              />
              <span className="font-display text-[10px] font-semibold tracking-[0.16em] text-hud-100">
                {module.label}
              </span>
              <span className="font-mono text-[9px] leading-tight text-hud-300/60">
                {module.tagline}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
