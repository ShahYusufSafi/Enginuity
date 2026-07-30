"""API tests: the HTTP boundary in front of the canonical model."""

from __future__ import annotations

from fastapi.testclient import TestClient

from main import app
from tests.test_dxf_import import build_sample_dxf

client = TestClient(app)


def test_check():
    assert client.get("/check").status_code == 200


def test_schema_endpoint_publishes_canonical_models():
    res = client.get("/api/schema")
    assert res.status_code == 200
    body = res.json()
    assert body["schema_version"]
    assert {"drawing", "poisson1d", "simulate_request", "selection"} <= body.keys()


def test_import_dxf_happy_path():
    res = client.post(
        "/api/import/dxf",
        files={"file": ("sample.dxf", build_sample_dxf(), "application/dxf")},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["model"]["model_kind"] == "drawing"
    assert body["report"]["imported_entities"] == 4
    assert body["model"]["source"]["sha256"]


def test_import_rejects_non_dxf_extension():
    res = client.post(
        "/api/import/dxf",
        files={"file": ("drawing.dwg", b"AC1027 garbage", "application/octet-stream")},
    )
    assert res.status_code == 422


def test_import_rejects_unparseable_content():
    res = client.post(
        "/api/import/dxf",
        files={"file": ("bad.dxf", b"this is not a dxf", "application/dxf")},
    )
    assert res.status_code == 422


SINE_MODEL = {
    "domain": [0.0, 1.0],
    "num_elements": 32,
    "dirichlet": [0.0, 0.0],
    "forcing": {"type": "sine", "amplitude": 9.8696044, "mode": 1},
}


def test_simulate_poisson1d_returns_result_manifest_and_selection():
    res = client.post("/api/simulate/poisson1d", json={"model": SINE_MODEL})
    assert res.status_code == 200
    body = res.json()

    assert len(body["result"]["x"]) == len(body["result"]["u"])
    assert len(body["manifest"]["input_sha256"]) == 64

    # This problem has a closed form, so the ladder should answer from tier 0.
    selection = body["selection"]
    assert selection["chosen"]["fidelity"] == "analytical"
    assert selection["error"]["basis"] == "exact"
    assert selection["tolerance_met"] is True


def test_simulate_accepts_a_tolerance():
    res = client.post(
        "/api/simulate/poisson1d", json={"model": SINE_MODEL, "tolerance": 1e-5}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["selection"]["requested_tolerance"] == 1e-5
    assert body["selection"]["error"]["relative"] is not None


def test_simulate_rejects_nonsense_tolerance():
    res = client.post(
        "/api/simulate/poisson1d", json={"model": SINE_MODEL, "tolerance": -1}
    )
    assert res.status_code == 422


def test_simulate_validates_the_model():
    res = client.post(
        "/api/simulate/poisson1d",
        json={"model": {"domain": [1.0, 0.0], "num_elements": 32}},
    )
    assert res.status_code == 422
