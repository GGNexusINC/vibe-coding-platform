import io
import os
import threading
import time
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from faster_whisper import WhisperModel

MODEL_SIZE = os.getenv("FASTER_WHISPER_MODEL", "small")
DEVICE = os.getenv("FASTER_WHISPER_DEVICE", "cuda")
COMPUTE_TYPE = os.getenv("FASTER_WHISPER_COMPUTE_TYPE", "float16")
BEAM_SIZE = int(os.getenv("FASTER_WHISPER_BEAM_SIZE", "5"))
VAD_FILTER = os.getenv("FASTER_WHISPER_VAD_FILTER", "true").lower() == "true"
LANGUAGE = os.getenv("FASTER_WHISPER_LANGUAGE", "").strip() or None

app = FastAPI(title="NewHopeGGN Local STT Worker", version="1.0.0")

_model_lock = threading.Lock()
_model: Optional[WhisperModel] = None
_model_loaded_at: Optional[float] = None


def get_model() -> WhisperModel:
    global _model, _model_loaded_at
    if _model is not None:
        return _model

    with _model_lock:
        if _model is None:
            started = time.time()
            _model = WhisperModel(
                MODEL_SIZE,
                device=DEVICE,
                compute_type=COMPUTE_TYPE,
            )
            _model_loaded_at = time.time()
            print(
                f"[local-stt-worker] loaded model={MODEL_SIZE} device={DEVICE} compute_type={COMPUTE_TYPE} "
                f"in {round(_model_loaded_at - started, 2)}s"
            )
    return _model


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "local-stt-worker",
        "model": MODEL_SIZE,
        "device": DEVICE,
        "computeType": COMPUTE_TYPE,
        "loaded": _model is not None,
        "loadedAt": _model_loaded_at,
    }


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(default=None),
    beam_size: Optional[int] = Form(default=None),
    vad_filter: Optional[bool] = Form(default=None),
):
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Audio filename missing.")

    content = await audio.read()
    if not content:
        raise HTTPException(status_code=400, detail="Audio payload missing.")

    model = get_model()
    active_language = (language or LANGUAGE or None)
    active_beam_size = beam_size or BEAM_SIZE
    active_vad_filter = VAD_FILTER if vad_filter is None else bool(vad_filter)

    started = time.time()
    segments, info = model.transcribe(
        io.BytesIO(content),
        language=active_language,
        beam_size=active_beam_size,
        vad_filter=active_vad_filter,
    )

    transcript_parts = []
    segment_count = 0
    for segment in segments:
        segment_count += 1
        if segment.text:
            transcript_parts.append(segment.text.strip())

    transcript = " ".join(part for part in transcript_parts if part).strip()

    return {
        "ok": True,
        "text": transcript,
        "language": getattr(info, "language", None),
        "languageProbability": getattr(info, "language_probability", None),
        "durationSeconds": getattr(info, "duration", None),
        "segments": segment_count,
        "latencyMs": round((time.time() - started) * 1000),
        "model": MODEL_SIZE,
        "device": DEVICE,
        "computeType": COMPUTE_TYPE,
    }
