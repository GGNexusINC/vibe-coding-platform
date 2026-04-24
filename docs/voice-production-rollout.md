# NewHopeGGN Voice Production Rollout

## Target Architecture

`Discord Bot -> voice router -> STT backend -> translation -> Discord output / TTS`

### Production backend policy

- `VOICE_STT_MODE=deepgram`
  - Use Deepgram for all live voice transcription.
- `VOICE_STT_MODE=local`
  - Use the self-hosted faster-whisper worker for all supported voice transcription.
- `VOICE_STT_MODE=hybrid`
  - Keep Deepgram as the premium / fallback path while the local worker is validated under load.

## Why this rollout exists

Deepgram is still the safest real-time path today, but local faster-whisper workers are the clearest path to lowering free/basic tier cost. The right production move is to operate both paths until local latency and GPU cost are proven with live Discord sessions.

## Local STT worker

Service location:

- `services/local-stt-worker/app.py`
- `services/local-stt-worker/Dockerfile`

### Health check

- `GET /health`

### Transcription endpoint

- `POST /transcribe`
- multipart form
- file field: `audio`
- optional form fields:
  - `language`
  - `beam_size`
  - `vad_filter`

## Recommended first production sequence

1. Keep Deepgram as default.
2. Deploy the local worker on a GPU host.
3. Load test the worker with real Discord-style clips.
4. Measure:
   - p50 latency
   - p95 latency
   - failure rate
   - GPU saturation
   - transcription quality vs Deepgram
5. Only then route free/basic sessions to the local worker.

## Minimum acceptance gates before switching free/basic traffic

- p95 transcription latency under 2000 ms for normal Discord utterances
- no crash/restart loops during overlapping speakers
- no silent transcript loss on worker overload
- clear fallback to Deepgram if the local worker errors or times out

## Environment variables

### Discord bot

- `VOICE_STT_MODE=deepgram|local|hybrid`
- `LOCAL_STT_WORKER_URL=https://...`

### Local worker

- `FASTER_WHISPER_MODEL=small`
- `FASTER_WHISPER_DEVICE=cuda`
- `FASTER_WHISPER_COMPUTE_TYPE=float16`
- `FASTER_WHISPER_BEAM_SIZE=5`
- `FASTER_WHISPER_VAD_FILTER=true`
- `FASTER_WHISPER_LANGUAGE=`

## Honest production note

This repo now includes the local worker service and production rollout documentation, but the worker is not automatically handling live Discord traffic yet. GPU hosting, latency validation, and the final routing cutover still have to be completed before you can truthfully market the local path as production-ready.
