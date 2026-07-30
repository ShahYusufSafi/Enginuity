"""Method selection for the 1D Poisson problem (strategy §3.0).

Callers ask for a solution and, optionally, an accuracy they need. They do not
name a solver. This module decides:

    tolerance is None  ->  exact if available, else one numerical solve,
                           error reported as "not estimated"
    tolerance given    ->  exact if available (error 0 beats any tolerance),
                           else numerical + Richardson, refining until the
                           estimate passes or the budget runs out

Why error estimation is not always on: a Richardson estimate means solving
twice. That is a real cost, and paying it on every call for a number nobody
asked to bound is waste. Ask for a guarantee, pay for the second solve.

When the budget runs out before the tolerance is met, the result still comes
back — with `tolerance_met=False`. A number that missed its target must never
be presentable as one that hit it.

The surrogate rung is not implemented. It is described in `SURROGATE_SLOT`
below so the shape of what plugs in later is fixed now: it must expose a
deterministic residual gauge, and it must never be the last word on a number
that matters.
"""

from __future__ import annotations

import numpy as np

from core.methods import (
    Attempt,
    Budget,
    ErrorBasis,
    ErrorEstimate,
    SelectionRecord,
)
from core.model import Poisson1DModel, Poisson1DResult
from core.provenance import RunManifest
from FEM import poisson1d_exact
from FEM.poisson1d import METHOD as NUMERICAL_METHOD
from FEM.poisson1d import solve_poisson_1d

# Convergence order of the numerical tier: linear (P1) elements in L2.
# Used to weight the Richardson extrapolation below.
NUMERICAL_ORDER = 2

SURROGATE_SLOT = """
Tier 2, not implemented (Phase 4). Contract for whatever fills it:

  - inputs and outputs are canonical models, same as every other tier
  - it declares Fidelity.surrogate
  - it exposes gauge(model, result) -> ErrorEstimate with
    basis=ErrorBasis.residual, computed by substituting the predicted solution
    back into the governing equation and measuring the violation
  - the gauge is arithmetic on the PDE, never a second learned model; a learned
    confidence score moves the trust problem instead of solving it
  - a result whose gauge exceeds tolerance escalates to tier 1 automatically
"""


def _richardson_error(
    coarse: Poisson1DResult,
    fine: Poisson1DResult,
    order: int = NUMERICAL_ORDER,
) -> tuple[float, str]:
    """Estimate the relative L2 error of the *fine* solution.

    With u_h = u + C h^p, halving the mesh gives

        u_{h/2} - u_h = C h^p (2^-p - 1)

    so the fine-grid error is

        |u_{h/2} - u| = 2^-p |C h^p| = |u_{h/2} - u_h| * 2^-p / (1 - 2^-p)

    which for p = 2 is one third of the difference between the two meshes.
    Compared on the coarse mesh's nodes, which are every second fine node.
    """
    # Uniform meshes with the element count doubled, so every second fine node
    # sits exactly on a coarse node. That makes the comparison exact — no
    # interpolation error contaminating the error estimate.
    u_coarse = np.asarray(coarse.u)
    u_fine_on_coarse = np.asarray(fine.u)[::2]
    x = np.asarray(coarse.x)

    diff = float(np.sqrt(np.trapezoid((u_fine_on_coarse - u_coarse) ** 2, x)))
    norm = float(np.sqrt(np.trapezoid(u_fine_on_coarse**2, x)))

    factor = 2.0**-order / (1.0 - 2.0**-order)  # = 1/3 for p = 2
    absolute = diff * factor

    # Relative to the solution size; fall back to absolute for a ~zero solution.
    relative = absolute / norm if norm > 1e-300 else absolute
    detail = (
        f"Richardson on N={coarse.num_dofs + 1}/{fine.num_dofs + 1}, "
        f"assumed order p={order}"
    )
    return relative, detail


