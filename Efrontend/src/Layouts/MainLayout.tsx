import type { ReactNode } from "react";
import Navbar from "../components/NavBar2";

/**
 * Page shell: fixed navbar + scrollable content.
 *
 * Note: the navbar is `position: fixed` (see NavBar.module.css), so it takes
 * no layout space and overlays the top of `children`. Pages rendered inside
 * this layout must provide their own top offset — HomePage does it with
 * `margin-top: 80px` in HomePage.module.css. Don't add padding here as well,
 * or the offset doubles.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <main className="flex-grow overflow-auto">{children}</main>
    </div>
  );
}
