import { Link, useLocation } from "react-router-dom";

import SvgLoader from "@/components/SvgLoader/SvgLoader";
import NavBar from "@/components/NavBar2";
import styles from "../styles/Workbench.module.css";

/**
 * Workbench — viewer for the legacy DWG → SVG flow (Dashboard → "Create New").
 *
 * @deprecated Superseded by /import. This page renders backend-generated SVG
 * markup, so nothing on it can be selected, measured or computed on.
 *
 * Reached only via router state from the upload; there is no URL that carries
 * the SVG, hence the empty state below.
 */
export default function WorkBench() {
  const location = useLocation();
  const svgUrl = (location.state as { svgUrl?: string } | null)?.svgUrl;

  if (!svgUrl || typeof svgUrl !== "string") {
    return (
      <div className={styles.workbenchContainer}>
        <NavBar />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-lg">No drawing to show.</p>
          <p className="text-sm text-gray-500">
            This page opens from the dashboard’s “Create New” upload, and can’t be
            reached directly by URL.
          </p>
          <div className="mt-2 flex gap-3">
            <Link
              to="/import"
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Import a drawing
            </Link>
            <Link
              to="/dashboard"
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.workbenchContainer}>
      <NavBar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <span>
            Static SVG preview — no layers, selection or measurement.
          </span>
          <Link to="/import" className="font-medium underline">
            Open this drawing in Import instead
          </Link>
        </div>

        <div className="relative flex-1 bg-white">
          <div className="absolute inset-0 overflow-auto p-4">
            <div className="h-full rounded-md border border-gray-300 bg-gray-50 shadow-md">
              <SvgLoader url={svgUrl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
