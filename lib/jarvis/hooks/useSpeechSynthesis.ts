"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceMode = "browser" | "elevenlabs";

/**
 * A fala do Jarvis.
 *
 * Com ELEVENLABS_API_KEY no servidor, usa a voz da ElevenLabs; sem ela, a voz
 * nativa do sistema. A troca é transparente para quem chama — e se a
 * ElevenLabs falhar no meio, cai para a voz nativa em vez de emudecer.
 */
export function useSpeechSynthesis({
  mode = "browser",
  lang = "pt-BR",
}: { mode?: VoiceMode; lang?: string } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanupAudio = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    audioRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (audioRef.current) {
      audioRef.current.pause();
      cleanupAudio();
    }

    setSpeaking(false);
  }, [cleanupAudio]);

  const speakBrowser = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          setError("Este navegador não sintetiza voz.");
          resolve();
          return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        // Tom corporativo: um pouco mais grave e levemente acelerado.
        utterance.rate = 1.04;
        utterance.pitch = 0.92;

        const preferred = window.speechSynthesis
          .getVoices()
          .find((v) => v.lang?.startsWith("pt") && /google|luciana|female/i.test(v.name));
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => {
          setSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setSpeaking(false);
          resolve();
        };

        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }),
    [lang],
  );

  const speak = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      setError(null);
      cancel();

      if (mode !== "elevenlabs") {
        await speakBrowser(clean);
        return;
      }

      try {
        const res = await fetch("/api/jarvis/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean }),
        });

        if (!res.ok) throw new Error(`status ${res.status}`);

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        setSpeaking(true);

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            setSpeaking(false);
            cleanupAudio();
            resolve();
          };
          audio.onerror = () => {
            setSpeaking(false);
            cleanupAudio();
            resolve();
          };
          void audio.play().catch(() => {
            // Autoplay bloqueado até a primeira interação do usuário.
            setSpeaking(false);
            cleanupAudio();
            resolve();
          });
        });
      } catch {
        // Voz premium indisponível não pode calar o assistente.
        setError("ElevenLabs indisponível — usando a voz do navegador.");
        await speakBrowser(clean);
      }
    },
    [cancel, cleanupAudio, mode, speakBrowser],
  );

  useEffect(() => () => cancel(), [cancel]);

  return { speak, cancel, speaking, error };
}
