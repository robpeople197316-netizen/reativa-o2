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

export interface Lembrete {
  id: string;
  texto: string;
  /** ISO completo: 2026-08-26T14:30:00.000Z. Vazio = sem hora marcada. */
  quando?: string;
  feito: boolean;
  /** Já foi anunciado pelo HUD? Evita repetir o alarme a cada varredura. */
  disparado?: boolean;
}

export interface DiaData {
  tipo: "diario";
  data: string;
  lembretes: Lembrete[];
}

export type NotaDiario = VaultNote<DiaData>;

function notePath(data: string): string {
  return `${VAULT_FOLDERS.diario}/${data}.md`;
}

function initialBody(data: string): string {
  return [`# Diário · ${data}`, "", "## Log de atendimento", ""].join("\n");
}

async function loadDia(data: string): Promise<NotaDiario> {
  await ensureVault();
  const existing = await readNote<DiaData>(notePath(data));

  return (
    existing ?? {
      relPath: notePath(data),
      data: { tipo: "diario", data, lembretes: [] },
      content: initialBody(data),
    }
  );
}

/** Registra uma linha no log do dia. */
export async function registrarLog(
  texto: string,
  opts: { data?: string; hora?: string } = {},
): Promise<NotaDiario> {
  const data = opts.data ?? isoDate();
  const hora = opts.hora ?? localTime();
  const dia = await loadDia(data);

  const body = `${dia.content.trimEnd()}\n- **${hora}** · ${texto}`;
  return writeNote<DiaData>(dia.relPath, dia.data, body);
}

export async function getDia(data = isoDate()): Promise<NotaDiario | null> {
  await ensureVault();
  return readNote<DiaData>(notePath(data));
}

/**
 * Cria um lembrete.
 *
 * Fica no frontmatter da nota do dia — o Obsidian mostra, o HUD varre, e não
 * exige banco de dados nenhum.
 */
export async function criarLembrete(input: {
  texto: string;
  quando?: string;
  data?: string;
}): Promise<Lembrete> {
  const data = input.data ?? (input.quando ? input.quando.slice(0, 10) : isoDate());
  const dia = await loadDia(data);

  const lembrete: Lembrete = {
    id: `lm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    texto: input.texto,
    quando: input.quando,
    feito: false,
    disparado: false,
  };

  const lembretes = [...(dia.data.lembretes ?? []), lembrete];
  const linha = input.quando
    ? `- [ ] ${input.texto} (${new Date(input.quando).toLocaleString("pt-BR")})`
    : `- [ ] ${input.texto}`;

  const body = appendUnderHeading(dia.content, "Lembretes", linha);
  await writeNote<DiaData>(dia.relPath, { ...dia.data, lembretes }, body);

  return lembrete;
}

export async function listarLembretes(data = isoDate()): Promise<Lembrete[]> {
  const dia = await getDia(data);
  return dia?.data.lembretes ?? [];
}

/**
 * Lembretes cujo horário já chegou e que ainda não foram anunciados.
 *
 * Este é o gatilho automático: o HUD chama periodicamente e, quando algo vence,
 * o Jarvis fala. Marcar como disparado aqui garante que ele fale uma vez só.
 */
export async function lembretesVencidos(
  agora = new Date(),
): Promise<Lembrete[]> {
  const data = isoDate(agora);
  const dia = await getDia(data);
  if (!dia) return [];

  const lembretes = dia.data.lembretes ?? [];
  const vencidos = lembretes.filter(
    (l) => !l.feito && !l.disparado && l.quando && new Date(l.quando) <= agora,
  );

  if (!vencidos.length) return [];

  const ids = new Set(vencidos.map((l) => l.id));
  const atualizados = lembretes.map((l) =>
    ids.has(l.id) ? { ...l, disparado: true } : l,
  );

  await writeNote<DiaData>(
    dia.relPath,
    { ...dia.data, lembretes: atualizados },
    dia.content,
  );

  return vencidos;
}

export async function concluirLembrete(
  id: string,
  data = isoDate(),
): Promise<boolean> {
  const dia = await getDia(data);
  if (!dia) return false;

  const lembretes = dia.data.lembretes ?? [];
  const alvo = lembretes.find((l) => l.id === id);
  if (!alvo) return false;

  const atualizados = lembretes.map((l) =>
    l.id === id ? { ...l, feito: true } : l,
  );

  // Marca a caixinha no corpo também, para quem lê no Obsidian.
  const body = dia.content.replace(`- [ ] ${alvo.texto}`, `- [x] ${alvo.texto}`);

  await writeNote<DiaData>(
    dia.relPath,
    { ...dia.data, lembretes: atualizados },
    body,
  );
  return true;
}

/** Últimos dias com registro, do mais recente para o mais antigo. */
export async function ultimosDias(limite = 7): Promise<NotaDiario[]> {
  const notes = await listNotes<DiaData>(VAULT_FOLDERS.diario);
  return notes
    .sort((a, b) => (b.data.data ?? "").localeCompare(a.data.data ?? ""))
    .slice(0, limite);
}

function appendUnderHeading(body: string, heading: string, line: string): string {
  const marker = `## ${heading}`;
  const index = body.indexOf(marker);

  if (index === -1) return `${body.trimEnd()}\n\n${marker}\n\n${line}\n`;

  const after = index + marker.length;
  const next = body.indexOf("\n## ", after);
  const end = next === -1 ? body.length : next;
  const section = body.slice(after, end).replace(/\s+$/, "");

  return `${body.slice(0, after)}${section}\n${line}\n${body.slice(end)}`;
}
