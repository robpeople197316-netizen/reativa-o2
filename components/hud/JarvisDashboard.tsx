"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import type { CoreState } from "@/components/hud/CoreOrb";
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
import { useCommandLog } from "@/lib/useCommandLog";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useMicLevel } from "@/lib/useMicLevel";

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
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Rail e gaveta mostram o MESMO painel: montar os dois faria o console da
  // campanha buscar a base duas vezes. Só um existe por vez.
  const wide = useMediaQuery("(min-width: 1280px)", true);

  const { entries, push } = useCommandLog();
  const { dataRef, status: micStatus } = useMicLevel(listening);

  // Progresso real da Onda 2 — leitura barata, sem baixar os contatos.
  const wave = useOnda2Progress(onda2.total, onda2.presetSent);

  const statusOverrides: Partial<Record<ModuleId, ModuleStatus>> = {
    marketing: wave.remaining === 0 ? "nominal" : "atencao",
  };

  const onda2Label = `${wave.sentTotal}/${onda2.total}`;

  const activeModule = activeId ? MODULES_BY_ID[activeId] : null;

  const coreState: CoreState = listening
    ? "listening"
    : processing
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

  const toggleListening = useCallback(() => {
    setListening((prev) => {
      push(
        prev ? "Captura de voz encerrada · STANDBY" : "Captura de voz iniciada · LISTENING",
        "voice",
      );
      return !prev;
    });
  }, [push]);

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
        setActiveId((current) => (current ? null : current));
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

      <JarvisHeader />

      <main className="relative z-10 grid min-h-0 flex-1 gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,24rem)]">
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
        listening={listening}
        onToggle={toggleListening}
        micStatus={micStatus}
        dataRef={dataRef}
        entries={entries}
      />
    </div>
  );
}
