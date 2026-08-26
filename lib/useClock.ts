"use client";

import { useEffect, useState } from "react";

export interface ClockState {
  time: string;
  seconds: string;
  date: string;
  /** Evita divergência entre HTML do servidor e do cliente na 1ª pintura. */
  ready: boolean;
}

const TIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const SEC_FMT = new Intl.DateTimeFormat("pt-BR", { second: "2-digit" });

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * Relógio em tempo real. O primeiro render é vazio de propósito: a hora só
 * aparece após a hidratação, o que evita mismatch de SSR.
 */
export function useClock(): ClockState {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return { time: "--:--", seconds: "--", date: "———", ready: false };
  }

  return {
    time: TIME_FMT.format(now),
    seconds: SEC_FMT.format(now).padStart(2, "0"),
    date: DATE_FMT.format(now).replace(/\./g, "").toUpperCase(),
    ready: true,
  };
}
