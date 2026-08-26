"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSpeechRecognition } from "@/lib/jarvis/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/lib/jarvis/hooks/useSpeechSynthesis";

export interface JarvisStatus {
  capabilities: {
    brain: boolean;
    whisper: boolean;
    elevenLabs: boolean;
    vault: boolean;
  };
  vault: { path: string | null; error: string | null };
  salao: string;
  modelo: string | null;
}

export interface JarvisTurn {
  role: "user" | "assistant";
  content: string;
}

export type JarvisPhase = "standby" | "listening" | "thinking" | "speaking";

export interface JarvisEvent {
  kind: "voce" | "jarvis" | "ferramenta" | "lembrete" | "erro";
  text: string;
}

/** Quanto tempo entre varreduras de lembretes vencidos. */
const REMINDER_POLL_MS = 60_000;

/**
 * O Jarvis inteiro, do ponto de vista da interface.
 *
 * Escolhe os melhores caminhos de voz a partir do que o servidor tem ligado,
 * conduz o ciclo ouvir → pensar → falar, mantém a conversa e vigia os
 * lembretes com horário marcado.
 */
export function useJarvis({
  onEvent,
}: { onEvent?: (event: JarvisEvent) => void } = {}) {
  const [status, setStatus] = useState<JarvisStatus | null>(null);
  const [phase, setPhase] = useState<JarvisPhase>("standby");
  const [history, setHistory] = useState<JarvisTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const historyRef = useRef<JarvisTurn[]>([]);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const emit = useCallback((event: JarvisEvent) => {
    onEventRef.current?.(event);
  }, []);

  // Descobre o que está disponível neste ambiente.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/jarvis/status")
      .then((r) => r.json() as Promise<JarvisStatus>)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível ler o status do Jarvis.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const voice = useSpeechSynthesis({
    mode: status?.capabilities.elevenLabs ? "elevenlabs" : "browser",
  });

  const say = useCallback(
    async (text: string) => {
      emit({ kind: "jarvis", text });
      setPhase("speaking");
      await voice.speak(text);
      setPhase("standby");
    },
    [emit, voice],
  );

  /** Manda uma frase ao cérebro e fala a resposta. */
  const ask = useCallback(
    async (message: string) => {
      const clean = message.trim();
      if (!clean) return;

      emit({ kind: "voce", text: clean });
      setError(null);
      setPhase("thinking");

      const next = [...historyRef.current, { role: "user" as const, content: clean }];

      try {
        const res = await fetch("/api/jarvis/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: clean, history: historyRef.current }),
        });

        const json = (await res.json()) as {
          reply?: string;
          toolCalls?: { name: string; ok: boolean }[];
          sources?: { title: string; url: string }[];
          error?: string;
        };

        if (!res.ok || !json.reply) {
          const detail = json.error ?? `status ${res.status}`;
          setError(detail);
          emit({ kind: "erro", text: detail });
          setPhase("standby");
          return;
        }

        for (const call of json.toolCalls ?? []) {
          emit({
            kind: "ferramenta",
            text: `${call.name}${call.ok ? "" : " (falhou)"}`,
          });
        }

        const updated = [...next, { role: "assistant" as const, content: json.reply }];
        historyRef.current = updated;
        setHistory(updated);

        await say(json.reply);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        setError(detail);
        emit({ kind: "erro", text: detail });
        setPhase("standby");
      }
    },
    [emit, say],
  );

  const speech = useSpeechRecognition({
    mode: status?.capabilities.whisper ? "whisper" : "webspeech",
    onFinal: (text) => {
      void ask(text);
    },
  });

  // A fase segue a escuta, mas nunca atropela um "pensando" já em curso.
  useEffect(() => {
    if (speech.listening) setPhase("listening");
    else setPhase((p) => (p === "listening" ? "standby" : p));
  }, [speech.listening]);

  // Gatilho automático dos lembretes com horário.
  useEffect(() => {
    let cancelled = false;

    const sweep = async () => {
      try {
        const res = await fetch("/api/jarvis/lembretes?vencidos=1");
        if (!res.ok) return;

        const json = (await res.json()) as { lembretes?: { texto: string }[] };
        if (cancelled) return;

        for (const lembrete of json.lembretes ?? []) {
          emit({ kind: "lembrete", text: lembrete.texto });
          await say(`Lembrete: ${lembrete.texto}`);
        }
      } catch {
        /* varredura silenciosa — um erro de rede aqui não merece alarme */
      }
    };

    void sweep();
    const id = window.setInterval(() => void sweep(), REMINDER_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [emit, say]);

  // Falha de microfone ou de voz precisa aparecer para o operador: sem isto,
  // o mic simplesmente não reage e ninguém descobre por quê.
  const lastReported = useRef<string | null>(null);

  useEffect(() => {
    const problema = speech.error ?? voice.error;
    if (!problema || problema === lastReported.current) return;

    lastReported.current = problema;
    emit({ kind: "erro", text: problema });
  }, [emit, speech.error, voice.error]);

  const reset = useCallback(() => {
    historyRef.current = [];
    setHistory([]);
  }, []);

  return {
    status,
    phase,
    history,
    error: error ?? speech.error ?? voice.error,
    interim: speech.interim,
    listening: speech.listening,
    speaking: voice.speaking,
    /** Alterna o microfone — o ciclo completo dispara sozinho. */
    toggleListening: speech.toggle,
    stopListening: speech.stop,
    ask,
    say,
    reset,
  };
}
