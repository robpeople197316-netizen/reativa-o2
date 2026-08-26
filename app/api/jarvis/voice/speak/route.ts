import { jarvisConfig } from "@/lib/jarvis/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Voz da ElevenLabs.
 *
 * Devolve audio/mpeg cru para o navegador tocar. Sem ELEVENLABS_API_KEY o hook
 * `useSpeechSynthesis` usa a voz nativa do sistema — o HUD nunca fica mudo.
 */
export async function POST(request: Request) {
  if (!jarvisConfig.elevenLabsKey) {
    return Response.json(
      {
        error:
          "ElevenLabs indisponível: defina ELEVENLABS_API_KEY. Use speechSynthesis do navegador.",
      },
      { status: 503 },
    );
  }

  let body: { text?: string; voiceId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return Response.json(
      { error: "Campo 'text' é obrigatório." },
      { status: 400 },
    );
  }

  const voiceId = body.voiceId ?? jarvisConfig.elevenLabsVoiceId;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": jarvisConfig.elevenLabsKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            // Estabilidade alta + estilo baixo: leitura corporativa, sem drama.
            stability: 0.55,
            similarity_boost: 0.75,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      return Response.json(
        { error: "ElevenLabs recusou a síntese.", detail: detail.slice(0, 400) },
        { status: 502 },
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: "Falha ao falar com a ElevenLabs.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
