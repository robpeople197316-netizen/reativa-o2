"use client";

import { Brain, Ear, FolderTree, Volume2, type LucideIcon } from "lucide-react";

import type { JarvisStatus } from "@/lib/jarvis/hooks/useJarvis";

interface Capability {
  key: keyof JarvisStatus["capabilities"];
  label: string;
  icon: LucideIcon;
  /** O que acontece quando esta capacidade está desligada. */
  fallback: string;
}

const CAPABILITIES: Capability[] = [
  {
    key: "brain",
    label: "Cérebro",
    icon: Brain,
    fallback: "offline · defina ANTHROPIC_API_KEY",
  },
  {
    key: "whisper",
    label: "Ouvido",
    icon: Ear,
    fallback: "usando a fala do navegador",
  },
  {
    key: "elevenLabs",
    label: "Voz",
    icon: Volume2,
    fallback: "usando a voz do sistema",
  },
  { key: "vault", label: "Cofre", icon: FolderTree, fallback: "indisponível" },
];

/**
 * Fita de status das capacidades.
 *
 * Verde não é "melhor": ouvido e voz funcionam desligados, só por outro
 * caminho. O texto abaixo de cada LED diz qual — o operador precisa saber se
 * está falando com o Whisper ou com o navegador.
 */
export function CapabilityLeds({
  status,
  onTestVoice,
}: {
  status: JarvisStatus | null;
  /** Toca uma frase de teste — o único jeito de ouvir a voz sem gastar API. */
  onTestVoice?: () => void;
}) {
  return (
    <div className="border-b border-hud-400/15 px-3 py-2.5">
      <div className="grid grid-cols-4 gap-1.5">
        {CAPABILITIES.map((cap) => {
          const ativo = status?.capabilities[cap.key] ?? false;
          // Só o cérebro e o cofre são bloqueantes; os outros têm plano B.
          const bloqueante = cap.key === "brain" || cap.key === "vault";
          const cor = ativo
            ? "text-acid"
            : bloqueante
              ? "text-rose"
              : "text-hud-300/50";

          const Icon = cap.icon;

          const testavel = cap.key === "elevenLabs" && Boolean(onTestVoice);
          const base = ativo ? `${cap.label}: ativo` : `${cap.label}: ${cap.fallback}`;

          const conteudo = (
            <>
              <Icon className={`h-3.5 w-3.5 ${cor}`} strokeWidth={1.6} />
              <span className="hud-label text-[8px] leading-none">{cap.label}</span>
              <span
                className={`h-1 w-1 rounded-full ${
                  ativo
                    ? "bg-acid shadow-[0_0_6px_#7cff9b]"
                    : bloqueante
                      ? "bg-rose"
                      : "bg-hud-400/40"
                }`}
              />
            </>
          );

          const classes =
            "flex flex-col items-center gap-1 rounded border border-hud-400/10 bg-abyss-800/40 px-1 py-1.5";

          if (testavel) {
            return (
              <button
                key={cap.key}
                type="button"
                onClick={onTestVoice}
                title={`${base} · toque para ouvir uma frase de teste`}
                aria-label="Ouvir uma frase de teste"
                className={`${classes} transition-colors hover:border-hud-300/50 hover:bg-abyss-700/50`}
              >
                {conteudo}
              </button>
            );
          }

          return (
            <div key={cap.key} title={base} className={classes}>
              {conteudo}
            </div>
          );
        })}
      </div>

      {status?.vault.path && (
        <p
          className="mt-2 truncate font-mono text-[9px] text-hud-300/45"
          title={status.vault.path}
        >
          {status.vault.path}
        </p>
      )}
    </div>
  );
}
