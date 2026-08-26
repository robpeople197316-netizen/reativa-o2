import {
  Boxes,
  CalendarClock,
  FlaskConical,
  Megaphone,
  Scissors,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ModuleId =
  | "clientes"
  | "financeiro"
  | "marketing"
  | "agendas"
  | "estoque"
  | "metas"
  | "quimico"
  | "visagismo";

export type ModuleStatus = "nominal" | "atencao" | "critico";

export interface ModuleMetric {
  label: string;
  value: string;
  /** Variação percentual — positiva/negativa colore o indicador. */
  delta?: number;
  /** 0–100, desenha a barra de progresso do painel. */
  gauge?: number;
}

export interface SalonModule {
  id: ModuleId;
  label: string;
  /** Descrição curta exibida no nó orbital e no cabeçalho do painel. */
  tagline: string;
  icon: LucideIcon;
  /** Cor de acento em RGB cru, usada em gradientes/sombras dinâmicas. */
  accent: string;
  status: ModuleStatus;
  /** Anel orbital: 0 = interno, 1 = externo. Distribui os nós em profundidade. */
  ring: 0 | 1;
  /**
   * Módulos com fonte de dados própria dispensam métricas estáticas: o painel
   * renderiza o console da fonte no lugar dos cartões.
   */
  live?: "onda2";
  metrics?: ModuleMetric[];
  feed?: string[];
}

export const STATUS_META: Record<
  ModuleStatus,
  { label: string; color: string; dot: string }
> = {
  nominal: { label: "NOMINAL", color: "text-acid", dot: "bg-acid" },
  atencao: { label: "ATENÇÃO", color: "text-ember", dot: "bg-ember" },
  critico: { label: "CRÍTICO", color: "text-rose", dot: "bg-rose" },
};

export const SALON_MODULES: SalonModule[] = [
  {
    id: "clientes",
    label: "CLIENTES",
    tagline: "Prontuário · Histórico · Preferências",
    icon: Users,
    accent: "79 227 255",
    status: "nominal",
    ring: 0,
    metrics: [
      { label: "Base ativa", value: "1.284", delta: 3.2 },
      { label: "Retorno 60d", value: "62%", delta: 4.1, gauge: 62 },
      { label: "Prontuários OK", value: "914", gauge: 71 },
      { label: "Aniversariantes", value: "17" },
    ],
    feed: [
      "Prontuário atualizado · Marina R. — alergia a amônia registrada",
      "Preferência salva · Júlia P. — café sem açúcar, cadeira 3",
      "38 clientes sem retorno há 90 dias · elegíveis p/ reativação",
    ],
  },
  {
    id: "financeiro",
    label: "FINANCEIRO",
    tagline: "Faturamento · Margem · Comissões · Caixa",
    icon: Wallet,
    accent: "124 255 155",
    status: "nominal",
    ring: 1,
    metrics: [
      { label: "Faturamento mês", value: "R$ 148,2k", delta: 8.4 },
      { label: "Margem líquida", value: "31%", delta: 1.6, gauge: 31 },
      { label: "Comissões a pagar", value: "R$ 34,7k" },
      { label: "Caixa projetado", value: "R$ 52,1k", delta: -2.3 },
    ],
    feed: [
      "Ticket médio subiu para R$ 187 (+R$ 12 vs. mês anterior)",
      "Coloração responde por 41% da margem bruta",
      "3 comandas em aberto há mais de 48h",
    ],
  },
  {
    id: "marketing",
    label: "MARKETING",
    tagline: "Campanhas WhatsApp · Retenção · Promos",
    icon: Megaphone,
    accent: "124 92 255",
    status: "atencao",
    ring: 0,
    // Base real: os contatos, o template e os lotes vêm do ONDA2_app.html.
    live: "onda2",
  },
  {
    id: "agendas",
    label: "AGENDAS",
    tagline: "Bancadas · Encaixes · Grade da equipe",
    icon: CalendarClock,
    accent: "31 208 245",
    status: "nominal",
    ring: 1,
    metrics: [
      { label: "Ocupação hoje", value: "87%", delta: 6.0, gauge: 87 },
      { label: "Bancadas livres", value: "2 / 9" },
      { label: "Encaixes possíveis", value: "5" },
      { label: "No-show 7d", value: "4%", delta: -1.2, gauge: 4 },
    ],
    feed: [
      "Janela ociosa · bancada 4 — 14h30 às 16h",
      "Sobrecarga detectada · Camila com 9 atendimentos seguidos",
      "2 clientes na lista de espera para sábado",
    ],
  },
  {
    id: "estoque",
    label: "ESTOQUE",
    tagline: "Previsão de uso · Alertas de falta",
    icon: Boxes,
    accent: "255 138 61",
    status: "critico",
    ring: 0,
    metrics: [
      { label: "SKUs monitorados", value: "142" },
      { label: "Ruptura prevista", value: "6 SKUs", gauge: 84 },
      { label: "Giro médio", value: "23 dias" },
      { label: "Capital parado", value: "R$ 18,3k", delta: -4.4 },
    ],
    feed: [
      "CRÍTICO · Pó descolorante — cobertura de 4 dias no ritmo atual",
      "OX 20vol abaixo do ponto de pedido (12 un.)",
      "Consumo de matizador 60% acima do previsto nesta semana",
    ],
  },
  {
    id: "metas",
    label: "METAS",
    tagline: "Desempenho da equipe · Faturamento diário",
    icon: Target,
    accent: "232 200 116",
    status: "atencao",
    ring: 1,
    metrics: [
      { label: "Meta do mês", value: "74%", delta: 2.8, gauge: 74 },
      { label: "Meta do dia", value: "R$ 4,8k / 6,0k", gauge: 80 },
      { label: "Top performer", value: "Camila" },
      { label: "Ritmo necessário", value: "R$ 6,4k/dia" },
    ],
    feed: [
      "Faltam R$ 38,6k para bater a meta mensal — 8 dias úteis",
      "Camila 118% da meta individual · Rafa 71%",
      "Serviço com maior gap: tratamento capilar (-22%)",
    ],
  },
  {
    id: "quimico",
    label: "HISTÓRICO QUÍMICO",
    tagline: "Fórmulas · Compatibilidade · Segurança",
    icon: FlaskConical,
    accent: "255 92 138",
    status: "atencao",
    ring: 0,
    metrics: [
      { label: "Fórmulas salvas", value: "2.104" },
      { label: "Alertas de risco", value: "3", gauge: 30 },
      { label: "Teste de mecha", value: "12 pendentes" },
      { label: "Reincidência OK", value: "96%", gauge: 96 },
    ],
    feed: [
      "ALERTA · Bruna S. — progressiva há 21 dias, evitar descoloração",
      "Fórmula 8.1 + 10vol registrada para Marina R. (3ª repetição)",
      "Histórico de henna detectado · Patrícia L. — bloquear química",
    ],
  },
  {
    id: "visagismo",
    label: "VISAGISMO",
    tagline: "Formato de rosto · Colorimetria · Proposta",
    icon: Scissors,
    accent: "143 240 255",
    status: "nominal",
    ring: 1,
    metrics: [
      { label: "Análises no mês", value: "58", delta: 19.0 },
      { label: "Conversão em serviço", value: "73%", delta: 6.3, gauge: 73 },
      { label: "Ticket pós-análise", value: "R$ 264", delta: 12.1 },
      { label: "Fila de estudo", value: "9" },
    ],
    feed: [
      "Proposta gerada · rosto oval + subtom frio → loiro pérola",
      "Simulação enviada por WhatsApp para 4 clientes",
      "Tendência local: franja cortina em alta (+31% de pedidos)",
    ],
  },
];

export const MODULES_BY_ID = Object.fromEntries(
  SALON_MODULES.map((m) => [m.id, m]),
) as Record<ModuleId, SalonModule>;
