"use client";

import { useEffect, useState } from "react";

export type VaultPhase = "sinc" | "sincronizando" | "offline";

export interface VaultState {
  phase: VaultPhase;
  lastSync: string;
  notes: number;
}

/**
 * Status do Obsidian Local Vault. Alterna entre sincronizado e sincronizando
 * para dar vida ao HUD; troque por um watcher real do cofre quando integrar.
 */
export function useVaultSync(): VaultState {
  const [phase, setPhase] = useState<VaultPhase>("sinc");
  const [notes, setNotes] = useState(1_842);
  const [lastSync, setLastSync] = useState("--:--");

  useEffect(() => {
    const stamp = () =>
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

    setLastSync(stamp());

    const id = window.setInterval(() => {
      setPhase("sincronizando");
      window.setTimeout(() => {
        setPhase("sinc");
        setLastSync(stamp());
        setNotes((n) => n + Math.floor(Math.random() * 3));
      }, 2_200);
    }, 24_000);

    return () => window.clearInterval(id);
  }, []);

  return { phase, lastSync, notes };
}
