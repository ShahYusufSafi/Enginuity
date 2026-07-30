# Architecture

How Enginuity is put together, and why. This is the public reference for anyone reading the code — including me in six months.

> Section numbers match the internal strategy notes, so a `§3.2` in a code comment resolves here.

Everything below follows from one goal: **a number this tool produces should be checkable.** Not "trust us" — checkable. That means knowing what was computed, from which input, by which method, and how accurate that method claims to be.

---

## §3.0 The method ladder

Solvers are not called directly. A caller asks for a solution and, optionally, an accuracy it needs; the ladder picks the method.

```
tier 0  analytical  closed form            exact, to round-off     cost ~0
tier 1  numerical   discretized (FEM)      estimated on request    1 solve, 2+ if bounded
tier 2  surrogate   trained approximation  residual-gauged         not implemented
```

**The rule:** pick the cheapest method whose error is within the requested tolerance.

**Tier 0 is a fast path, not the normal case.** A closed form exists only where someone has derived one for that exact shape of problem — constant coefficients, simple domain, a load that integrates in closed form. Standard load cases on prismatic members qualify. An arbitrary region traced out of a DWG does not, and never will. When tier 0 declines, it returns a reason, and that reason is shown to the user: *"This problem has no closed-form solution: …"*. Falling through to tier 1 is the expected path for real work.

**Tier 1 is where the actual work happens.** Error is bounded by discretization theory rather than eliminated, so results carry an estimate. Ask for a tolerance and the solver refines until a Richardson estimate is inside it, or until the `Budget` stops it — in which case the result comes back with `tolerance_met=False`. A number that missed its target must never be presentable as one that hit it.

**Tier 2 is empty on purpose.** A surrogate earns its place only when tier 1 is correct but too slow for a real use case (live previews, large sweeps). Its contract is fixed in `FEM/ladder.py:SURROGATE_SLOT`: it never certifies anything on its own, and its error is measured by substituting the prediction back into the governing equation. The gauge is arithmetic on the PDE, never a second learned model — a learned confidence score relocates the trust problem instead of solving it.

**Error estimation is opt-in.** A Richardson estimate costs a second solve. Paying that on every call, to bound a number nobody asked about, is waste. No tolerance requested → one solve, `basis="unknown"`, and the result says so.

**No claim beats floating point.** "Exact" means round-off, not zero, so `ErrorEstimate.exact()` reports machine epsilon. Ask for `1e-20` and even the closed form reports the tolerance as unmet, because no method can meet it.

Code: `core/methods.py` (vocabulary), `FEM/ladder.py` (selection), `FEM/poisson1d_exact.py` (tier 0), `FEM/poisson1d.py` (tier 1).

---

## §3.1 The canonical model

One versioned representation everything else is written against. Formats, solvers and UIs get replaced around it; this is the part that shouldn't need rewriting.

- `DrawingModel` — 2D geometry (lines, polylines, arcs, circles), layers, units, bbox, and the source file's SHA-256. Entity ids are DXF handles, so any result traces back to the entity it came from.
- `Poisson1DModel` / `Poisson1DResult` — an analysis problem and its answer. Forcing is declarative (`sine` / `constant` / `polynomial`), not a code string, because a run has to stay hashable and reproducible.

Rules: file formats never appear below the boundary; bump `SCHEMA_VERSION` when a field changes meaning and write the migration. The frontend mirror is `Efrontend/src/types/canonical.ts`, and `GET /api/schema` publishes the schemas as the tie-breaker.

Code: `core/model.py`.

---

## §3.2 Provenance

Every solve returns a `RunManifest`: run id, UTC timestamp, solver name and version, SHA-256 of the canonical input, and exact numpy/scipy/ezdxf/Python versions. Serialization is deterministic (sorted keys) so identical models hash identically.

This is the identity half — *what was computed, from what, by which version*. The accuracy half is §3.0. Both were built in from the first commit because neither can be added later; you cannot hash inputs you no longer have.

Code: `core/provenance.py`.

---

## §3.3 Validation

Every solver ships with tests before it gets an endpoint. Three kinds:

1. **Exactness** — cases where the method should land on the exact answer to machine precision.
2. **Convergence** — error must shrink at the theoretical rate (slope ~2 for linear elements).
3. **Determinism and provenance** — same input, same output, same hash.

Tier 0 doubles as the reference for tier 1: the closed forms are a production solver *and* what the numerical tests measure against.

The test that matters most is not "is the error small" but "is the error estimate honest" — `test_richardson_estimate_brackets_the_true_error` fails if the estimate is optimistic by more than 2× against the measured error.

CI runs the suite on every push. Code: `Backend/tests/`.

---

## §3.4 Intake and formats

```
DWG ──(converter service, ODA, swappable)──▶ DXF ──(ezdxf)──▶ DrawingModel
DXF ─────────────────────────────────────────────────────────▶ DrawingModel
```

DXF is the primary path: openly documented, exported by every CAD tool, parsed in-process. No proprietary binary sits in the critical path. DWG is translated at the edge by the converter service, which is quarantined behind HTTP so swapping ODA touches one service.

Importers implement a `DrawingImporter` protocol. Skipped entity types are counted and reported — an engineer needs to know what the tool ignored.

Code: `ingest/`, `converter/`.

---

## §3.6 Frontend

The viewer draws canonical entities directly, so what's on screen is selectable, measurable data rather than a picture. One rendering stack (plain SVG DOM), with world→screen math kept pure and React-free in `viewerMath.ts`.

Anything the backend computes arrives as data; the frontend draws it. No server-side plotting.

Code: `Efrontend/src/components/ModelViewer/`.

---

## Service layout

| Service | Job |
|---|---|
| `Backend` | Canonical model, solvers, provenance. FastAPI. |
| `converter` | DWG → DXF only. Quarantines the ODA dependency. |
| `Efrontend` | React/Vite UI. |

Each has a README describing its own internals.
