# ModelViewer — the canonical drawing viewer

Draws the `DrawingModel` (`src/types/canonical.ts`) as interactive SVG. Replaces injecting backend-generated SVG markup (`SvgLoader`): what's on screen is selectable, measurable data rather than a picture.

## Decisions

- **One rendering stack: plain SVG DOM** (§3.6). No Konva, no canvas, no three.js. Entity counts in 2D drawings sit well inside what SVG handles, and DOM hit-testing gives selection for free.
- **Screen-space rendering.** The world→screen mapping, including the CAD y-up to SVG y-down flip, is computed in `viewerMath.ts` instead of using SVG transforms. Stroke widths then stay in device pixels at any zoom, and there's no transform/arc-flag interaction to debug.
- **Arcs are tessellated** for display, ≤96 segments per circle. Exact parameters stay in the model — the viewer needs to look right, the model needs to be right.
- **Hit areas** are transparent 10px strokes under the visible ones, so picking doesn't require pixel-hunting.
- **`viewerMath.ts` has no React in it**: viewport fit, transforms, snapping, tessellation, entity length, ACI→CSS colors. Testable, and reusable when Phase 1 needs region picking.

## Interactions

| Action | Gesture |
|---|---|
| Pan | drag (left/middle button) |
| Zoom to cursor | mouse wheel |
| Select entity | click (highlights red; info panel via `onSelect`) |
| Hover | pointer over (highlights blue) |
| Measure | enable measure mode, click two snap points (endpoints/vertices/centers, 12px snap radius); Esc cancels |
| Layer visibility | controlled via `hiddenLayers` prop |

## Props

```ts
{
  model: DrawingModel;
  hiddenLayers?: ReadonlySet<string>;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  measureMode?: boolean;
  onMeasure?: (m: Measurement | null) => void;
}
```

State that belongs to the *page* (layer toggles, selection, tool mode) is lifted out; the viewer owns only view transform, hover, cursor, and in-progress measurement.

## Known limits (v0)

- No dynamic grid/rulers yet; cursor coordinate readout (bottom-left) covers the need.
- No touch pinch-zoom (wheel + drag only).
- Very large drawings (>~20k entities) may want canvas/WebGL later — decided by real files, not speculation.
