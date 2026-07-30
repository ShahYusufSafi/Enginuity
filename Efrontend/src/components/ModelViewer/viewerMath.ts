/**
 * Pure geometry/viewport math for the ModelViewer.
 * Kept free of React so it is unit-testable and reusable.
 */

import type { BBox, DrawingModel, Entity, Point2 } from "../../types/canonical";

/** Viewport: world center (cx, cy) and zoom in screen px per world unit. */
export interface View {
  cx: number;
  cy: number;
  scale: number;
}

/**
 * World (CAD, y up) to screen (SVG, y down).
 *
 * Done in arithmetic rather than an SVG transform on purpose: with a transform,
 * a negative y-scale would also mirror text and make stroke widths scale with
 * zoom, so every stroke would need a compensating vector-effect. Here strokes
 * stay in device pixels for free.
 */
export function worldToScreen(p: Point2, view: View, w: number, h: number): Point2 {
  return {
    x: (p.x - view.cx) * view.scale + w / 2,
    y: h / 2 - (p.y - view.cy) * view.scale,
  };
}

export function screenToWorld(p: Point2, view: View, w: number, h: number): Point2 {
  return {
    x: (p.x - w / 2) / view.scale + view.cx,
    y: (h / 2 - p.y) / view.scale + view.cy,
  };
}

/** Fit a bbox into a w×h viewport with a margin factor. */
export function fitView(bbox: BBox, w: number, h: number, margin = 0.9): View {
  // Clamped spans keep a degenerate bbox (a single line, or one entity) from
  // producing an infinite scale.
  const spanX = Math.max(bbox.max_x - bbox.min_x, 1e-9);
  const spanY = Math.max(bbox.max_y - bbox.min_y, 1e-9);
  // min() of both fits: the tighter axis decides, so nothing is cropped.
  const scale = Math.min((w / spanX) * margin, (h / spanY) * margin);
  return {
    cx: (bbox.min_x + bbox.max_x) / 2,
    cy: (bbox.min_y + bbox.max_y) / 2,
    scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
  };
}

const DEG = Math.PI / 180;

/**
 * CCW sweep of a DXF arc in degrees.
 *
 * DXF arcs always run counter-clockwise from start to end, and the stored
 * angles aren't normalised — an arc from 350° to 10° is a 20° sweep, not
 * -340°. Winding up into positive range handles that.
 */
export function arcSweepDeg(startAngle: number, endAngle: number): number {
  let sweep = endAngle - startAngle;
  while (sweep <= 0) sweep += 360;
  return sweep;
}

/**
 * Tessellate an arc into world-space points.
 * Rendering arcs as short segments sidesteps SVG arc-flag pitfalls under a
 * flipped y-axis; exact parameters stay in the canonical model.
 */
export function tessellateArc(
  center: Point2,
  radius: number,
  startAngle: number,
  endAngle: number,
  segmentsPerFullCircle = 96,
): Point2[] {
  const sweep = arcSweepDeg(startAngle, endAngle);
  const n = Math.max(2, Math.ceil((sweep / 360) * segmentsPerFullCircle));
  const pts: Point2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (startAngle + (sweep * i) / n) * DEG;
    pts.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) });
  }
  return pts;
}

export function arcEndpoints(e: { center: Point2; radius: number; start_angle: number; end_angle: number }): [Point2, Point2] {
  const s = e.start_angle * DEG;
  const t = e.end_angle * DEG;
  return [
    { x: e.center.x + e.radius * Math.cos(s), y: e.center.y + e.radius * Math.sin(s) },
    { x: e.center.x + e.radius * Math.cos(t), y: e.center.y + e.radius * Math.sin(t) },
  ];
}

export function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Characteristic length of an entity (for the selection info panel). */
export function entityLength(e: Entity): number {
  switch (e.kind) {
    case "line":
      return distance(e.start, e.end);
    case "polyline": {
      let len = 0;
      for (let i = 1; i < e.points.length; i++) len += distance(e.points[i - 1], e.points[i]);
      if (e.closed && e.points.length > 1) len += distance(e.points[e.points.length - 1], e.points[0]);
      return len;
    }
    case "arc":
      return e.radius * arcSweepDeg(e.start_angle, e.end_angle) * DEG;
    case "circle":
      return 2 * Math.PI * e.radius;
  }
}

export interface SnapPoint {
  point: Point2;
  entityId: string;
  label: "endpoint" | "vertex" | "center";
}

/** All snappable points of a model (endpoints, vertices, centers). */
export function collectSnapPoints(model: DrawingModel, hiddenLayers: ReadonlySet<string>): SnapPoint[] {
  const snaps: SnapPoint[] = [];
  for (const e of model.entities) {
    if (hiddenLayers.has(e.layer)) continue;
    switch (e.kind) {
      case "line":
        snaps.push({ point: e.start, entityId: e.id, label: "endpoint" });
        snaps.push({ point: e.end, entityId: e.id, label: "endpoint" });
        break;
      case "polyline":
        for (const p of e.points) snaps.push({ point: p, entityId: e.id, label: "vertex" });
        break;
      case "arc": {
        const [s, t] = arcEndpoints(e);
        snaps.push({ point: s, entityId: e.id, label: "endpoint" });
        snaps.push({ point: t, entityId: e.id, label: "endpoint" });
        snaps.push({ point: e.center, entityId: e.id, label: "center" });
        break;
      }
      case "circle":
        snaps.push({ point: e.center, entityId: e.id, label: "center" });
        break;
    }
  }
  return snaps;
}

/** Nearest snap point within `tolerancePx` of a screen position, or null. */
export function nearestSnap(
  snaps: readonly SnapPoint[],
  screenPos: Point2,
  view: View,
  w: number,
  h: number,
  tolerancePx = 12,
): SnapPoint | null {
  let best: SnapPoint | null = null;
  let bestDist = tolerancePx;
  for (const s of snaps) {
    const sp = worldToScreen(s.point, view, w, h);
    const d = Math.hypot(sp.x - screenPos.x, sp.y - screenPos.y);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

/** AutoCAD Color Index -> CSS color (common values; fallback provided). */
export function aciToCss(aci: number | null | undefined, fallback = "var(--enginuity-stroke, #334155)"): string {
  switch (aci) {
    case 1: return "#dc2626";
    case 2: return "#ca8a04";
    case 3: return "#16a34a";
    case 4: return "#0891b2";
    case 5: return "#2563eb";
    case 6: return "#c026d3";
    case 7: return fallback; // "white/black" in CAD = theme foreground here
    default: return fallback;
  }
}

export function formatDistance(d: number, units: string): string {
  const u = units === "unitless" ? "" : ` ${units}`;
  if (d !== 0 && (Math.abs(d) < 1e-3 || Math.abs(d) >= 1e6)) return d.toExponential(4) + u;
  return `${Number(d.toFixed(4))}${u}`;
}
