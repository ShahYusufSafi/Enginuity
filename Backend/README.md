# Backend — Enginuity API

FastAPI service: canonical model, solvers, provenance. Design rationale is in [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md); this file covers how to work in the directory.

## Layout

| Directory | Role |
|---|---|
| `core/` | Canonical schemas, provenance, method-ladder vocabulary |
| `ingest/` | Formats in, canonical models out. DXF is the primary path |
| `FEM/` | Solvers as tiers. Entry point is `ladder.solve` |
| `tests/` | Validation suite |
| `models/` | Deprecated shim, scheduled for deletion |
| `main.py` | HTTP boundary only — no numerics, no parsing, no plotting |

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/import/dxf` | DXF file → `{model, report}` |
| `POST /api/simulate/poisson1d` | `{model, tolerance?, budget?}` → `{result, manifest, selection}` |
| `GET /api/schema` | JSON Schemas of the canonical models |
| `GET /check` | Liveness |

`tolerance` is optional. Without it you get one solve and no error estimate. With it, the ladder spends what it takes to bound the error, and reports in `selection.tolerance_met` if it couldn't inside `budget`. `selection.message` is a plain-language sentence written for the end user — including when the problem has no closed-form solution.

## Running

```bash
docker-compose up --build backend       # from repo root

pip install -r requirements-dev.txt     # or locally
uvicorn main:app --reload --port 8000
python -m pytest                        # ~1s
```

## Rules

1. Formats live at the boundary. Nothing below `main.py`/`ingest/` knows what a DXF is.
2. Solvers are pure functions — no I/O, no globals, no rendering.
3. Every solve returns a manifest and a selection record. Both are cheap now and impossible to retrofit.
4. Validation tests before endpoints. An unchecked solver doesn't get exposed.
5. A method that can't handle a problem says so, in words the user can read. Never silently substitute a different one.
