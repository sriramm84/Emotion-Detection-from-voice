"use client";

import { API_URL } from "@/lib/api";
import type { BackendState } from "@/lib/hooks/useEmotionAPI";
import type { BackendHealth } from "@/lib/api";

interface Props {
  state: BackendState;
  health: BackendHealth | null;
  onRetry: () => void;
}

const LABELS: Record<BackendState, string> = {
  checking: "Connecting…",
  online: "Model ready",
  degraded: "Demo mode",
  offline: "Backend offline",
};

export default function StatusBadge({ state, health, onRetry }: Props) {
  const detail =
    state === "online"
      ? `Connected to ${API_URL}${health?.device ? ` · ${health.device}` : ""}`
      : state === "degraded"
        ? (health?.warnings?.join(" ") ?? "The backend is running without a model file.")
        : state === "offline"
          ? `No response from ${API_URL}. Start the backend, then retry.`
          : `Checking ${API_URL}`;

  return (
    <div className={`status status-${state}`} title={detail}>
      <span className="status-dot" aria-hidden="true" />
      <span>{LABELS[state]}</span>
      {state === "offline" && (
        <button type="button" className="status-retry" onClick={onRetry}>
          Retry
        </button>
      )}
      <span className="visually-hidden">{detail}</span>
    </div>
  );
}
