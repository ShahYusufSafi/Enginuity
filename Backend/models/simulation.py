"""DEPRECATED — replaced by the canonical model in Backend/core/model.py.

`SimulationRequest` (domain/num_elements/bc) was the ad-hoc request body of
the old /simulate endpoint. The canonical `Poisson1DModel` supersedes it:
schema-versioned, hashable, with declarative forcing. This shim remains only
so stale imports fail loudly with a pointer instead of silently drifting.
"""

from core.model import Poisson1DModel as SimulationRequest  # noqa: F401
