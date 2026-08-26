"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import type { CoreState } from "@/components/hud/CoreOrb";
import { JarvisConsole } from "@/components/hud/jarvis/JarvisConsole";
import { JarvisHeader } from "@/components/hud/JarvisHeader";
import { ModulePanel } from "@/components/hud/ModulePanel";
import { OrbitalMap } from "@/components/hud/OrbitalMap";
import { ParticleField } from "@/components/hud/ParticleField";
import { VoiceHUD } from "@/components/hud/VoiceHUD";
import {
  MODULES_BY_ID,
  type ModuleId,
  type ModuleStatus,
  type SalonModule,
} from "@/lib/modules";
import { useOnda2Progress } from "@/lib/campaign/useOnda2Progress";
import { useCommandLog, type LogLevel } from "@/lib/useCommandLog";
import { useJarvis, type JarvisEvent } from "@/lib/jarvis/hooks/useJarvis";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useMicLevel } from "@/lib/useMicLevel";

const PHASE_LABEL: Record<string, string> = {
  standby: "STANDBY",
  listening: "LISTENING",
  thinking: "PROCESSANDO",
  speaking: "FALANDO",
};

export interface Onda2Summary {
  total: number;
  lots: number;
  presetSent: number;
  dailyLimit: number;
}

/**
 * Casca do HUD: orquestra estado do núcleo, módulo selecionado, captura de
 * voz e o log compartilhado entre os painéis.
 */
