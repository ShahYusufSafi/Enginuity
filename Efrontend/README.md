# Efrontend — Enginuity UI

React + Vite + TypeScript + Tailwind. Runs on port 5173.

```bash
npm install
npm run dev          # or: docker-compose up frontend
npx tsc -b           # typecheck, also runs in CI
npm run build
```

## What lives where

| Path | Role |
|---|---|
| `src/types/canonical.ts` | Mirror of the backend's canonical schemas. New code uses these types, never ad-hoc response shapes. `GET /api/schema` is the tie-breaker. |
| `src/components/ModelViewer/` | The drawing viewer: pan, zoom, layers, selection, snapping, measurement. Draws canonical entities, not backend-generated SVG. Has its own README. |
| `src/pages/ImportPage.tsx` | `/import` — upload DXF/DWG, inspect and measure |
| `src/pages/p1d.tsx` | `/simulate` — solver, result plot, accuracy badge, run manifest |
| `src/components/MethodBadge.tsx` | Which method answered and what it claims |
| `src/components/SolutionPlot.tsx` | Inline SVG plot of solver output |

## Conventions

- **The backend computes, the frontend draws.** Results arrive as numbers; no server-side image generation.
- **One rendering stack for drawing content:** plain SVG DOM. Not Konva, not canvas, not three.js — until a real file proves SVG isn't enough.
- **Show the accuracy claim.** Anything displaying a solver result also shows how that result was obtained. The backend writes the user-facing sentence in `selection.message`; render it rather than reconstructing it here.

## Deprecated, still routable

`/draw` (Konva sketcher), `/DrawPage` (three.js prototype) and the Dashboard → Workbench SVG flow predate the canonical model. They're reachable by URL but not linked in the navbar, and they'll be rebuilt on the canonical model when geometry-correction UX is needed. Don't add features to them.

`src/DrawingEngine/` is a frozen vanilla-JS prototype. Note that its toolbar dispatches several tools whose methods were never implemented — that's why the live toolbar is limited to Select / Line / Circle.
