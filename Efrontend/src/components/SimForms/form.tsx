import React, { useState } from "react";

import styles from "../../styles/SimulationPage.module.css";
import type { Forcing, Poisson1DModel } from "../../types/canonical";

/**
 * Input form for the 1D Poisson solver: -k·u''(x) = f(x) on [x₀, x₁].
 *
 * Emits a validated `Poisson1DModel`, not loose strings for the page to parse.
 * Every control here maps to a field the solver actually reads — if a control
 * has nowhere to go in the canonical model, it doesn't belong on the form.
 *
 * Validation mirrors the backend's so failures show up here instead of as a
 * 422 from the API.
 */

type ForcingKind = Forcing["type"];

interface FormProps {
  onSubmit: (model: Poisson1DModel, tolerance: number | null) => void | Promise<void>;
  children?: React.ReactNode;
}

export default function Form({ onSubmit, children }: FormProps) {
  const [x0, setX0] = useState(0);
  const [x1, setX1] = useState(1);
  const [u0, setU0] = useState(0);
  const [u1, setU1] = useState(0);
  const [numElements, setNumElements] = useState(32);
  const [conductivity, setConductivity] = useState(1);

  const [forcingKind, setForcingKind] = useState<ForcingKind>("sine");
  const [amplitude, setAmplitude] = useState(Math.PI * Math.PI);
  const [mode, setMode] = useState(1);
  const [constantValue, setConstantValue] = useState(1);
  const [coefficients, setCoefficients] = useState("0, 1");

  // Accuracy request (§3.0). Off by default: estimating error costs a second
  // solve, so it only happens when the user actually asks for a bound.
  const [wantTolerance, setWantTolerance] = useState(false);
  const [tolerance, setTolerance] = useState(1e-4);

  const [error, setError] = useState<string | null>(null);

  const buildForcing = (): Forcing => {
    switch (forcingKind) {
      case "constant":
        return { type: "constant", value: constantValue };
      case "polynomial":
        return {
          type: "polynomial",
          coefficients: coefficients
            .split(",")
            .map((c) => Number(c.trim()))
            .filter((c) => Number.isFinite(c)),
        };
      case "sine":
      default:
        return { type: "sine", amplitude, mode };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Mirror the backend's validators so failures surface here, not as a 422.
    if (!Number.isFinite(x0) || !Number.isFinite(x1) || x1 <= x0) {
      setError("Domain must satisfy x₁ > x₀.");
      return;
    }
    if (!Number.isInteger(numElements) || numElements < 2 || numElements > 100_000) {
      setError("Number of elements must be a whole number between 2 and 100 000.");
      return;
    }
    if (!Number.isFinite(conductivity) || conductivity <= 0) {
      setError("Conductivity must be greater than 0.");
      return;
    }

    const forcing = buildForcing();
    if (forcing.type === "polynomial" && forcing.coefficients.length === 0) {
      setError("Enter at least one polynomial coefficient.");
      return;
    }
    if (wantTolerance && (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 1)) {
      setError("Tolerance must be between 0 and 1 (relative error).");
      return;
    }

    void onSubmit(
      {
        domain: [x0, x1],
        num_elements: numElements,
        conductivity,
        dirichlet: [u0, u1],
        forcing,
      },
      wantTolerance ? tolerance : null,
    );
  };

  return (
    <form onSubmit={handleSubmit} className={styles.simulationForm}>
      <div className={styles.formGroup}>
        <fieldset style={{ border: "none", padding: 0 }}>
          <legend style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            Domain — solves −k·u″(x) = f(x) on [x₀, x₁]
          </legend>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ flex: 1 }}>
              x₀
              <input
                type="number"
                step="any"
                value={x0}
                onChange={(e) => setX0(Number(e.target.value))}
                className={styles.formInput}
              />
            </label>
            <label style={{ flex: 1 }}>
              x₁
              <input
                type="number"
                step="any"
                value={x1}
                onChange={(e) => setX1(Number(e.target.value))}
                className={styles.formInput}
              />
            </label>
          </div>
        </fieldset>

        <fieldset style={{ border: "none", padding: 0 }}>
          <legend style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            Dirichlet boundary conditions
          </legend>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ flex: 1 }}>
              u(x₀)
              <input
                type="number"
                step="any"
                value={u0}
                onChange={(e) => setU0(Number(e.target.value))}
                className={styles.formInput}
              />
            </label>
            <label style={{ flex: 1 }}>
              u(x₁)
              <input
                type="number"
                step="any"
                value={u1}
                onChange={(e) => setU1(Number(e.target.value))}
                className={styles.formInput}
              />
            </label>
          </div>
        </fieldset>

        <div style={{ display: "flex", gap: "1rem" }}>
          <label style={{ flex: 1 }}>
            Number of elements
            <input
              type="number"
              min={2}
              max={100000}
              value={numElements}
              onChange={(e) => setNumElements(Number(e.target.value))}
              className={styles.formInput}
            />
          </label>
          <label style={{ flex: 1 }}>
            Conductivity k
            <input
              type="number"
              step="any"
              min={0}
              value={conductivity}
              onChange={(e) => setConductivity(Number(e.target.value))}
              className={styles.formInput}
            />
          </label>
        </div>

        <label>
          Forcing f(x)
          <select
            value={forcingKind}
            onChange={(e) => setForcingKind(e.target.value as ForcingKind)}
            className={styles.formInput}
          >
            <option value="sine">Sine — A·sin(n·π·x̂)</option>
            <option value="constant">Constant — f(x) = c</option>
            <option value="polynomial">Polynomial — Σ aᵢ·xⁱ</option>
          </select>
        </label>

        {forcingKind === "sine" && (
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ flex: 1 }}>
              Amplitude A
              <input
                type="number"
                step="any"
                value={amplitude}
                onChange={(e) => setAmplitude(Number(e.target.value))}
                className={styles.formInput}
              />
            </label>
            <label style={{ flex: 1 }}>
              Mode n
              <input
                type="number"
                min={1}
                value={mode}
                onChange={(e) => setMode(Number(e.target.value))}
                className={styles.formInput}
              />
            </label>
          </div>
        )}

        {forcingKind === "constant" && (
          <label>
            Value c
            <input
              type="number"
              step="any"
              value={constantValue}
              onChange={(e) => setConstantValue(Number(e.target.value))}
              className={styles.formInput}
            />
          </label>
        )}

        {forcingKind === "polynomial" && (
          <label>
            Coefficients (ascending powers, comma-separated)
            <input
              type="text"
              value={coefficients}
              onChange={(e) => setCoefficients(e.target.value)}
              className={styles.formInput}
              placeholder="0, 1, 2"
            />
          </label>
        )}

        <fieldset style={{ border: "none", padding: 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={wantTolerance}
              onChange={(e) => setWantTolerance(e.target.checked)}
            />
            Require an accuracy guarantee
          </label>
          <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            Off: one solve, no error estimate. On: the solver refines until the
            estimated relative error is within your tolerance, or reports that it
            couldn&apos;t. Costs an extra solve per refinement.
          </p>
          {wantTolerance && (
            <label style={{ display: "block", marginTop: "0.5rem" }}>
              Max relative error
              <input
                type="number"
                step="any"
                min={0}
                max={1}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className={styles.formInput}
              />
            </label>
          )}
        </fieldset>

        {error && (
          <p style={{ color: "#dc2626", fontSize: "0.85rem", margin: 0 }}>{error}</p>
        )}
      </div>

      {children}
    </form>
  );
}
