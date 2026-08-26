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

  /** Nome do salão usado nas fichas e no tom das respostas. */
  salonName: process.env.JARVIS_SALON_NAME ?? "Salão",
  /** Percentual padrão do profissional quando a comissão não é informada. */
  defaultCommission: Number(process.env.JARVIS_DEFAULT_COMMISSION ?? 40),
} as const;

export interface JarvisCapabilities {
  /** Cérebro: conversa, uso de ferramentas, visão e pesquisa web. */
  brain: boolean;
  /** Transcrição via Whisper. Sem ela, o navegador usa a Web Speech API. */
  whisper: boolean;
  /** Voz da ElevenLabs. Sem ela, o navegador usa speechSynthesis. */
  elevenLabs: boolean;
  vault: boolean;
}

export function capabilities(): JarvisCapabilities {
  return {
    brain: Boolean(jarvisConfig.anthropicKey),
    whisper: Boolean(jarvisConfig.openaiKey),
    elevenLabs: Boolean(jarvisConfig.elevenLabsKey),
    vault: true,
  };
}
