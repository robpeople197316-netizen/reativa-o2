import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/jarvis/apiError";

import {
  getDiaFinanceiro,
  registrarLancamento,
  resumoPeriodo,
  type TipoLancamento,
} from "@/lib/jarvis/obsidian/financeiro";

export const dynamic = "force-dynamic";

const TIPOS: TipoLancamento[] = ["entrada", "saida", "comissao"];

/** GET ?data=2026-08-26 (um dia) | ?dias=30 (consolidado) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    if (searchParams.has("dias")) {
      const dias = Number(searchParams.get("dias"));
      return NextResponse.json(
        await resumoPeriodo(Number.isFinite(dias) ? dias : 30),
      );
    }

    const data = searchParams.get("data") ?? undefined;
    const dia = await getDiaFinanceiro(data);

    if (!dia) {
      return NextResponse.json(
        { error: "Nenhum lançamento nesta data.", data: data ?? "hoje" },
        { status: 404 },
      );
    }

    return NextResponse.json(dia);
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST — lança entrada, saída ou comissão. */
export async function POST(request: Request) {
  let body: {
    tipo?: string;
    valor?: number;
    descricao?: string;
    profissional?: string;
    categoria?: string;
    data?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!TIPOS.includes(body.tipo as TipoLancamento)) {
    return NextResponse.json(
      { error: `Campo 'tipo' deve ser um de: ${TIPOS.join(", ")}.` },
      { status: 400 },
    );
  }

  if (typeof body.valor !== "number" || !Number.isFinite(body.valor)) {
    return NextResponse.json(
      { error: "Campo 'valor' deve ser um número." },
      { status: 400 },
    );
  }

  try {
    const nota = await registrarLancamento({
      tipo: body.tipo as TipoLancamento,
      valor: Math.abs(body.valor),
      descricao: body.descricao ?? "sem descrição",
      profissional: body.profissional,
      categoria: body.categoria,
      data: body.data,
    });

    return NextResponse.json(nota, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
