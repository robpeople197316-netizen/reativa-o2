"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface VisionAnalysis {
  reply: string;
  sources: { title: string; url: string }[];
}

/** Converte um MediaStream num JPEG base64, sem escrever nada em disco. */
async function grabFrame(
  stream: MediaStream,
  maxWidth: number,
): Promise<string> {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  await video.play();

  // Um quadro em branco sai se capturarmos antes do primeiro frame decodificar.
  await new Promise<void>((resolve) => {
    if (video.readyState >= 2) resolve();
    else video.onloadeddata = () => resolve();
  });

  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((video.videoWidth || maxWidth) * scale);
  canvas.height = Math.round((video.videoHeight || maxWidth) * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível para capturar o quadro.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  video.pause();
  video.srcObject = null;

  // 0.82: bom detalhe de fio de cabelo sem estourar o payload da requisição.
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function analyze(
  image: string,
  origem: "webcam" | "tela",
  pergunta?: string,
): Promise<VisionAnalysis> {
  const res = await fetch("/api/jarvis/vision/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, origem, pergunta }),
  });

  const json = (await res.json()) as VisionAnalysis & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `status ${res.status}`);

  return { reply: json.reply, sources: json.sources ?? [] };
}

/**
 * Visão pela webcam: diagnóstico da cliente na cadeira.
 *
 * A câmera é aberta só no instante da captura e fechada em seguida — nada de
 * stream aberto o dia inteiro em cima de quem está no salão.
 */
export function useWebcam() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);

  const capture = useCallback(async (): Promise<string | null> => {
    setError(null);
    setBusy(true);

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
      });
      const frame = await grabFrame(stream, 1024);
      setLastFrame(frame);
      return frame;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível acessar a webcam.",
      );
      return null;
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      setBusy(false);
    }
  }, []);

  const captureAndAnalyze = useCallback(
    async (pergunta?: string): Promise<VisionAnalysis | null> => {
      const frame = await capture();
      if (!frame) return null;

      setBusy(true);
      try {
        return await analyze(frame, "webcam", pergunta);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha na análise.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [capture],
  );

  return { capture, captureAndAnalyze, busy, error, lastFrame };
}

/**
 * Leitura de tela via Screen Capture API.
 *
 * O navegador sempre pede consentimento e mostra qual superfície está sendo
 * compartilhada — não há captura silenciosa, por design da plataforma.
 */
export function useScreenCapture() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setSupported(
      typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getDisplayMedia === "function",
    );
    return () => {
      mounted.current = false;
    };
  }, []);

  const capture = useCallback(async (): Promise<string | null> => {
    setError(null);
    setBusy(true);

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      // 1440px preserva texto pequeno de agenda e comanda.
      const frame = await grabFrame(stream, 1440);
      if (mounted.current) setLastFrame(frame);
      return frame;
    } catch (err) {
      if (mounted.current) {
        setError(
          err instanceof Error ? err.message : "Captura de tela cancelada.",
        );
      }
      return null;
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      if (mounted.current) setBusy(false);
    }
  }, []);

  const captureAndAnalyze = useCallback(
    async (pergunta?: string): Promise<VisionAnalysis | null> => {
      const frame = await capture();
      if (!frame) return null;

      setBusy(true);
      try {
        return await analyze(frame, "tela", pergunta);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha na leitura.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [capture],
  );

  return { capture, captureAndAnalyze, busy, error, supported, lastFrame };
}
