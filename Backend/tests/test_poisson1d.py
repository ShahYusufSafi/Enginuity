"""Validation suite for the numerical (tier 1) Poisson solver (§3.3).

Three kinds of check:
1. Exactness — cases where linear FEM lands on the exact answer at the nodes.
2. Convergence — L2 error has to shrink at the theoretical O(h^2) rate.
3. Determinism and provenance — same input, same output, same hash.

These are the receipts behind every number the solver reports, which is why
they run in CI on every commit rather than when I remember to run them.

Method selection and error estimation are tested in test_ladder.py.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from core.model import (
    ConstantForcing,
    Poisson1DModel,
    PolynomialForcing,
    SineForcing,
)
from core.provenance import sha256_of_model
from FEM.poisson1d import solve_poisson_1d


def l2_error(x: np.ndarray, u_h: np.ndarray, u_exact: np.ndarray) -> float:
    """Composite-trapezoid L2 norm of the nodal error."""
    return math.sqrt(np.trapezoid((u_h - u_exact) ** 2, x))


# ---------------------------------------------------------------------------
# Tier 1 — analytical exactness
# ---------------------------------------------------------------------------

def test_zero_forcing_reproduces_linear_solution_exactly():
    """-u'' = 0, u(0)=2, u(1)=5  ->  u(x) = 2 + 3x, exact at nodes."""
    model = Poisson1DModel(
        domain=(0.0, 1.0),
        num_elements=17,  # deliberately odd
        dirichlet=(2.0, 5.0),
        forcing=ConstantForcing(value=0.0),
    )
    result, _ = solve_poisson_1d(model)
    x = np.array(result.x)
    u = np.array(result.u)
    assert np.allclose(u, 2.0 + 3.0 * x, atol=1e-12)


def test_constant_forcing_exact_at_nodes():
    """-u'' = 1, u(0)=u(1)=0  ->  u(x) = x(1-x)/2.

    With linear elements and exact load integration the nodal values are
    exact (superconvergence); nodal quadrature IS exact for constant f.
    """
    model = Poisson1DModel(
        domain=(0.0, 1.0),
        num_elements=16,
        dirichlet=(0.0, 0.0),
        forcing=ConstantForcing(value=1.0),
    )
    result, _ = solve_poisson_1d(model)
    x = np.array(result.x)
    u = np.array(result.u)
    assert np.allclose(u, x * (1.0 - x) / 2.0, atol=1e-12)


def test_conductivity_scales_solution():
    """-(k u')' = 1 with k=2 halves the k=1 solution."""
    base = Poisson1DModel(num_elements=32, forcing=ConstantForcing(value=1.0))
    stiff = base.model_copy(update={"conductivity": 2.0})
    u1 = np.array(solve_poisson_1d(base)[0].u)
    u2 = np.array(solve_poisson_1d(stiff)[0].u)
    assert np.allclose(u2, u1 / 2.0, atol=1e-12)


def test_shifted_domain_sine():
    """Domain (1,3), f = pi^2/4 * sin(pi (x-1)/2), u=0 at both ends
    ->  u(x) = sin(pi (x-1)/2) ... verified loosely (discretization error)."""
    model = Poisson1DModel(
        domain=(1.0, 3.0),
        num_elements=128,
        dirichlet=(0.0, 0.0),
        forcing=SineForcing(amplitude=(math.pi / 2.0) ** 2, mode=1),
    )
    result, _ = solve_poisson_1d(model)
    x = np.array(result.x)
    u = np.array(result.u)
    u_exact = np.sin(np.pi * (x - 1.0) / 2.0)
    assert l2_error(x, u, u_exact) < 5e-4


# ---------------------------------------------------------------------------
# Tier 2 — convergence at the theoretical rate
# ---------------------------------------------------------------------------

def test_l2_convergence_rate_is_second_order():
    """Manufactured solution u = sin(pi x): f = pi^2 sin(pi x), u(0)=u(1)=0.

    Linear elements must converge in L2 at O(h^2). We fit the slope of
    log(error) vs log(h) over a mesh sequence and require slope ~ 2.
    """
    errors: list[float] = []
    hs: list[float] = []
    for n in (8, 16, 32, 64, 128):
        model = Poisson1DModel(
            domain=(0.0, 1.0),
            num_elements=n,
            dirichlet=(0.0, 0.0),
            forcing=SineForcing(amplitude=math.pi**2, mode=1),
        )
        result, _ = solve_poisson_1d(model)
        x = np.array(result.x)
        u = np.array(result.u)
        errors.append(l2_error(x, u, np.sin(np.pi * x)))
        hs.append(result.h)

    slope = np.polyfit(np.log(hs), np.log(errors), 1)[0]
    assert 1.9 < slope < 2.1, f"L2 convergence slope {slope:.3f} not ~2"


def test_linear_forcing_is_nodally_exact():
    """f = x  ->  u = (x - x^3)/6 on (0,1) with u(0)=u(1)=0.

    Superconvergence: for linear f the nodal quadrature b_i = h*f(x_i) equals
    the exact load integral (midpoint symmetry of hat functions), and 1D FEM
    with exact loads reproduces the exact solution at the nodes. So we assert
    machine-precision nodal exactness rather than a convergence rate.
    """
    for n in (16, 64):
        model = Poisson1DModel(
            num_elements=n,
            forcing=PolynomialForcing(coefficients=[0.0, 1.0]),
        )
        result, _ = solve_poisson_1d(model)
        x = np.array(result.x)
        u = np.array(result.u)
        assert np.allclose(u, (x - x**3) / 6.0, atol=1e-12)


# ---------------------------------------------------------------------------
# Tier 3 — determinism and provenance
# ---------------------------------------------------------------------------

def test_solver_is_deterministic():
    model = Poisson1DModel(num_elements=64)
    r1, _ = solve_poisson_1d(model)
    r2, _ = solve_poisson_1d(model)
    assert r1.u == r2.u and r1.x == r2.x


def test_manifest_identifies_input():
    model = Poisson1DModel(num_elements=64)
    _, manifest = solve_poisson_1d(model)
    assert manifest.input_sha256 == sha256_of_model(model)
    assert manifest.solver_name == "poisson1d"
    assert manifest.solver_version
    assert manifest.libraries.numpy and manifest.libraries.scipy


def test_equal_models_hash_equal_and_different_models_differ():
    a = Poisson1DModel(num_elements=64)
    b = Poisson1DModel(num_elements=64)
    c = Poisson1DModel(num_elements=65)
    assert sha256_of_model(a) == sha256_of_model(b)
    assert sha256_of_model(a) != sha256_of_model(c)


def test_invalid_domain_rejected():
    with pytest.raises(ValueError):
        Poisson1DModel(domain=(1.0, 0.0))
