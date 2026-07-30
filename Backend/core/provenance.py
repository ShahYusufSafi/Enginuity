"""Provenance: every run is identified, hashed and reproducible (§3.2).

A `RunManifest` rides along with every result the API returns, and later with
every report. It answers one question, permanently:

    what was computed, by which solver version, from which input?

Built in from the first commit because it can't be added later — you can't
hash inputs you no longer have.

The manifest covers identity. Accuracy is the other half and lives in
core/methods.py (§3.0): which tier ran, and how wrong it might be.
"""

from __future__ import annotations

import hashlib
import platform
import uuid
from datetime import datetime, timezone

from pydantic import BaseModel

from .model import SCHEMA_VERSION


def canonical_json(model: BaseModel) -> str:
    """Deterministic JSON: sorted keys, fixed separators.

    Two models that mean the same thing must serialize to the same bytes, or
    the hash is useless. Sorting keys ourselves rather than relying on pydantic
    field order keeps that true across pydantic versions.
    """
    import json

    return json.dumps(model.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))


def sha256_of_model(model: BaseModel) -> str:
    return hashlib.sha256(canonical_json(model).encode("utf-8")).hexdigest()


def sha256_of_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class LibraryVersions(BaseModel):
    python: str
    numpy: str
    scipy: str
    ezdxf: str | None = None


def _library_versions() -> LibraryVersions:
    import numpy
    import scipy

    try:
        import ezdxf

        ezdxf_version: str | None = ezdxf.__version__
    except Exception:  # pragma: no cover - ezdxf is an install-time dependency
        ezdxf_version = None

    return LibraryVersions(
        python=platform.python_version(),
        numpy=numpy.__version__,
        scipy=scipy.__version__,
        ezdxf=ezdxf_version,
    )


class RunManifest(BaseModel):
    """The reproducibility record attached to every solver run."""

    run_id: str
    created_utc: str
    schema_version: str
    solver_name: str
    solver_version: str
    input_sha256: str
    libraries: LibraryVersions
    notes: dict[str, str] = {}


def build_manifest(
    *,
    solver_name: str,
    solver_version: str,
    input_model: BaseModel,
    notes: dict[str, str] | None = None,
) -> RunManifest:
    return RunManifest(
        run_id=str(uuid.uuid4()),
        created_utc=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        schema_version=SCHEMA_VERSION,
        solver_name=solver_name,
        solver_version=solver_version,
        input_sha256=sha256_of_model(input_model),
        libraries=_library_versions(),
        notes=notes or {},
    )
