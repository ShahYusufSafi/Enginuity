# tests/ — the validation suite

Not housekeeping. Enginuity's claim is that its numbers can be checked; this is the checking. CI runs it on every push. 49 tests, about one second.

```bash
cd Backend && pip install -r requirements-dev.txt && python -m pytest
```

| File | Covers |
|---|---|
| `test_poisson1d.py` | Tier 1: exactness, O(h²) convergence, determinism, manifest |
| `test_ladder.py` | Method selection, closed-form correctness, error-estimate honesty, budgets, user messages |
| `test_dxf_import.py` | DXF → canonical model round-trip |
| `test_api.py` | HTTP boundary: happy paths and rejections |

## The three checks every solver gets

1. **Exactness** — cases where the method should land on the exact answer to machine precision. Failure here means the implementation is wrong.
2. **Convergence** — error must shrink at the theoretical rate. Fit log(error) against log(h), require ~2 for linear elements. This catches methods that look plausible by accident.
3. **Determinism and provenance** — same input, same output, same hash.

## What `test_ladder.py` is really for

Not "is the error small" but **"is the claim honest"**:

- `test_richardson_estimate_brackets_the_true_error` fails if the estimate is optimistic by more than 2× against the error measured against the closed form.
- `test_exact_claims_no_more_than_floating_point_allows` — ask for `1e-20` and even the closed form must report the tolerance unmet.
- `test_exact_tier_declines_and_says_why` — when there's no closed form, the reason has to reach `record.message`, not stop in a log.
- Budget tests — when refinement runs out, the result comes back flagged.

A wrong number caught by a correct error estimate is a bad solve. A wrong number reported as accurate is a broken product.

## Conventions

- DXF fixtures are generated in-code with ezdxf. No binary files in the repo.
- Tier 0 is the reference for tier 1 — the closed forms are production code and the test oracle at once.
- A solver without validation tests doesn't get an endpoint.
- If a test fails because the code is *better* than the test assumed, assert the stronger property and write down why. That happened with `test_linear_forcing_is_nodally_exact`: it began as a convergence-ratio test and failed at ~1e-16, because nodal quadrature is exact for linear f and 1D FEM is nodally exact, so the ratio was meaningless.

Next: NAFEMS-style benchmarks and cross-checks against `sectionproperties` when 2D solvers land, published as a benchmarks page.
