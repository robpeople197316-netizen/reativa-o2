"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A Web Speech API não está no lib.dom padrão — declaramos só o que usamos.
 */
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type ListenMode = "webspeech" | "whisper";

export interface SpeechRecognitionState {
  listening: boolean;
  /** Texto parcial enquanto a pessoa ainda fala. */
  interim: string;
  error: string | null;
  supported: boolean;
  mode: ListenMode;
}

/**
 * Escuta do Jarvis, com dois caminhos.
 *
 * `webspeech` transcreve no próprio navegador — instantâneo e sem chave.
 * `whisper` grava o áudio e manda para /api/jarvis/voice/transcribe, que é mais
 * preciso com ruído de secador e vocabulário técnico. O modo é escolhido por
 * quem chama, a partir do /api/jarvis/status.
 */
export function useSpeechRecognition({
  mode = "webspeech",
  lang = "pt-BR",
  onFinal,
}: {
  mode?: ListenMode;
  lang?: string;
  /** Chamado com a frase final, uma vez por fala. */
  onFinal: (text: string) => void;
}) {
  const [state, setState] = useState<SpeechRecognitionState>({
    listening: false,
    interim: "",
    error: null,
    supported: true,
    mode,
  });

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    setState((s) => ({ ...s, mode }));
  }, [mode]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();

    setState((s) => ({ ...s, listening: false, interim: "" }));
  }, []);

  const startWebSpeech = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setState((s) => ({
        ...s,
        supported: false,
        error: "Este navegador não tem reconhecimento de fala nativo.",
      }));
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) final += text;
        else interim += text;
      }

      setState((s) => ({ ...s, interim }));
      if (final.trim()) onFinalRef.current(final.trim());
    };

    recognition.onerror = (event) => {
      setState((s) => ({
        ...s,
        listening: false,
        error: event.error ?? "erro no reconhecimento de fala",
      }));
    };

    recognition.onend = () => {
      setState((s) => ({ ...s, listening: false, interim: "" }));
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState((s) => ({ ...s, listening: true, error: null }));
  }, [lang]);

  const startWhisper = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (!blob.size) return;

        const form = new FormData();
        form.append("audio", blob, "fala.webm");

        try {
          const res = await fetch("/api/jarvis/voice/transcribe", {
            method: "POST",
            body: form,
          });
          const json = (await res.json()) as { text?: string; error?: string };

          if (!res.ok) {
            setState((s) => ({ ...s, error: json.error ?? "falha na transcrição" }));
            return;
          }
          if (json.text?.trim()) onFinalRef.current(json.text.trim());
        } catch (err) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : "falha na transcrição",
          }));
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setState((s) => ({ ...s, listening: true, error: null }));
    } catch {
      setState((s) => ({
        ...s,
        listening: false,
        error: "Permissão de microfone negada.",
      }));
    }
  }, []);

  const start = useCallback(() => {
    if (mode === "whisper") void startWhisper();
    else startWebSpeech();
  }, [mode, startWebSpeech, startWhisper]);

  const toggle = useCallback(() => {
    if (state.listening) stop();
    else start();
  }, [start, state.listening, stop]);

  // Nunca deixar o microfone aberto ao desmontar.
  useEffect(() => () => stop(), [stop]);

  return { ...state, start, stop, toggle };
}
