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
  /** Miniatura da imagem enviada nesta fala, só para exibição. */
  imagem?: string;
  /** Ferramentas usadas para produzir esta resposta. */
  ferramentas?: string[];
  /** Fontes citadas quando houve pesquisa web. */
  fontes?: { title: string; url: string }[];
  /** Turno de falha — exibido, mas fora do contexto mandado ao modelo. */
  erro?: boolean;
}

export interface JarvisAnexo {
  /** Data URL completa: "data:image/jpeg;base64,...". */
  dataUrl: string;
  origem: "webcam" | "tela";
}

/** Separa a data URL no formato que a API espera. */
function parseAnexo(anexo: JarvisAnexo) {
  const match = anexo.dataUrl.match(
    /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s,
  );

  if (!match) return null;
  return { mediaType: match[1], data: match[2], origem: anexo.origem };
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

  /**
   * Manda uma frase ao cérebro e fala a resposta.
   *
   * O anexo, quando existe, vai como imagem desta rodada — é assim que a
   * webcam e a leitura de tela entram na MESMA conversa, em vez de virarem
   * um diálogo paralelo.
   */
  const ask = useCallback(
    async (message: string, anexo?: JarvisAnexo | null) => {
      const clean = message.trim();
      if (!clean) return;

      emit({ kind: "voce", text: clean });
      setError(null);
      setPhase("thinking");

      const imagem = anexo ? parseAnexo(anexo) : null;

      // Anexo que não dá para ler não pode virar pergunta sem imagem: o
      // operador acharia que o Jarvis viu a foto quando ele não viu.
      if (anexo && !imagem) {
        const detalhe = "Não consegui ler a imagem anexada (formato inesperado).";
        setError(detalhe);
        emit({ kind: "erro", text: detalhe });
        setHistory((prev) => [
          ...prev,
          { role: "assistant", content: detalhe, erro: true },
        ]);
        setPhase("standby");
        return;
      }

      // A transcrição mostra a pergunta na hora; a resposta chega depois.
      setHistory((prev) => [
        ...prev,
        { role: "user", content: clean, imagem: anexo?.dataUrl },
      ]);

      try {
        const res = await fetch("/api/jarvis/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: clean,
            // O histórico enviado é só texto: imagens ficam na rodada delas.
            history: historyRef.current.map((t) => ({
              role: t.role,
              content: t.content,
            })),
            images: imagem
              ? [
                  {
                    data: imagem.data,
                    mediaType: imagem.mediaType,
                    origem: imagem.origem,
                  },
                ]
              : undefined,
          }),
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
          // Fica visível na transcrição, mas fora do contexto do modelo.
          setHistory((prev) => [
            ...prev,
            { role: "assistant", content: detail, erro: true },
          ]);
          setPhase("standby");
          return;
        }

        for (const call of json.toolCalls ?? []) {
          emit({
            kind: "ferramenta",
            text: `${call.name}${call.ok ? "" : " (falhou)"}`,
          });
        }

        const resposta: JarvisTurn = {
          role: "assistant",
          content: json.reply,
          ferramentas: (json.toolCalls ?? []).map((c) => c.name),
          fontes: json.sources,
        };

        // Contexto do modelo: só os turnos que deram certo, só texto.
        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: clean },
          { role: "assistant", content: json.reply },
        ];

        setHistory((prev) => [...prev, resposta]);

        await say(json.reply);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        setError(detail);
        emit({ kind: "erro", text: detail });
        setHistory((prev) => [
          ...prev,
          { role: "assistant", content: detail, erro: true },
        ]);
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
