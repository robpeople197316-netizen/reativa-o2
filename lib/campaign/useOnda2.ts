"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ONDA2_CHANGE_EVENT,
  ONDA2_STORAGE_KEY,
  buildWhatsAppLink,
  type Onda2Campaign,
  type Onda2Contact,
} from "@/lib/campaign/onda2";

type SentMap = Record<string, 1>;

export interface Onda2Progress {
  sentTotal: number;
  remaining: number;
  percent: number;
  /** Lote sugerido: o primeiro que ainda tem contatos pendentes. */
  currentLot: number;
  lotSent: number;
  lotTotal: number;
}

function readStored(): SentMap | null {
  try {
    const raw = window.localStorage.getItem(ONDA2_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SentMap) : null;
  } catch {
    // Modo privado ou storage bloqueado: a campanha segue só em memória.
    return null;
  }
}

function writeStored(map: SentMap) {
  try {
    window.localStorage.setItem(ONDA2_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* sem persistência — não é motivo para quebrar o envio */
  }

  // `storage` só dispara em OUTRAS abas; este evento avisa esta mesma página.
  window.dispatchEvent(new CustomEvent(ONDA2_CHANGE_EVENT));
}

/**
 * Estado da campanha Onda 2 dentro do HUD.
 *
 * Compartilha a chave de localStorage com o ONDA2_app.html, então o progresso
 * feito em qualquer um dos dois aparece no outro.
 */
export function useOnda2() {
  const [campaign, setCampaign] = useState<Onda2Campaign | null>(null);
  const [sent, setSent] = useState<SentMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState(false);

  // Carrega a base sob demanda.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/campanha/onda2")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Onda2Campaign>;
      })
      .then((data) => {
        if (cancelled) return;
        setCampaign(data);

        // Primeira visita: semeia com o preset do app original.
        const stored = readStored();
        if (stored) {
          setSent(stored);
        } else {
          const seed: SentMap = {};
          for (const i of data.presetSent) seed[i] = 1;
          writeStored(seed);
          setSent(seed);
        }
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Mantém o HUD em sincronia se o app em HTML for usado em outra aba.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== ONDA2_STORAGE_KEY) return;
      const stored = readStored();
      if (stored) setSent(stored);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((next: SentMap) => {
    setSent(next);
    writeStored(next);
  }, []);

  const markSent = useCallback(
    (contact: Onda2Contact) => {
      update({ ...sent, [contact.index]: 1 });
    },
    [sent, update],
  );

  const toggle = useCallback(
    (contact: Onda2Contact) => {
      const next = { ...sent };
      if (next[contact.index]) delete next[contact.index];
      else next[contact.index] = 1;
      update(next);
    },
    [sent, update],
  );

  const send = useCallback(
    (contact: Onda2Contact) => {
      if (!campaign) return;
      markSent(contact);
      window.open(
        buildWhatsAppLink(contact, campaign.template),
        "_blank",
        "noopener,noreferrer",
      );
    },
    [campaign, markSent],
  );

  const progress = useMemo<Onda2Progress | null>(() => {
    if (!campaign) return null;

    const sentTotal = Object.keys(sent).length;

    // Lote atual = primeiro com pendências; se tudo saiu, mantém o último.
    const lotStats = campaign.lots.map((lot) => {
      const inLot = campaign.contacts.filter((c) => c.lot === lot);
      const done = inLot.filter((c) => sent[c.index]).length;
      return { lot, total: inLot.length, done };
    });

    const pending = lotStats.find((l) => l.done < l.total);
    const active = pending ?? lotStats[lotStats.length - 1];

    return {
      sentTotal,
      remaining: campaign.total - sentTotal,
      percent: campaign.total ? (sentTotal / campaign.total) * 100 : 0,
      currentLot: active?.lot ?? 1,
      lotSent: active?.done ?? 0,
      lotTotal: active?.total ?? 0,
    };
  }, [campaign, sent]);

  return {
    campaign,
    sent,
    progress,
    hydrated,
    error,
    send,
    toggle,
  };
}
