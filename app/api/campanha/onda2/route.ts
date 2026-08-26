import { NextResponse } from "next/server";

import { loadOnda2Campaign } from "@/lib/campaign/onda2.server";

/**
 * Payload da campanha Onda 2.
 *
 * Fica fora do HTML inicial de propósito: são ~600 contatos, carregados só
 * quando o operador abre o módulo MARKETING. Como a base é um arquivo do
 * repositório, a rota é gerada no build.
 */
export const dynamic = "force-static";

export async function GET() {
  const campaign = await loadOnda2Campaign();
  return NextResponse.json(campaign);
}
