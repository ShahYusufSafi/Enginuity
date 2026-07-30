"""Tier 0 for the 1D Poisson problem: closed forms, where one exists (§3.0).

    -k u''(x) = f(x)  on (x0, x1),   u(x0) = g0,  u(x1) = g1

Integrate twice and fit the two constants to the boundary conditions. With u_p
any particular solution of u_p'' = -f/k:

    u(x) = u_p(x) + a + b x
    b    = [(g1 - u_p(x1)) - (g0 - u_p(x0))] / (x1 - x0)
    a    = g0 - u_p(x0) - b x0

Scope, stated plainly because this tier is easy to over-sell: a closed form
exists only when someone has sat down and derived one for that exact shape of
problem. Here that means constant k, Dirichlet data at both ends, and a forcing
in CLOSED_FORMS below. Anything else — variable coefficients, arbitrary tabulated
loads, a 2D region traced out of somebody's DWG — has no closed form and never
will. Those are the numerical solver's job, and that is the normal case, not the
fallback.

`applicability()` returns the reason when it declines, and that reason is shown
to the user. "Your problem cannot be solved analytically" is a fine thing to
say; pretending otherwise is not.

Double duty: tier 0 in production, and the reference the numerical solver is
tested against (§3.3).
"""

from __future__ import annotations

import numpy as np

from core.model import (
    Forcing,
    Poisson1DModel,
    Poisson1DResult,
)
from core.methods import Applicability, ErrorEstimate, Fidelity, MethodInfo
from core.provenance import RunManifest, build_manifest

METHOD = MethodInfo(
    name="poisson1d-exact",
    version="1.0.0",
    fidelity=Fidelity.analytical,
    describes="closed-form solution of -k u'' = f with Dirichlet ends",
)

# Nodes reported for a closed-form solve. The solution is exact everywhere, so
# this is sampling density for plotting, not accuracy.
DEFAULT_SAMPLES = 201

# Forcings a closed form has actually been derived for. Adding an entry means
# adding the derivation to _particular() and a test that differentiates it back
# into the PDE. Not listed here means not solvable analytically by this module.
CLOSED_FORMS: frozenset[str] = frozenset({"constant", "sine", "polynomial"})


def applicability(model: Poisson1DModel) -> Applicability:
    """Can this exact problem be written down in closed form?

    The reason goes in front of the user, so it names the obstacle in their
    problem rather than a gap in our code.
    """
    if model.forcing.type not in CLOSED_FORMS:
        return Applicability(
            applies=False,
            reason=(
                f"This problem has no closed-form solution: the load f(x) is "
                f"{model.forcing.type!r}, which cannot be integrated in closed "
                "form here."
            ),
        )
    return Applicability(applies=True)


def _particular(forcing: Forcing, x: np.ndarray, x0: float, length: float, k: float) -> np.ndarray:
    """A particular solution u_p with u_p'' = -f/k."""
    if forcing.type == "constant":
        # f = c            ->  u_p = -c x^2 / (2k)
        return -forcing.value * x**2 / (2.0 * k)

    if forcing.type == "sine":
        # f = A sin(w s), s = x - x0, w = m pi / L
        #                  ->  u_p = A sin(w s) / (k w^2)
        w = forcing.mode * np.pi / length
        return forcing.amplitude * np.sin(w * (x - x0)) / (k * w**2)

    if forcing.type == "polynomial":
        # f = sum a_i x^i  ->  u_p = -(1/k) sum a_i x^(i+2) / ((i+1)(i+2))
        u_p = np.zeros_like(x, dtype=float)
        for i, a in enumerate(forcing.coefficients):
            if a == 0.0:
                continue
            u_p -= a * x ** (i + 2) / ((i + 1) * (i + 2) * k)
        return u_p

    raise TypeError(f"No closed form registered for forcing {forcing.type!r}")


def solve_exact(
    model: Poisson1DModel,
    samples: int = DEFAULT_SAMPLES,
) -> tuple[Poisson1DResult, RunManifest, ErrorEstimate]:
    """Evaluate the closed-form solution. Error is machine precision."""
    x0, x1 = model.domain
    length = x1 - x0
    k = model.conductivity
    g0, g1 = model.dirichlet

    x = np.linspace(x0, x1, samples)
    u_p = _particular(model.forcing, x, x0, length, k)

    # Fit a + b x to the boundary conditions.
    u_p_left = float(_particular(model.forcing, np.array([x0]), x0, length, k)[0])
    u_p_right = float(_particular(model.forcing, np.array([x1]), x0, length, k)[0])
    b = ((g1 - u_p_right) - (g0 - u_p_left)) / length
    a = g0 - u_p_left - b * x0

    u = u_p + a + b * x

    result = Poisson1DResult(
        x=x.tolist(),
        u=u.tolist(),
        h=float(length / (samples - 1)),
        num_dofs=0,  # nothing was solved for; the solution is written down
    )
    manifest = build_manifest(
        solver_name=METHOD.name,
        solver_version=METHOD.version,
        input_model=model,
        notes={
            "method": "analytical",
            "derivation": "integrate twice, fit constants to Dirichlet data",
            "forcing": model.forcing.type,
        },
    )
    return result, manifest, ErrorEstimate.exact()


def evaluate_exact(model: Poisson1DModel, x: np.ndarray) -> np.ndarray:
    """Exact u at arbitrary points. Used by tests to measure numerical error."""
    x0, x1 = model.domain
    length = x1 - x0
    k = model.conductivity
    g0, g1 = model.dirichlet

    u_p = _particular(model.forcing, np.asarray(x, dtype=float), x0, length, k)
    u_p_left = float(_particular(model.forcing, np.array([x0]), x0, length, k)[0])
    u_p_right = float(_particular(model.forcing, np.array([x1]), x0, length, k)[0])
    b = ((g1 - u_p_right) - (g0 - u_p_left)) / length
    a = g0 - u_p_left - b * x0
    return u_p + a + b * np.asarray(x, dtype=float)
