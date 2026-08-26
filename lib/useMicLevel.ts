"use client";

import { useEffect, useRef, useState } from "react";

export type MicStatus = "idle" | "requesting" | "live" | "denied" | "unsupported";

/**
 * Captura o nível de áudio do microfone para alimentar a waveform.
 *
 * Quando `active` é falso — ou quando o usuário nega a permissão — o hook
 * simplesmente não entrega dados e o canvas cai na animação sintética,
 * de modo que o HUD funciona igual sem microfone.
 */
export function useMicLevel(active: boolean) {
  const dataRef = useRef<Uint8Array | null>(null);
  const [status, setStatus] = useState<MicStatus>("idle");

  useEffect(() => {
    if (!active) {
      dataRef.current = null;
      setStatus((s) => (s === "denied" || s === "unsupported" ? s : "idle"));
      return;
    }

    const supported =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window.AudioContext !== "undefined";

    if (!supported) {
      setStatus("unsupported");
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;

    setStatus("requesting");

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }

        stream = s;
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(s);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);

        const buffer = new Uint8Array(analyser.frequencyBinCount);
        setStatus("live");

        const tick = () => {
          analyser.getByteFrequencyData(buffer);
          dataRef.current = buffer;
          raf = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      dataRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [active]);

  return { dataRef, status };
}
