// Browser audio helpers: pick a recording format and convert recordings to WAV.
//
// Browsers record in different containers (Chrome/Firefox: WebM or Ogg, Safari: MP4).
// The backend only reads WAV/FLAC/MP3/OGG/WebM, and WebM needs ffmpeg on the server.
// Converting to WAV in the browser makes recording work everywhere without ffmpeg.

/** Sample rate the model was trained on (backend/utils/audio_preprocess.py). */
export const MODEL_SAMPLE_RATE = 22050;

/** The model analyses this many seconds; longer audio is trimmed by the backend. */
export const MODEL_WINDOW_SECONDS = 4;

export const ALLOWED_EXTENSIONS = [".wav", ".mp3", ".flac", ".ogg", ".webm"];

export const MAX_UPLOAD_MB = 50;

export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export function extensionForMime(mime: string): string {
  if (mime.includes("webm")) return ".webm";
  if (mime.includes("ogg")) return ".ogg";
  if (mime.includes("mp4")) return ".m4a";
  if (mime.includes("wav")) return ".wav";
  return "";
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  );
}

/**
 * Decode any browser-playable audio blob and re-encode it as
 * 16-bit mono PCM WAV at the model's sample rate.
 */
export async function convertToWav(blob: Blob, sampleRate = MODEL_SAMPLE_RATE): Promise<Blob> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) throw new Error("Web Audio is not supported in this browser.");

  const ctx = new Ctor();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void ctx.close();
  }

  // Resample and downmix to mono in one pass
  const length = Math.max(1, Math.ceil(decoded.duration * sampleRate));
  const offline = new OfflineAudioContext(1, length, sampleRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();

  return encodeWav(rendered.getChannelData(0), sampleRate);
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function validateAudioFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return `Unsupported format. Use ${ALLOWED_EXTENSIONS.join(", ").toUpperCase().replace(/\./g, "")}.`;
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The limit is ${MAX_UPLOAD_MB} MB.`;
  }
  if (file.size === 0) return "This file is empty.";
  return null;
}

export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