export function JarvisDashboard({ onda2 }: { onda2: Onda2Summary }) {
  const [activeId, setActiveId] = useState<ModuleId | null>(null);
  const [processing, setProcessing] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);

  // Rail e gaveta mostram o MESMO painel: montar os dois faria o console da
  // campanha buscar a base duas vezes. Só um existe por vez.
  const wide = useMediaQuery("(min-width: 1280px)", true);

  // Três colunas só a partir de 1536px: abaixo disso o mapa orbital ficaria
  // estreito demais e cairia na grade compacta.
  const ultraWide = useMediaQuery("(min-width: 1536px)", true);
  const consoleInline = consoleOpen && ultraWide;

  const { entries, push } = useCommandLog();

  // Os eventos do cérebro alimentam o log de comandos do HUD.
  const onJarvisEvent = useCallback(
    (event: JarvisEvent) => {
      const level: LogLevel =
        event.kind === "erro" ? "warn" : event.kind === "ferramenta" ? "info" : "voice";

      const prefixo: Record<JarvisEvent["kind"], string> = {
        voce: "Você",
        jarvis: "JARVIS",
        ferramenta: "Ferramenta",
        lembrete: "Lembrete",
        erro: "Erro",
      };

      push(`${prefixo[event.kind]}: ${event.text}`, level);
    },
    [push],
  );

  const jarvis = useJarvis({ onEvent: onJarvisEvent });
  const { dataRef, status: micStatus } = useMicLevel(jarvis.listening);

  // Progresso real da Onda 2 — leitura barata, sem baixar os contatos.
  const wave = useOnda2Progress(onda2.total, onda2.presetSent);

  const statusOverrides: Partial<Record<ModuleId, ModuleStatus>> = {
    marketing: wave.remaining === 0 ? "nominal" : "atencao",
  };

  const onda2Label = `${wave.sentTotal}/${onda2.total}`;

  const activeModule = activeId ? MODULES_BY_ID[activeId] : null;

  // O núcleo espelha a fase real do assistente, não só o microfone.
  const coreState: CoreState =
    jarvis.phase === "listening"
      ? "listening"
      : jarvis.phase === "thinking" || jarvis.phase === "speaking" || processing
        ? "processing"
        : "standby";

  const selectModule = useCallback(
    (module: SalonModule) => {
      setActiveId((current) => {
        if (current === module.id) {
          push(`Módulo ${module.label} recolhido`, "info");
          return null;
        }

        push(`Abrindo módulo ${module.label} · ${module.tagline}`, "ok");
        return module.id;
      });

      // Pisca o núcleo em "processing" enquanto o painel carrega.
      setProcessing(true);
      window.setTimeout(() => setProcessing(false), 900);
    },
    [push],
  );

  const closeModule = useCallback(() => {
    setActiveId(null);
    push("Painel de módulo fechado", "info");
  }, [push]);

  /**
   * Frase de teste da voz.
   *
   * Não depende do cérebro: é o único jeito de conferir caixa de som e voz do
   * sistema antes de configurar qualquer chave de API.
   */
  const testarVoz = useCallback(() => {
    const provedor = jarvis.status?.capabilities.voiceProvider;

    const origem =
      provedor === "google"
        ? "Voz do Google"
        : provedor === "elevenlabs"
          ? "Voz da ElevenLabs"
          : "Voz do sistema";

    void jarvis.say(`${origem} ativa. Estou pronto para começar o dia.`);
  }, [jarvis]);

  const toggleListening = useCallback(() => {
    if (!jarvis.status?.capabilities.brain) {
      push(
        "Cérebro offline · defina ANTHROPIC_API_KEY para conversar com o JARVIS",
        "warn",
      );
      return;
    }

    jarvis.toggleListening();
  }, [jarvis, push]);

  // ESC fecha o módulo aberto; barra de espaço alterna o microfone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (typing) return;

      if (e.key === "Escape") {
        // Fecha uma coisa por vez: primeiro o console, depois o módulo.
        setConsoleOpen((open) => {
          if (open) return false;
          setActiveId((current) => (current ? null : current));
          return open;
        });
      }

      if (e.key.toLowerCase() === "j" && !e.repeat && !e.metaKey && !e.ctrlKey) {
        setConsoleOpen((o) => !o);
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleListening]);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      {/* Camadas ambientais */}
      <ParticleField />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-vignette"
      />

      <JarvisHeader
        consoleOpen={consoleOpen}
        onToggleConsole={() => setConsoleOpen((o) => !o)}
      />

      <main
        className={`relative z-10 grid min-h-0 flex-1 gap-3 p-3 ${
          consoleInline
            ? "2xl:grid-cols-[minmax(280px,22rem)_minmax(0,1fr)_minmax(300px,24rem)]"
            : "xl:grid-cols-[minmax(0,1fr)_minmax(300px,24rem)]"
        }`}
      >
        {consoleInline && (
          <div className="hidden min-h-0 2xl:block">
            <JarvisConsole
              status={jarvis.status}
              phase={jarvis.phase}
              history={jarvis.history}
              interim={jarvis.interim}
              onAsk={jarvis.ask}
              onReset={jarvis.reset}
              onClose={() => setConsoleOpen(false)}
              onTestVoice={testarVoz}
            />
          </div>
        )}

        <div className="relative min-h-0 overflow-hidden rounded-lg border border-hud-400/10">
          <OrbitalMap
            coreState={coreState}
            activeId={activeId}
            onSelect={selectModule}
            onCoreActivate={toggleListening}
            statusOverrides={statusOverrides}
          />
        </div>

        <div className={wide ? "hidden min-h-0 xl:block" : "hidden"}>
          <ModulePanel
            module={activeModule}
            onClose={closeModule}
            onSelect={selectModule}
            statusOverrides={statusOverrides}
            onda2Label={onda2Label}
            onLog={push}
          />
        </div>
      </main>

      {/* Abaixo de 2xl o console vira gaveta sobreposta. */}
      <AnimatePresence>
        {consoleOpen && !ultraWide && (
          <div key="console-drawer">
            <motion.button
              type="button"
              aria-label="Fechar console do Jarvis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConsoleOpen(false)}
              className="fixed inset-0 z-30 cursor-default bg-abyss-950/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 240, damping: 28 }}
              className="fixed inset-y-0 left-0 z-40 w-full max-w-[26rem] p-3"
            >
              <JarvisConsole
                status={jarvis.status}
                phase={jarvis.phase}
                history={jarvis.history}
                interim={jarvis.interim}
                onAsk={jarvis.ask}
                onReset={jarvis.reset}
                onClose={() => setConsoleOpen(false)}
                onTestVoice={testarVoz}
                className="!bg-abyss-900/95"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Abaixo de xl o rail vira uma gaveta sobreposta ao mapa. */}
      <AnimatePresence>
        {!wide && activeModule && (
          <div key="drawer" className="xl:hidden">
            <motion.button
              type="button"
              aria-label="Fechar módulo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModule}
              className="fixed inset-0 z-30 cursor-default bg-abyss-950/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 240, damping: 28 }}
              className="fixed inset-x-0 bottom-0 top-16 z-40 p-3 sm:inset-x-auto sm:right-0 sm:top-20 sm:w-[26rem]"
            >
              <ModulePanel
                module={activeModule}
                onClose={closeModule}
                onSelect={selectModule}
                statusOverrides={statusOverrides}
                onda2Label={onda2Label}
                onLog={push}
                className="!bg-abyss-900/95"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <VoiceHUD
        listening={jarvis.listening}
        onToggle={toggleListening}
        micStatus={micStatus}
        dataRef={dataRef}
        entries={entries}
        phaseLabel={PHASE_LABEL[jarvis.phase]}
        interim={jarvis.interim}
      />
    </div>
  );
}
