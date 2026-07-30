import { useState } from 'react';
import SimButton from '../components/SimButton/sim_button';
import Navbar from '../components/NavBar2';
import Form from '../components/SimForms/form';
import SolutionPlot from '../components/SolutionPlot';
import MethodBadge from '../components/MethodBadge';
import styles from '../styles/SimulationPage.module.css';
import type { Poisson1DModel, SimulateResponse } from '../types/canonical';

/**
 * 1D Poisson solver page.
 *
 * The backend returns numbers, not pictures: this page plots the solution and
 * shows the two things that make the number defensible — the run manifest
 * (input hash, solver version, library versions) and the method badge (which
 * tier solved it, and how accurate it claims to be).
 */
export default function P1D() {
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulatePoisson = async (model: Poisson1DModel, tolerance: number | null) => {
    setLoading(true);
    setError(null);
    try {
      // tolerance = null means "don't bound the error", which saves the second
      // solve a Richardson estimate would cost (§3.0).
      const response = await fetch('/api/simulate/poisson1d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, tolerance }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.detail ? JSON.stringify(body.detail) : `Backend error: ${response.status}`,
        );
      }

      setResult(await response.json());
    } catch (err) {
      console.error('Failed to simulate:', err);
      setError(
        err instanceof Error
          ? `${err.message} — is the backend running (port 8000 / docker compose)?`
          : String(err),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className={styles.simulationPage}>
        <main className={styles.pageContent}>
          <section className={styles.simCard}>
            <h1 className={styles.title}>Enginuity: FEM Simulation</h1>
            <Form onSubmit={simulatePoisson}>
              <div className={styles.btnWrapper}>
                <SimButton type="submit" loading={loading} disabled={loading}>
                  Run Solver
                </SimButton>
              </div>
            </Form>

            {error && (
              <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {result && (
              <div className="mt-4 flex flex-col items-center gap-3">
                <SolutionPlot x={result.result.x} u={result.result.u} />

                <MethodBadge selection={result.selection} />

                <div className="w-full max-w-xl rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  <p className="mb-1 font-sans font-semibold text-gray-800 dark:text-gray-100">
                    Run manifest (reproducibility record)
                  </p>
                  <p>solver: {result.manifest.solver_name} v{result.manifest.solver_version}</p>
                  <p>input sha256: {result.manifest.input_sha256.slice(0, 24)}…</p>
                  <p>run: {result.manifest.run_id.slice(0, 8)} · {result.manifest.created_utc}</p>
                  <p>
                    numpy {result.manifest.libraries.numpy} · scipy {result.manifest.libraries.scipy} ·
                    dofs {result.result.num_dofs} · h {result.result.h.toExponential(3)}
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
