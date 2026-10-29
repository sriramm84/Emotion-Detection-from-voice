"use client";

import { useCallback, useState } from "react";
import EmotionRecorder from "@/components/EmotionRecorder";
import FileUploader from "@/components/FileUploader";
import HistoryList from "@/components/HistoryList";
import ResultsDisplay from "@/components/ResultsDisplay";
import StatusBadge from "@/components/StatusBadge";
import ThemeToggle from "@/components/ThemeToggle";
import { API_URL } from "@/lib/api";
import { EMOTION_ORDER, emotionInfo } from "@/lib/emotions";
import { useBackendStatus, useEmotionAPI } from "@/lib/hooks/useEmotionAPI";

type Mode = "record" | "upload";

export default function Home() {
  const [mode, setMode] = useState<Mode>("record");
  const backend = useBackendStatus();
  const { analyze, result, history, loading, error, select, clearHistory } = useEmotionAPI();

  const analyzeRecording = useCallback((audio: Blob, name: string) => analyze(audio, name, "recording"), [analyze]);
  const analyzeUpload = useCallback((audio: Blob, name: string) => analyze(audio, name, "upload"), [analyze]);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="9" />
            <path d="M8 16v0M12 12v8M16 8v16M20 11v10M24 15v2" />
          </svg>
          <span className="brand-name">Voice Emotion</span>
        </div>
        <div className="topbar-actions">
          <StatusBadge state={backend.state} health={backend.health} onRetry={backend.refresh} />
          <ThemeToggle />
        </div>
      </header>

      <main>
        <section className="intro">
          <h1>How does this voice sound?</h1>
          <p>
            Record a few seconds of speech or upload a clip. An ensemble of EfficientNetV2-M, VGG16 and
            DenseNet121 reads its mel spectrogram and scores seven emotions.
          </p>
        </section>

        <div className="workspace">
          <section className="card input-card" aria-label="Audio input">
            <div className="tabs" role="tablist" aria-label="Input method">
              <button
                type="button"
                role="tab"
                id="tab-record"
                aria-selected={mode === "record"}
                aria-controls="panel-record"
                className={mode === "record" ? "is-active" : ""}
                onClick={() => setMode("record")}
              >
                Record
              </button>
              <button
                type="button"
                role="tab"
                id="tab-upload"
                aria-selected={mode === "upload"}
                aria-controls="panel-upload"
                className={mode === "upload" ? "is-active" : ""}
                onClick={() => setMode("upload")}
              >
                Upload file
              </button>
            </div>

            <div
              role="tabpanel"
              id={mode === "record" ? "panel-record" : "panel-upload"}
              aria-labelledby={mode === "record" ? "tab-record" : "tab-upload"}
              className="tab-panel"
            >
              {mode === "record" ? (
                <EmotionRecorder busy={loading} onAnalyze={analyzeRecording} />
              ) : (
                <FileUploader busy={loading} onAnalyze={analyzeUpload} />
              )}
            </div>

            <ul className="tips">
              <li>Speak naturally, about a sentence long, in a quiet room.</li>
              <li>Express the feeling in your tone, the model doesn&apos;t understand words.</li>
            </ul>
          </section>

          <section className="card results-card" aria-label="Results">
            <ResultsDisplay result={result} loading={loading} error={error} />
          </section>
        </div>

        <HistoryList items={history} activeId={result?.id ?? null} onSelect={select} onClear={clearHistory} />

        <section className="legend" aria-label="Emotions the model can detect">
          {EMOTION_ORDER.map((e) => {
            const info = emotionInfo(e);
            return (
              <span key={e} className="legend-chip">
                <span className="legend-dot" style={{ background: info.color }} aria-hidden="true" />
                {info.label}
              </span>
            );
          })}
        </section>
      </main>

      <footer className="footer">
        <span>Trained on RAVDESS, TESS and CREMA-D.</span>
        <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
          API docs ↗
        </a>
      </footer>
    </div>
  );
}
