import { NextResponse } from "next/server";

import { askJarvis, type JarvisImage } from "@/lib/jarvis/ai/brain";
import { capabilities } from "@/lib/jarvis/config";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

/** Aceita data URL ("data:image/jpeg;base64,...") ou base64 puro. */
function parseImage(
  raw: string,
  fallback: MediaType,
): { data: string; mediaType: MediaType } {
  const match = raw.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s);
  if (match) {
    return { mediaType: match[1] as MediaType, data: match[2] };
  }
  return { mediaType: fallback, data: raw };
}

/**
 * Diagnóstico visual.
 *
 * `origem: "webcam"` avalia a cliente na cadeira (cor, corte, estado do fio);
 * `origem: "tela"` lê a tela atual para extrair dados ou orientar a navegação.
 * Em ambos os casos as ferramentas do cofre continuam disponíveis, então o
 * Jarvis pode cruzar o que vê com o histórico da cliente.
 */
export async function POST(request: Request) {
  if (!capabilities().brain) {
    return NextResponse.json(
      { error: "Visão offline: defina ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  let body: { image?: string; origem?: string; pergunta?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.image) {
    return NextResponse.json(
      { error: "Campo 'image' é obrigatório (data URL ou base64)." },
      { status: 400 },
    );
  }

  const origem: JarvisImage["origem"] = body.origem === "tela" ? "tela" : "webcam";
  const { data, mediaType } = parseImage(body.image, "image/jpeg");

  const pergunta =
    body.pergunta?.trim() ||
    (origem === "webcam"
      ? "Avalie a cor e o corte desta cliente. Aponte o que você observa no fio e sugira o próximo passo."
      : "Leia esta tela e me diga o que é relevante agora.");

  try {
    const result = await askJarvis({
      message: pergunta,
      images: [{ data, mediaType, origem }],
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Falha na análise visual.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
