import json

import pytest
from fastapi.testclient import TestClient

from depression_backend.main import app

client = TestClient(app)

PATIENT = {"name": "王小明", "pid": "A123456789", "birth": "1990-01-01"}
DOCTOR = {"name": "陳醫師", "dept": "精神科"}


def post(patient=PATIENT, audio=("a.wav", b"RIFF"), transcript=None):
    files = {"audio": audio}
    if transcript:
        files["transcript"] = transcript
    data = {"patient": json.dumps(patient), "doctor": json.dumps(DOCTOR)}
    return client.post("/analyze", files=files, data=data)


@pytest.mark.parametrize("pid, label", [("A123456789", 1), ("B123456789", 0)])
def test_returns_label(pid, label):
    r = post({**PATIENT, "pid": pid}, transcript=("t.txt", b"hello"))
    assert r.status_code == 200
    assert r.json() == {"label": label}


def test_bad_pid():
    assert post({**PATIENT, "pid": "A12345"}).status_code == 422


def test_bad_audio_ext():
    assert post(audio=("a.ogg", b"x")).status_code == 422


def test_bad_transcript_ext():
    assert post(transcript=("t.pdf", b"x")).status_code == 422


def test_missing_audio():
    data = {"patient": json.dumps(PATIENT), "doctor": json.dumps(DOCTOR)}
    assert client.post("/analyze", data=data).status_code == 422
