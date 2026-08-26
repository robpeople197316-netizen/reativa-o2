import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import {
  dividirComissao,
  margemProduto,
  ticketMedio,
} from "@/lib/jarvis/finance/calc";
import {
  searchClientes,
  upsertCliente,
} from "@/lib/jarvis/obsidian/clientes";
import {
  criarLembrete,
  listarLembretes,
  registrarLog,
} from "@/lib/jarvis/obsidian/diario";
import {
  getDiaFinanceiro,
  registrarLancamento,
  resumoPeriodo,
} from "@/lib/jarvis/obsidian/financeiro";

/**
 * Ferramentas do Jarvis.
 *
 * Cada uma é uma ponte para um módulo já testado — o cérebro não fala com o
 * disco nem com os cálculos diretamente. `strict: true` garante que a entrada
 * chega exatamente no formato declarado.
 */
export const JARVIS_TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_cliente",
    description:
      "Busca fichas de clientes no cofre Obsidian por nome, telefone, tag " +
      "(ex.: loira, progressiva) ou texto do prontuário. Use antes de qualquer " +
      "procedimento químico para conferir alertas e histórico.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: {
          type: "string",
          description: "Nome, telefone ou tag. Vazio lista todos.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "salvar_cliente",
    description:
      "Cria ou atualiza a ficha de um cliente. É aditivo: tags, preferências e " +
      "histórico se somam ao que já existe, nada é apagado.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        nome: { type: "string" },
        telefone: { type: ["string", "null"] },
        tags: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Sem '#': loira, progressiva, preferencia_cafe.",
        },
        alertas: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Riscos químicos: henna, alergia_amonia, progressiva_recente.",
        },
        preferencias: { type: ["array", "null"], items: { type: "string" } },
        anotacao: { type: ["string", "null"] },
        quimica: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            data: { type: "string", description: "AAAA-MM-DD" },
            procedimento: { type: "string" },
            formula: { type: ["string", "null"] },
            observacao: { type: ["string", "null"] },
          },
          required: ["data", "procedimento", "formula", "observacao"],
        },
      },
      required: [
        "nome",
        "telefone",
        "tags",
        "alertas",
        "preferencias",
        "anotacao",
        "quimica",
      ],
    },
  },
  {
    name: "registrar_financeiro",
    description:
      "Lança uma entrada, saída ou comissão no livro-caixa do dia, dentro do " +
      "cofre Obsidian.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        tipo: { type: "string", enum: ["entrada", "saida", "comissao"] },
        valor: { type: "number", description: "Sempre positivo, em reais." },
        descricao: { type: "string" },
        profissional: { type: ["string", "null"] },
        categoria: { type: ["string", "null"] },
      },
      required: ["tipo", "valor", "descricao", "profissional", "categoria"],
    },
  },
  {
    name: "consultar_financeiro",
    description:
      "Lê o caixa: o dia de hoje ou o consolidado dos últimos N dias " +
      "(entradas, saídas, comissões, saldo e ticket médio).",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        escopo: { type: "string", enum: ["hoje", "periodo"] },
        dias: { type: ["integer", "null"], description: "Só para escopo periodo." },
      },
      required: ["escopo", "dias"],
    },
  },
  {
    name: "calcular",
    description:
      "Calculadora do salão: ticket médio, divisão de comissão entre " +
      "profissional e salão, e custo/margem de produto por grama ou ml.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        operacao: {
          type: "string",
          enum: ["ticket_medio", "comissao", "margem_produto"],
        },
        faturamento: { type: ["number", "null"] },
        atendimentos: { type: ["integer", "null"] },
        valorServico: { type: ["number", "null"] },
        percentualProfissional: { type: ["number", "null"] },
        custoProduto: { type: ["number", "null"] },
        descontarCustoAntes: { type: ["boolean", "null"] },
        custoEmbalagem: { type: ["number", "null"] },
        quantidadeEmbalagem: { type: ["number", "null"] },
        quantidadeUsada: { type: ["number", "null"] },
        precoServico: { type: ["number", "null"] },
        unidade: { type: ["string", "null"], enum: ["g", "ml", "un", null] },
      },
      required: ["operacao"],
    },
  },
  {
    name: "registrar_diario",
    description:
      "Escreve uma linha no log de atendimento do dia (cofre /Diario).",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { texto: { type: "string" } },
      required: ["texto"],
    },
  },
  {
    name: "criar_lembrete",
    description:
      "Cria um lembrete. Com horário, o HUD avisa em voz alta quando vencer.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        texto: { type: "string" },
        quando: {
          type: ["string", "null"],
          description: "ISO 8601 completo, ex.: 2026-08-26T14:30:00-03:00.",
        },
      },
      required: ["texto", "quando"],
    },
  },
  {
    name: "listar_lembretes",
    description: "Lista os lembretes de hoje, pendentes e concluídos.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
      required: [],
    },
  },
];

type ToolInput = Record<string, unknown>;

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const list = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;