def solve(
    model: Poisson1DModel,
    tolerance: float | None = None,
    budget: Budget | None = None,
) -> tuple[Poisson1DResult, RunManifest, SelectionRecord]:
    """Solve, choosing the cheapest method that meets `tolerance`."""
    budget = budget or Budget()
    attempts: list[Attempt] = []

    # --- Tier 0: closed form, when one exists for this problem --------------
    #
    # Most real problems will not have one. That is expected, not a failure:
    # tier 0 is a fast path for cases someone has derived, and the reason it
    # declines is passed to the user rather than swallowed.
    applicable = poisson1d_exact.applicability(model)
    if applicable.applies:
        result, manifest, error = poisson1d_exact.solve_exact(model)
        attempts.append(Attempt(method=poisson1d_exact.METHOD, outcome="used", error=error))
        # Exact still means floating point, so a tolerance below round-off is
        # not met by anything, including this.
        met = tolerance is None or error.within(tolerance)
        record = SelectionRecord(
            requested_tolerance=tolerance,
            chosen=poisson1d_exact.METHOD,
            error=error,
            tolerance_met=met,
            attempts=attempts,
        )
        return result, manifest, record.finalize()

    attempts.append(
        Attempt(
            method=poisson1d_exact.METHOD,
            outcome="not_applicable",
            note=applicable.reason,
        )
    )

    # --- Tier 1: numerical --------------------------------------------------
    if tolerance is None:
        # Nobody asked for a bound, so don't pay for the second solve.
        result, manifest = solve_poisson_1d(model)
        error = ErrorEstimate.not_requested(
            "pass a tolerance to trigger Richardson estimation"
        )
        attempts.append(Attempt(method=NUMERICAL_METHOD, outcome="used", error=error))
        return result, manifest, SelectionRecord(
            requested_tolerance=None,
            chosen=NUMERICAL_METHOD,
            error=error,
            tolerance_met=False,  # nothing was promised, so nothing was met
            attempts=attempts,
        ).finalize()

    # Refinement loop. Each pass keeps the previous fine mesh as the new coarse
    # one, so a doubling costs one extra solve rather than two.
    n = model.num_elements
    refinements = 0
    coarse_model = model.model_copy(update={"num_elements": n})
    coarse, _ = solve_poisson_1d(coarse_model)

    while True:
        fine_model = model.model_copy(update={"num_elements": n * 2})
        fine, fine_manifest = solve_poisson_1d(fine_model)

        relative, detail = _richardson_error(coarse, fine)
        error = ErrorEstimate(
            basis=ErrorBasis.richardson, relative=relative, detail=detail
        )

        if error.within(tolerance):
            attempts.append(Attempt(method=NUMERICAL_METHOD, outcome="used", error=error))
            return fine, fine_manifest, SelectionRecord(
                requested_tolerance=tolerance,
                chosen=NUMERICAL_METHOD,
                error=error,
                tolerance_met=True,
                attempts=attempts,
                refinements=refinements,
            ).finalize()

        # Not accurate enough. Refine, unless that would break the budget.
        next_n = n * 2
        out_of_budget = (
            refinements + 1 > budget.max_refinements or next_n * 2 > budget.max_dofs
        )
        if out_of_budget:
            attempts.append(
                Attempt(
                    method=NUMERICAL_METHOD,
                    outcome="over_budget",
                    error=error,
                    note=(
                        f"stopped at N={next_n}: "
                        f"refinements={refinements + 1}/{budget.max_refinements}, "
                        f"max_dofs={budget.max_dofs}"
                    ),
                )
            )
            return fine, fine_manifest, SelectionRecord(
                requested_tolerance=tolerance,
                chosen=NUMERICAL_METHOD,
                error=error,
                tolerance_met=False,
                attempts=attempts,
                refinements=refinements + 1,
            ).finalize()

        attempts.append(
            Attempt(method=NUMERICAL_METHOD, outcome="insufficient_accuracy", error=error)
        )
        coarse = fine
        n = next_n
        refinements += 1
