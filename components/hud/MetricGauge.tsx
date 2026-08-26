"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

import type { ModuleMetric } from "@/lib/modules";

/** Cartão de métrica com barra de progresso e variação percentual. */
export function MetricGauge({
  metric,
  accent,
  delay = 0,
}: {
  metric: ModuleMetric;
  accent: string;
  delay?: number;
}) {
  const up = (metric.delta ?? 0) >= 0;
  const Trend = up ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="hud-panel hud-corners px-3 py-2.5"
    >
      <div className="hud-label truncate">{metric.label}</div>

      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="hud-value text-base font-semibold text-glow">
          {metric.value}
        </span>

        {metric.delta !== undefined && (
          <span
            className={`flex shrink-0 items-center gap-1 font-mono text-[10px] ${
              up ? "text-acid" : "text-rose"
            }`}
          >
            <Trend className="h-3 w-3" strokeWidth={2} />
            {up ? "+" : ""}
            {metric.delta.toFixed(1)}%
          </span>
        )}
      </div>

      {metric.gauge !== undefined && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-hud-900/60">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, metric.gauge))}%` }}
            transition={{ delay: delay + 0.15, duration: 0.7, ease: "easeOut" }}
            style={{
              background: `linear-gradient(90deg, rgba(${accent},0.35), rgb(${accent}))`,
              boxShadow: `0 0 10px -2px rgb(${accent})`,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
