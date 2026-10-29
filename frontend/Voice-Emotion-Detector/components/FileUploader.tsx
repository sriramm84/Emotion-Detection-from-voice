"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_MB, formatBytes, validateAudioFile } from "@/lib/audio";

interface Props {
  busy: boolean;
  onAnalyze: (audio: Blob, fileName: string) => Promise<unknown>;
}

export default function FileUploader({ busy, onAnalyze }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const accept = useCallback((candidate: File | undefined | null) => {
    if (!candidate) return;
    const problem = validateAudioFile(candidate);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setFile(candidate);
    setPreviewUrl(URL.createObjectURL(candidate));
  }, []);

  const clear = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragging(false);
      if (busy) return;
      accept(e.dataTransfer.files?.[0]);
    },
    [accept, busy],
  );

  return (
    <div className="uploader">
      {!file ? (
        <label
          className={`dropzone ${dragging ? "is-dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={[...ALLOWED_EXTENSIONS, "audio/*"].join(",")}
            className="visually-hidden"
            onChange={(e) => accept(e.target.files?.[0])}
            disabled={busy}
          />
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="dropzone-title">Drop an audio file here</span>
          <span className="muted">or click to browse</span>
          <span className="formats mono">WAV · MP3 · FLAC · OGG · WEBM · up to {MAX_UPLOAD_MB} MB</span>
        </label>
      ) : (
        <div className="take">
          <div className="file-row">
            <div className="file-icon" aria-hidden="true">
              ♪
            </div>
            <div className="file-meta">
              <span className="file-name" title={file.name}>
                {file.name}
              </span>
              <span className="muted mono">{formatBytes(file.size)}</span>
            </div>
          </div>
          {previewUrl && <audio controls src={previewUrl} className="player" />}
          <div className="take-actions">
            <button type="button" className="btn-primary" onClick={() => onAnalyze(file, file.name)} disabled={busy}>
              {busy ? "Analysing…" : "Analyse emotion"}
            </button>
            <button type="button" className="btn-ghost" onClick={clear} disabled={busy}>
              Choose another file
            </button>
          </div>
          <p className="muted small">Only the first 4 seconds are analysed. Trim longer clips to the part you care about.</p>
        </div>
      )}

      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
