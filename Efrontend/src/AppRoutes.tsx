/**
 * Route table.
 *
 * Every authenticated route goes through <Protected>. A bare <SignedIn>
 * renders nothing when signed out, which shows a blank white page instead of
 * the sign-in screen — <Protected> pairs it with the redirect.
 *
 * Deprecated routes stay reachable by URL but aren't linked from the navbar.
 */

import type { ReactNode } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";

import MainLayout from "./Layouts/MainLayout";
import SignInPage from "./Layouts/SignIn";
import HomePage from "./pages/HomePage";
import ImportPage from "./pages/ImportPage";
import P1D from "./pages/p1d";
import Dashboard from "./pages/Dashboard";
import Workbench from "./pages/Workbench";
import DrawPage from "./pages/DrawPage";
import DrawingPage from "./pages/DrawingPage";

/** Renders children when signed in, otherwise sends the visitor to sign-in. */
function Protected({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function NotFound() {
  return (
    <MainLayout>
      {/* pt-20 clears the position:fixed navbar, which occupies no layout space */}
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 pt-20 text-center">
        <h1 className="text-2xl font-semibold">404 — page not found</h1>
        <p className="text-sm text-gray-500">
          That route doesn’t exist. The live pages are Import and FEM Simulation.
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            to="/import"
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Import a drawing
          </Link>
          <Link
            to="/"
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Home
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in/*" element={<SignInPage />} />

      {/* ── Live product surface ─────────────────────────────────────────── */}

      <Route
        path="/"
        element={
          <Protected>
            <MainLayout>
              <HomePage />
            </MainLayout>
          </Protected>
        }
      />

      <Route
        path="/import"
        element={
          <Protected>
            <ImportPage />
          </Protected>
        }
      />

      <Route
        path="/simulate"
        element={
          <Protected>
            <P1D />
          </Protected>
        }
      />

      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />

      {/* ── Deprecated: reachable by URL, not linked from the navbar ────────
          Superseded by /import + the canonical ModelViewer. Kept so the work
          isn't lost; see the frontend README, "Deprecated, still routable".  */}

      {/* Legacy DWG→SVG flow: Dashboard → "Create New" → Workbench */}
      <Route
        path="/Workbench/:id"
        element={
          <Protected>
            <Workbench />
          </Protected>
        }
      />

      {/* Konva node/edge sketch prototype */}
      <Route
        path="/draw"
        element={
          <Protected>
            <DrawPage />
          </Protected>
        }
      />

      {/* three.js CAD prototype */}
      <Route
        path="/DrawPage"
        element={
          <Protected>
            <DrawingPage />
          </Protected>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
