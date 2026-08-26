import { NextResponse } from "next/server";

import { askJarvis, type JarvisImage, type JarvisTurn } from "@/lib/jarvis/ai/brain";
import { capabilities } from "@/lib/jarvis/config";

export const dynamic = "force-dynamic";
/** Uma volta com ferramentas pode passar de 30s — o padrão da Vercel. */
export const maxDuration = 120;

interface ChatBody {
  message?: string;
  history?: JarvisTurn[];
  images?: JarvisImage[];
}

export async function POST(request: Request) {
  if (!capabilities().brain) {
    return NextResponse.json(
      {
        error:
          "Cérebro offline: defina ANTHROPIC_API_KEY para ativar a conversa do Jarvis.",
      },
      { status: 503 },
    );
  }

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json(
      { error: "Campo 'message' é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const result = await askJarvis({
      message,
      // Janela curta: o HUD é conversa de balcão, não sessão longa.
      history: (body.history ?? []).slice(-12),
      images: body.images,
    });

    return NextResponse.json(result);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Falha ao consultar o cérebro.", detail },
      { status: 502 },
    );
  }
}
