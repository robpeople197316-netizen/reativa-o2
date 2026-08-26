"use client";

import { useEffect, useState } from "react";

import { ONDA2_CHANGE_EVENT, ONDA2_STORAGE_KEY } from "@/lib/campaign/onda2";

export interface Onda2Snapshot {
  sentTotal: number;
  remaining: number;
  percent: number;
  /** Falso até ler o localStorage — antes disso valem os números do servidor. */
  live: boolean;
}

/**
 * Leitura barata do progresso da Onda 2.
 *
 * Só conta as chaves salvas no localStorage: não baixa os ~600 contatos, então
 * pode alimentar o LED do nó e os cartões do HUD sem custo. O console da
 * campanha, esse sim, carrega a base inteira quando é aberto.
 */
export function useOnda2Progress(total: number, fallbackSent: number): Onda2Snapshot {
  const [sentTotal, setSentTotal] = useState<number | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem(ONDA2_STORAGE_KEY);
        // Sem nada salvo, o preset do app original ainda não foi semeado:
        // manter null faz valer o número que veio do servidor.
        setSentTotal(raw ? Object.keys(JSON.parse(raw)).length : null);
      } catch {
        setSentTotal(null);
      }
    };

    read();
    window.addEventListener("storage", read);
    window.addEventListener(ONDA2_CHANGE_EVENT, read);

    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(ONDA2_CHANGE_EVENT, read);
    };
  }, []);

  const value = sentTotal ?? fallbackSent;

  return {
    sentTotal: value,
    remaining: Math.max(0, total - value),
    percent: total ? (value / total) * 100 : 0,
    live: sentTotal !== null,
  };
}
