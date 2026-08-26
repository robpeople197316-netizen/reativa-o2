"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Loader2,
  Monitor,
  Repeat,
  RotateCcw,
  SendHorizonal,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";

import { CapabilityLeds } from "@/components/hud/jarvis/CapabilityLeds";
import { LembretesPanel } from "@/components/hud/jarvis/LembretesPanel";
import { Transcript } from "@/components/hud/jarvis/Transcript";
import { useScreenCapture, useWebcam } from "@/lib/jarvis/hooks/useVision";
import type {
  JarvisAnexo,
  JarvisPhase,
  JarvisStatus,
  JarvisTurn,
} from "@/lib/jarvis/hooks/useJarvis";

interface JarvisConsoleProps {
  status: JarvisStatus | null;
  phase: JarvisPhase;
  history: JarvisTurn[];
  interim?: string;
  onAsk: (message: string, anexo?: JarvisAnexo | null) => void | Promise<void>;
  onReset: () => void;
  onClose: () => void;
  /** Toca uma frase de teste pelo caminho de voz ativo. */
  onTestVoice?: () => void;
  /** Conversa contínua ligada? */
  continuo?: boolean;
  onToggleContinuo?: () => void;
  /** Verdadeiro enquanto a janela de acompanhamento está aberta. */
  aguardando?: boolean;
  className?: string;
}

type Aba = "conversa" | "lembretes";

const PHASE_META: Record<JarvisPhase, { label: string; cor: string }> = {
  standby: { label: "STANDBY", cor: "text-hud-300/60" },
  listening: { label: "OUVINDO", cor: "text-acid" },
  thinking: { label: "PROCESSANDO", cor: "text-plasma" },
  speaking: { label: "FALANDO", cor: "text-hud-200" },
};

/**
 * Painel de controle do Jarvis.
 *
 * Reúne o que estava só na API: o que está ligado, a conversa, a visão pela
 * webcam e pela tela, e os lembretes do dia.
 */
