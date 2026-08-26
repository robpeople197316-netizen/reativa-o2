"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** `server` = a rota /api/jarvis/voice/speak, seja qual for o provedor. */
export type VoiceMode = "browser" | "server";

/**
 * A lista de vozes do navegador chega DEPOIS do primeiro acesso: `getVoices()`
 * responde vazio até o evento `voiceschanged`. Ler uma vez só, no ato de falar,
 * fazia a primeira frase sair sem voz escolhida — e no Windows isso significa
 * a voz padrão do sistema, em inglês, lendo português.
 */
function vozesDisponiveis(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const atuais = window.speechSynthesis.getVoices();
    if (atuais.length) {
      resolve(atuais);
      return;
    }

    let resolvido = false;
    const entregar = () => {
      if (resolvido) return;
      resolvido = true;
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.onvoiceschanged = entregar;
    // Rede de segurança: alguns navegadores nunca disparam o evento.
    window.setTimeout(entregar, 1200);
  });
}

/**
 * Escolhe a melhor voz em português disponível.
 *
 * Os nomes mudam por sistema — no Windows são "Microsoft Maria/Thalita", no
 * macOS "Luciana", no Chrome "Google português". Em vez de procurar nomes
 * específicos, pontua: português do Brasil primeiro, e dentro disso as vozes
 * "natural"/"online", que são bem melhores que as antigas.
 */
function escolherVoz(vozes: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const candidatas = vozes.filter((v) => v.lang?.toLowerCase().startsWith("pt"));
  if (!candidatas.length) return null;

  const nota = (v: SpeechSynthesisVoice) => {
    let n = 0;
    if (v.lang?.toLowerCase().replace("_", "-") === "pt-br") n += 100;
    if (/natural|online|neural|wavenet/i.test(v.name)) n += 40;
    if (/google/i.test(v.name)) n += 20;
    if (v.default) n += 5;
    return n;
  };

  return [...candidatas].sort((a, b) => nota(b) - nota(a))[0];
}

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
  const vozRef = useRef<SpeechSynthesisVoice | null>(null);

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
    async (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setError("Este navegador não sintetiza voz.");
        return;
      }

      // Resolve a voz uma vez e reaproveita nas falas seguintes.
      if (!vozRef.current) {
        vozRef.current = escolherVoz(await vozesDisponiveis());
        if (!vozRef.current) {
          // Diagnóstico com o caminho da solução: quem lê isto está no Windows
          // e não tem como adivinhar onde se instala uma voz.
          setError(
            "Nenhuma voz em português instalada. No Windows: Configurações → " +
              "Hora e Idioma → Fala → Adicionar vozes.",
          );
        }
      }

      await new Promise<void>((resolve) => {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        // Tom corporativo: um pouco mais grave e levemente acelerado.
        utterance.rate = 1.04;
        utterance.pitch = 0.92;
        if (vozRef.current) utterance.voice = vozRef.current;

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
      });
    },
    [lang],
  );

  const speak = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      setError(null);
      cancel();

      if (mode !== "server") {
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
        // Voz de servidor indisponível não pode calar o assistente.
        setError("Voz do servidor indisponível — usando a voz do navegador.");
        await speakBrowser(clean);
      }
    },
    [cancel, cleanupAudio, mode, speakBrowser],
  );

  useEffect(() => () => cancel(), [cancel]);

  return { speak, cancel, speaking, error };
}
