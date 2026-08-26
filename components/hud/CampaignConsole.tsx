"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";

import { useOnda2 } from "@/lib/campaign/useOnda2";
import type { LogLevel } from "@/lib/useCommandLog";

const ACCENT = "124 92 255";

/**
 * Console da campanha Onda 2 — os dados vêm do ONDA2_app.html.
 *
 * Substitui os cartões estáticos no painel do módulo MARKETING: lotes reais,
 * contatos reais e disparo no WhatsApp com o template original. O progresso
 * divide o mesmo localStorage do app em HTML, nos dois sentidos.
 */
export function CampaignConsole({
  onLog,
}: {
  /** Publica os disparos no log de comandos do HUD. */
  onLog?: (text: string, level: LogLevel) => void;
}) {
  const { campaign, sent, progress, hydrated, error, send, toggle } = useOnda2();
  const [lot, setLot] = useState<number | null>(null);

  // Abre no primeiro lote com pendências, sem prender a escolha do operador.
  useEffect(() => {
    if (lot === null && progress) setLot(progress.currentLot);
  }, [lot, progress]);

  if (error) {
    return (
      <div className="flex flex-1 items-center gap-2 px-4 py-6 text-ember">
        <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.6} />
        <p className="font-mono text-[11px] leading-relaxed">
          Não foi possível ler a base da Onda 2 (ONDA2_app.html).
        </p>
      </div>
    );
  }

  if (!campaign || !progress || !hydrated) {
    return (
      <div className="flex flex-1 items-center gap-2 px-4 py-6 text-hud-300/60">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={1.6} />
        <span className="font-mono text-[11px]">Carregando base da campanha…</span>
      </div>
    );
  }

  const activeLot = lot ?? progress.currentLot;
  const inLot = campaign.contacts.filter((c) => c.lot === activeLot);
  const lotSent = inLot.filter((c) => sent[c.index]).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Progresso geral da onda */}
      <div className="px-3">
        <div className="flex items-baseline justify-between">
          <span className="hud-label">Onda 2 · reativação</span>
          <span className="font-mono text-[10px] text-hud-300/60 tabular-nums">
            {progress.sentTotal} / {campaign.total}
          </span>
        </div>

        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-abyss-950/80 ring-1 ring-inset ring-hud-400/20">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              background: `linear-gradient(90deg, rgba(${ACCENT},0.4), rgb(${ACCENT}))`,
              boxShadow: `0 0 10px -2px rgb(${ACCENT})`,
            }}
          />
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <Cell label="Enviadas" value={String(progress.sentTotal)} />
          <Cell label="Restantes" value={String(progress.remaining)} tone="text-ember" />
          <Cell label="Teto diário" value={`${campaign.dailyLimit}/dia`} />
        </div>
      </div>

      {/* Seletor de lotes */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]">
        {campaign.lots.map((l) => {
          const contacts = campaign.contacts.filter((c) => c.lot === l);
          const done = contacts.every((c) => sent[c.index]);
          const active = l === activeLot;

          return (
            <button
              key={l}
              type="button"
              onClick={() => setLot(l)}
              className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                active
                  ? "border-plasma/70 bg-plasma/15 text-hud-100"
                  : "border-hud-400/20 text-hud-300/60 hover:border-hud-400/40"
              } ${done && !active ? "opacity-45" : ""}`}
            >
              Lote {l}
              {done && " ✓"}
            </button>
          );
        })}
      </div>

      <div className="px-3 pb-1.5">
        <span className="hud-label">
          Lote {activeLot} · {lotSent}/{inLot.length} enviadas
        </span>
      </div>

      {/* Contatos do lote */}
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {inLot.map((contact) => {
          const done = Boolean(sent[contact.index]);

          return (
            <li
              key={contact.index}
              className={`flex items-center gap-2 rounded border px-2 py-1.5 transition-colors ${
                done
                  ? "border-acid/25 bg-acid/[0.06]"
                  : "border-hud-400/15 bg-abyss-800/40"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(contact)}
                aria-pressed={done}
                aria-label={`Marcar ${contact.name} como ${done ? "não enviada" : "enviada"}`}
                className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
                  done
                    ? "border-acid/60 bg-acid/20 text-acid"
                    : "border-hud-400/30 text-transparent hover:border-hud-300/60"
                }`}
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </button>

              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate font-sans text-[11px] ${
                    done ? "text-hud-300/60 line-through" : "text-hud-100"
                  }`}
                >
                  {contact.name}
                </span>
                <span className="block truncate font-mono text-[9px] text-hud-300/45">
                  +{contact.phone}
                </span>
              </span>

              <button
                type="button"
                onClick={() => {
                  send(contact);
                  onLog?.(
                    `Onda 2 · mensagem aberta para ${contact.firstName} (lote ${contact.lot})`,
                    "ok",
                  );
                }}
                className="flex shrink-0 items-center gap-1 rounded border border-plasma/40 bg-plasma/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-hud-100 transition-colors hover:border-plasma/80 hover:bg-plasma/20"
              >
                <Send className="h-3 w-3" strokeWidth={1.8} />
                {done ? "Reenviar" : "Enviar"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Cell({
  label,
  value,
  tone = "text-hud-100",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded border border-hud-400/15 bg-abyss-800/40 px-2 py-1.5">
      <div className="hud-label truncate text-[9px]">{label}</div>
      <div className={`hud-value mt-0.5 text-sm font-semibold ${tone}`}>{value}</div>
    </div>
  );
}