export function JarvisConsole({
  status,
  phase,
  history,
  interim,
  onAsk,
  onReset,
  onClose,
  onTestVoice,
  continuo = false,
  onToggleContinuo,
  aguardando = false,
  className = "",
}: JarvisConsoleProps) {
  const [aba, setAba] = useState<Aba>("conversa");
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<JarvisAnexo | null>(null);

  const webcam = useWebcam();
  const tela = useScreenCapture();

  const cerebroAtivo = status?.capabilities.brain ?? false;
  const ocupado = phase === "thinking";
  const fase = PHASE_META[phase];

  const enviar = useCallback(() => {
    const limpo = texto.trim();
    if (!limpo || ocupado || !cerebroAtivo) return;

    setTexto("");
    void onAsk(limpo, anexo);
  }, [anexo, cerebroAtivo, ocupado, onAsk, texto]);

  /** Captura um quadro e o anexa — a pergunta vem depois, do operador. */
  const capturar = useCallback(
    async (origem: "webcam" | "tela") => {
      const dataUrl =
        origem === "webcam" ? await webcam.capture() : await tela.capture();

      if (dataUrl) {
        setAnexo({ dataUrl, origem });
        if (!texto.trim()) {
          setTexto(
            origem === "webcam"
              ? "Avalie a cor e o corte desta cliente."
              : "Leia esta tela e me diga o que é relevante.",
          );
        }
      }
    },
    [tela, texto, webcam],
  );

  const capturando = webcam.busy || tela.busy;
  const erroVisao = webcam.error ?? tela.error;

  return (
    <aside
      className={`hud-panel hud-corners relative flex h-full w-full flex-col overflow-hidden ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 border-b border-hud-400/15 bg-gradient-to-b from-plasma/10 to-transparent px-3 py-2.5">
        <span className="relative flex h-2 w-2 shrink-0">
          {phase !== "standby" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-plasma/70" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              cerebroAtivo ? "bg-plasma" : "bg-rose"
            } shadow-[0_0_8px_currentColor]`}
          />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xs font-semibold tracking-[0.24em] text-hud-100 text-glow">
            JARVIS CONSOLE
          </h2>
          <p className={`font-mono text-[9px] tracking-[0.2em] ${fase.cor}`}>
            {fase.label}
            {status?.modelo ? ` · ${status.modelo}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          aria-label="Limpar conversa"
          title="Limpar conversa"
          className="shrink-0 rounded p-1 text-hud-300/55 transition-colors hover:bg-hud-400/10 hover:text-hud-100"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.6} />
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar console do Jarvis"
          className="shrink-0 rounded p-1 text-hud-300/55 transition-colors hover:bg-hud-400/10 hover:text-hud-100"
        >
          <X className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </div>

      <CapabilityLeds status={status} onTestVoice={onTestVoice} />

      {/* Abas */}
      <div className="flex gap-1 border-b border-hud-400/15 px-2 pt-2">
        {(["conversa", "lembretes"] as const).map((chave) => (
          <button
            key={chave}
            type="button"
            onClick={() => setAba(chave)}
            className={`rounded-t border-b-2 px-3 py-1.5 font-display text-[10px] tracking-[0.16em] transition-colors ${
              aba === chave
                ? "border-plasma text-hud-100"
                : "border-transparent text-hud-300/50 hover:text-hud-200"
            }`}
          >
            {chave === "conversa" ? "CONVERSA" : "LEMBRETES"}
          </button>
        ))}
      </div>

      {aba === "lembretes" ? (
        <LembretesPanel />
      ) : (
        <>
          <Transcript turns={history} phase={phase} interim={interim} />

          {/* Visão + entrada */}
          <div className="border-t border-hud-400/15 p-2">
            {erroVisao && (
              <p className="mb-1.5 truncate font-mono text-[9px] text-ember/85">
                {erroVisao}
              </p>
            )}

            <AnimatePresence>
              {anexo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-1.5 overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded border border-plasma/30 bg-plasma/[0.07] p-1.5">
                    <img
                      src={anexo.dataUrl}
                      alt="Quadro anexado"
                      className="h-10 w-14 shrink-0 rounded object-cover"
                    />
                    <span className="min-w-0 flex-1 font-mono text-[9px] leading-tight text-hud-200/80">
                      {anexo.origem === "webcam" ? "Webcam" : "Tela"} anexada
                      <br />
                      <span className="text-hud-300/50">
                        segue anexada até você remover
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAnexo(null)}
                      aria-label="Remover anexo"
                      className="shrink-0 rounded p-1 text-hud-300/60 hover:text-hud-100"
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Conversa contínua + aviso de escuta aberta */}
            {onToggleContinuo && (
              <div className="mb-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleContinuo}
                  aria-pressed={continuo}
                  title={
                    continuo
                      ? "Depois de responder, ele continua ouvindo por alguns segundos"
                      : "Ligar para emendar perguntas sem tocar no microfone"
                  }
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                    continuo
                      ? "border-acid/60 bg-acid/10 text-acid"
                      : "border-hud-400/25 text-hud-300/60 hover:border-hud-300/50 hover:text-hud-200"
                  }`}
                >
                  <Repeat className="h-3 w-3" strokeWidth={2} />
                  Conversa contínua
                </button>

                {aguardando && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-acid"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acid/70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-acid" />
                    </span>
                    ouvindo
                  </motion.span>
                )}
              </div>
            )}

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => void capturar("webcam")}
                disabled={capturando || !cerebroAtivo}
                aria-label="Capturar webcam"
                title="Analisar a cliente na cadeira"
                className="grid h-[34px] w-9 shrink-0 place-items-center rounded border border-hud-400/25 bg-abyss-800/60 text-hud-200 transition-colors hover:border-hud-300/60 disabled:opacity-35"
              >
                {webcam.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />
                ) : (
                  <Camera className="h-4 w-4" strokeWidth={1.6} />
                )}
              </button>

              <button
                type="button"
                onClick={() => void capturar("tela")}
                disabled={capturando || !cerebroAtivo || !tela.supported}
                aria-label="Capturar tela"
                title={
                  tela.supported
                    ? "Ler a tela atual"
                    : "Este navegador não captura tela"
                }
                className="grid h-[34px] w-9 shrink-0 place-items-center rounded border border-hud-400/25 bg-abyss-800/60 text-hud-200 transition-colors hover:border-hud-300/60 disabled:opacity-35"
              >
                {tela.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />
                ) : (
                  <Monitor className="h-4 w-4" strokeWidth={1.6} />
                )}
              </button>

              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                disabled={!cerebroAtivo}
                // Placeholder curto: a coluna é estreita e o texto longo corta.
                placeholder={cerebroAtivo ? "Escreva para o JARVIS" : "Cérebro offline"}
                className="min-w-0 flex-1 rounded border border-hud-400/20 bg-abyss-950/60 px-2.5 py-2 font-mono text-[11px] text-hud-100 outline-none transition-colors placeholder:text-hud-300/35 focus:border-hud-300/50 disabled:opacity-50"
              />

              <button
                type="button"
                onClick={enviar}
                disabled={!texto.trim() || ocupado || !cerebroAtivo}
                aria-label="Enviar mensagem"
                className="grid h-[34px] w-9 shrink-0 place-items-center rounded border border-plasma/40 bg-plasma/15 text-hud-100 transition-colors hover:border-plasma/80 hover:bg-plasma/25 disabled:opacity-35"
              >
                {ocupado ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                ) : (
                  <SendHorizonal className="h-4 w-4" strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
