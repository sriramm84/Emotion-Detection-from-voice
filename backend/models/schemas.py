"""
Pydantic response models shared by the API routers.

Imported by main.py, routers/inference.py and routers/monitor.py.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


def get_current_timestamp() -> str:
    """Current UTC time as an ISO 8601 string ending in Z."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class _Base(BaseModel):
    # Allow field names that start with "model_" (model_used, model_loaded, ...)
    model_config = ConfigDict(protected_namespaces=())


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

class EmotionResponse(_Base):
    """Result of POST /api/predict."""

    emotion: str = Field(..., description="Predicted emotion label")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Probability of the predicted emotion")
    raw_scores: List[float] = Field(
        ...,
        description="Probabilities in class order: angry, disgust, fear, happy, neutral, sad, surprise",
    )
    inference_time_ms: float
    audio_duration_seconds: float
    model_used: Optional[str] = None
    device: str
    timestamp: str
    warning: Optional[str] = None


class ErrorResponse(_Base):
    """Body returned for every handled error."""

    error: str
    message: Optional[str] = None
    detail: Optional[str] = None
    timestamp: str


# ---------------------------------------------------------------------------
# Monitoring
# ---------------------------------------------------------------------------

class SystemMetrics(_Base):
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float


class GPUMetrics(_Base):
    available: bool
    device_name: Optional[str] = None
    memory_allocated_mb: Optional[float] = None
    memory_reserved_mb: Optional[float] = None
    memory_total_mb: Optional[float] = None
    utilization_percent: Optional[float] = None
    error: Optional[str] = None


class InferenceMetrics(_Base):
    total_predictions: int
    avg_inference_time_ms: float
    min_inference_time_ms: float
    max_inference_time_ms: float
    predictions_per_emotion: Dict[str, int]
    most_common_emotion: str


class MetricsResponse(_Base):
    """Result of GET /api/metrics."""

    system: SystemMetrics
    gpu: GPUMetrics
    inference: InferenceMetrics
    uptime_seconds: float
    timestamp: str


class HealthResponse(_Base):
    """Result of GET /api/health/detailed."""

    status: str = Field(..., description="healthy, degraded or unhealthy")
    uptime_seconds: float
    model_loaded: bool
    model_name: Optional[str] = None
    device: str
    version: str
    timestamp: str
    warnings: Optional[List[str]] = None
