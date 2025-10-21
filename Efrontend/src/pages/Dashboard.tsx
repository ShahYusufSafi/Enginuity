import styles from '../styles/Dashboard.module.css'
import NavBar from '../components/Dashboard_NavBar';
import CreateNew from '@/components/CreateNewButt';
export default function Dashboard() {
    return (
    
    <div className={styles.mainContainer}>
      <NavBar />
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <nav className={styles.nav}>
          <a href="#">Dashboard</a>
          <a href="#">Projects</a>
          <a href="#">Simulations</a>
          <a href="#">Reports</a>
          <a href="#">Settings</a>
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
          {/* KPI Row */}
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
              <div className={styles.chartPlaceholder}>
                📊 Chart goes here
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
    
}