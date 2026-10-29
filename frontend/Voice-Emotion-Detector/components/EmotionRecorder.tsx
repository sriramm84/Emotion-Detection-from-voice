"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MODEL_WINDOW_SECONDS,
  convertToWav,
  extensionForMime,
  formatSeconds,
  pickRecorderMimeType,
} from "@/lib/audio";

const MAX_RECORD_SECONDS = 10;
const MIN_RECORD_SECONDS = 1;
const METER_BARS = 32;

type Phase = "idle" | "requesting" | "recording" | "recorded" | "preparing";

interface Props {
  busy: boolean;
  onAnalyze: (audio: Blob, fileName: string) => Promise<unknown>;
}

function micErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access was blocked. Allow it in your browser's site settings and try again.";
  if (name === "NotFoundError") return "No microphone was found. Plug one in, or upload a file instead.";
  if (name === "NotReadableError") return "The microphone is being used by another app.";
  return "Couldn't start the microphone.";
}

export default function EmotionRecorder({ busy, onAnalyze }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(METER_BARS).fill(0));
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const startedAtRef = useRef(0);

  const releaseDevices = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      releaseDevices();
    };
  }, [releaseDevices]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") rec.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Recording needs a secure page. Open the app at http://localhost:3000 (not an IP address), or upload a file instead.",
      );
      return;
    }
    const mimeType = pickRecorderMimeType();
    if (typeof MediaRecorder === "undefined") {
      setError("This browser can't record audio. Upload a file instead.");
      return;
    }

    setPhase("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: false, autoGainControl: true },
      });
    } catch (err) {
      setPhase("idle");
      setError(micErrorMessage(err));
      return;
    }
    streamRef.current = stream;

    // Live input meter
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      const data = new Float32Array(analyser.fftSize);
      let lastPush = 0;
      const tick = (now: number) => {
        if (now - lastPush > 60) {
          analyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
          const rms = Math.sqrt(sum / data.length);
          const level = Math.min(1, rms * 6);
          setLevels((prev) => [...prev.slice(1), level]);
          lastPush = now;
        }
        setElapsed((performance.now() - startedAtRef.current) / 1000);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Meter is optional
    }

    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const duration = (performance.now() - startedAtRef.current) / 1000;
      releaseDevices();
      setLevels(Array(METER_BARS).fill(0));
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
      if (duration < MIN_RECORD_SECONDS || blob.size === 0) {
        setPhase("idle");
        setElapsed(0);
        setError("That was too short. Hold the recording for at least a second.");
        return;
      }
      blobRef.current = blob;
      setElapsed(duration);
      setAudioUrl(URL.createObjectURL(blob));
      setPhase("recorded");
    };

    startedAtRef.current = performance.now();
    recorder.start(250);
    recorderRef.current = recorder;
    setElapsed(0);
    setPhase("recording");
  }, [releaseDevices]);

  // Auto-stop at the time limit
  useEffect(() => {
    if (phase === "recording" && elapsed >= MAX_RECORD_SECONDS) stop();
  }, [phase, elapsed, stop]);

  const discard = useCallback(() => {
    blobRef.current = null;
    setAudioUrl(null);
    setElapsed(0);
    setError(null);
    setPhase("idle");
  }, []);

  const analyze = useCallback(async () => {
    const blob = blobRef.current;
    if (!blob) return;
    setError(null);
    setPhase("preparing");

    let upload: Blob = blob;
    let name = "recording.wav";
    try {
      upload = await convertToWav(blob);
    } catch {
      // Fall back to the original file if the backend can read it (needs ffmpeg for WebM)
      const ext = extensionForMime(blob.type);
      if (ext !== ".webm" && ext !== ".ogg") {
        setPhase("recorded");
        setError("Couldn't convert this recording in your browser. Try Chrome or Firefox, or upload a file.");
        return;
      }
      name = `recording${ext}`;
    }

    setPhase("recorded");
    await onAnalyze(upload, name);
  }, [onAnalyze]);

  const recording = phase === "recording";
  const progress = Math.min(1, elapsed / MAX_RECORD_SECONDS);
  const windowMark = MODEL_WINDOW_SECONDS / MAX_RECORD_SECONDS;

  return (
    <div className="recorder">
      <div className={`meter ${recording ? "is-live" : ""}`} aria-hidden="true">
        {levels.map((l, i) => (
          <span key={i} style={{ transform: `scaleY(${0.06 + l * 0.94})` }} />
        ))}
      </div>

      <div className="timeline" aria-hidden="true">
        <div className="timeline-fill" style={{ width: `${(phase === "idle" ? 0 : progress) * 100}%` }} />
        <div className="timeline-mark" style={{ left: `${windowMark * 100}%` }} title="Model window" />
      </div>
      <div className="timeline-labels">
        <span className="mono" aria-live="polite">
          {formatSeconds(elapsed)}
        </span>
        <span className="muted">
          The model listens to the first {MODEL_WINDOW_SECONDS} s · max {MAX_RECORD_SECONDS} s
        </span>
      </div>

      <div className="recorder-controls">
        {(phase === "idle" || phase === "requesting") && (
          <button
            type="button"
            className="record-btn"
            onClick={start}
            disabled={phase === "requesting" || busy}
            aria-label="Start recording"
          >
            <span className="record-dot" />
            {phase === "requesting" ? "Waiting for microphone…" : "Record"}
          </button>
        )}

        {recording && (
          <button type="button" className="record-btn is-recording" onClick={stop} aria-label="Stop recording">
            <span className="stop-square" />
            Stop
          </button>
        )}

        {(phase === "recorded" || phase === "preparing") && audioUrl && (
          <div className="take">
            <audio controls src={audioUrl} className="player" />
            <div className="take-actions">
              <button type="button" className="btn-primary" onClick={analyze} disabled={busy || phase === "preparing"}>
                {busy || phase === "preparing" ? "Analysing…" : "Analyse emotion"}
              </button>
              <button type="button" className="btn-ghost" onClick={discard} disabled={busy}>
                Record again
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
