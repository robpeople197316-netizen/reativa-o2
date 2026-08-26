import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/jarvis/apiError";

import {
  concluirLembrete,
  criarLembrete,
  lembretesVencidos,
  listarLembretes,
} from "@/lib/jarvis/obsidian/diario";

export const dynamic = "force-dynamic";

/**
 * GET            — lembretes de hoje.
 * GET ?vencidos=1 — só os que venceram e ainda não foram anunciados.
 *
 * O modo `vencidos` tem efeito colateral de propósito: marca os que devolve
 * como disparados, para o HUD não repetir o mesmo alarme a cada varredura.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    if (searchParams.get("vencidos") === "1") {
      return NextResponse.json({ lembretes: await lembretesVencidos() });
    }

    return NextResponse.json({ lembretes: await listarLembretes() });
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST — cria um lembrete, com ou sem horário. */
export async function POST(request: Request) {
  let body: { texto?: string; quando?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.texto?.trim()) {
    return NextResponse.json(
      { error: "Campo 'texto' é obrigatório." },
      { status: 400 },
    );
  }

  if (body.quando && Number.isNaN(Date.parse(body.quando))) {
    return NextResponse.json(
      { error: "Campo 'quando' deve ser uma data ISO 8601 válida." },
      { status: 400 },
    );
  }

  try {
    const lembrete = await criarLembrete({
      texto: body.texto,
      quando: body.quando,
    });
    return NextResponse.json(lembrete, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

/** PATCH — marca como concluído. */
export async function PATCH(request: Request) {
  let body: { id?: string; data?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json(
      { error: "Campo 'id' é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const ok = await concluirLembrete(body.id, body.data);
    if (!ok) {
      return NextResponse.json(
        { error: `Lembrete não encontrado: ${body.id}` },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
