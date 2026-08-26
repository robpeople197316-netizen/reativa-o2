"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSpeechRecognition } from "@/lib/jarvis/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/lib/jarvis/hooks/useSpeechSynthesis";

export interface JarvisStatus {
  capabilities: {
    brain: boolean;
    whisper: boolean;
    /** Há síntese de voz no servidor? */
    voiceServer: boolean;
    voiceProvider: "elevenlabs" | "google" | null;
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
 * Janela de acompanhamento: quanto tempo o microfone fica aberto depois que o
 * Jarvis termina de falar. Curta de propósito — num salão há cliente na
 * cadeira, e microfone aberto sem motivo é constrangimento, não recurso.
 */
const JANELA_MS = 8_000;

const CHAVE_CONTINUO = "jarvis:conversa-continua";

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

  // Conversa contínua: reabre o microfone sozinho após cada resposta.
  const [continuo, setContinuo] = useState(false);
  const [aguardando, setAguardando] = useState(false);
  const continuoRef = useRef(false);
  const janelaRef = useRef<number | null>(null);

  /**
   * Controles da escuta por referência.
   *
   * `ask` precisa reabrir o microfone, mas é declarado ANTES do hook de
   * reconhecimento — que por sua vez precisa de `ask`. A referência quebra o
   * ciclo sem inverter a ordem.
   */
  const escutaRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const emit = useCallback((event: JarvisEvent) => {
    onEventRef.current?.(event);
  }, []);

  // Preferência de conversa contínua sobrevive ao recarregar a página.
  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_CONTINUO) === "1";
      setContinuo(salvo);
      continuoRef.current = salvo;
    } catch {
      /* storage bloqueado: segue desligado */
    }
  }, []);

  const fecharJanela = useCallback(() => {
    if (janelaRef.current !== null) {
      window.clearTimeout(janelaRef.current);
      janelaRef.current = null;
    }
    setAguardando(false);
  }, []);

  const alternarContinuo = useCallback(() => {
    setContinuo((antes) => {
      const agora = !antes;
      continuoRef.current = agora;

      try {
        window.localStorage.setItem(CHAVE_CONTINUO, agora ? "1" : "0");
      } catch {
        /* sem persistência — a sessão atual ainda vale */
      }

      if (!agora) {
        fecharJanela();
        escutaRef.current?.stop();
      }

      return agora;
    });
  }, [fecharJanela]);

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
    mode: status?.capabilities.voiceServer ? "server" : "browser",
  });

  const say = useCallback(
    async (text: string) => {
      emit({ kind: "jarvis", text });

      // Falar com o microfone aberto faz o Jarvis se ouvir e responder a si
      // mesmo. Fecha antes, reabre depois — nunca os dois ao mesmo tempo.
      escutaRef.current?.stop();
      fecharJanela();

      setPhase("speaking");
      await voice.speak(text);
      setPhase("standby");
    },
    [emit, fecharJanela, voice],
  );

  /**
   * Reabre a escuta por alguns segundos depois da resposta.
   *
   * Se nada vier, fecha sozinha — é o que separa "conversa contínua" de
   * "microfone ligado o dia inteiro".
   */
  const abrirJanela = useCallback(() => {
    if (!continuoRef.current) return;

    setAguardando(true);
    escutaRef.current?.start();

    janelaRef.current = window.setTimeout(() => {
      janelaRef.current = null;
      setAguardando(false);
      escutaRef.current?.stop();
    }, JANELA_MS);
  }, []);

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
        abrirJanela();
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
    [abrirJanela, emit, say],
  );

  const speech = useSpeechRecognition({
    mode: status?.capabilities.whisper ? "whisper" : "webspeech",
    onFinal: (text) => {
      fecharJanela();
      void ask(text);
    },
  });

  // Publica os controles para `ask` e `say` alcançarem sem ciclo de declaração.
  useEffect(() => {
    escutaRef.current = { start: speech.start, stop: speech.stop };
  }, [speech.start, speech.stop]);

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

  // Encerra tudo ao desmontar: janela pendente não pode reabrir microfone.
  useEffect(() => () => fecharJanela(), [fecharJanela]);

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
    toggleListening: () => {
      fecharJanela();
      speech.toggle();
    },
    stopListening: speech.stop,
    /** Conversa contínua: reabre o microfone após cada resposta. */
    continuo,
    alternarContinuo,
    /** Verdadeiro durante a janela de acompanhamento. */
    aguardando,
    ask,
    say,
    reset,
  };
}
