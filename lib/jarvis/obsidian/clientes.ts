import "server-only";

import {
  VAULT_FOLDERS,
  type VaultNote,
  ensureVault,
  isoDate,
  listNotes,
  readNote,
  slugify,
  writeNote,
} from "@/lib/jarvis/obsidian/vault";

/** Frontmatter da ficha de cliente. */
export interface ClienteData {
  tipo: "cliente";
  nome: string;
  telefone?: string;
  /** Tags do Obsidian sem "#": ["loira", "progressiva", "preferencia_cafe"]. */
  tags: string[];
  criado_em: string;
  atualizado_em: string;
  ultimo_atendimento?: string;
  /** Alertas de segurança química, ex.: "henna", "alergia_amonia". */
  alertas?: string[];
}

export interface RegistroQuimico {
  data: string;
  procedimento: string;
  formula?: string;
  observacao?: string;
}

export type FichaCliente = VaultNote<ClienteData>;

function notePath(nome: string): string {
  return `${VAULT_FOLDERS.clientes}/${slugify(nome)}.md`;
}

/**
 * Normaliza tags: sem "#", minúsculas, sem espaço.
 * "#Loira" e "Loira" viram "loira" — Obsidian trata as duas como a mesma tag.
 */
function normalizeTags(tags: string[] = []): string[] {
  const clean = tags
    .map((t) => t.trim().replace(/^#/, "").toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
  return [...new Set(clean)];
}

/** Corpo inicial de uma ficha nova. */
function initialBody(nome: string): string {
  return [
    `# ${nome}`,
    "",
    "## Preferências",
    "",
    "## Histórico Químico",
    "",
    "## Anotações",
    "",
  ].join("\n");
}

/**
 * Insere uma linha sob um cabeçalho `## X`, criando a seção se faltar.
 * Preserva o resto do arquivo — o cabeleireiro pode editar a ficha no Obsidian
 * e o Jarvis não vai atropelar o que ele escreveu.
 */
function appendUnderHeading(
  body: string,
  heading: string,
  line: string,
): string {
  const marker = `## ${heading}`;
  const index = body.indexOf(marker);

  if (index === -1) {
    return `${body.trim()}\n\n${marker}\n\n${line}\n`;
  }

  const after = index + marker.length;
  const nextHeading = body.indexOf("\n## ", after);
  const end = nextHeading === -1 ? body.length : nextHeading;

  const section = body.slice(after, end).replace(/\s+$/, "");
  return `${body.slice(0, after)}${section}\n${line}\n${body.slice(end)}`;
}

export async function getCliente(nome: string): Promise<FichaCliente | null> {
  await ensureVault();
  return readNote<ClienteData>(notePath(nome));
}

export async function listClientes(): Promise<FichaCliente[]> {
  const notes = await listNotes<ClienteData>(VAULT_FOLDERS.clientes);
  return notes.sort((a, b) =>
    (a.data.nome ?? "").localeCompare(b.data.nome ?? "", "pt-BR"),
  );
}

/** Busca por nome, telefone ou tag. */
export async function searchClientes(query: string): Promise<FichaCliente[]> {
  const term = query.trim().toLowerCase().replace(/^#/, "");
  if (!term) return listClientes();

  const all = await listClientes();
  return all.filter(
    (c) =>
      c.data.nome?.toLowerCase().includes(term) ||
      c.data.telefone?.includes(term) ||
      (c.data.tags ?? []).some((t) => t.includes(term)) ||
      c.content.toLowerCase().includes(term),
  );
}

export interface UpsertClienteInput {
  nome: string;
  telefone?: string;
  /** Tags acrescentadas às existentes — nunca substituem a lista inteira. */
  tags?: string[];
  alertas?: string[];
  preferencias?: string[];
  anotacao?: string;
  quimica?: RegistroQuimico;
}

/**
 * Cria ou atualiza a ficha do cliente.
 *
 * É aditivo de propósito: tags, preferências e histórico se somam ao que já
 * existe. Uma conversa de voz nunca deve apagar o prontuário por engano.
 */
export async function upsertCliente(
  input: UpsertClienteInput,
): Promise<FichaCliente> {
  await ensureVault();

  const relPath = notePath(input.nome);
  const existing = await readNote<ClienteData>(relPath);
  const hoje = isoDate();

  const data: ClienteData = {
    tipo: "cliente",
    nome: existing?.data.nome ?? input.nome,
    telefone: input.telefone ?? existing?.data.telefone,
    tags: normalizeTags([...(existing?.data.tags ?? []), ...(input.tags ?? [])]),
    criado_em: existing?.data.criado_em ?? hoje,
    atualizado_em: hoje,
    ultimo_atendimento: input.quimica
      ? input.quimica.data
      : existing?.data.ultimo_atendimento,
    alertas: normalizeTags([
      ...(existing?.data.alertas ?? []),
      ...(input.alertas ?? []),
    ]),
  };

  if (!data.alertas?.length) delete data.alertas;
  if (!data.telefone) delete data.telefone;
  if (!data.ultimo_atendimento) delete data.ultimo_atendimento;

  let body = existing?.content ?? initialBody(input.nome);

  for (const pref of input.preferencias ?? []) {
    body = appendUnderHeading(body, "Preferências", `- ${pref}`);
  }

  if (input.quimica) {
    const q = input.quimica;
    const parts = [`- **${q.data}** · ${q.procedimento}`];
    if (q.formula) parts.push(`fórmula: \`${q.formula}\``);
    if (q.observacao) parts.push(q.observacao);
    body = appendUnderHeading(body, "Histórico Químico", parts.join(" · "));
  }

  if (input.anotacao) {
    body = appendUnderHeading(
      body,
      "Anotações",
      `- **${hoje}** · ${input.anotacao}`,
    );
  }

  // As tags também vão para o corpo: é assim que o grafo do Obsidian as vê.
  const tagLine = data.tags.map((t) => `#${t}`).join(" ");
  body = body.replace(/\n?_tags:.*$/m, "").trimEnd();
  if (tagLine) body += `\n\n_tags: ${tagLine}_`;

  return writeNote(relPath, data, body);
}
