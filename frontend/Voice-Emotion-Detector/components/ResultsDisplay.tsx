"use client";

import type { CSSProperties } from "react";
import type { PredictionResult } from "@/lib/api";
import { EMOTION_ORDER, emotionInfo } from "@/lib/emotions";

interface Props {
  result: PredictionResult | null;
  loading: boolean;
  error: string | null;
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function ConfidenceRing({ value, color }: { value: number; color: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 120 120" role="img" aria-label={`Confidence ${pct(value)}`}>
      <circle cx="60" cy="60" r={r} className="ring-track" />
      <circle
        cx="60"
        cy="60"
        r={r}
        className="ring-value"
        style={{ stroke: color, strokeDasharray: `${c * value} ${c}` }}
      />
      <text x="60" y="58" textAnchor="middle" className="ring-number">
        {Math.round(value * 100)}
        <tspan className="ring-unit">%</tspan>
      </text>
      <text x="60" y="78" textAnchor="middle" className="ring-label">
        confidence
      </text>
    </svg>
  );
}

export default function ResultsDisplay({ result, loading, error }: Props) {
  if (loading) {
    return (
      <div className="results is-loading" aria-busy="true" aria-live="polite">
        <div className="loading-wave" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.09}s` }} />
          ))}
        </div>
        <p className="results-title">Listening closely…</p>
        <p className="muted">Cleaning the audio and running the ensemble model.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results is-error" role="alert">
        <div className="error-icon" aria-hidden="true">!</div>
        <p className="results-title">Couldn&apos;t analyse that clip</p>
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="results is-empty">
        <div className="empty-faces" aria-hidden="true">
          {EMOTION_ORDER.map((e) => (
            <span key={e}>{emotionInfo(e).emoji}</span>
          ))}
        </div>
        <p className="results-title">No analysis yet</p>
        <p className="muted">Record your voice or upload a clip, and the predicted emotion will appear here.</p>
      </div>
    );
  }

  const top = emotionInfo(result.emotion);
  const ordered = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="results" aria-live="polite">
      {result.warning && (
        <div className="warning" role="status">
          <strong>Demo mode.</strong> The backend has no model file loaded, so these predictions are random. Add
          the trained <code>.pt</code> model to get real results.
        </div>
      )}

      <div className="verdict" style={{ "--emotion": top.color } as CSSProperties}>
        <ConfidenceRing value={result.confidence} color={top.color} />
        <div className="verdict-text">
          <span className="eyebrow">Detected emotion</span>
          <h2 className="verdict-name">
            <span className="verdict-emoji" aria-hidden="true">
              {top.emoji}
            </span>
            {top.label}
          </h2>
          <p className="muted">{top.description}</p>
        </div>
      </div>

      <div className="scores" role="list" aria-label="Probability for each emotion">
        {ordered.map(([name, value]) => {
          const info = emotionInfo(name);
          const isTop = name === result.emotion;
          return (
            <div key={name} className={`score-row ${isTop ? "is-top" : ""}`} role="listitem">
              <span className="score-label">
                <span aria-hidden="true">{info.emoji}</span> {info.label}
              </span>
              <span className="score-bar">
                <span style={{ width: `${Math.max(0.5, value * 100)}%`, background: info.color }} />
              </span>
              <span className="score-value mono">{pct(value)}</span>
            </div>
          );
        })}
      </div>

      <dl className="meta">
        <div>
          <dt>Inference</dt>
          <dd className="mono">{result.inferenceTimeMs !== null ? `${result.inferenceTimeMs.toFixed(0)} ms` : "—"}</dd>
        </div>
        <div>
          <dt>Audio length</dt>
          <dd className="mono">
            {result.audioDurationSeconds !== null ? `${result.audioDurationSeconds.toFixed(2)} s` : "—"}
          </dd>
        </div>
        <div>
          <dt>Device</dt>
          <dd className="mono">{result.device ?? "—"}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd className="mono" title={result.fileName}>
            {result.source === "recording" ? "Microphone" : result.fileName}
          </dd>
        </div>
      </dl>
    </div>
  );
}
