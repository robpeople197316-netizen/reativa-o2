import { NextResponse } from "next/server";

import { capabilities, jarvisConfig } from "@/lib/jarvis/config";
import { ensureVault } from "@/lib/jarvis/obsidian/vault";

export const dynamic = "force-dynamic";

/**
 * O que está ligado neste ambiente.
 *
 * Só booleanos e o caminho do cofre — nenhuma chave sai daqui. O HUD usa para
 * decidir entre Whisper e Web Speech, ElevenLabs e voz nativa.
 */
export async function GET() {
  const caps = capabilities();

  let vaultPath: string | null = null;
  let vaultError: string | null = null;

  try {
    vaultPath = await ensureVault();
  } catch (err) {
    vaultError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    capabilities: { ...caps, vault: Boolean(vaultPath) },
    vault: { path: vaultPath, error: vaultError },
    salao: jarvisConfig.salonName,
    modelo: caps.brain ? "claude-opus-5" : null,
  });
}
