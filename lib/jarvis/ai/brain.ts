import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { jarvisConfig } from "@/lib/jarvis/config";
import { JARVIS_TOOLS, runTool } from "@/lib/jarvis/ai/tools";

/** Opus 5 — a escolha padrão para o cérebro. */
const MODEL = "claude-opus-5";

/** Teto de voltas do laço de ferramentas, para uma pergunta nunca travar o HUD. */
const MAX_ITERATIONS = 6;

export interface JarvisImage {
  /** Base64 puro, sem o prefixo "data:image/...". */
  data: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  /** De onde veio: molda o que o modelo deve procurar na imagem. */
  origem: "webcam" | "tela";
}

export interface JarvisTurn {
  role: "user" | "assistant";
  content: string;
}

export interface JarvisRequest {
  message: string;
  history?: JarvisTurn[];
  images?: JarvisImage[];
}

export interface JarvisToolCall {
  name: string;
  input: unknown;
  ok: boolean;
}

export interface JarvisResponse {
  reply: string;
  toolCalls: JarvisToolCall[];
  /** Fontes citadas pela busca web, quando houve pesquisa. */
  sources: { title: string; url: string }[];
  usage: { input: number; output: number };
}

function systemPrompt(): string {
  const agora = new Date().toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return [
    `Você é o JARVIS, assistente operacional do ${jarvisConfig.salonName}.`,
    `Agora são ${agora}.`,
    "",
    "TOM: refinado, corporativo e prestativo. Trate o interlocutor por você.",
    "Seja direto e caloroso, nunca bajulador. Sem emoji.",
    "",
    "FORMATO: sua resposta é LIDA EM VOZ ALTA. Escreva em prosa curta, sem",
    "markdown, sem listas numeradas, sem tabelas. Duas ou três frases na",
    "maioria das vezes. Valores em reais falados por extenso quando ajudar.",
    "",
    "FERRAMENTAS: o cofre Obsidian é a memória do salão. Consulte antes de",
    "responder sobre clientes, caixa ou agenda — nunca invente um dado que",
    "poderia ter buscado. Registre o que o profissional pedir para guardar.",
    "",
    "SEGURANÇA QUÍMICA: antes de opinar sobre qualquer química, busque a ficha",
    "da cliente e verifique os alertas. Havendo histórico de henna, progressiva",
    "recente ou alergia, diga isso primeiro, com clareza.",
    "",
    "PESQUISA: use a busca web para tendências, técnicas e cotação de produto.",
    "Cite a fonte ao trazer um dado de fora. Se não encontrar, diga que não",
    "encontrou — jamais estime um preço de fornecedor como se fosse pesquisado.",
  ].join("\n");
}

/**
 * Uma volta de conversa com o cérebro.
 *
 * Laço manual de ferramentas: pede ao modelo, executa o que ele chamar, devolve
 * os resultados e repete até ele parar de pedir ferramenta. A busca web é
 * ferramenta de servidor — roda na Anthropic e volta pronta no mesmo response.
 */
export async function askJarvis(req: JarvisRequest): Promise<JarvisResponse> {
  if (!jarvisConfig.anthropicKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada — o cérebro do Jarvis está offline.",
    );
  }

  const client = new Anthropic({ apiKey: jarvisConfig.anthropicKey });

  const content: Anthropic.ContentBlockParam[] = [];

  for (const image of req.images ?? []) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.data },
    });
    content.push({
      type: "text",
      text:
        image.origem === "webcam"
          ? "Imagem da webcam: a cliente na cadeira. Avalie cor, corte e estado do fio."
          : "Captura da tela atual do sistema. Leia o que estiver visível.",
    });
  }

  content.push({ type: "text", text: req.message });

  const messages: Anthropic.MessageParam[] = [
    ...(req.history ?? []).map((t) => ({
      role: t.role,
      content: t.content,
    })),
    { role: "user", content },
  ];

  const toolCalls: JarvisToolCall[] = [];
  const sources: { title: string; url: string }[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt(),
      thinking: { type: "adaptive" },
      // Resposta falada: latência importa mais do que profundidade máxima.
      output_config: { effort: "medium" },
      tools: [
        ...JARVIS_TOOLS,
        { type: "web_search_20260209", name: "web_search" },
      ],
      messages,
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    for (const block of response.content) {
      if (block.type === "web_search_tool_result") {
        // Em erro, `content` vem como objeto único em vez de lista.
        if (Array.isArray(block.content)) {
          for (const result of block.content) {
            sources.push({ title: result.title, url: result.url });
          }
        }
      }
    }

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const reply = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      return {
        reply:
          reply ||
          "Não consegui formular uma resposta. Pode repetir de outro jeito?",
        toolCalls,
        sources,
        usage: { input: inputTokens, output: outputTokens },
      };
    }

    // Todos os resultados voltam numa ÚNICA mensagem de usuário: dividir em
    // várias ensina o modelo a parar de paralelizar chamadas.
    const results: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      try {
        const output = await runTool(
          block.name,
          block.input as Record<string, unknown>,
        );
        toolCalls.push({ name: block.name, input: block.input, ok: true });
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: output,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toolCalls.push({ name: block.name, input: block.input, ok: false });
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Erro: ${message}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: results });
  }

  return {
    reply:
      "Consultei várias fontes e ainda não fechei a resposta. Quer que eu tente de novo com menos coisas de uma vez?",
    toolCalls,
    sources,
    usage: { input: inputTokens, output: outputTokens },
  };
}