/**
 * Executa uma ferramenta e devolve texto para o modelo.
 *
 * O retorno é texto legível, não JSON cru: o modelo lê melhor e a resposta
 * falada sai mais natural.
 */
export async function runTool(
  name: string,
  input: ToolInput,
): Promise<string> {
  switch (name) {
    case "buscar_cliente": {
      const fichas = await searchClientes(str(input.query) ?? "");
      if (!fichas.length) return "Nenhum cliente encontrado.";

      return fichas
        .slice(0, 8)
        .map((f) => {
          const tags = f.data.tags?.length ? ` · tags: ${f.data.tags.join(", ")}` : "";
          const alertas = f.data.alertas?.length
            ? ` · ALERTAS: ${f.data.alertas.join(", ")}`
            : "";
          return `${f.data.nome}${f.data.telefone ? ` (${f.data.telefone})` : ""}${tags}${alertas}\n${f.content.slice(0, 600)}`;
        })
        .join("\n\n---\n\n");
    }

    case "salvar_cliente": {
      const quimicaRaw = input.quimica as ToolInput | null | undefined;
      const ficha = await upsertCliente({
        nome: str(input.nome) ?? "",
        telefone: str(input.telefone),
        tags: list(input.tags),
        alertas: list(input.alertas),
        preferencias: list(input.preferencias),
        anotacao: str(input.anotacao),
        quimica: quimicaRaw
          ? {
              data: str(quimicaRaw.data) ?? new Date().toISOString().slice(0, 10),
              procedimento: str(quimicaRaw.procedimento) ?? "procedimento",
              formula: str(quimicaRaw.formula),
              observacao: str(quimicaRaw.observacao),
            }
          : undefined,
      });

      return `Ficha salva em ${ficha.relPath} · tags: ${ficha.data.tags.join(", ") || "nenhuma"}`;
    }

    case "registrar_financeiro": {
      const nota = await registrarLancamento({
        tipo: (str(input.tipo) ?? "entrada") as "entrada" | "saida" | "comissao",
        valor: num(input.valor) ?? 0,
        descricao: str(input.descricao) ?? "sem descrição",
        profissional: str(input.profissional),
        categoria: str(input.categoria),
      });

      const d = nota.data;
      return `Lançado. Dia ${d.data}: entradas ${d.entradas}, saídas ${d.saidas}, comissões ${d.comissoes}, saldo ${d.saldo}, ${d.atendimentos} atendimentos.`;
    }

    case "consultar_financeiro": {
      if (str(input.escopo) === "periodo") {
        const r = await resumoPeriodo(num(input.dias) ?? 30);
        return r.dias ? r.formatado : "Nenhum dia registrado no período.";
      }

      const hoje = await getDiaFinanceiro();
      if (!hoje) return "Nenhum lançamento hoje ainda.";

      const d = hoje.data;
      return `Hoje: entradas ${d.entradas}, saídas ${d.saidas}, comissões ${d.comissoes}, saldo ${d.saldo}, ${d.atendimentos} atendimentos.`;
    }

    case "calcular": {
      const op = str(input.operacao);

      if (op === "ticket_medio") {
        return ticketMedio({
          faturamento: num(input.faturamento) ?? 0,
          atendimentos: num(input.atendimentos) ?? 0,
        }).formatado;
      }

      if (op === "comissao") {
        return dividirComissao({
          valorServico: num(input.valorServico) ?? 0,
          percentualProfissional: num(input.percentualProfissional) ?? 0,
          custoProduto: num(input.custoProduto),
          descontarCustoAntes: input.descontarCustoAntes === true,
        }).formatado;
      }

      return margemProduto({
        custoEmbalagem: num(input.custoEmbalagem) ?? 0,
        quantidadeEmbalagem: num(input.quantidadeEmbalagem) ?? 0,
        quantidadeUsada: num(input.quantidadeUsada) ?? 0,
        precoServico: num(input.precoServico),
        unidade: (str(input.unidade) ?? "g") as "g" | "ml" | "un",
      }).formatado;
    }

    case "registrar_diario": {
      const nota = await registrarLog(str(input.texto) ?? "");
      return `Registrado no diário (${nota.relPath}).`;
    }

    case "criar_lembrete": {
      const lembrete = await criarLembrete({
        texto: str(input.texto) ?? "",
        quando: str(input.quando),
      });
      return lembrete.quando
        ? `Lembrete criado para ${new Date(lembrete.quando).toLocaleString("pt-BR")}.`
        : "Lembrete criado sem horário.";
    }

    case "listar_lembretes": {
      const lembretes = await listarLembretes();
      if (!lembretes.length) return "Nenhum lembrete para hoje.";

      return lembretes
        .map(
          (l) =>
            `${l.feito ? "[x]" : "[ ]"} ${l.texto}${l.quando ? ` (${new Date(l.quando).toLocaleTimeString("pt-BR")})` : ""}`,
        )
        .join("\n");
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}
