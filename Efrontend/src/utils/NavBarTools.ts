import type { NavItem } from "../types/NavBarTools";

/**
 * Primary navigation.
 *
 * Rule: an entry goes here only if the page behind it does something today.
 * Prototypes stay reachable by URL (see AppRoutes.tsx) but aren't advertised.
 * A nav item that leads nowhere makes the whole tool feel broken.
 *
 * Live:
 *   /import   DXF/DWG -> canonical model -> viewer
 *   /simulate 1D Poisson solver, with manifest and method badge
 *
 * Not listed (prototypes, see the frontend README): /draw, /DrawPage. They were
 * in the navbar as "Drawer" and "Draw" — two labels for two dead ends. They
 * get rebuilt on the canonical model when Phase 1 needs geometry correction.
 */
export const navItems: NavItem[] = [
  {
    id: "import",
    name: "Import DXF",
    path: "/import",
    title: "Upload a DXF or DWG and inspect, measure and select its geometry",
  },
  {
    id: "simulate",
    name: "FEM Simulation",
    path: "/simulate",
    title: "Run the 1D Poisson solver and see its reproducibility manifest",
  },
];
