"""Enginuity backend API.

Endpoints (JSON, all speaking the canonical model — see core/):
- POST /api/import/dxf         DXF file -> DrawingModel + ImportReport
- POST /api/simulate/poisson1d Poisson1DModel -> result + manifest + selection
- GET  /api/schema             JSON Schemas of the canonical models
- GET  /check                  liveness

House rules:
- Solvers return numbers; the frontend draws (no matplotlib here).
- Every solve carries a provenance manifest (§3.2) and a selection record
  saying which tier ran and how accurate it claims to be (§3.0).
- File formats are parsed at this boundary only. Nothing DXF-shaped goes deeper.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core.methods import Budget, SelectionRecord
from core.model import (
    SCHEMA_VERSION,
    DrawingModel,
    Poisson1DModel,
    Poisson1DResult,
)
from core.provenance import RunManifest
from FEM.ladder import solve as solve_ladder
from ingest.dxf_importer import DxfImporter, ImportReport

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB is generous for 2D DXF

app = FastAPI(title="Enginuity API", version=SCHEMA_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # frontend dev server
        "http://frontend:5173",   # frontend container
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Response envelopes
# ---------------------------------------------------------------------------

class ImportResponse(BaseModel):
    model: DrawingModel
    report: ImportReport


class SimulateRequest(BaseModel):
    """A problem, plus optionally how accurate the answer has to be.

    Leave `tolerance` unset and you get one solve with no error estimate — the
    cheap path. Set it and the ladder will spend what it takes to bound the
    error, or tell you it couldn't inside `budget` (§3.0).
    """

    model: Poisson1DModel
    tolerance: float | None = Field(default=None, gt=0.0, le=1.0)
    budget: Budget | None = None


class SimulateResponse(BaseModel):
    result: Poisson1DResult
    manifest: RunManifest
    selection: SelectionRecord


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/api/import/dxf", response_model=ImportResponse)
async def import_dxf(file: UploadFile) -> ImportResponse:
    if file.filename and not file.filename.lower().endswith(".dxf"):
        raise HTTPException(
            status_code=422,
            detail="Only .dxf files are accepted here. Convert DWG to DXF first "
            "(the converter service does this at the edge).",
        )
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 20 MB limit.")
    if not data:
        raise HTTPException(status_code=422, detail="Empty file.")

    try:
        model, report = DxfImporter().import_bytes(data, filename=file.filename)
    except Exception as exc:  # ezdxf raises many specific types; surface cleanly
        raise HTTPException(status_code=422, detail=f"Could not parse DXF: {exc}") from exc

    return ImportResponse(model=model, report=report)


@app.post("/api/simulate/poisson1d", response_model=SimulateResponse)
async def simulate_poisson1d(request: SimulateRequest) -> SimulateResponse:
    result, manifest, selection = solve_ladder(
        request.model, tolerance=request.tolerance, budget=request.budget
    )
    return SimulateResponse(result=result, manifest=manifest, selection=selection)


@app.get("/api/schema")
def schemas() -> dict:
    """The canonical model schemas, published. An open model is the product."""
    return {
        "schema_version": SCHEMA_VERSION,
        "drawing": DrawingModel.model_json_schema(),
        "poisson1d": Poisson1DModel.model_json_schema(),
        "poisson1d_result": Poisson1DResult.model_json_schema(),
        "simulate_request": SimulateRequest.model_json_schema(),
        "selection": SelectionRecord.model_json_schema(),
    }


@app.get("/check")
def check() -> str:
    return "Backend!!"
