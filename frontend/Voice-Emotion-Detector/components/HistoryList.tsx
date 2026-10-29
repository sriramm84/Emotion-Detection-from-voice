"use client";

import type { PredictionResult } from "@/lib/api";
import { emotionInfo } from "@/lib/emotions";

interface Props {
  items: PredictionResult[];
  activeId: string | null;
  onSelect: (item: PredictionResult) => void;
  onClear: () => void;
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function HistoryList({ items, activeId, onSelect, onClear }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="card history" aria-labelledby="history-title">
      <div className="card-head">
        <h3 id="history-title">Recent analyses</h3>
        <button type="button" className="btn-link" onClick={onClear}>
          Clear
        </button>
      </div>
      <ul>
        {items.map((item) => {
          const info = emotionInfo(item.emotion);
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`history-item ${item.id === activeId ? "is-active" : ""}`}
                onClick={() => onSelect(item)}
              >
                <span className="history-swatch" style={{ background: info.color }} aria-hidden="true" />
                <span className="history-emotion">
                  {info.emoji} {info.label}
                </span>
                <span className="history-source muted" title={item.fileName}>
                  {item.source === "recording" ? "Microphone" : item.fileName}
                </span>
                <span className="mono muted">{Math.round(item.confidence * 100)}%</span>
                <span className="mono muted history-time">{timeOf(item.timestamp)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
