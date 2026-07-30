<div align="center">

# Enginuity

**Upload an engineering drawing. Get calculations you can check.**

Browser-based engineering platform: CAD intake, simulation and solvers in one place, no software to install.

</div>

---

## What it does today

Enginuity is early. Here is what actually works, not what is planned.

**Import a drawing → get real geometry.** Upload a DXF or DWG and it becomes interactive, measurable geometry: pan, zoom, layer visibility, click any entity to select it, snap to endpoints and centres to measure distances in the drawing's own units. Not a picture of a drawing — the geometry itself, with every entity traceable back to its handle in the source file.

**Run a solver, see how it was solved.** The 1D FEM solver (Poisson / steady heat-flow form) takes a domain, boundary conditions, conductivity and a load, and returns the solution plotted in the browser.

**Every result shows its own accuracy.** Enginuity solves exactly when the problem has a closed-form solution, and numerically when it doesn't — which is most of the time. Either way the result tells you which method answered, why, and how accurate it claims to be. Ask for a specific tolerance and the solver refines until it meets it, or tells you plainly that it couldn't.

**Every run is reproducible.** Results carry a manifest: a hash of the exact input, the solver version, and the library versions used. Re-run it later and you can prove you got the same answer.

## Screens

| Route | What it's for |
|---|---|
| `/import` | Upload a DXF/DWG, inspect and measure the geometry |
| `/simulate` | Run the 1D solver, with its accuracy and provenance |
| `/dashboard` | Project list (legacy DWG→SVG flow) |

## Quick start

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/Shahyusufsafi/Enginuity.git
cd Enginuity
docker-compose up --build
```

Then open <http://localhost:5173> and sign in.

- **To view a drawing:** go to *Import DXF*, choose a `.dxf` or `.dwg` file. Drag to pan, scroll to zoom, click entities to select, use 📏 to measure between two snap points.
- **To run the solver:** go to *FEM Simulation*, set the domain, boundary values and load, then *Run Solver*. Tick "require an accuracy guarantee" if you want the error bounded — it costs an extra solve.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind |
| Backend | FastAPI (Python), NumPy/SciPy |
| Drawing intake | ezdxf (DXF), ODA File Converter (DWG→DXF, isolated in its own service) |
| Auth | Clerk |
| Containers | Docker Compose |

## For developers

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the pieces fit and why: the canonical model, the method ladder, provenance, validation.
- Each service has its own README: [`Backend/`](Backend/README.md), [`converter/`](converter/README.md).
- Tests: `cd Backend && pip install -r requirements-dev.txt && python -m pytest`

The validation suite runs in CI on every push. It checks solvers against closed-form solutions, enforces the theoretical convergence rate, and verifies that error estimates are honest rather than merely small.

## Status and limitations

Being upfront about the edges:

- The solver covers 1D problems. 2D section properties and frame analysis are next.
- Polyline arc segments (bulges) import as straight lines, with a warning shown on import.
- TEXT, dimensions, hatches and blocks are not imported yet; the import report counts everything skipped.
- No persistent project storage yet — work is per-session.
- Design-code checks (Eurocode, AREMA and similar) are planned, not built.

## Roadmap

1. **Section properties from a drawing** — extract a closed region from an imported profile, mesh it, compute area/centroid/second moments/torsion, and produce a traceable report.
2. **2D frame analysis** with design-code member checks, each check printing the clause it came from.
3. **Wider physics** on the same spine: plane stress, steady heat.

Not planned: a general CAD editor, or a general-purpose cloud simulation platform. Machine-learned surrogates are reserved for cases where the real solver is too slow, and only ever gauged against it.

## Author

**Shah Yusuf Safi** — MSc Computational Science.

📧 yusufsafi277@gmail.com · 🔗 [LinkedIn](http://linkedin.com/in/shah-yusuf-safi-6444472b7)

## License

MIT.

If this is useful to you, a star on the repo is appreciated.
