/**
 * The application navbar. One component, used by every page.
 *
 * Navigation goes through <NavLink>, never `window.location.href` — a href
 * assignment reloads the document, throwing away SPA state and re-mounting
 * Clerk. NavLink's `isActive` drives `styles.active`, so the bar shows which
 * page you're on.
 */

import { NavLink, useNavigate } from "react-router-dom";
import { SignedIn, UserButton } from "@clerk/clerk-react";

import { navItems } from "../utils/NavBarTools";
import AppLogo from "./logo";
import { Button } from "./ui/button";
import { ModeToggle } from "./mode-toggle";
import styles from "../styles/NavBar.module.css";
import styles_logo from "../styles/AppLogo.module.css";

export default function NavBar() {
  const navigate = useNavigate();

  return (
    <nav className={styles.navbar}>
      {/* Logo → home. A button, because it behaves like one. */}
      <button
        type="button"
        className={styles.logo_link}
        onClick={() => navigate("/")}
        aria-label="Enginuity — go to home"
        style={{ background: "none", border: "none", padding: 0 }}
      >
        <AppLogo className={styles_logo.logo} classNameIcon={styles_logo.Icon} />
      </button>

      <ul className={styles.navList}>
        {navItems.map((item) => (
          <li key={item.id} className={styles.navItem}>
            <NavLink
              to={item.path}
              title={item.title}
              className={({ isActive }) => (isActive ? styles.active : undefined)}
            >
              {item.name}
            </NavLink>
          </li>
        ))}
      </ul>

      <Button
        variant="outline"
        size="sm"
        className={styles.navItem}
        onClick={() => navigate("/dashboard")}
      >
        Dashboard
      </Button>

      <ModeToggle />

      <div className="auth-buttons">
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </nav>
  );
}
