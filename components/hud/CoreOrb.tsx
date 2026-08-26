"use client";

import { useEffect, useRef } from "react";

export type CoreState = "standby" | "listening" | "processing";

interface CoreOrbProps {
  size: number;
  state: CoreState;
  /** Rótulo do módulo focado, exibido sob o status. */
  focus?: string;
  onActivate?: () => void;
}

const STATE_COPY: Record<CoreState, { title: string; hint: string; hue: string }> =
  {
    standby: { title: "STANDBY", hint: "aguardando comando", hue: "79, 227, 255" },
    listening: { title: "LISTENING", hint: "captando áudio", hue: "124, 255, 155" },
    processing: { title: "PROCESSING", hint: "analisando dados", hue: "124, 92, 255" },
  };

interface Orbiter {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
}

/**
 * Núcleo luminoso da interface. O halo, os anéis e o enxame de partículas
 * respondem ao estado da IA — parado em standby, agitado ao ouvir.
 */
export function CoreOrb({ size, state, focus, onActivate }: CoreOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CoreState>(state);
  const copy = STATE_COPY[state];

  // Mantém o loop de animação lendo o estado atual sem reiniciar o efeito.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const c = size / 2;
    const orbiters: Orbiter[] = Array.from({ length: 90 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: c * (0.2 + Math.random() * 0.72),
      speed: (Math.random() * 0.006 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
      size: Math.random() * 1.6 + 0.4,
      alpha: Math.random() * 0.6 + 0.2,
    }));

    let raf = 0;
    let t = 0;

    const render = () => {
      const current = stateRef.current;
      const energy =
        current === "listening" ? 2.4 : current === "processing" ? 1.7 : 1;
      const hue = STATE_COPY[current].hue;

      ctx.clearRect(0, 0, size, size);
      t += 0.016 * energy;

      for (const o of orbiters) {
        if (!reduced) o.angle += o.speed * energy;

        // Respiração radial: as partículas pulsam para dentro e para fora.
        const wobble = Math.sin(t * 1.6 + o.radius) * (3 * energy);
        const r = o.radius + wobble;
        const x = c + Math.cos(o.angle) * r;
        const y = c + Math.sin(o.angle) * r * 0.92;

        ctx.beginPath();
        ctx.arc(x, y, o.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hue}, ${o.alpha})`;
        ctx.fill();

        // Rastro curto na direção do movimento.
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          c + Math.cos(o.angle - o.speed * 8) * r,
          c + Math.sin(o.angle - o.speed * 8) * r * 0.92,
        );
        ctx.strokeStyle = `rgba(${hue}, ${o.alpha * 0.35})`;
        ctx.lineWidth = o.size * 0.6;
        ctx.stroke();
      }

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  const ringSize = size;

  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={`Núcleo JARVIS — ${copy.title}`}
      className="group relative grid place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-hud-300/70"
      style={{ width: ringSize, height: ringSize }}
    >
      {/* Halo externo */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-radial-core opacity-80 blur-xl transition-opacity duration-700 group-hover:opacity-100"
      />

      {/* Ondas de pulso */}
      <span
        aria-hidden
        className="absolute inset-0 animate-pulse-ring rounded-full border border-hud-300/50"
      />
      <span
        aria-hidden
        className="absolute inset-0 animate-pulse-ring rounded-full border border-hud-300/30"
        style={{ animationDelay: "1.1s" }}
      />

      {/* Anéis técnicos girando em sentidos opostos */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full animate-spin-slow text-hud-300/45"
      >
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          strokeDasharray="3 7"
        />
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={i}
            x1="100"
            y1="8"
            x2="100"
            y2={i % 6 === 0 ? "18" : "13"}
            stroke="currentColor"
            strokeWidth={i % 6 === 0 ? "1.2" : "0.6"}
            transform={`rotate(${i * 15} 100 100)`}
          />
        ))}
      </svg>

      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="absolute inset-[10%] h-[80%] w-[80%] animate-spin-reverse text-hud-200/35"
      >
        <circle
          cx="100"
          cy="100"
          r="88"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeDasharray="40 14 8 14"
        />
      </svg>

      {/* Enxame de partículas */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{ width: size, height: size }}
      />

      {/* Esfera central */}
      <span
        aria-hidden
        className="absolute inset-[26%] animate-core-breathe rounded-full border border-hud-200/40"
        style={{
          background: `radial-gradient(circle at 38% 32%, rgba(${copy.hue}, 0.95) 0%, rgba(${copy.hue}, 0.35) 38%, rgba(3,16,28,0.9) 74%)`,
          boxShadow: `0 0 70px -8px rgba(${copy.hue}, 0.8), inset 0 0 40px -10px rgba(255,255,255,0.55)`,
        }}
      />

      {/* Legenda */}
      <span className="relative z-10 flex flex-col items-center gap-0.5 px-4 text-center">
        <span className="font-display text-[11px] font-semibold tracking-[0.34em] text-white text-glow-strong sm:text-sm">
          {copy.title}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-hud-100/70">
          {focus ?? copy.hint}
        </span>
      </span>
    </button>
  );
}
