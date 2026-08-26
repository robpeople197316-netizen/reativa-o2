import { NextResponse } from "next/server";

import {
  dividirComissao,
  margemProduto,
  ticketMedio,
} from "@/lib/jarvis/finance/calc";

export const dynamic = "force-dynamic";

type Operacao = "ticket_medio" | "comissao" | "margem_produto";

/**
 * Calculadora do salão por HTTP.
 *
 * As mesmas funções que o cérebro chama por ferramenta — útil para o HUD e
 * para qualquer integração que só queira a conta, sem passar pelo modelo.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> & { operacao?: Operacao };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    switch (body.operacao) {
      case "ticket_medio":
        return NextResponse.json(
          ticketMedio({
            faturamento: Number(body.faturamento),
            atendimentos: Number(body.atendimentos),
          }),
        );

      case "comissao":
        return NextResponse.json(
          dividirComissao({
            valorServico: Number(body.valorServico),
            percentualProfissional: Number(body.percentualProfissional),
            custoProduto:
              body.custoProduto === undefined
                ? undefined
                : Number(body.custoProduto),
            descontarCustoAntes: body.descontarCustoAntes === true,
          }),
        );

      case "margem_produto":
        return NextResponse.json(
          margemProduto({
            custoEmbalagem: Number(body.custoEmbalagem),
            quantidadeEmbalagem: Number(body.quantidadeEmbalagem),
            quantidadeUsada: Number(body.quantidadeUsada),
            precoServico:
              body.precoServico === undefined
                ? undefined
                : Number(body.precoServico),
            unidade: (body.unidade as "g" | "ml" | "un") ?? "g",
          }),
        );

      default:
        return NextResponse.json(
          {
            error:
              "Campo 'operacao' deve ser: ticket_medio, comissao ou margem_produto.",
          },
          { status: 400 },
        );
    }
  } catch (err) {
    // Erros de validação das funções puras viram 400, não 500.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
