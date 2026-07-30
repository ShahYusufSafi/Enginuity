# core/

The parts that shouldn't need rewriting. Formats, solvers and UIs get replaced around them. Rationale: [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §3.0–3.2.

## `model.py` — canonical schemas

`DrawingModel` (geometry, layers, units, bbox, source hash; entity ids are DXF handles) and `Poisson1DModel`/`Poisson1DResult` (declarative forcing, not code strings).

Changing a schema: bump `SCHEMA_VERSION`, write the migration. Frontend mirror is `Efrontend/src/types/canonical.ts`.

## `provenance.py` — identity

`canonical_json` → deterministic bytes → `sha256_of_model`. `build_manifest` returns a `RunManifest` carrying run id, timestamp, solver name/version, input hash and library versions.

## `methods.py` — accuracy

| Type | Purpose |
|---|---|
| `Fidelity` | Which rung: analytical / numerical / surrogate |
| `Applicability` | Whether a method can take a problem, **and the user-facing reason when it can't** |
| `ErrorEstimate` + `ErrorBasis` | The accuracy claim and how it was arrived at |
| `Budget` | How much refinement a solve may spend |
| `Attempt` / `SelectionRecord` | The decision trail, including methods that declined |
| `MACHINE_EPS_CLAIM` | Floor on any claim — "exact" means round-off, not zero |

Two deliberate behaviours:

- `ErrorEstimate.within()` returns False for unestimated error. Silence is not a guarantee.
- `SelectionRecord.finalize()` writes `message`, the sentence shown to the user. Call it before returning a record, or the UI gets an empty string.

Selection logic itself lives in `FEM/ladder.py` — choosing between solvers is solver work. This module only defines the vocabulary.
