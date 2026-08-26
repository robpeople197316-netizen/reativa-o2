"use client";

import { useEffect, useRef, type RefObject } from "react";

interface AudioWaveformProps {
  active: boolean;
  /** Dados de frequência reais do microfone; ausente = onda sintética. */
  dataRef?: RefObject<Uint8Array | null>;
  bars?: number;
  className?: string;
}

/**
 * Barras de áudio espelhadas no eixo central.
 *
 * Com permissão de microfone, desenha o espectro real; sem ela, sintetiza uma
 * onda contínua — o HUD nunca fica visualmente morto.
 */
export function AudioWaveform({
  active,
  dataRef,
  bars = 128,
  className = "",
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let t = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const amplitudeAt = (
      i: number,
      count: number,
      live: Uint8Array | null,
    ): number => {
      if (live && live.length) {
        // Comprime o espectro para o número de barras desenhadas.
        const slice = Math.max(1, Math.floor(live.length / count));
        let sum = 0;
        for (let k = 0; k < slice; k++) sum += live[i * slice + k];
        return sum / slice / 255;
      }

      // Onda sintética: soma de senoides com fase deslocada por barra.
      const idle = activeRef.current ? 1 : 0.52;
      const wave =
        Math.sin(t * 2.1 + i * 0.28) * 0.5 +
        Math.sin(t * 1.3 + i * 0.11) * 0.3 +
        Math.sin(t * 3.4 + i * 0.42) * 0.2;
      return (Math.abs(wave) * 0.62 + 0.12) * idle;
    };

    const draw = () => {
      t += 0.02;
      ctx.clearRect(0, 0, w, h);

      const live = dataRef?.current ?? null;
      const gap = 2;
      // Densidade acompanha a largura: nunca vira um punhado de blocos largos.
      const count = Math.max(24, Math.min(bars, Math.floor(w / 7)));
      const barWidth = Math.max(1.5, w / count - gap);
      const mid = h / 2;

      for (let i = 0; i < count; i++) {
        const amp = amplitudeAt(i, count, live);
        // Envelope: barras das pontas ficam mais baixas.
        const envelope = Math.sin((i / count) * Math.PI) * 0.75 + 0.25;
        const barHeight = Math.max(2, amp * envelope * h * 0.92);
        const x = i * (barWidth + gap);

        const grad = ctx.createLinearGradient(0, mid - barHeight / 2, 0, mid + barHeight / 2);
        const alpha = activeRef.current ? 0.95 : 0.55;
        grad.addColorStop(0, `rgba(143, 240, 255, ${alpha * 0.35})`);
        grad.addColorStop(0.5, `rgba(79, 227, 255, ${alpha})`);
        grad.addColorStop(1, `rgba(143, 240, 255, ${alpha * 0.35})`);

        ctx.fillStyle = grad;
        // Raio limitado pela menor dimensão: barras curtas não viram traços.
        const radius = Math.min(barWidth, barHeight) / 2;

        ctx.beginPath();
        ctx.roundRect(x, mid - barHeight / 2, barWidth, barHeight, radius);
        ctx.fill();
      }

      // Linha de base do eixo
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.strokeStyle = "rgba(79,227,255,0.16)";
      ctx.lineWidth = 1;
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [bars, dataRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`h-full w-full ${className}`}
    />
  );
}
