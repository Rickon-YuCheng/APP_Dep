import json
import re
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .inference import predict

AUDIO_EXTS = {".wav", ".mp3", ".m4a"}
TRANSCRIPT_EXTS = {".txt", ".csv", ".docx"}
MAX_AUDIO_BYTES = 200 * 1024 * 1024
PID_RE = re.compile(r"^[A-Z][0-9]{9}$")

app = FastAPI()


def _parse_json(field: str, raw: str, keys: tuple[str, ...]) -> dict:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(422, f"{field} 不是合法的 JSON")
    if not isinstance(data, dict) or any(not isinstance(data.get(k), str) for k in keys):
        raise HTTPException(422, f"{field} 需包含字串欄位 {', '.join(keys)}")
    return data


@app.post("/analyze")
async def analyze(
    audio: UploadFile = File(...),
    transcript: UploadFile | None = File(None),
    patient: str = Form(...),
    doctor: str = Form(...),
) -> dict:
    p = _parse_json("patient", patient, ("name", "pid", "birth"))
    _parse_json("doctor", doctor, ("name", "dept"))

    pid = p["pid"].strip().upper()
    if not PID_RE.match(pid):
        raise HTTPException(422, "身分證字號格式錯誤(1 英文字母 + 9 數字)")

    if Path(audio.filename or "").suffix.lower() not in AUDIO_EXTS:
        raise HTTPException(422, "語音檔僅支援 WAV/MP3/M4A")
    audio_bytes = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "語音檔超過 200MB")

    transcript_bytes = None
    if transcript is not None:
        if Path(transcript.filename or "").suffix.lower() not in TRANSCRIPT_EXTS:
            raise HTTPException(422, "逐字稿僅支援 TXT/CSV/DOCX")
        transcript_bytes = await transcript.read()

    return {"label": predict(audio_bytes, transcript_bytes, pid)}
