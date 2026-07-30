import { NavLink } from "react-router-dom";

import NavBar from "@/components/NavBar2";
import CreateNew from "@/components/CreateNewButt";
import styles from "../styles/Dashboard.module.css";

/**
 * Dashboard.
 *
 * TODO: the KPI numbers, "Recent Projects" and the chart are hard-coded sample
 * content. They need real data, which means project persistence first.
 */

/** Sidebar destinations that exist today. */
const SIDEBAR_LINKS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Import drawing", to: "/import" },
  { label: "Simulations", to: "/simulate" },
] as const;

/** Sidebar entries kept visible as roadmap signposts, but not clickable. */
const SIDEBAR_PLANNED = [
  { label: "Projects", note: "Planned — Phase 2 (persistence & run history)" },
  { label: "Reports", note: "Planned — Phase 1 (traceable calculation report)" },
] as const;

export default function Dashboard() {
  return (
    <div className={styles.mainContainer}>
      <NavBar />

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <nav className={styles.nav}>
          {SIDEBAR_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              style={({ isActive }) => (isActive ? { color: "white", fontWeight: 600 } : undefined)}
            >
              {link.label}
            </NavLink>
          ))}

          {SIDEBAR_PLANNED.map((item) => (
            <span
              key={item.label}
              title={item.note}
              aria-disabled="true"
              style={{ color: "#6b7280", cursor: "not-allowed", margin: "12px 0", fontSize: 15 }}
            >
              {item.label} <em style={{ fontSize: 11, fontStyle: "normal" }}>· soon</em>
            </span>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className={styles.mainArea}>
        {/* Top Navbar */}
        <header className={styles.topbar}>
          <h2>Dashboard</h2>
          <CreateNew />
        </header>

        {/* Content */}
        <main className={styles.content}>
          {/* KPI Row — sample content, not wired to real data */}
          <section className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <h3>Active Simulations</h3>
              <p>3 running, 2 queued</p>
            </div>
            <div className={styles.kpiCard}>
              <h3>Completed Projects</h3>
              <p>18 total</p>
            </div>
            <div className={styles.kpiCard}>
              <h3>Usage</h3>
              <p>45% of monthly quota</p>
            </div>
          </section>

          {/* Dashboard Panels */}
          <section className={styles.dashboard}>
            <div className={styles.card}>
              <h2>Recent Projects</h2>
              <ul>
                <li>Structural Beam Analysis</li>
                <li>Heat Transfer Model</li>
                <li>Fluid Dynamics Demo</li>
              </ul>
            </div>

            <div className={styles.card}>
              <h2>Usage Overview</h2>
              <div className={styles.chartPlaceholder}>📊 Chart goes here</div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
