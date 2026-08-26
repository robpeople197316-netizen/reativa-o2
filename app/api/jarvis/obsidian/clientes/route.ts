import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/jarvis/apiError";

import {
  getCliente,
  searchClientes,
  upsertCliente,
  type UpsertClienteInput,
} from "@/lib/jarvis/obsidian/clientes";

export const dynamic = "force-dynamic";

/** GET /api/jarvis/obsidian/clientes?q=loira | ?nome=Marina Rocha */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nome = searchParams.get("nome");

  try {
    if (nome) {
      const ficha = await getCliente(nome);
      if (!ficha) {
        return NextResponse.json(
          { error: `Ficha não encontrada: ${nome}` },
          { status: 404 },
        );
      }
      return NextResponse.json(ficha);
    }

    const fichas = await searchClientes(searchParams.get("q") ?? "");
    return NextResponse.json({ total: fichas.length, fichas });
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST — cria ou atualiza (aditivo). */
export async function POST(request: Request) {
  let body: UpsertClienteInput;
  try {
    body = (await request.json()) as UpsertClienteInput;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.nome?.trim()) {
    return NextResponse.json(
      { error: "Campo 'nome' é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const ficha = await upsertCliente(body);
    return NextResponse.json(ficha, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
