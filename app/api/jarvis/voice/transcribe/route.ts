import { NextResponse } from "next/server";

import { jarvisConfig } from "@/lib/jarvis/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Transcrição via Whisper (OpenAI).
 *
 * É o caminho de precisão: melhor com ruído de secador e vocabulário técnico
 * do salão. Sem OPENAI_API_KEY, o navegador cai na Web Speech API — o hook
 * `useSpeechRecognition` decide sozinho.
 *
 * Envie multipart/form-data com o campo `audio`.
 */
export async function POST(request: Request) {
  if (!jarvisConfig.openaiKey) {
    return NextResponse.json(
      {
        error:
          "Whisper indisponível: defina OPENAI_API_KEY. Use a Web Speech API do navegador.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Envie multipart/form-data com o campo 'audio'." },
      { status: 400 },
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json(
      { error: "Campo 'audio' ausente ou não é um arquivo." },
      { status: 400 },
    );
  }

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "audio.webm");
  upstream.append("model", "whisper-1");
  upstream.append("language", "pt");
  // Nomes técnicos que o Whisper erra sem contexto do domínio.
  upstream.append(
    "prompt",
    "Salão de beleza. Termos: visagismo, progressiva, matizador, ox 20 volumes, pó descolorante, escova, luzes, comanda, bancada.",
  );

  try {
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${jarvisConfig.openaiKey}` },
        body: upstream,
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: "Whisper recusou o áudio.", detail: detail.slice(0, 400) },
        { status: 502 },
      );
    }

    const result = (await response.json()) as { text?: string };
    return NextResponse.json({ text: result.text ?? "" });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Falha ao falar com o Whisper.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
