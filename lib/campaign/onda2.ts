/**
 * Tipos da campanha Onda 2.
 *
 * Este arquivo é seguro no cliente — o parser que lê o HTML fica em
 * `onda2.server.ts` e nunca é importado por um componente de browser.
 */

export interface Onda2Contact {
  /** Índice na lista original. É a chave do progresso salvo — ver nota abaixo. */
  index: number;
  /** Lote ao qual o contato pertence. */
  lot: number;
  /** Nome completo como está na base. */
  name: string;
  /** Primeiro nome, usado para personalizar a mensagem. */
  firstName: string;
  /** Telefone em formato internacional, sem "+". */
  phone: string;
}

export interface Onda2Campaign {
  contacts: Onda2Contact[];
  /** Template do WhatsApp com o marcador {p} para o primeiro nome. */
  template: string;
  /** Índices já marcados como enviados na carga inicial do app original. */
  presetSent: number[];
  /** Lotes existentes, em ordem. */
  lots: number[];
  /** Teto diário de disparos declarado na campanha. */
  dailyLimit: number;
  total: number;
}

/** Chave de progresso — a mesma do ONDA2_app.html, de propósito. */
export const ONDA2_STORAGE_KEY = "onda2";

/** Evento interno: avisa a própria aba que o progresso mudou. */
export const ONDA2_CHANGE_EVENT = "onda2:change";

/**
 * O progresso é indexado pela POSIÇÃO do contato na lista original, herança do
 * app em HTML. Manter o mesmo esquema faz o progresso já salvo no navegador do
 * usuário continuar valendo aqui — mas significa que reordenar a base invalida
 * o histórico. Se um dia a base virar banco, migre a chave para o telefone.
 */
export function buildWhatsAppLink(contact: Onda2Contact, template: string) {
  const text = template.replace("{p}", contact.firstName || "tudo bem");
  return `https://wa.me/${contact.phone}?text=${encodeURIComponent(text)}`;
}
