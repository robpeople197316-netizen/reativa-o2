import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/jarvis/apiError";

import { getDia, registrarLog, ultimosDias } from "@/lib/jarvis/obsidian/diario";

export const dynamic = "force-dynamic";

/** GET ?data=2026-08-26 (um dia) | ?ultimos=7 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    if (searchParams.has("ultimos")) {
      const limite = Number(searchParams.get("ultimos"));
      return NextResponse.json({
        dias: await ultimosDias(Number.isFinite(limite) ? limite : 7),
      });
    }

    const dia = await getDia(searchParams.get("data") ?? undefined);
    if (!dia) {
      return NextResponse.json(
        { error: "Nenhum registro nesta data." },
        { status: 404 },
      );
    }

    return NextResponse.json(dia);
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST — acrescenta uma linha ao log do dia. */
export async function POST(request: Request) {
  let body: { texto?: string; data?: string; hora?: string };

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

  try {
    const nota = await registrarLog(body.texto, {
      data: body.data,
      hora: body.hora,
    });
    return NextResponse.json(nota, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
