"use client";

import { useCallback, useEffect, useState } from "react";

export interface Lembrete {
  id: string;
  texto: string;
  quando?: string;
  feito: boolean;
  disparado?: boolean;
}

/**
 * Lembretes de hoje, do ponto de vista do painel.
 *
 * O disparo automático continua no `useJarvis` — aqui é só a lista visível,
 * com criação e conclusão. As duas coisas leem o mesmo arquivo do cofre.
 */
export function useLembretes() {
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/jarvis/lembretes");
      const json = (await res.json()) as { lembretes?: Lembrete[]; error?: string };

      if (!res.ok) throw new Error(json.error ?? `status ${res.status}`);
      setLembretes(json.lembretes ?? []);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao ler lembretes.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const criar = useCallback(
    async (texto: string, quando?: string) => {
      const res = await fetch("/api/jarvis/lembretes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, quando }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErro(json.error ?? "Não foi possível criar o lembrete.");
        return false;
      }

      await carregar();
      return true;
    },
    [carregar],
  );

  const concluir = useCallback(
    async (id: string) => {
      // Otimista: a caixinha marca na hora e a lista se reconcilia depois.
      setLembretes((prev) =>
        prev.map((l) => (l.id === id ? { ...l, feito: true } : l)),
      );

      const res = await fetch("/api/jarvis/lembretes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) setErro("Não foi possível concluir o lembrete.");
      await carregar();
    },
    [carregar],
  );

  return { lembretes, carregando, erro, carregar, criar, concluir };
}
