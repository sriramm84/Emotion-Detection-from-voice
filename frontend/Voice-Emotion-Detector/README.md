# Voice Emotion Detector — Frontend

Next.js web interface for the Emotion Voice Recognition API in `../../backend`.

## Features

- **Record** from the microphone with a live level meter and a 10-second limit
- **Upload** WAV, MP3, FLAC, OGG or WebM files (drag and drop, up to 50 MB)
- **Results**: predicted emotion, confidence, probability for all 7 emotions, inference time
- **Backend status**: shows whether the API is online, offline, or running without a model (demo mode)
- **History** of recent analyses in the current session
- **Light/dark theme** that follows the system setting and remembers your choice
- Works on phones and desktops

Recordings are converted in the browser to 16-bit mono WAV at 22,050 Hz (the model's sample rate)
before upload, so recording works in every browser and the backend doesn't need ffmpeg for them.

## Run it

Start the backend first (from the project root, see the main README), then:

```bash
cd frontend/Voice-Emotion-Detector
npm install
npm run dev
```

Open http://localhost:3000.

Use `localhost`, not your computer's IP address. Browsers only allow microphone access on
`localhost` or HTTPS pages.

## Configuration

Copy `.env.example` to `.env.local` to change these:

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | Where the FastAPI backend runs |
| `NEXT_PUBLIC_API_TOKEN` | *(empty)* | Bearer token, only if the backend has `ENABLE_AUTH=True` |

The backend must allow the frontend's origin in `CORS_ORIGINS`. The defaults already include
`http://localhost:3000`.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Type-check the project |

## Structure

```
app/
  layout.tsx          Root layout, theme setup
  page.tsx            Main page
  globals.css         All styles and theme colours
components/
  EmotionRecorder.tsx Microphone recording
  FileUploader.tsx    File picker and drag-and-drop
  ResultsDisplay.tsx  Prediction, confidence ring, score bars
  HistoryList.tsx     Recent analyses
  StatusBadge.tsx     Backend health indicator
  ThemeToggle.tsx     Light/dark switch
lib/
  api.ts              Calls /api/predict and /api/health/detailed
  audio.ts            Recorder format selection, WAV encoding, validation
  emotions.ts         Emotion order, labels, colours
  hooks/useEmotionAPI.ts  State for predictions and backend status
```

## Docker

```bash
docker build -t voice-emotion-frontend --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 .
docker run -p 3000:3000 voice-emotion-frontend
```

`docker compose up` from the project root builds this image together with the backend.
