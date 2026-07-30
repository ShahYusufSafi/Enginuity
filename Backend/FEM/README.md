# FEM/ — solvers as a ladder

Call `ladder.solve(model, tolerance=...)`. Don't call a tier directly outside tests. Rationale: [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §3.0.

```
tier 0  poisson1d_exact.py   closed form      exact to round-off   ~0 cost
tier 1  poisson1d.py         linear FEM       O(h²), estimated     1 solve, 2+ if bounded
tier 2  (empty)              surrogate        residual gauge       Phase 4
```

## `poisson1d_exact.py` — tier 0, and it is narrow

Integrate `-k u'' = f` twice, fit the constants to the Dirichlet ends.

The scope is small and stays small: constant `k`, Dirichlet data at both ends, and a forcing listed in `CLOSED_FORMS`. Adding an entry there means deriving the particular solution in `_particular()` and adding a test that differentiates it back into the PDE. Anything else — variable coefficients, tabulated loads, an arbitrary 2D region from a drawing — has no closed form, and `applicability()` returns a reason that gets shown to the user.

**Tier 0 declining is normal.** Most real problems land on tier 1. Treat tier 0 as a fast path for cases someone derived, not as the expected answer.

This module is also the reference tier 1 is tested against (§3.3).

## `poisson1d.py` — tier 1, the actual workhorse

Linear (P1) elements, uniform mesh, nodal quadrature for the load vector, Dirichlet by elimination. O(h²) in L2 for smooth f; nodally exact for constant and linear f. Pure function.

## `ladder.py` — selection

No tolerance → tier 0 if it applies, else one numerical solve with `basis=unknown`. Tolerance → tier 0 still preferred, else refine with Richardson until the estimate passes or `Budget` stops it, returning `tolerance_met=False` when it doesn't.

`_richardson_error` writes out its derivation in the docstring so the estimate can be checked rather than trusted: for order p, the fine-grid error is the mesh-to-mesh difference times `2⁻ᵖ/(1−2⁻ᵖ)`, one third at p=2.

`SURROGATE_SLOT` is a string, not code. It fixes the tier-2 contract: canonical models in and out, `Fidelity.surrogate`, and a `gauge()` computed by substituting the prediction back into the governing equation. Arithmetic on the PDE — a second learned model would just move the trust problem.

## Staged, not wired up

`MatrixAssemblers.py` / `MeshGenerator.py` are 2D P1 groundwork for later. `solver.py` is the superseded demo kernel. Neither is in the tier contract and neither has validation tests — don't build on them until they do.

## Adding a solver

1. Schemas in `core/model.py`, bump `SCHEMA_VERSION`.
2. Declare a `MethodInfo` and an `applicability()` that gives a readable reason when it declines.
3. Write the validation tests first.
4. Register in `ladder.py`, state how it estimates its own error.
5. Document the discretization here and in the module docstring.
