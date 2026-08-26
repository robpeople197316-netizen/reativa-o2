import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type { Onda2Campaign, Onda2Contact } from "@/lib/campaign/onda2";

/** Formato cru dos contatos dentro do ONDA2_app.html. */
interface RawContact {
  l: number;
  n: string;
  p: string;
  f: string;
}

const SOURCE_FILE = "ONDA2_app.html";

/**
 * Recorta um literal JSON do script do HTML.
 *
 * O app original declara os dados como `var X=<json>;`, então basta achar o
 * início e o fechamento correspondente — nenhum dos blocos contém o
 * terminador dentro de si.
 */
function extractLiteral(html: string, declaration: string, close: string) {
  const start = html.indexOf(declaration);
  if (start === -1) {
    throw new Error(`${SOURCE_FILE}: declaração "${declaration}" não encontrada`);
  }

  const from = start + declaration.length - 1;
  const end = html.indexOf(close, from);
  if (end === -1) {
    throw new Error(`${SOURCE_FILE}: "${declaration}" não foi fechada`);
  }

  return html.slice(from, end + 1);
}

/**
 * Lê a campanha direto do ONDA2_app.html.
 *
 * O HTML continua sendo a fonte da verdade: editar a base lá dentro atualiza
 * o nó MARKETING no próximo build, sem passo de geração de código.
 */
async function parseCampaign(): Promise<Onda2Campaign> {
  const file = path.join(process.cwd(), SOURCE_FILE);
  const html = await readFile(file, "utf8");

  const raw = JSON.parse(extractLiteral(html, "var D=[", "];")) as RawContact[];
  const preset = JSON.parse(
    extractLiteral(html, "var PRESET={", "};"),
  ) as Record<string, number>;

  // O template é um literal de string com escapes — JSON dá conta dele.
  const templateMatch = html.match(/var TMPL=("(?:[^"\\]|\\.)*");/);
  if (!templateMatch) {
    throw new Error(`${SOURCE_FILE}: template da mensagem não encontrado`);
  }
  const template = JSON.parse(templateMatch[1]) as string;

  // O teto diário vive no texto de instrução do app.
  const limitMatch = html.match(/Máx\.\s*(\d+)\s*\/\s*dia/i);
  const dailyLimit = limitMatch ? Number(limitMatch[1]) : 50;

  const contacts: Onda2Contact[] = raw.map((c, index) => ({
    index,
    lot: c.l,
    name: c.n,
    firstName: c.p,
    phone: c.f,
  }));

  const presetSent = Object.keys(preset)
    .map(Number)
    .filter((i) => Number.isInteger(i) && i >= 0 && i < contacts.length)
    .sort((a, b) => a - b);

  const lots = [...new Set(contacts.map((c) => c.lot))].sort((a, b) => a - b);

  return {
    contacts,
    template,
    presetSent,
    lots,
    dailyLimit,
    total: contacts.length,
  };
}

/** Memoizado por request — o arquivo é lido uma vez por render. */
export const loadOnda2Campaign = cache(parseCampaign);

/** Números que o header do módulo MARKETING mostra antes de hidratar. */
export async function loadOnda2Summary() {
  const campaign = await loadOnda2Campaign();

  return {
    total: campaign.total,
    lots: campaign.lots.length,
    presetSent: campaign.presetSent.length,
    dailyLimit: campaign.dailyLimit,
  };
}
