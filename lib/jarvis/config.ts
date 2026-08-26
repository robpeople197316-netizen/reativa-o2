import "server-only";

import path from "node:path";

/**
 * Configuração do Jarvis.
 *
 * Nada aqui é obrigatório: cada capacidade externa liga sozinha quando a chave
 * correspondente existe. Sem chave nenhuma, o HUD continua funcionando com o
 * cofre local, os cálculos e a voz nativa do navegador.
 */
export const jarvisConfig = {
  /** Raiz do cofre Obsidian. Aponte para o seu vault real em produção. */
  vaultPath:
    process.env.OBSIDIAN_VAULT_PATH ??
    path.join(process.cwd(), "jarvis-vault"),

  anthropicKey: process.env.ANTHROPIC_API_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
  elevenLabsKey: process.env.ELEVENLABS_API_KEY,
  elevenLabsVoiceId:
    process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM",

  /** Google Cloud Text-to-Speech — vozes pt-BR sem depender do Windows. */
  googleTtsKey: process.env.GOOGLE_TTS_API_KEY,
  googleTtsVoice: process.env.GOOGLE_TTS_VOICE ?? "pt-BR-Neural2-A",
  /** Sobrescrevível para proxy corporativo — e é o que permite testar a rota. */
  googleTtsEndpoint:
    process.env.GOOGLE_TTS_ENDPOINT ??
    "https://texttospeech.googleapis.com/v1/text:synthesize",

  /**
   * Qual provedor usar quando os dois estão configurados.
   * Sem valor, a ElevenLabs vence — quem a configurou escolheu por algum motivo.
   */
  ttsProvider: process.env.JARVIS_TTS_PROVIDER as
    | "elevenlabs"
    | "google"
    | undefined,

  /** Nome do salão usado nas fichas e no tom das respostas. */
  salonName: process.env.JARVIS_SALON_NAME ?? "Salão",
  /** Percentual padrão do profissional quando a comissão não é informada. */
  defaultCommission: Number(process.env.JARVIS_DEFAULT_COMMISSION ?? 40),
} as const;

export type TtsProvider = "elevenlabs" | "google";

export interface JarvisCapabilities {
  /** Cérebro: conversa, uso de ferramentas, visão e pesquisa web. */
  brain: boolean;
  /** Transcrição via Whisper. Sem ela, o navegador usa a Web Speech API. */
  whisper: boolean;
  /** Há síntese de voz no servidor? Sem ela, o navegador usa speechSynthesis. */
  voiceServer: boolean;
  /** Qual provedor responde por ela. */
  voiceProvider: TtsProvider | null;
  vault: boolean;
}

/**
 * Decide quem sintetiza a voz.
 *
 * A preferência explícita só vale se a chave daquele provedor existir — senão
 * o HUD anunciaria uma voz que não pode entregar.
 */
export function resolveTtsProvider(): TtsProvider | null {
  const temEleven = Boolean(jarvisConfig.elevenLabsKey);
  const temGoogle = Boolean(jarvisConfig.googleTtsKey);

  if (jarvisConfig.ttsProvider === "google" && temGoogle) return "google";
  if (jarvisConfig.ttsProvider === "elevenlabs" && temEleven) return "elevenlabs";

  if (temEleven) return "elevenlabs";
  if (temGoogle) return "google";
  return null;
}

export function capabilities(): JarvisCapabilities {
  const voiceProvider = resolveTtsProvider();

  return {
    brain: Boolean(jarvisConfig.anthropicKey),
    whisper: Boolean(jarvisConfig.openaiKey),
    voiceServer: voiceProvider !== null,
    voiceProvider,
    vault: true,
  };
}
