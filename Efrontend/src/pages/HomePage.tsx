import styles from "../styles/HomePage.module.css";

export default function HomePage() {
  return (
    <div className={styles.homepage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Next-Gen Engineering Simulation</h1>
          <p>
            Run high-fidelity simulations directly in your browser. 
            No installations, no limits — just results.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.primaryBtn}>Start Simulating</button>
            <button className={styles.secondaryBtn}>Learn More</button>
          </div>
        </div>
        <div className={styles.heroImage}>
          {/* Placeholder for illustration / 3D preview */}
          <div className={styles.imagePlaceholder}>3D Preview Here</div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <h2>Powerful Features</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <h3>Fluid Dynamics</h3>
            <p>Simulate airflow, liquids, and thermal transfer with ease.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>Structural Analysis</h3>
            <p>Test strength, deformation, and stress distribution.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>Thermal Studies</h3>
            <p>Understand heat transfer and cooling performance.</p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className={styles.workflow}>
        <h2>How It Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span>1</span>
            <p>Upload your CAD model</p>
          </div>
          <div className={styles.step}>
            <span>2</span>
            <p>Choose your analysis type</p>
          </div>
          <div className={styles.step}>
            <span>3</span>
            <p>Run simulation in the cloud</p>
          </div>
          <div className={styles.step}>
            <span>4</span>
            <p>Visualize and optimize results</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className={styles.cta}>
        <h2>Ready to get started?</h2>
        <button className={styles.primaryBtn}>Sign Up Free</button>
      </section>
    </div>
  );
}
