# 🎤 Emotion Voice Recognition System

<div align="center">

![Version](https://img.shields.io/badge/version-4.0.0--tier0-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688?logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?logo=pytorch)
![License](https://img.shields.io/badge/license-MIT-green)

**Detect emotions from voice recordings with a deep-learning ensemble, served by FastAPI and a Next.js web UI**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [API](#-api-documentation) • [Model](#-model-information)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Model Information](#-model-information)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

The **Emotion Voice Recognition System** analyzes a short voice recording and classifies the speaker's emotion. Audio is cleaned and converted into a mel spectrogram, then scored by a TorchScript ensemble of three CNNs (EfficientNetV2-M, VGG16 and DenseNet121).

### Supported Emotions

- 😠 **Angry**
- 🤢 **Disgust**
- 😨 **Fear**
- 😊 **Happy**
- 😐 **Neutral**
- 😢 **Sad**
- 😲 **Surprise**

---

## ✨ Features

### Backend (FastAPI)

- ⚡ Async FastAPI app served by Uvicorn, with interactive docs at `/docs`
- 🎛️ Audio pipeline: format conversion (WebM/MP3/OGG via FFmpeg), resampling, noise reduction, mel spectrogram
- 🧠 TorchScript ensemble model, loaded on CPU or CUDA (`DEVICE=auto`)
- 🔒 Optional Bearer-token auth and per-IP rate limiting (100 requests/minute on `/api/predict`)
- 📊 Health, status, GPU and inference metrics endpoints
- 📝 Structured logs and per-request inference traces in `backend/logs/`
- 🐳 Dockerfiles and a Docker Compose stack

### Frontend (Next.js)

- 🎤 In-browser recording with a live level meter (converted to WAV before upload)
- 📤 Drag-and-drop file upload
- 📈 Probability bars for all 7 emotions
- 🕘 History of recent analyses
- 🟢 Backend connection status badge
- 🌓 Light/dark theme, responsive layout

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│   Recorder  •  File Uploader  •  Results  •  History      │
└─────────────────────────────┬─────────────────────────────┘
                              │  POST /api/predict (multipart)
                              ▼
┌───────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                     │
│   main.py: CORS • rate limiting • auth • error handling   │
│                                                           │
│   routers/inference.py   routers/monitor.py   admin.py    │
│            │                                              │
│            ▼                                              │
│   utils/audio_preprocess.py                               │
│   convert → resample 22.05 kHz → noise reduction →        │
│   pad/trim 4 s → 128-bin mel (dB) → resize 128×128        │
│            │                                              │
│            ▼                                              │
│   utils/model_loader.py                                   │
│   TorchScript ensemble: EfficientNetV2-M + VGG16 +        │
│   DenseNet121 → 7 emotion probabilities                   │
└───────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.10/3.11, FastAPI 0.104, Uvicorn 0.24, Pydantic 2, pydantic-settings, slowapi |
| Audio | torchaudio, librosa 0.10, pydub, noisereduce, FFmpeg |
| ML | PyTorch 2.x (TorchScript), torchvision |
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5, Web Audio API, plain CSS |
| Training | Jupyter notebooks (`Ai.ipynb`, `train_kaggle.ipynb`) |

---

## 📦 Prerequisites

- **Python 3.10 or 3.11** (the Windows launcher suggests `py -3.11`)
- **Node.js 18.18+** and npm
- **FFmpeg** on your `PATH` (needed for WebM/MP3/OGG decoding)
  - Windows: `.\backend\install_ffmpeg.ps1`
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`
- **The trained model file** `best_efficientnet_v2_m+vgg16+densenet121.pt` (see below)
- Optional: an NVIDIA GPU with CUDA for faster inference

### Getting the model file

Model weights (`*.pt`) are not committed to the repository. Either:

1. **Train it yourself** with [`train_kaggle.ipynb`](train_kaggle.ipynb) on Kaggle or Colab (GPU). It downloads the datasets, trains the three networks and exports the exact file the backend loads, or
2. Use a copy you already have.

Place it at:

```
backend/models/best_efficientnet_v2_m+vgg16+densenet121.pt
```

or point `MODEL_PATH` at another location (see [Configuration](#-configuration)).

---

## 🚀 Installation

### Option 1: Quick start

```bash
# 1. Clone the repository
git clone https://github.com/sriramm84/Emotion-Detection-from-voice.git
cd Emotion-Detection-from-voice

# 2. Backend environment
cd backend
python -m venv venv
# Windows:      .\venv\Scripts\activate
# macOS/Linux:  source venv/bin/activate
pip install -r requirements.txt
cd ..

# 3. Frontend dependencies
cd frontend/Voice-Emotion-Detector
npm install
cd ../..

# 4. Start both servers
python start_all.py
```

On Windows you can instead double-click **`START_ALL.bat`**, which runs `start_all.py` with the backend venv's Python.

`start_all.py` checks dependencies (including FFmpeg), starts the backend, waits for `/health`, then starts the frontend. Press `Ctrl+C` to stop both.

> **GPU:** to use CUDA, install the CUDA build of PyTorch first, e.g.
> `pip install torch torchaudio torchvision --index-url https://download.pytorch.org/whl/cu118`

### Option 2: Run each part manually

**Backend**

```bash
cd backend
# activate the venv first
uvicorn main:app --reload --host 127.0.0.1 --port 8000
# or: python start_server.py
```

**Frontend**

```bash
cd frontend/Voice-Emotion-Detector
cp .env.example .env.local   # optional; defaults to http://127.0.0.1:8000
npm run dev
```

### Option 3: Docker Compose

```bash
docker-compose up --build
```

The compose file mounts `./phase3_outputs/final_export` into the backend container as `/app/models` and sets `MODEL_PATH=/app/models/best_model.pt`, so copy your model there first:

```bash
mkdir -p phase3_outputs/final_export
cp backend/models/best_efficientnet_v2_m+vgg16+densenet121.pt phase3_outputs/final_export/best_model.pt
```

Services: backend on port **8000**, frontend on port **3000**.

---

## 💻 Usage

Once running:

| What | URL |
|------|-----|
| Web UI | http://localhost:3000 |
| Interactive API docs | http://127.0.0.1:8000/docs |
| Health check | http://127.0.0.1:8000/health |

### Web interface

1. **Record**: click the microphone button, speak for a few seconds, then stop. The clip is analyzed automatically.
2. **Upload**: drag an audio file (WAV, MP3, FLAC, OGG, WebM) onto the uploader or click to browse.
3. **Results**: see the top emotion, its confidence, the probability for each emotion, inference time and the device used.

> Browsers only allow microphone access on `localhost` or over HTTPS.

### API examples

**cURL**

```bash
curl -X POST http://127.0.0.1:8000/api/predict -F "file=@sample.wav"
```

**Python**

```python
import requests

with open("sample.wav", "rb") as f:
    r = requests.post("http://127.0.0.1:8000/api/predict", files={"file": f})
print(r.json())
```

**JavaScript**

```javascript
const form = new FormData();
form.append("file", audioBlob, "recording.wav");

const res = await fetch("http://127.0.0.1:8000/api/predict", { method: "POST", body: form });
console.log(await res.json());
```

If `ENABLE_AUTH=True`, add `Authorization: Bearer <API_TOKEN>` to the request.

---

## 📚 API Documentation

Full, always-current docs are generated by FastAPI at **`/docs`** (Swagger UI) and **`/redoc`**.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service information |
| `/health` | GET | Simple liveness check |
| `/api/predict` | POST | Predict emotion from an uploaded audio file (`file` form field) |
| `/api/health` | GET | Health check |
| `/api/health/detailed` | GET | Health, model status, device and version |
| `/api/status` | GET | Server and model status |
| `/api/metrics` | GET | System, GPU and inference metrics |
| `/api/gpu` | GET | GPU information |
| `/api/models` | GET | List available models (admin) |
| `/api/switch_model` | POST | Switch the active model (admin) |
| `/api/clear_model` | POST | Unload the model and free memory (admin) |

Admin endpoints require an `x-api-key` header that matches `API_TOKEN`.

### `POST /api/predict` response

```json
{
  "emotion": "happy",
  "confidence": 0.87,
  "raw_scores": [0.02, 0.01, 0.03, 0.87, 0.04, 0.01, 0.02],
  "inference_time_ms": 145.3,
  "audio_duration_seconds": 3.5,
  "model_used": "best_efficientnet_v2_m+vgg16+densenet121",
  "device": "cpu",
  "timestamp": "2026-10-29T10:30:45.123Z",
  "warning": null
}
```

`raw_scores` are probabilities in the order: `angry, disgust, fear, happy, neutral, sad, surprise`.

### Errors

Handled errors return:

```json
{
  "error": "Bad Request",
  "message": "...",
  "detail": "...",
  "timestamp": "2026-10-29T10:30:45.123Z"
}
```

---

## ⚙️ Configuration

### Backend (`backend/.env`)

Settings are loaded by [`backend/config.py`](backend/config.py) from environment variables or a `backend/.env` file. All are optional.

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Bind address |
| `PORT` | `8000` | Port |
| `RELOAD` | `True` | Auto-reload on code changes |
| `WORKERS` | `1` | Worker processes |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000` | Comma-separated allowed origins |
| `ENABLE_AUTH` | `False` | Require a Bearer token on `/api/predict` |
| `API_TOKEN` | `dev-token-change-in-production` | Bearer token, also used as the admin `x-api-key` |
| `RATE_LIMIT` | `100/minute` | Per-IP rate limit |
| `MODEL_PATH` | `backend/models/best_efficientnet_v2_m+vgg16+densenet121.pt` | TorchScript model file |
| `DEVICE` | `auto` | `auto`, `cuda` or `cpu` |
| `ENABLE_MODEL_PRELOAD` | `True` | Load the model at startup |
| `LOG_LEVEL` | `INFO` | Logging level |
| `LOG_DIR` | `logs` | Log directory |
| `MAX_FILE_SIZE_MB` | `50` | Maximum upload size |
| `ENABLE_METRICS` | `True` | Collect metrics |

Example:

```env
ENABLE_AUTH=True
API_TOKEN=replace-with-a-long-random-string
CORS_ORIGINS=http://localhost:3000
DEVICE=cpu
```

### Frontend (`frontend/Voice-Emotion-Detector/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | Backend URL |
| `NEXT_PUBLIC_API_TOKEN` | *(empty)* | Only if the backend has `ENABLE_AUTH=True`. Visible in the browser, so use it for local demos only. |

---

## 📁 Project Structure

```
Emotion-Detection-from-voice/
├── backend/                         # FastAPI backend
│   ├── main.py                      # App entry point, middleware, root routes
│   ├── config.py                    # Settings (env vars / .env)
│   ├── config/training_config.json  # Preprocessing + model metadata
│   ├── models/
│   │   ├── schemas.py               # Pydantic response models
│   │   └── *.pt                     # Model file goes here (not committed)
│   ├── routers/
│   │   ├── inference.py             # /api/predict
│   │   ├── monitor.py               # health, status, metrics, GPU
│   │   └── admin.py                 # model management
│   ├── utils/
│   │   ├── audio_preprocess.py      # Audio → mel spectrogram
│   │   ├── model_loader.py          # Model loading and inference
│   │   ├── inference_tracer.py      # Per-request traces
│   │   ├── logging_utils.py         # Structured logging
│   │   ├── metrics.py               # Metrics collection
│   │   └── security.py              # Auth and rate limiting
│   ├── test_*.py                    # API test scripts
│   ├── start_server.py / .ps1       # Backend-only launchers
│   ├── install.ps1                  # Windows setup helper
│   ├── install_ffmpeg.ps1           # Windows FFmpeg installer
│   ├── Dockerfile                   # Backend image (used by compose)
│   ├── Dockerfile.fastapi           # Alternative backend image
│   └── requirements.txt
│
├── frontend/Voice-Emotion-Detector/ # Next.js frontend
│   ├── app/                         # layout.tsx, page.tsx, globals.css
│   ├── components/                  # EmotionRecorder, FileUploader, ResultsDisplay,
│   │                                # HistoryList, StatusBadge, ThemeToggle
│   ├── lib/                         # api.ts, audio.ts, emotions.ts, theme.ts,
│   │                                # hooks/useEmotionAPI.ts
│   ├── public/icon.svg
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── Ai.ipynb                         # Original training notebook
├── train_kaggle.ipynb               # Cloud (Kaggle/Colab) training + export
├── docker-compose.yml
├── start_all.py                     # Starts backend + frontend
├── START_ALL.bat                    # Windows launcher
├── requirements.txt
└── LICENSE
```

---

## 🧠 Model Information

### Ensemble

| Component | Role |
|-----------|------|
| EfficientNetV2-M | CNN backbone |
| VGG16 | CNN backbone |
| DenseNet121 | CNN backbone |
| **Ensemble** | Combines the three into one TorchScript model that outputs softmax probabilities |

### Results (validation set)

| Metric | Score |
|--------|-------|
| Accuracy | **74.4%** |
| Weighted F1 | **74.4%** |

Source: [`backend/config/training_config.json`](backend/config/training_config.json).

### Training data

- **Datasets:** CREMA-D, RAVDESS, SAVEE and TESS (combined)
- **Classes:** angry, disgust, fear, happy, neutral, sad, surprise
- **Split:** 80/20 stratified train/validation, seed 42

### Preprocessing

The backend reproduces the training pipeline exactly ([`audio_preprocess.py`](backend/utils/audio_preprocess.py)):

| Step | Value |
|------|-------|
| Sample rate | 22,050 Hz |
| Duration | padded/trimmed to 4.0 s |
| Noise reduction | `noisereduce` spectral gating |
| Loudness | RMS normalization |
| Mel spectrogram | `n_fft=1024`, `hop_length=256`, 128 mel bins, dB scale |
| Input size | resized to 128 × 128 (bilinear), z-score normalized |

### Retraining

Open [`train_kaggle.ipynb`](train_kaggle.ipynb) on Kaggle (GPU T4 x2 or P100, Internet on) or Colab and run all cells. It downloads the datasets, builds spectrograms, trains the three networks, evaluates the ensemble and exports `best_efficientnet_v2_m+vgg16+densenet121.pt`. Copy that file into `backend/models/`.

---

## 🧪 Testing

With the backend running:

```bash
cd backend
python test_all_endpoints.py       # hit every endpoint
python test_single_prediction.py   # one prediction end to end
python test_alignment.py           # check preprocessing matches training
python test_api.py                 # general API checks
```

Quick manual checks:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/metrics
curl -X POST http://127.0.0.1:8000/api/predict -F "file=@sample.wav"
```

Frontend type check:

```bash
cd frontend/Voice-Emotion-Detector
npm run lint     # runs tsc --noEmit
npm run build
```

---

## 🔍 Troubleshooting

**FFmpeg not found / WebM recordings fail**
Install FFmpeg (see [Prerequisites](#-prerequisites)) and make sure `ffmpeg -version` works in a new terminal.

**Model file not found**
Check that `backend/models/best_efficientnet_v2_m+vgg16+densenet121.pt` exists, or that `MODEL_PATH` points to the file. With Docker, the file must be at `phase3_outputs/final_export/best_model.pt`.

**Port already in use**

```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9
```

**CUDA out of memory**
Set `DEVICE=cpu` in `backend/.env`.

**Frontend shows the backend as offline**
- Open http://127.0.0.1:8000/health to confirm the backend is up.
- Make sure the frontend's origin is listed in `CORS_ORIGINS`.
- Check `NEXT_PUBLIC_API_URL` in `.env.local`, then restart `npm run dev`.

**401/403 from the API**
The backend has `ENABLE_AUTH=True`. Send `Authorization: Bearer <API_TOKEN>`, or set `NEXT_PUBLIC_API_TOKEN` for the frontend.

**Microphone not working**
Use `localhost` or HTTPS, and allow microphone access in the browser.

**Logs**
See `backend/logs/` (`system/`, `predictions/`, `inference_trace/`).

---

## 🤝 Contributing

1. Fork the repository and create a branch: `git checkout -b feature/my-change`
2. Make your changes. Run `black` and `flake8` on backend code and `npm run lint` on the frontend.
3. Commit using conventional prefixes (`feat:`, `fix:`, `docs:`, ...).
4. Push and open a pull request describing the change.

Bug reports and feature requests: [GitHub Issues](https://github.com/sriramm84/Emotion-Detection-from-voice/issues)

---

## 🗺️ Roadmap

- [ ] Real-time streaming inference over WebSockets
- [ ] Batch prediction for multiple files
- [ ] Waveform visualization
- [ ] Improve accuracy (more data, augmentation, newer backbones)
- [ ] Multi-language evaluation

---

## 📄 License

Licensed under the **MIT License**. See [LICENSE](LICENSE).

---

## 🙏 Acknowledgments

- **Datasets:** CREMA-D, RAVDESS, SAVEE, TESS
- **Architectures:** EfficientNetV2, VGG, DenseNet
- **Libraries:** FastAPI, Next.js, PyTorch, torchaudio, librosa, pydub, noisereduce

<div align="center">

⭐ **Star the repo** if you find it useful!

</div>
