"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { useLembretes } from "@/lib/jarvis/hooks/useLembretes";

/** Hora "14:30" de hoje vira ISO completo, respeitando o fuso local. */
function horaParaIso(hora: string): string | undefined {
  const match = hora.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const data = new Date();
  data.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return data.toISOString();
}

/** Lembretes de hoje: criar, ver e concluir. */
export function LembretesPanel() {
  const { lembretes, carregando, erro, criar, concluir } = useLembretes();
  const [texto, setTexto] = useState("");
  const [hora, setHora] = useState("");
  const [enviando, setEnviando] = useState(false);

  const adicionar = async () => {
    const limpo = texto.trim();
    if (!limpo || enviando) return;

    setEnviando(true);
    const ok = await criar(limpo, hora ? horaParaIso(hora) : undefined);
    setEnviando(false);

    if (ok) {
      setTexto("");
      setHora("");
    }
  };

  const pendentes = lembretes.filter((l) => !l.feito);
  const feitos = lembretes.filter((l) => l.feito);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {carregando ? (
          <div className="flex items-center gap-2 text-hud-300/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
            <span className="font-mono text-[10px]">Lendo o cofre…</span>
          </div>
        ) : (
          <>
            {erro && (
              <p className="mb-2 rounded border border-ember/30 bg-ember/[0.07] px-2 py-1.5 font-mono text-[10px] text-ember/90">
                {erro}
              </p>
            )}

            {!lembretes.length && (
              <p className="font-mono text-[11px] leading-relaxed text-hud-300/50">
                Nenhum lembrete hoje. Os que tiverem hora são anunciados em voz
                alta quando vencem.
              </p>
            )}

            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {[...pendentes, ...feitos].map((lembrete) => (
                  <motion.li
                    key={lembrete.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-start gap-2 rounded border px-2 py-1.5 ${
                      lembrete.feito
                        ? "border-hud-400/10 bg-abyss-800/25"
                        : "border-hud-400/20 bg-abyss-800/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void concluir(lembrete.id)}
                      disabled={lembrete.feito}
                      aria-label={`Concluir: ${lembrete.texto}`}
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                        lembrete.feito
                          ? "border-acid/50 bg-acid/20 text-acid"
                          : "border-hud-400/30 text-transparent hover:border-hud-300/70"
                      }`}
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </button>

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[11px] leading-snug ${
                          lembrete.feito
                            ? "text-hud-300/45 line-through"
                            : "text-hud-100/90"
                        }`}
                      >
                        {lembrete.texto}
                      </span>

                      {lembrete.quando && (
                        <span className="mt-0.5 flex items-center gap-1 font-mono text-[9px] text-hud-300/50">
                          <BellRing className="h-2.5 w-2.5" strokeWidth={2} />
                          {new Date(lembrete.quando).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {lembrete.disparado && !lembrete.feito && " · anunciado"}
                        </span>
                      )}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </>
        )}
      </div>

      {/* Criação rápida */}
      <div className="border-t border-hud-400/15 p-2">
        <div className="flex gap-1.5">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void adicionar();
            }}
            placeholder="Novo lembrete"
            className="min-w-0 flex-1 rounded border border-hud-400/20 bg-abyss-950/60 px-2 py-1.5 font-mono text-[11px] text-hud-100 outline-none placeholder:text-hud-300/35 focus:border-hud-300/50"
          />
          <input
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            placeholder="14:30"
            aria-label="Hora do lembrete"
            className="w-16 shrink-0 rounded border border-hud-400/20 bg-abyss-950/60 px-2 py-1.5 text-center font-mono text-[11px] text-hud-100 outline-none placeholder:text-hud-300/35 focus:border-hud-300/50"
          />
          <button
            type="button"
            onClick={() => void adicionar()}
            disabled={!texto.trim() || enviando}
            aria-label="Adicionar lembrete"
            className="grid h-[30px] w-8 shrink-0 place-items-center rounded border border-hud-400/25 bg-abyss-800/60 text-hud-200 transition-colors hover:border-hud-300/60 disabled:opacity-35"
          >
            {enviando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
            ) : (
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
