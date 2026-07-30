/**
 * ModelViewer — renders the canonical DrawingModel (types/canonical.ts).
 *
 * This intentionally does NOT render backend-produced SVG: it draws canonical
 * entities directly, so everything on screen is selectable, measurable data —
 * not pixels. One rendering stack, plain SVG (strategy §3.6).
 *
 * Features: pan (drag), zoom-to-cursor (wheel), layer visibility, hover +
 * click selection, endpoint/vertex/center snapping, two-point measurement.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DrawingModel, Entity, Point2 } from "../../types/canonical";
import {
  aciToCss,
  collectSnapPoints,
  fitView,
  formatDistance,
  nearestSnap,
  screenToWorld,
  tessellateArc,
  worldToScreen,
  type SnapPoint,
  type View,
} from "./viewerMath";

export interface Measurement {
  a: Point2;
  b: Point2;
  distance: number;
}

interface ModelViewerProps {
  model: DrawingModel;
  hiddenLayers?: ReadonlySet<string>;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  measureMode?: boolean;
  onMeasure?: (m: Measurement | null) => void;
}

// Every entity is drawn twice: an invisible fat stroke that catches pointer
// events, and the visible thin one on top with pointerEvents disabled. Picking
// a 1px line otherwise means hunting for the exact pixel.
const HIT_STROKE_PX = 10;

export default function ModelViewer({
  model,
  hiddenLayers = new Set<string>(),
  selectedId = null,
  onSelect,
  measureMode = false,
  onMeasure,
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [view, setView] = useState<View>({ cx: 0, cy: 0, scale: 1 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [cursorWorld, setCursorWorld] = useState<Point2 | null>(null);
  const [activeSnap, setActiveSnap] = useState<SnapPoint | null>(null);
  const [measureStart, setMeasureStart] = useState<SnapPoint | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);

  const drag = useRef<{ startX: number; startY: number; view: View; moved: boolean } | null>(null);

  const layerColor = useMemo(() => {
    const map = new Map<string, string>();
    for (const layer of model.layers) map.set(layer.name, aciToCss(layer.color_index));
    return map;
  }, [model.layers]);

  const snaps = useMemo(() => collectSnapPoints(model, hiddenLayers), [model, hiddenLayers]);

  // --- size tracking -------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- fit on model change -------------------------------------------------
  // Refit only when the drawing changes. Deliberately not on `size`: a window
  // resize would otherwise throw away the user's pan and zoom.
  useEffect(() => {
    if (model.bbox) setView(fitView(model.bbox, size.w, size.h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  // --- wheel zoom (non-passive so preventDefault works) --------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setView((v) => {
        // Exponential so each wheel notch is a constant ratio, not a constant
        // step — otherwise zooming feels fast when close and dead when far out.
        const factor = Math.exp(-e.deltaY * 0.0015);
        const scale = Math.min(Math.max(v.scale * factor, 1e-6), 1e6);
        // Zoom toward the cursor: find the world point under it before and
        // after the scale change, then shift the centre by the difference so
        // that point stays put.
        const before = screenToWorld(pos, v, rect.width, rect.height);
        const after = screenToWorld(pos, { ...v, scale }, rect.width, rect.height);
        return { scale, cx: v.cx + (before.x - after.x), cy: v.cy + (before.y - after.y) };
      });
    };
    // Registered here rather than as a React prop because onWheel is passive by
    // default in React, and a passive listener can't preventDefault() the page
    // scroll.
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // --- Esc cancels an in-progress measurement ------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMeasureStart(null);
        setMeasurement(null);
        onMeasure?.(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMeasure]);

  useEffect(() => {
    if (!measureMode) {
      setMeasureStart(null);
      setActiveSnap(null);
    }
  }, [measureMode]);

  // --- pointer interactions ------------------------------------------------
  const localPos = useCallback((e: { clientX: number; clientY: number }): Point2 => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, view, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const pos = localPos(e);
    setCursorWorld(screenToWorld(pos, view, size.w, size.h));

    if (drag.current) {
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      // 3px dead zone separates a click from a drag, so a slightly shaky click
      // still selects instead of nudging the view.
      if (Math.hypot(dx, dy) > 3) drag.current.moved = true;
      if (drag.current.moved) {
        // Pan against the stored start view, not the current one, so the
        // drawing tracks the cursor exactly. cy is +dy because screen y grows
        // downward and world y grows upward.
        const v0 = drag.current.view;
        setView({ ...v0, cx: v0.cx - dx / v0.scale, cy: v0.cy + dy / v0.scale });
      }
      return;
    }
    if (measureMode) {
      setActiveSnap(nearestSnap(snaps, pos, view, size.w, size.h));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    // A drag that ends over an entity must not also select or measure it.
    const wasDrag = drag.current?.moved ?? false;
    drag.current = null;
    if (wasDrag || e.button !== 0) return;

    if (measureMode) {
      const snap = nearestSnap(snaps, localPos(e), view, size.w, size.h);
      if (!snap) return;
      if (!measureStart) {
        setMeasureStart(snap);
        setMeasurement(null);
        onMeasure?.(null);
      } else {
        const m: Measurement = {
          a: measureStart.point,
          b: snap.point,
          distance: Math.hypot(snap.point.x - measureStart.point.x, snap.point.y - measureStart.point.y),
        };
        setMeasurement(m);
        setMeasureStart(null);
        onMeasure?.(m);
      }
    }
  };

  const onBackgroundClick = () => {
    if (!measureMode) onSelect?.(null);
  };

  // --- entity -> screen-space SVG path -------------------------------------
  const toScreen = useCallback(
    (p: Point2) => worldToScreen(p, view, size.w, size.h),
    [view, size.w, size.h],
  );

  const pathFor = useCallback(
    (e: Entity): string => {
      const pts: Point2[] =
        e.kind === "line"
          ? [e.start, e.end]
          : e.kind === "polyline"
            ? e.points
            : e.kind === "arc"
              ? tessellateArc(e.center, e.radius, e.start_angle, e.end_angle)
              : []; // circle handled separately
      if (pts.length === 0) return "";
      const s = pts.map(toScreen);
      const d = `M ${s[0].x} ${s[0].y} ` + s.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
      return e.kind === "polyline" && e.closed ? d + " Z" : d;
    },
    [toScreen],
  );

  const strokeFor = (e: Entity): string => {
    if (e.id === selectedId) return "#dc2626";
    if (e.id === hoverId) return "#2563eb";
    return layerColor.get(e.layer) ?? "#334155";
  };

  const widthFor = (e: Entity): number => (e.id === selectedId ? 2.5 : e.id === hoverId ? 2 : 1.25);

  const visible = model.entities.filter((e) => !hiddenLayers.has(e.layer));

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ touchAction: "none", cursor: measureMode ? "crosshair" : drag.current ? "grabbing" : "grab" }}
    >
      <svg
        width={size.w}
        height={size.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onBackgroundClick}
        style={{ display: "block", background: "transparent" }}
      >
        {visible.map((e) =>
          e.kind === "circle" ? (
            <g key={e.id}>
              <circle
                cx={toScreen(e.center).x}
                cy={toScreen(e.center).y}
                r={e.radius * view.scale}
                fill="none"
                stroke="transparent"
                strokeWidth={HIT_STROKE_PX}
                style={{ pointerEvents: "stroke" }}
                onPointerEnter={() => setHoverId(e.id)}
                onPointerLeave={() => setHoverId((h) => (h === e.id ? null : h))}
                onClick={(ev) => {
                  if (measureMode) return;
                  ev.stopPropagation();
                  onSelect?.(e.id);
                }}
              />
              <circle
                cx={toScreen(e.center).x}
                cy={toScreen(e.center).y}
                r={e.radius * view.scale}
                fill="none"
                stroke={strokeFor(e)}
                strokeWidth={widthFor(e)}
                style={{ pointerEvents: "none" }}
              />
            </g>
          ) : (
            <g key={e.id}>
              <path
                d={pathFor(e)}
                fill="none"
                stroke="transparent"
                strokeWidth={HIT_STROKE_PX}
                style={{ pointerEvents: "stroke" }}
                onPointerEnter={() => setHoverId(e.id)}
                onPointerLeave={() => setHoverId((h) => (h === e.id ? null : h))}
                onClick={(ev) => {
                  if (measureMode) return;
                  ev.stopPropagation();
                  onSelect?.(e.id);
                }}
              />
              <path
                d={pathFor(e)}
                fill="none"
                stroke={strokeFor(e)}
                strokeWidth={widthFor(e)}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: "none" }}
              />
            </g>
          ),
        )}

        {/* measurement overlay */}
        {measureMode && activeSnap && (
          <SnapMarker p={toScreen(activeSnap.point)} label={activeSnap.label} />
        )}
        {measureMode && measureStart && (
          <>
            <SnapMarker p={toScreen(measureStart.point)} label={measureStart.label} fixed />
            {cursorWorld && (
              <line
                x1={toScreen(measureStart.point).x}
                y1={toScreen(measureStart.point).y}
                x2={toScreen(activeSnap?.point ?? cursorWorld).x}
                y2={toScreen(activeSnap?.point ?? cursorWorld).y}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                style={{ pointerEvents: "none" }}
              />
            )}
          </>
        )}
        {measurement && (
          <g style={{ pointerEvents: "none" }}>
            <line
              x1={toScreen(measurement.a).x}
              y1={toScreen(measurement.a).y}
              x2={toScreen(measurement.b).x}
              y2={toScreen(measurement.b).y}
              stroke="#f59e0b"
              strokeWidth={2}
            />
            <MeasureLabel
              p={{
                x: (toScreen(measurement.a).x + toScreen(measurement.b).x) / 2,
                y: (toScreen(measurement.a).y + toScreen(measurement.b).y) / 2 - 10,
              }}
              text={formatDistance(measurement.distance, model.units)}
            />
          </g>
        )}
      </svg>

      {/* cursor readout */}
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 font-mono text-xs text-white">
        {cursorWorld
          ? `x: ${cursorWorld.x.toFixed(3)}  y: ${cursorWorld.y.toFixed(3)}${model.units !== "unitless" ? `  [${model.units}]` : ""}`
          : "—"}
      </div>
    </div>
  );
}

function SnapMarker({ p, label, fixed = false }: { p: Point2; label: string; fixed?: boolean }) {
  const color = fixed ? "#f59e0b" : "#2563eb";
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={p.x - 5} y={p.y - 5} width={10} height={10} fill="none" stroke={color} strokeWidth={1.5} />
      <text x={p.x + 8} y={p.y - 8} fontSize={10} fill={color}>
        {label}
      </text>
    </g>
  );
}

function MeasureLabel({ p, text }: { p: Point2; text: string }) {
  const width = text.length * 7 + 10;
  return (
    <g>
      <rect x={p.x - width / 2} y={p.y - 12} width={width} height={16} rx={3} fill="#f59e0b" />
      <text x={p.x} y={p.y} fontSize={11} textAnchor="middle" fill="#1f2937" fontFamily="monospace">
        {text}
      </text>
    </g>
  );
}
