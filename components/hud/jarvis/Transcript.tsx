"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ExternalLink, Wrench } from "lucide-react";
import { useEffect, useRef } from "react";

import type { JarvisPhase, JarvisTurn } from "@/lib/jarvis/hooks/useJarvis";

interface TranscriptProps {
  turns: JarvisTurn[];
  phase: JarvisPhase;
  /** Texto parcial enquanto a pessoa ainda está falando. */
  interim?: string;
}

/** Conversa com o Jarvis, do mais antigo para o mais recente. */
export function Transcript({ turns, phase, interim }: TranscriptProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Sempre revelar a última fala — a conversa cresce para baixo.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, phase, interim]);

  if (!turns.length && !interim && phase === "standby") {
    return (
      <div className="flex-1 px-4 py-5">
        <p className="font-mono text-[11px] leading-relaxed text-hud-300/50">
          Aperte o microfone e fale, ou escreva abaixo.
          <br />
          <br />
          &ldquo;Como está o caixa hoje?&rdquo;
          <br />
          &ldquo;A Marina pode fazer descoloração?&rdquo;
          <br />
          &ldquo;Lança 180 de coloração da Camila.&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
      {turns.map((turn, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className={turn.role === "user" ? "pl-6" : "pr-6"}
        >
          <div className="hud-label mb-1 flex items-center gap-1.5 text-[8px]">
            {turn.role === "user" ? "Você" : "JARVIS"}
            {turn.erro && (
              <AlertTriangle className="h-2.5 w-2.5 text-ember" strokeWidth={2} />
            )}
          </div>

          {turn.imagem && (
            <img
              src={turn.imagem}
              alt="Imagem enviada ao Jarvis"
              className="mb-1.5 max-h-28 w-full rounded border border-hud-400/25 object-cover"
            />
          )}

          <div
            className={`rounded border px-2.5 py-2 text-[11px] leading-relaxed ${
              turn.erro
                ? "border-ember/35 bg-ember/[0.07] text-ember/90"
                : turn.role === "user"
                  ? "border-hud-400/20 bg-abyss-800/50 text-hud-100/90"
                  : "border-plasma/30 bg-plasma/[0.07] text-hud-100"
            }`}
          >
            {turn.content}
          </div>

          {/* Rastro do que a resposta usou — dá para auditar o que ele fez. */}
          {!!turn.ferramentas?.length && (
            <div className="mt-1 flex flex-wrap gap-1">
              {turn.ferramentas.map((nome, k) => (
                <span
                  key={`${nome}-${k}`}
                  className="flex items-center gap-1 rounded-full border border-hud-400/20 px-1.5 py-0.5 font-mono text-[8px] text-hud-300/70"
                >
                  <Wrench className="h-2 w-2" strokeWidth={2} />
                  {nome}
                </span>
              ))}
            </div>
          )}

          {!!turn.fontes?.length && (
            <ul className="mt-1 space-y-0.5">
              {turn.fontes.slice(0, 4).map((fonte) => (
                <li key={fonte.url}>
                  <a
                    href={fonte.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 truncate font-mono text-[9px] text-hud-300/60 underline-offset-2 hover:text-hud-200 hover:underline"
                  >
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
                    <span className="truncate">{fonte.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      ))}

      {interim && (
        <div className="pl-6">
          <div className="hud-label mb-1 text-[8px]">Você</div>
          <div className="rounded border border-hud-400/15 border-dashed bg-abyss-800/30 px-2.5 py-2 text-[11px] italic text-hud-300/70">
            {interim}
          </div>
        </div>
      )}

      {phase === "thinking" && (
        <div className="pr-6">
          <div className="hud-label mb-1 text-[8px]">JARVIS</div>
          <div className="flex gap-1 rounded border border-plasma/25 bg-plasma/[0.05] px-3 py-2.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-plasma"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
