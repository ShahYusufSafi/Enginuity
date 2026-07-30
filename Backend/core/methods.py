"""The method ladder: how a solve picks its method and reports its accuracy.

Strategy §3.0. The rule is one line:

    pick the cheapest method whose error is within the requested tolerance.

Tiers, in preference order:
  0 analytical  exact closed form, machine precision, negligible cost
  1 numerical   discretized, error bounded by theory and estimated on request
  2 surrogate   fast approximation, gauged by physics residual (empty until Phase 4)

Two rules that shape this file:

- Error estimation is opt-in. A Richardson estimate costs a second solve, so it
  runs when a caller asks for a tolerance, not on every call. Default is one
  solve reporting what it already knows.
- The tier that ran is part of the answer. "Exact" and "estimated 0.3%" are
  different claims, so ErrorEstimate travels with every result and lands in the
  report next to the number.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class Fidelity(str, Enum):
    """Which rung of the ladder a method sits on."""

    analytical = "analytical"
    numerical = "numerical"
    surrogate = "surrogate"


# Sort key for "cheapest first". Analytical is always preferred when it applies;
# surrogate is last because it needs the most scrutiny per unit of speed.
FIDELITY_ORDER: dict[Fidelity, int] = {
    Fidelity.analytical: 0,
    Fidelity.numerical: 1,
    Fidelity.surrogate: 2,
}


# Floor on any accuracy claim. Even a closed form is evaluated in floating
# point, so "exact" means round-off, not zero. Claiming 0.0 would let a request
# for tolerance=1e-20 come back as met, which is a lie we can avoid cheaply.
MACHINE_EPS_CLAIM = 2.220446049250313e-16


class Applicability(BaseModel):
    """Whether a method can handle a given problem, and why not when it can't.

    `reason` is shown to the user, so it says what about *their problem* put the
    method out of reach — not what is missing from our code.
    """

    applies: bool
    reason: str = ""


class ErrorBasis(str, Enum):
    """How an error number was arrived at. Different bases carry different weight.

    exact       closed-form solution; only floating-point round-off remains
    richardson  a posteriori: solved twice on refined meshes and extrapolated
    a_priori    from convergence theory alone, no second solve
    residual    surrogate output substituted back into the governing equation
    unknown     nothing was computed because no tolerance was requested
    """

    exact = "exact"
    richardson = "richardson"
    a_priori = "a_priori"
    residual = "residual"
    unknown = "unknown"


class ErrorEstimate(BaseModel):
    """What we are willing to claim about how wrong a result might be.

    `relative` is a relative L2 measure. None means "not estimated" — which is a
    legitimate answer when the caller did not ask and did not pay for it.
    """

    basis: ErrorBasis
    relative: float | None = None
    detail: str = ""

    @property
    def is_estimated(self) -> bool:
        return self.relative is not None

    def within(self, tolerance: float) -> bool:
        """True only if we actually estimated and the estimate passes.

        Unestimated error never counts as passing. Silence is not a guarantee.
        """
        return self.relative is not None and self.relative <= tolerance

    @classmethod
    def exact(cls, detail: str = "closed-form solution, floating-point round-off only") -> "ErrorEstimate":
        return cls(basis=ErrorBasis.exact, relative=MACHINE_EPS_CLAIM, detail=detail)

    @classmethod
    def not_requested(cls, detail: str = "no tolerance requested") -> "ErrorEstimate":
        return cls(basis=ErrorBasis.unknown, relative=None, detail=detail)


class Budget(BaseModel):
    """Limits on what a solve may spend chasing a tolerance.

    Refinement stops at whichever limit comes first. Missing the tolerance is
    reported, not hidden — a number that missed its target must not look like
    one that hit it.

    Defaults are sized for interactive use: six halvings is a 64x finer mesh,
    which is far more than a well-posed 1D problem needs, and 200k DOFs still
    solves in well under a second with a sparse direct solver.
    """

    max_dofs: int = Field(default=200_000, ge=1)
    max_refinements: int = Field(default=6, ge=0)


class MethodInfo(BaseModel):
    """Identity of the method that produced a result."""

    name: str
    version: str
    fidelity: Fidelity
    describes: str = ""


class Attempt(BaseModel):
    """One rung tried, and what came of it. Kept even when it failed.

    The failures are the interesting part: they show why the tier that answered
    was the one that answered.
    """

    method: MethodInfo
    outcome: Literal["used", "not_applicable", "insufficient_accuracy", "over_budget"]
    error: ErrorEstimate | None = None
    note: str = ""


class SelectionRecord(BaseModel):
    """The decision trail for a single solve.

    Answers "why this method and not another", which is the accuracy half of
    the provenance story (§3.2 covers the identity half).

    `message` is the user-facing sentence, computed by `explanation` and stored
    so it survives serialization into reports and API responses.
    """

    requested_tolerance: float | None = None
    chosen: MethodInfo
    error: ErrorEstimate
    tolerance_met: bool
    attempts: list[Attempt] = Field(default_factory=list)
    refinements: int = 0
    message: str = ""

    def finalize(self) -> "SelectionRecord":
        """Fill `message` from the record's own contents. Call before returning."""
        self.message = self.explanation
        return self

    @property
    def explanation(self) -> str:
        """One sentence a user can read, stating what happened and why.

        This is the message that has to be honest when a problem has no closed
        form, or when a requested tolerance was not reached.
        """
        declined = [
            a for a in self.attempts if a.outcome == "not_applicable" and a.note
        ]
        prefix = f"{declined[0].note} " if declined else ""

        if self.error.basis is ErrorBasis.exact:
            if self.requested_tolerance is not None and not self.tolerance_met:
                return (
                    "Solved exactly from a closed-form solution, but the requested "
                    f"tolerance {self.requested_tolerance:.2e} is below floating-point "
                    f"round-off (~{self.error.relative:.1e}). No method can meet it."
                )
            return "Solved exactly from a closed-form solution for this problem."

        if self.error.relative is None:
            return (
                f"{prefix}Solved numerically. No accuracy bound was requested, so "
                "the error was not estimated — ask for a tolerance to get one."
            )

        if self.tolerance_met:
            return (
                f"{prefix}Solved numerically to an estimated relative error of "
                f"{self.error.relative:.2e}, within the requested "
                f"{self.requested_tolerance:.2e}."
            )

        return (
            f"{prefix}Solved numerically, but the estimated relative error "
            f"{self.error.relative:.2e} did not reach the requested "
            f"{self.requested_tolerance:.2e} within the allowed budget. "
            "Treat this result as indicative, not as a bounded answer."
        )
