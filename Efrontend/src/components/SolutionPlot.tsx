/**
 * SolutionPlot — renders solver results (x, u arrays) as an inline SVG line
 * chart. Replaces the old backend-generated matplotlib PNG: solvers return
 * numbers, the frontend renders them (strategy §3.2).
 */

interface SolutionPlotProps {
  x: number[];
  u: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
}

export default function SolutionPlot({
  x,
  u,
  width = 560,
  height = 320,
  strokeColor = "#4f46e5",
}: SolutionPlotProps) {
  if (x.length < 2 || x.length !== u.length) return null;

  const margin = { top: 16, right: 16, bottom: 34, left: 56 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const xMin = Math.min(...x);
  const xMax = Math.max(...x);
  const uMinRaw = Math.min(...u);
  const uMaxRaw = Math.max(...u);
  // Pad the value axis so the curve doesn't graze the frame. The `|| 1` guards
  // a flat solution, where the range is 0 and the scale would divide by zero.
  const pad = (uMaxRaw - uMinRaw || 1) * 0.08;
  const uMin = uMinRaw - pad;
  const uMax = uMaxRaw + pad;

  // Data to pixels. sy is inverted because SVG y grows downward.
  const sx = (v: number) => margin.left + ((v - xMin) / (xMax - xMin)) * w;
  const sy = (v: number) => margin.top + h - ((v - uMin) / (uMax - uMin)) * h;

  const path = x.map((xi, i) => `${i === 0 ? "M" : "L"} ${sx(xi)} ${sy(u[i])}`).join(" ");

  const xTicks = [xMin, (xMin + xMax) / 2, xMax];
  const uTicks = [uMinRaw, (uMinRaw + uMaxRaw) / 2, uMaxRaw];
  const fmt = (v: number) =>
    Math.abs(v) !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e4)
      ? v.toExponential(2)
      : Number(v.toFixed(4)).toString();

  return (
    <svg width={width} height={height} role="img" aria-label="FEM solution plot">
      {/* axes */}
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + h} stroke="#9ca3af" />
      <line x1={margin.left} y1={margin.top + h} x2={margin.left + w} y2={margin.top + h} stroke="#9ca3af" />

      {uTicks.map((t) => (
        <g key={`u${t}`}>
          <line x1={margin.left - 4} y1={sy(t)} x2={margin.left + w} y2={sy(t)} stroke="#e5e7eb" />
          <text x={margin.left - 8} y={sy(t) + 3} textAnchor="end" fontSize={10} fill="#6b7280">
            {fmt(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} y1={margin.top + h} x2={sx(t)} y2={margin.top + h + 4} stroke="#9ca3af" />
          <text x={sx(t)} y={margin.top + h + 16} textAnchor="middle" fontSize={10} fill="#6b7280">
            {fmt(t)}
          </text>
        </g>
      ))}

      <text
        x={margin.left + w / 2}
        y={height - 4}
        textAnchor="middle"
        fontSize={11}
        fill="#374151"
      >
        x
      </text>
      <text
        x={14}
        y={margin.top + h / 2}
        textAnchor="middle"
        fontSize={11}
        fill="#374151"
        transform={`rotate(-90 14 ${margin.top + h / 2})`}
      >
        u(x)
      </text>

      <path d={path} fill="none" stroke={strokeColor} strokeWidth={2} />
    </svg>
  );
}
