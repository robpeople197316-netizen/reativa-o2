import "server-only";

import { constants } from "node:fs";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { jarvisConfig } from "@/lib/jarvis/config";

/** Pastas que o Jarvis mantém dentro do cofre. */
export const VAULT_FOLDERS = {
  clientes: "Clientes",
  financeiro: "Financeiro",
  diario: "Diario",
} as const;

export type VaultFolder = (typeof VAULT_FOLDERS)[keyof typeof VAULT_FOLDERS];

export interface VaultNote<T = Record<string, unknown>> {
  /** Caminho relativo à raiz do cofre, ex.: "Clientes/marina-rocha.md". */
  relPath: string;
  /** Frontmatter YAML da nota. */
  data: T;
  /** Corpo em Markdown, sem o frontmatter. */
  content: string;
}

/** Tentativa de sair do cofre: é erro de quem chamou, não falha do servidor. */
export class VaultPathError extends Error {
  constructor(attempted: string) {
    super(`Caminho fora do cofre: ${attempted}`);
    this.name = "VaultPathError";
  }
}

/**
 * Resolve um caminho DENTRO do cofre.
 *
 * Toda escrita e leitura passa por aqui: sem isso, um nome de cliente com
 * "../" escreveria em qualquer lugar do disco do salão.
 */
export function resolveInVault(...segments: string[]): string {
  const root = path.resolve(jarvisConfig.vaultPath);
  const target = path.resolve(root, ...segments);

  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new VaultPathError(segments.join("/"));
  }

  return target;
}

/**
 * Transforma um texto livre em nome de arquivo seguro.
 * "Marina Rocha" -> "marina-rocha"
 */
export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (!slug) throw new VaultPathError(value);
  return slug;
}

/** Cria a estrutura de pastas do Jarvis se ainda não existir. */
export async function ensureVault(): Promise<string> {
  const root = path.resolve(jarvisConfig.vaultPath);
  await mkdir(root, { recursive: true });

  for (const folder of Object.values(VAULT_FOLDERS)) {
    await mkdir(resolveInVault(folder), { recursive: true });
  }

  return root;
}

export async function noteExists(relPath: string): Promise<boolean> {
  try {
    await access(resolveInVault(relPath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readNote<T = Record<string, unknown>>(
  relPath: string,
): Promise<VaultNote<T> | null> {
  try {
    const raw = await readFile(resolveInVault(relPath), "utf8");
    const parsed = matter(raw);
    return {
      relPath,
      data: parsed.data as T,
      content: parsed.content.trim(),
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Escreve a nota inteira, frontmatter + corpo. */
export async function writeNote<T extends object>(
  relPath: string,
  data: T,
  content: string,
): Promise<VaultNote<T>> {
  const target = resolveInVault(relPath);
  await mkdir(path.dirname(target), { recursive: true });

  const body = matter.stringify(`${content.trim()}\n`, data as Record<string, unknown>);
  await writeFile(target, body, "utf8");

  return { relPath, data, content: content.trim() };
}

/**
 * Acrescenta uma linha ao fim da nota, criando-a se necessário.
 * É como o diário e o livro-caixa crescem ao longo do dia.
 */
export async function appendToNote(
  relPath: string,
  line: string,
  initial?: { data: Record<string, unknown>; heading: string },
): Promise<VaultNote> {
  const existing = await readNote(relPath);

  if (!existing) {
    const data: Record<string, unknown> = initial?.data ?? {};
    const heading = initial?.heading ?? "";
    return writeNote(relPath, data, `${heading}\n\n${line}`.trim());
  }

  return writeNote(
    relPath,
    existing.data as Record<string, unknown>,
    `${existing.content}\n${line}`,
  );
}

/** Lista as notas de uma pasta, já com frontmatter parseado. */
export async function listNotes<T = Record<string, unknown>>(
  folder: VaultFolder,
): Promise<VaultNote<T>[]> {
  await ensureVault();

  const dir = resolveInVault(folder);
  const entries = await readdir(dir, { withFileTypes: true });
  const notes: VaultNote<T>[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const note = await readNote<T>(path.posix.join(folder, entry.name));
    if (note) notes.push(note);
  }

  return notes;
}

/** Data no formato usado nos nomes de arquivo e no frontmatter: 2026-08-26. */
export function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Hora local curta para as linhas do diário: "14:35". */
export function localTime(date = new Date()): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
