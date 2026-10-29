"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, BackendHealth, PredictionResult, fetchHealth, predictEmotion } from "../api";

export type BackendState = "checking" | "online" | "degraded" | "offline";

const HEALTH_POLL_MS = 15_000;
const HISTORY_LIMIT = 6;

/** Polls the backend health endpoint so the UI can show whether it is reachable. */
export function useBackendStatus() {
  const [state, setState] = useState<BackendState>("checking");
  const [health, setHealth] = useState<BackendHealth | null>(null);

  const check = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const h = await fetchHealth(controller.signal);
      setHealth(h);
      setState(h.status === "healthy" && h.model_loaded !== false ? "online" : "degraded");
    } catch {
      setHealth(null);
      setState("offline");
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    void check();
    const id = setInterval(check, HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, [check]);

  return { state, health, refresh: check };
}

/** Sends audio to /api/predict and keeps the latest result plus a short history. */
export function useEmotionAPI() {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const analyze = useCallback(
    async (audio: Blob, fileName: string, source: PredictionResult["source"]) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setLoading(true);
      setError(null);
      try {
        const prediction = await predictEmotion(audio, fileName, source, controller.signal);
        setResult(prediction);
        setHistory((prev) => [prediction, ...prev].slice(0, HISTORY_LIMIT));
        return prediction;
      } catch (err) {
        if (controller.signal.aborted && inFlight.current !== controller) return null;
        setError(err instanceof ApiError ? err.message : "Something went wrong while analysing the audio.");
        return null;
      } finally {
        if (inFlight.current === controller) {
          inFlight.current = null;
          setLoading(false);
        }
      }
    },
    [],
  );

  const select = useCallback((item: PredictionResult) => {
    setResult(item);
    setError(null);
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  useEffect(() => () => inFlight.current?.abort(), []);

  return { analyze, result, history, loading, error, setError, select, clearHistory };
}
