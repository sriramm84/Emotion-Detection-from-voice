// Must match CLASSES in backend/utils/model_loader.py (same order as raw_scores)
export const EMOTION_ORDER = [
  "angry",
  "disgust",
  "fear",
  "happy",
  "neutral",
  "sad",
  "surprise",
] as const;

export type Emotion = (typeof EMOTION_ORDER)[number];

export interface EmotionInfo {
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export const EMOTIONS: Record<Emotion, EmotionInfo> = {
  angry: { label: "Angry", emoji: "😠", color: "#d9483b", description: "Irritation, frustration, rage" },
  disgust: { label: "Disgust", emoji: "🤢", color: "#6f8f2e", description: "Aversion, repulsion" },
  fear: { label: "Fear", emoji: "😨", color: "#7a52b3", description: "Anxiety, worry, terror" },
  happy: { label: "Happy", emoji: "😊", color: "#e0a019", description: "Joy, contentment, excitement" },
  neutral: { label: "Neutral", emoji: "😐", color: "#7d8691", description: "Calm, balanced, indifferent" },
  sad: { label: "Sad", emoji: "😢", color: "#3a78c2", description: "Sorrow, grief, melancholy" },
  surprise: { label: "Surprise", emoji: "😲", color: "#d4589a", description: "Astonishment, shock, amazement" },
};

export function emotionInfo(name: string): EmotionInfo {
  return (
    EMOTIONS[name.toLowerCase() as Emotion] ?? {
      label: name,
      emoji: "🎧",
      color: "#7d8691",
      description: "",
    }
  );
}
