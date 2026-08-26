/**
 * Motor de cálculo do salão.
 *
 * Funções puras, sem I/O: o cérebro chama por ferramenta, as rotas expõem por
 * HTTP e ambos recebem o mesmo resultado. Todo dinheiro é arredondado a 2 casas
 * só na saída — as contas intermediárias ficam em ponto flutuante cheio.
 */

const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export interface TicketMedioInput {
  faturamento: number;
  atendimentos: number;
}

export interface TicketMedioResult {
  ticketMedio: number;
  faturamento: number;
  atendimentos: number;
  formatado: string;
}

export function ticketMedio({
  faturamento,
  atendimentos,
}: TicketMedioInput): TicketMedioResult {
  if (atendimentos <= 0) {
    throw new Error("atendimentos precisa ser maior que zero");
  }

  const valor = round(faturamento / atendimentos);
  return {
    ticketMedio: valor,
    faturamento: round(faturamento),
    atendimentos,
    formatado: `${brl(valor)} por atendimento (${atendimentos} atendimentos, ${brl(
      faturamento,
    )})`,
  };
}

export interface ComissaoInput {
  valorServico: number;
  /** Percentual do profissional. Ex.: 40 = 40%. */
  percentualProfissional: number;
  /**
   * Custo de produto gasto no serviço. Quando `descontarCustoAntes` é true,
   * sai do bolo antes da divisão — prática comum em química.
   */
  custoProduto?: number;
  descontarCustoAntes?: boolean;
}

export interface ComissaoResult {
  base: number;
  profissional: number;
  salao: number;
  custoProduto: number;
  percentualProfissional: number;
  formatado: string;
}

export function dividirComissao({
  valorServico,
  percentualProfissional,
  custoProduto = 0,
  descontarCustoAntes = false,
}: ComissaoInput): ComissaoResult {
  if (percentualProfissional < 0 || percentualProfissional > 100) {
    throw new Error("percentualProfissional precisa estar entre 0 e 100");
  }

  const base = descontarCustoAntes
    ? Math.max(0, valorServico - custoProduto)
    : valorServico;

  const profissional = round(base * (percentualProfissional / 100));

  // O produto sai do caixa do salão nos dois modos — o que `descontarCustoAntes`
  // muda é só a BASE do profissional, ou seja, quem sente o custo na comissão.
  const salao = round(valorServico - profissional - custoProduto);

  return {
    base: round(base),
    profissional,
    salao,
    custoProduto: round(custoProduto),
    percentualProfissional,
    formatado: `${brl(profissional)} para o profissional (${percentualProfissional}% de ${brl(
      base,
    )}) e ${brl(salao)} para o salão${custoProduto ? `, já descontado ${brl(custoProduto)} de produto` : ""}`,
  };
}

export interface MargemProdutoInput {
  /** Preço pago na embalagem inteira. */
  custoEmbalagem: number;
  /** Conteúdo da embalagem na unidade de uso (g, ml). */
  quantidadeEmbalagem: number;
  /** Quanto foi usado no serviço, na mesma unidade. */
  quantidadeUsada: number;
  /** Preço cobrado do cliente pelo serviço. */
  precoServico?: number;
  unidade?: "g" | "ml" | "un";
}

export interface MargemProdutoResult {
  custoUnitario: number;
  custoAplicado: number;
  margem?: number;
  margemPercentual?: number;
  unidade: string;
  formatado: string;
}

/**
 * Custo por grama/ml e margem do serviço.
 *
 * Ex.: pó descolorante de 500 g por R$ 89 → R$ 0,178/g. Usou 60 g num serviço
 * de R$ 180 → custo de R$ 10,68 e margem de 94%.
 */
export function margemProduto({
  custoEmbalagem,
  quantidadeEmbalagem,
  quantidadeUsada,
  precoServico,
  unidade = "g",
}: MargemProdutoInput): MargemProdutoResult {
  if (quantidadeEmbalagem <= 0) {
    throw new Error("quantidadeEmbalagem precisa ser maior que zero");
  }

  const custoUnitario = custoEmbalagem / quantidadeEmbalagem;
  const custoAplicado = round(custoUnitario * quantidadeUsada);

  const base: MargemProdutoResult = {
    // 4 casas: a R$/g costuma ser fração de centavo e arredondar cedo distorce.
    custoUnitario: Math.round(custoUnitario * 10000) / 10000,
    custoAplicado,
    unidade,
    formatado: "",
  };

  if (precoServico === undefined) {
    base.formatado = `${brl(base.custoUnitario)}/${unidade} · ${quantidadeUsada}${unidade} custam ${brl(
      custoAplicado,
    )}`;
    return base;
  }

  const margem = round(precoServico - custoAplicado);
  const margemPercentual = precoServico
    ? round((margem / precoServico) * 100)
    : 0;

  return {
    ...base,
    margem,
    margemPercentual,
    formatado: `${brl(base.custoUnitario)}/${unidade} · ${quantidadeUsada}${unidade} custam ${brl(
      custoAplicado,
    )} · margem de ${brl(margem)} (${margemPercentual}%) sobre ${brl(precoServico)}`,
  };
}
