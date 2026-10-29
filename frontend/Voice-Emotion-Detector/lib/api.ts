// Client for the FastAPI backend (backend/main.py).

import { EMOTION_ORDER } from "./emotions";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

// Only needed when the backend runs with ENABLE_AUTH=True
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || "";

const PREDICT_TIMEOUT_MS = 120_000;

export interface PredictionResult {
  id: string;
  emotion: string;
  confidence: number;
  /** Probability per emotion, keyed by emotion name */
  scores: Record<string, number>;
  inferenceTimeMs: number | null;
  audioDurationSeconds: number | null;
  model: string | null;
  device: string | null;
  timestamp: string;
  warning: string | null;
  source: "recording" | "upload";
  fileName: string;
}

export interface BackendHealth {
  status: "healthy" | "degraded" | "unhealthy" | string;
  model_loaded?: boolean;
  model_name?: string | null;
  device?: string;
  version?: string;
  uptime_seconds?: number;
  warnings?: string[] | null;
}

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

function authHeaders(): HeadersInit {
  return API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const msg = body?.message ?? body?.detail ?? body?.error;
    if (typeof msg === "string" && msg) return msg;
    if (msg) return JSON.stringify(msg);
  } catch {
    // not JSON
  }
  return res.statusText || `Request failed (${res.status})`;
}

function friendlyStatusMessage(status: number, serverMessage: string): string {
  switch (status) {
    case 401:
    case 403:
      return "The backend requires an API token. Set NEXT_PUBLIC_API_TOKEN in .env.local to match API_TOKEN.";
    case 413:
      return serverMessage || "That file is too large for the server.";
    case 429:
      return "Too many requests. Wait a moment and try again.";
    default:
      return serverMessage;
  }
}

/** Accepts both the documented response shape and the one the backend actually returns. */
export function normalizePrediction(
  raw: Record<string, unknown>,
  source: PredictionResult["source"],
  fileName: string,
): PredictionResult {
  const scores: Record<string, number> = {};

  if (Array.isArray(raw.raw_scores)) {
    (raw.raw_scores as number[]).forEach((value, i) => {
      const name = EMOTION_ORDER[i] ?? `class_${i}`;
      scores[name] = Number(value) || 0;
    });
  } else if (raw.probabilities && typeof raw.probabilities === "object") {
    for (const [name, value] of Object.entries(raw.probabilities as Record<string, number>)) {
      scores[name.toLowerCase()] = Number(value) || 0;
    }
  }

  const emotion = String(raw.emotion ?? "unknown").toLowerCase();
  const confidence = typeof raw.confidence === "number" ? raw.confidence : scores[emotion] ?? 0;
  if (Object.keys(scores).length === 0) scores[emotion] = confidence;

  const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);
  const meta = (raw.metadata ?? {}) as Record<string, unknown>;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    emotion,
    confidence,
    scores,
    inferenceTimeMs: num(raw.inference_time_ms) ?? num(raw.processing_time_ms),
    audioDurationSeconds: num(raw.audio_duration_seconds) ?? num(meta.audio_duration_sec),
    model: (raw.model_used ?? raw.model ?? meta.model_version ?? null) as string | null,
    device: (raw.device ?? null) as string | null,
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    warning: (raw.warning ?? null) as string | null,
    source,
    fileName,
  };
}

export async function predictEmotion(
  audio: Blob,
  fileName: string,
  source: PredictionResult["source"],
  signal?: AbortSignal,
): Promise<PredictionResult> {
  const form = new FormData();
  form.append("file", audio, fileName);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREDICT_TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort());

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/predict`, {
      method: "POST",
      body: form,
      headers: authHeaders(),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ApiError(signal?.aborted ? "Cancelled." : "The server took too long to respond.");
    }
    throw new ApiError(`Can't reach the backend at ${API_URL}. Make sure it is running.`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new ApiError(friendlyStatusMessage(res.status, message), res.status);
  }

  return normalizePrediction(await res.json(), source, fileName);
}

export async function fetchHealth(signal?: AbortSignal): Promise<BackendHealth> {
  const detailed = await fetch(`${API_URL}/api/health/detailed`, { signal, cache: "no-store" });
  if (detailed.ok) return detailed.json();

  // Fall back to the simple endpoint
  const simple = await fetch(`${API_URL}/health`, { signal, cache: "no-store" });
  if (simple.ok) return { status: "healthy" };
  throw new ApiError("Backend is not healthy", simple.status);
}
