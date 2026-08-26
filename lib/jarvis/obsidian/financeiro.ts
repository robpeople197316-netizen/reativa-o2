import "server-only";

import {
  VAULT_FOLDERS,
  type VaultNote,
  ensureVault,
  isoDate,
  listNotes,
  localTime,
  readNote,
  writeNote,
} from "@/lib/jarvis/obsidian/vault";

export type TipoLancamento = "entrada" | "saida" | "comissao";

export interface Lancamento {
  tipo: TipoLancamento;
  valor: number;
  descricao: string;
  /** Profissional responsável — usado no fechamento de comissões. */
  profissional?: string;
  /** Serviço ou categoria, ex.: "coloração", "produto", "aluguel". */
  categoria?: string;
  hora: string;
}

export interface DiaFinanceiroData {
  tipo: "financeiro";
  data: string;
  entradas: number;
  saidas: number;
  comissoes: number;
  saldo: number;
  atendimentos: number;
}

export type NotaFinanceira = VaultNote<DiaFinanceiroData>;

function notePath(data: string): string {
  return `${VAULT_FOLDERS.financeiro}/${data}.md`;
}

/** Formata em BRL — o cofre é lido por humanos, não por máquinas. */
function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function initialBody(data: string): string {
  return [`# Financeiro · ${data}`, "", "## Lançamentos", ""].join("\n");
}

/**
 * Reconta os totais a partir das linhas do arquivo.
 *
 * Recalcular em vez de somar incrementalmente mantém o frontmatter honesto
 * mesmo se alguém editar ou apagar uma linha direto no Obsidian.
 */
function recalc(body: string): Omit<DiaFinanceiroData, "tipo" | "data"> {
  const linha = /^- \*\*(\d{2}:\d{2})\*\* · (entrada|saida|comissao) · (-?[\d.,]+) ·/gm;
  let entradas = 0;
  let saidas = 0;
  let comissoes = 0;
  let atendimentos = 0;

  for (const match of body.matchAll(linha)) {
    const tipo = match[2] as TipoLancamento;
    const valor = Number(match[3].replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valor)) continue;

    if (tipo === "entrada") {
      entradas += valor;
      atendimentos += 1;
    } else if (tipo === "saida") {
      saidas += valor;
    } else {
      comissoes += valor;
    }
  }

  return {
    entradas: Number(entradas.toFixed(2)),
    saidas: Number(saidas.toFixed(2)),
    comissoes: Number(comissoes.toFixed(2)),
    saldo: Number((entradas - saidas - comissoes).toFixed(2)),
    atendimentos,
  };
}

/** Registra um lançamento no arquivo do dia, criando-o se for o primeiro. */
export async function registrarLancamento(
  input: Omit<Lancamento, "hora"> & { data?: string; hora?: string },
): Promise<NotaFinanceira> {
  await ensureVault();

  const data = input.data ?? isoDate();
  const hora = input.hora ?? localTime();
  const relPath = notePath(data);
  const existing = await readNote<DiaFinanceiroData>(relPath);

  const valor = input.valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const extras = [
    input.descricao,
    input.profissional ? `prof: ${input.profissional}` : null,
    input.categoria ? `cat: ${input.categoria}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const linha = `- **${hora}** · ${input.tipo} · ${valor} · ${extras}`;
  const body = existing
    ? `${existing.content.trimEnd()}\n${linha}`
    : `${initialBody(data)}\n${linha}`;

  return writeNote<DiaFinanceiroData>(
    relPath,
    { tipo: "financeiro", data, ...recalc(body) },
    body,
  );
}

export async function getDiaFinanceiro(
  data = isoDate(),
): Promise<NotaFinanceira | null> {
  await ensureVault();
  return readNote<DiaFinanceiroData>(notePath(data));
}

export interface ResumoPeriodo {
  dias: number;
  entradas: number;
  saidas: number;
  comissoes: number;
  saldo: number;
  atendimentos: number;
  ticketMedio: number;
  formatado: string;
}

/** Consolida os últimos N dias registrados no cofre. */
export async function resumoPeriodo(dias = 30): Promise<ResumoPeriodo> {
  const notes = await listNotes<DiaFinanceiroData>(VAULT_FOLDERS.financeiro);
  const corte = new Date();
  corte.setDate(corte.getDate() - dias);
  const limite = isoDate(corte);

  const periodo = notes.filter((n) => (n.data.data ?? "") >= limite);

  const total = periodo.reduce(
    (acc, n) => ({
      entradas: acc.entradas + (n.data.entradas ?? 0),
      saidas: acc.saidas + (n.data.saidas ?? 0),
      comissoes: acc.comissoes + (n.data.comissoes ?? 0),
      atendimentos: acc.atendimentos + (n.data.atendimentos ?? 0),
    }),
    { entradas: 0, saidas: 0, comissoes: 0, atendimentos: 0 },
  );

  const saldo = total.entradas - total.saidas - total.comissoes;
  const ticketMedio = total.atendimentos
    ? total.entradas / total.atendimentos
    : 0;

  return {
    dias: periodo.length,
    entradas: Number(total.entradas.toFixed(2)),
    saidas: Number(total.saidas.toFixed(2)),
    comissoes: Number(total.comissoes.toFixed(2)),
    saldo: Number(saldo.toFixed(2)),
    atendimentos: total.atendimentos,
    ticketMedio: Number(ticketMedio.toFixed(2)),
    formatado: `${periodo.length} dias · entradas ${brl(total.entradas)} · saídas ${brl(
      total.saidas,
    )} · comissões ${brl(total.comissoes)} · saldo ${brl(saldo)} · ticket médio ${brl(
      ticketMedio,
    )}`,
  };
}
