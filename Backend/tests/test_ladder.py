"""Tests for the method ladder (§3.0).

Three things have to hold:

1. The exact tier is actually exact, and it wins whenever it applies.
2. The numerical tier's error estimate is honest — it has to bracket the error
   we can measure against the closed form, not just look small.
3. Selection reports the truth: which tier ran, whether the tolerance was met,
   and what was tried on the way.

The third is the one that matters most in practice. A wrong number caught by a
correct error estimate is a bad solve; a wrong number reported as accurate is a
broken product.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from core.methods import (
    MACHINE_EPS_CLAIM,
    Applicability,
    Budget,
    ErrorBasis,
    Fidelity,
)
from core.model import (
    ConstantForcing,
    Poisson1DModel,
    PolynomialForcing,
    SineForcing,
)
from FEM import poisson1d_exact
from FEM.ladder import solve
from FEM.poisson1d import solve_poisson_1d


def rel_l2(x: np.ndarray, approx: np.ndarray, exact: np.ndarray) -> float:
    num = math.sqrt(np.trapezoid((approx - exact) ** 2, x))
    den = math.sqrt(np.trapezoid(exact**2, x))
    return num / den if den > 0 else num


# ---------------------------------------------------------------------------
# Tier 0 is exact
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "forcing",
    [
        ConstantForcing(value=1.0),
        ConstantForcing(value=-3.5),
        SineForcing(amplitude=math.pi**2, mode=1),
        SineForcing(amplitude=2.0, mode=3),
        PolynomialForcing(coefficients=[0.0, 1.0]),
        PolynomialForcing(coefficients=[1.0, -2.0, 0.5]),
    ],
)
def test_exact_solution_satisfies_the_equation(forcing):
    """Check -k u'' = f by differentiating the closed form numerically."""
    model = Poisson1DModel(
        domain=(0.0, 2.0), conductivity=1.7, dirichlet=(1.0, -0.5), forcing=forcing
    )
    x = np.linspace(0.0, 2.0, 20001)
    u = poisson1d_exact.evaluate_exact(model, x)

    h = x[1] - x[0]
    u_xx = (u[:-2] - 2 * u[1:-1] + u[2:]) / h**2
    lhs = -model.conductivity * u_xx

    from FEM.poisson1d import forcing_callable

    rhs = forcing_callable(model.forcing, model.domain)(x[1:-1])
    assert np.allclose(lhs, rhs, atol=1e-4)


def test_exact_solution_hits_the_boundary_values():
    model = Poisson1DModel(
        domain=(1.0, 4.0), dirichlet=(2.5, -1.25), forcing=ConstantForcing(value=2.0)
    )
    result, _, error = poisson1d_exact.solve_exact(model)
    assert result.u[0] == pytest.approx(2.5, abs=1e-12)
    assert result.u[-1] == pytest.approx(-1.25, abs=1e-12)
    assert error.basis is ErrorBasis.exact
    # Not zero: a closed form is still evaluated in floating point.
    assert error.relative == MACHINE_EPS_CLAIM


def test_ladder_prefers_the_exact_tier():
    model = Poisson1DModel(forcing=SineForcing(amplitude=math.pi**2, mode=1))
    _, manifest, record = solve(model)
    assert record.chosen.fidelity is Fidelity.analytical
    assert record.tolerance_met is True
    assert record.error.basis is ErrorBasis.exact
    assert manifest.solver_name == "poisson1d-exact"


def test_exact_tier_declines_and_says_why(numerical_only):
    """No closed form: fall through to tier 1 and tell the user why."""
    model = Poisson1DModel(num_elements=32, forcing=ConstantForcing(value=1.0))
    _, _, record = solve(model)

    assert record.chosen.fidelity is Fidelity.numerical
    declined = record.attempts[0]
    assert declined.outcome == "not_applicable"
    assert "no closed-form solution" in declined.note
    # The reason has to reach the user, not stop in the log.
    assert "no closed-form solution" in record.message


def test_applicability_names_the_obstacle():
    """A forcing nobody derived must be declined with a readable reason."""

    class Tabulated:
        type = "tabulated"

    model = Poisson1DModel()
    object.__setattr__(model, "forcing", Tabulated())  # skip validation for the check
    verdict = poisson1d_exact.applicability(model)
    assert verdict.applies is False
    assert "tabulated" in verdict.reason
    assert "no closed-form solution" in verdict.reason


def test_exact_claims_no_more_than_floating_point_allows():
    """A tolerance below round-off is met by nothing, tier 0 included."""
    model = Poisson1DModel(forcing=ConstantForcing(value=1.0))
    _, _, record = solve(model, tolerance=1e-20)
    assert record.chosen.fidelity is Fidelity.analytical
    assert record.tolerance_met is False
    assert "below floating-point round-off" in record.message
    assert "No method can meet it" in record.message


# ---------------------------------------------------------------------------
# Tier 1 error estimation
# ---------------------------------------------------------------------------

@pytest.fixture()
def numerical_only(monkeypatch):
    monkeypatch.setattr(
        poisson1d_exact,
        "applicability",
        lambda _model: Applicability(
            applies=False, reason="This problem has no closed-form solution."
        ),
    )


def test_no_tolerance_means_no_estimate_and_one_solve(numerical_only):
    model = Poisson1DModel(num_elements=32, forcing=SineForcing(amplitude=1.0, mode=2))
    result, _, record = solve(model)
    assert record.error.basis is ErrorBasis.unknown
    assert record.error.relative is None
    assert record.error.is_estimated is False
    assert record.tolerance_met is False  # nothing promised, nothing met
    assert len(result.x) == 33  # solved once, at the requested resolution


def test_richardson_estimate_brackets_the_true_error(numerical_only):
    """The estimate must not be optimistic: compare it to the measured error."""
    model = Poisson1DModel(
        num_elements=16, forcing=SineForcing(amplitude=math.pi**2, mode=1)
    )
    result, _, record = solve(model, tolerance=1e-3)

    x = np.array(result.x)
    exact = poisson1d_exact.evaluate_exact(model, x)
    measured = rel_l2(x, np.array(result.u), exact)

    assert record.error.basis is ErrorBasis.richardson
    assert record.error.relative is not None
    # Same order of magnitude, and not an underestimate by more than 2x.
    assert record.error.relative >= measured / 2
    assert record.error.relative <= max(measured * 20, 1e-9)


def test_refines_until_tolerance_is_met(numerical_only):
    model = Poisson1DModel(
        num_elements=4, forcing=SineForcing(amplitude=math.pi**2, mode=1)
    )
    result, _, record = solve(model, tolerance=1e-4)
    assert record.tolerance_met is True
    assert record.error.relative <= 1e-4
    assert record.refinements > 0
    assert len(result.x) > 5  # mesh actually grew

    x = np.array(result.x)
    measured = rel_l2(x, np.array(result.u), poisson1d_exact.evaluate_exact(model, x))
    assert measured <= 1e-3  # the promise holds against the closed form


def test_loose_tolerance_stops_early(numerical_only):
    model = Poisson1DModel(
        num_elements=64, forcing=SineForcing(amplitude=math.pi**2, mode=1)
    )
    _, _, record = solve(model, tolerance=1e-1)
    assert record.tolerance_met is True
    assert record.refinements == 0  # already good enough, don't spend more


def test_budget_stops_refinement_and_says_so(numerical_only):
    """An impossible tolerance must return a flagged result, not loop forever."""
    model = Poisson1DModel(
        num_elements=4, forcing=SineForcing(amplitude=math.pi**2, mode=1)
    )
    _, _, record = solve(
        model, tolerance=1e-14, budget=Budget(max_refinements=2, max_dofs=10_000)
    )
    assert record.tolerance_met is False
    assert record.attempts[-1].outcome == "over_budget"
    assert record.refinements <= 3
    assert "stopped at" in record.attempts[-1].note


def test_message_warns_when_a_tolerance_was_missed(numerical_only):
    model = Poisson1DModel(num_elements=4, forcing=SineForcing(amplitude=1.0, mode=1))
    _, _, record = solve(model, tolerance=1e-14, budget=Budget(max_refinements=1))
    assert "did not reach" in record.message
    assert "indicative" in record.message


def test_message_says_when_no_bound_was_asked_for(numerical_only):
    model = Poisson1DModel(num_elements=32, forcing=SineForcing(amplitude=1.0, mode=1))
    _, _, record = solve(model)
    assert "not estimated" in record.message


def test_message_is_plain_for_an_exact_solve():
    _, _, record = solve(Poisson1DModel(forcing=ConstantForcing(value=1.0)))
    assert record.message == "Solved exactly from a closed-form solution for this problem."


# ---------------------------------------------------------------------------
# Cross-tier agreement: the two rungs must agree with each other
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "forcing",
    [
        ConstantForcing(value=1.0),
        SineForcing(amplitude=math.pi**2, mode=1),
        PolynomialForcing(coefficients=[0.0, 1.0]),
    ],
)
def test_numerical_converges_to_the_closed_form(forcing):
    model = Poisson1DModel(
        domain=(0.0, 1.0), num_elements=256, dirichlet=(0.0, 0.0), forcing=forcing
    )
    result, _ = solve_poisson_1d(model)
    x = np.array(result.x)
    assert rel_l2(x, np.array(result.u), poisson1d_exact.evaluate_exact(model, x)) < 1e-4


def test_selection_record_is_serializable():
    """It ends up in reports and API responses, so it has to round-trip."""
    from core.methods import SelectionRecord

    _, _, record = solve(Poisson1DModel(), tolerance=1e-6)
    assert SelectionRecord.model_validate_json(record.model_dump_json()) == record
