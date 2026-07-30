"""Solvers, arranged as the method ladder (strategy §3.0).

Entry point is `ladder.solve` — it picks the tier. Call the tiers directly only
in tests, where you want a specific one.

  tier 0  poisson1d_exact   closed form, exact
  tier 1  poisson1d         linear FEM, O(h^2), Richardson error on request
  tier 2  (empty)           surrogate slot, Phase 4; see ladder.SURROGATE_SLOT

Staged, not wired to anything yet:
  MatrixAssemblers / MeshGenerator  2D P1 groundwork for Phase 3
  solver.FEM_element_based          the original demo kernel, superseded
"""

from .ladder import solve
from .poisson1d import METHOD as NUMERICAL_METHOD
from .poisson1d import SOLVER_NAME, SOLVER_VERSION, solve_poisson_1d
from .poisson1d_exact import METHOD as ANALYTICAL_METHOD
from .poisson1d_exact import evaluate_exact, solve_exact
from .solver import FEM_element_based  # deprecated

__all__ = [
    "solve",
    "solve_poisson_1d",
    "solve_exact",
    "evaluate_exact",
    "NUMERICAL_METHOD",
    "ANALYTICAL_METHOD",
    "SOLVER_NAME",
    "SOLVER_VERSION",
    "FEM_element_based",
]
