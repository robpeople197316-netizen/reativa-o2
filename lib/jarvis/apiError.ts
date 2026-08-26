import "server-only";

import { NextResponse } from "next/server";

import { VaultPathError } from "@/lib/jarvis/obsidian/vault";

/**
 * Erro -> resposta HTTP.
 *
 * Um caminho fora do cofre é entrada inválida (400), não falha interna: o
 * cliente precisa saber que o pedido é que está errado.
 */
export function errorResponse(err: unknown) {
  if (err instanceof VaultPathError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  return NextResponse.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}
