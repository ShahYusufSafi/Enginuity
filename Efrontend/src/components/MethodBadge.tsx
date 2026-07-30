/**
 * Which rung of the method ladder answered, and what it claims (§3.0).
 *
 * "Exact, closed form" and "numerical, estimated 0.3%" are different claims and
 * a reader shouldn't have to guess which one they got. Most problems have no
 * closed form — when that happens the backend says so in `message`, and this
 * component shows it rather than hiding it as an implementation detail.
 */

import type { ErrorEstimate, SelectionRecord } from "../types/canonical";

function accuracyText(error: ErrorEstimate): string {
  if (error.basis === "exact") return "exact, to floating-point round-off";
  if (error.relative === null) return "error not estimated";
  return `estimated ${error.relative.toExponential(2)} relative (${error.basis})`;
}

export default function MethodBadge({ selection }: { selection: SelectionRecord }) {
  const {
    chosen,
    error,
    tolerance_met,
    requested_tolerance,
    refinements,
    attempts,
    message,
  } = selection;

  const missed = requested_tolerance !== null && !tolerance_met;
  const exact = chosen.fidelity === "analytical";

  const tone = missed
    ? "border-amber-400 bg-amber-50 text-amber-900"
    : exact
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <div className={`w-full max-w-xl rounded border p-3 text-xs ${tone}`}>
      {/* The backend writes the sentence; don't second-guess it here. */}
      <p className="font-sans text-sm">{message}</p>

      <p className="mt-2 font-mono opacity-90">
        {chosen.name} v{chosen.version} · {accuracyText(error)}
        {requested_tolerance !== null &&
          ` · requested ≤ ${requested_tolerance.toExponential(2)}`}
        {refinements > 0 && ` · ${refinements} refinement${refinements > 1 ? "s" : ""}`}
      </p>
      <p className="font-sans opacity-70">{chosen.describes}</p>

      {attempts.length > 1 && (
        <details className="mt-2">
          <summary className="cursor-pointer font-sans opacity-80">
            Methods tried ({attempts.length})
          </summary>
          <ul className="mt-1 space-y-0.5 font-mono">
            {attempts.map((a, i) => (
              <li key={`${a.method.name}-${i}`}>
                {a.method.name}: {a.outcome}
                {a.error?.relative != null && ` (${a.error.relative.toExponential(1)})`}
                {a.note && ` — ${a.note}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
