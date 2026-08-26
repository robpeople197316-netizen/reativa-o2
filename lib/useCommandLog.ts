"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LogLevel = "info" | "ok" | "warn" | "voice";

export interface LogEntry {
  id: number;
  time: string;
  text: string;
  level: LogLevel;
}

const SEED: Array<Pick<LogEntry, "text" | "level">> = [
  { text: "JARVIS core inicializado · 8 módulos montados", level: "ok" },
  { text: "Obsidian Local Vault conectado · 1.842 notas indexadas", level: "ok" },
  { text: "Varredura de estoque concluída · 6 rupturas previstas", level: "warn" },
  { text: "Grade da equipe carregada · ocupação de hoje em 87%", level: "info" },
];

const AMBIENT: Array<Pick<LogEntry, "text" | "level">> = [
  { text: "Reconciliando comandas abertas do turno da manhã", level: "info" },
  { text: "Previsão de consumo recalculada · pó descolorante em 4 dias", level: "warn" },
  { text: "Lote de reativação preparado · 148 contatos restantes", level: "info" },
  { text: "Fórmula química arquivada · Marina R. (8.1 + 10vol)", level: "ok" },
  { text: "Encaixe sugerido · bancada 4 às 14h30", level: "info" },
  { text: "Meta diária em 80% · ritmo dentro do previsto", level: "ok" },
];

function stamp(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Buffer circular dos comandos/eventos recentes exibidos no rodapé do HUD. */
export function useCommandLog(limit = 24) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const push = useCallback(
    (text: string, level: LogLevel = "info") => {
      setEntries((prev) =>
        [{ id: nextId.current++, time: stamp(), text, level }, ...prev].slice(
          0,
          limit,
        ),
      );
    },
    [limit],
  );

  // Semeia o log após a hidratação (usa a hora local do cliente).
  useEffect(() => {
    setEntries(
      SEED.map((seed) => ({
        id: nextId.current++,
        time: stamp(),
        text: seed.text,
        level: seed.level,
      })).reverse(),
    );
  }, []);

  // Ruído ambiente: o HUD nunca fica parado.
  useEffect(() => {
    const id = window.setInterval(() => {
      const pick = AMBIENT[Math.floor(Math.random() * AMBIENT.length)];
      push(pick.text, pick.level);
    }, 11_000);
    return () => window.clearInterval(id);
  }, [push]);

  return { entries, push };
}
