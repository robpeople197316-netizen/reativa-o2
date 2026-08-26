"use client";

import { motion } from "framer-motion";

import { STATUS_META, type SalonModule } from "@/lib/modules";

interface OrbitNodeProps {
  module: SalonModule;
  x: number;
  y: number;
  size: number;
  active: boolean;
  index: number;
  onSelect: (module: SalonModule) => void;
  onHover: (module: SalonModule | null) => void;
}

/** Nó orbital: botão circular com ícone, rótulo e LED de status. */
export function OrbitNode({
  module,
  x,
  y,
  size,
  active,
  index,
  onSelect,
  onHover,
}: OrbitNodeProps) {
  const Icon = module.icon;
  const status = STATUS_META[module.status];

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: 0.15 + index * 0.07,
        type: "spring",
        stiffness: 180,
        damping: 18,
      }}
      whileHover={{ scale: 1.09 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => onSelect(module)}
      onMouseEnter={() => onHover(module)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(module)}
      onBlur={() => onHover(null)}
      aria-pressed={active}
      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 outline-none"
      style={{ left: x, top: y }}
    >
      <span
        className="relative grid place-items-center rounded-full border transition-colors duration-300"
        style={{
          width: size,
          height: size,
          borderColor: `rgba(${module.accent}, ${active ? 0.9 : 0.35})`,
          background: `radial-gradient(circle at 50% 35%, rgba(${module.accent}, ${
            active ? 0.34 : 0.14
          }) 0%, rgba(3,16,28,0.92) 68%)`,
          boxShadow: active
            ? `0 0 34px -4px rgba(${module.accent}, 0.85), inset 0 0 24px -8px rgba(${module.accent}, 0.9)`
            : `0 0 18px -8px rgba(${module.accent}, 0.6)`,
        }}
      >
        {/* Anel de varredura no hover/seleção */}
        <span
          aria-hidden
          className={`absolute inset-[-6px] rounded-full border border-dashed transition-opacity duration-300 ${
            active
              ? "animate-spin-medium opacity-90"
              : "opacity-0 group-hover:opacity-70 group-focus-visible:opacity-70"
          }`}
          style={{ borderColor: `rgba(${module.accent}, 0.5)` }}
        />

        <Icon
          className="transition-transform duration-300 group-hover:scale-110"
          style={{
            color: `rgb(${module.accent})`,
            width: size * 0.36,
            height: size * 0.36,
            filter: `drop-shadow(0 0 6px rgba(${module.accent}, 0.8))`,
          }}
          strokeWidth={1.4}
        />

        {/* LED de status */}
        <span
          aria-hidden
          className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${status.dot} shadow-[0_0_8px_currentColor] ${
            module.status === "nominal" ? "" : "animate-pulse"
          }`}
        />
      </span>

      {/* Rótulo abaixo do nó */}
      <span
        className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 text-center"
        style={{ width: Math.max(112, size * 2.1) }}
      >
        <span
          className={`block font-display text-[10px] font-semibold tracking-[0.18em] transition-colors duration-300 ${
            active ? "text-white text-glow-strong" : "text-hud-100/85"
          }`}
        >
          {module.label}
        </span>
        <span
          className={`mt-0.5 block px-1 font-mono text-[9px] leading-tight text-hud-300/55 transition-opacity duration-300 ${
            active
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          }`}
        >
          {module.tagline}
        </span>
      </span>
    </motion.button>
  );
}
