"""Tier 1 for the 1D Poisson problem: linear finite elements, uniform mesh.

    -(k u')' = f   on (x0, x1),   u(x0) = g0,  u(x1) = g1

Pure function of the canonical `Poisson1DModel`: no I/O, no globals, no
plotting. Returns numbers and a manifest; the frontend draws.

Callers should normally go through FEM.ladder.solve rather than calling this
directly, so the exact solution gets used when it applies (§3.0).

Discretization, written down so the tests can be checked against it:
- N elements -> N+1 equally spaced nodes, h = L/N.
- Linear (hat) elements give (k/h) * tridiag(-1, 2, -1) on interior nodes.
- Load vector by nodal quadrature, b_i = h * f(x_i). Exact for constant and
  linear f; keeps the O(h^2) L2 rate for smooth f.
- Dirichlet ends by elimination, with the boundary values lifted onto the RHS.
"""

from __future__ import annotations

from typing import Callable

import numpy as np
import scipy.sparse as sp
from scipy.sparse.linalg import spsolve

from core.model import (
    ConstantForcing,
    Forcing,
    Poisson1DModel,
    Poisson1DResult,
    PolynomialForcing,
    SineForcing,
)
from core.methods import Fidelity, MethodInfo
from core.provenance import RunManifest, build_manifest

SOLVER_NAME = "poisson1d"
SOLVER_VERSION = "1.0.0"

METHOD = MethodInfo(
    name=SOLVER_NAME,
    version=SOLVER_VERSION,
    fidelity=Fidelity.numerical,
    describes="linear (P1) finite elements on a uniform mesh, O(h^2) in L2",
)


def forcing_callable(forcing: Forcing, domain: tuple[float, float]) -> Callable[[np.ndarray], np.ndarray]:
    """Turn a declarative forcing spec into a vectorized f(x).

    Specs rather than code strings, so a run stays serializable, hashable and
    reproducible.
    """
    x0, x1 = domain
    length = x1 - x0

    if isinstance(forcing, SineForcing):
        amplitude, mode = forcing.amplitude, forcing.mode
        return lambda x: amplitude * np.sin(mode * np.pi * (x - x0) / length)
    if isinstance(forcing, ConstantForcing):
        value = forcing.value
        return lambda x: np.full_like(np.asarray(x, dtype=float), value)
    if isinstance(forcing, PolynomialForcing):
        # np.polyval expects descending order; model stores ascending.
        coeffs_desc = list(reversed(forcing.coefficients))
        return lambda x: np.polyval(coeffs_desc, x)
    raise TypeError(f"Unsupported forcing type: {type(forcing).__name__}")


def assemble_stiffness_1d(num_elements: int, h: float, conductivity: float) -> sp.csr_matrix:
    """Interior stiffness matrix (Dirichlet DOFs eliminated).

    Assembled element-by-element to keep the pattern that generalizes to 2D,
    then restricted to interior nodes 1..N-1.
    """
    n_nodes = num_elements + 1
    k_local = (conductivity / h) * np.array([[1.0, -1.0], [-1.0, 1.0]])

    rows: list[int] = []
    cols: list[int] = []
    vals: list[float] = []
    for e in range(num_elements):
        for a in range(2):
            for b in range(2):
                rows.append(e + a)
                cols.append(e + b)
                vals.append(k_local[a, b])

    k_global = sp.coo_matrix((vals, (rows, cols)), shape=(n_nodes, n_nodes)).tocsr()
    return k_global[1:-1, 1:-1].tocsr()


def solve_poisson_1d(model: Poisson1DModel) -> tuple[Poisson1DResult, RunManifest]:
    """Solve the model. Pure function: same input -> same output, always."""
    x0, x1 = model.domain
    n = model.num_elements
    h = (x1 - x0) / n
    x = np.linspace(x0, x1, n + 1)
    g0, g1 = model.dirichlet

    f = forcing_callable(model.forcing, model.domain)

    # Solve for interior nodes only; the boundary values are already known.
    K = assemble_stiffness_1d(n, h, model.conductivity)
    b = h * f(x[1:-1])

    # Eliminating the boundary DOFs leaves their stiffness coupling behind:
    # row 1 had a -k/h term multiplying u_0, so move k*g0/h to the RHS. Same at
    # the far end. Skipping this silently imposes u=0 at the ends instead.
    b[0] += model.conductivity * g0 / h
    b[-1] += model.conductivity * g1 / h

    u = np.empty(n + 1)
    u[0], u[-1] = g0, g1
    u[1:-1] = spsolve(K, b)

    result = Poisson1DResult(
        x=x.tolist(),
        u=u.tolist(),
        h=h,
        num_dofs=n - 1,
    )
    manifest = build_manifest(
        solver_name=SOLVER_NAME,
        solver_version=SOLVER_VERSION,
        input_model=model,
        notes={
            "quadrature": "nodal (lumped), exact for constant f",
            "elements": "linear (P1), uniform mesh",
        },
    )
    return result, manifest
