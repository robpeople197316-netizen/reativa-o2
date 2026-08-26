import { jarvisConfig, resolveTtsProvider } from "@/lib/jarvis/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Síntese de voz do Jarvis.
 *
 * Uma rota, dois provedores: quem chama recebe audio/mpeg e não precisa saber
 * qual respondeu. Sem chave nenhuma, devolve 503 e o navegador assume com a voz
 * do sistema — é o `useSpeechSynthesis` que faz essa queda.
 */

async function falarComElevenLabs(text: string, voiceId: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": jarvisConfig.elevenLabsKey as string,
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
    throw new Error(`ElevenLabs recusou a síntese: ${detail.slice(0, 300)}`);
  }

  return new Response(response.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}

/** Uma tentativa contra o Cloud TTS. `voz` vazia deixa o Google escolher. */
async function tentarGoogle(text: string, voz?: string) {
  const url = `${jarvisConfig.googleTtsEndpoint}?key=${encodeURIComponent(
    jarvisConfig.googleTtsKey as string,
  )}`;

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: voz ? { languageCode: "pt-BR", name: voz } : { languageCode: "pt-BR" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.02, pitch: -1 },
    }),
  });
}

async function falarComGoogle(text: string) {
  let response = await tentarGoogle(text, jarvisConfig.googleTtsVoice);

  // Nome de voz inválido é o erro mais provável — os catálogos mudam. Em vez
  // de emudecer, repete deixando o Google escolher uma voz em pt-BR.
  if (!response.ok) {
    const detail = await response.text();

    if (response.status === 400) {
      response = await tentarGoogle(text);
      if (!response.ok) {
        const segundo = await response.text();
        throw new Error(
          `Google TTS recusou a síntese: ${segundo.slice(0, 300)}`,
        );
      }
    } else {
      throw new Error(`Google TTS recusou a síntese: ${detail.slice(0, 300)}`);
    }
  }

  const json = (await response.json()) as { audioContent?: string };
  if (!json.audioContent) {
    throw new Error("Google TTS respondeu sem áudio.");
  }

  // O Cloud TTS devolve MP3 em base64; o navegador quer os bytes.
  const bytes = Buffer.from(json.audioContent, "base64");

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(bytes.length),
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const provider = resolveTtsProvider();

  if (!provider) {
    return Response.json(
      {
        error:
          "Nenhuma voz de servidor configurada: defina ELEVENLABS_API_KEY ou " +
          "GOOGLE_TTS_API_KEY. Sem elas, o navegador usa a voz do sistema.",
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

  try {
    return provider === "google"
      ? await falarComGoogle(text)
      : await falarComElevenLabs(
          text,
          body.voiceId ?? jarvisConfig.elevenLabsVoiceId,
        );
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : String(err),
        provedor: provider,
      },
      { status: 502 },
    );
  }
}
