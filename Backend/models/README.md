# models/ — deprecated

The old ad-hoc request models lived here. As of Phase 0 (2026-07), request/response schemas are canonical models in **`Backend/core/model.py`** — schema-versioned, hashable, documented.

`simulation.py` remains only as a deprecation shim (`SimulationRequest` re-exports `core.model.Poisson1DModel`) so stale imports fail loudly with a pointer instead of drifting. Do not add new models here; this directory is scheduled for removal once nothing imports from it.
