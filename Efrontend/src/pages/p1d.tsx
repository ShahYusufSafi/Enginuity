import { useState } from 'react';
import SimButton from '../components/SimButton/sim_button';
import Navbar from '../components/NavBar2';
import Form from '../components/SimForms/form';
import styles from '../styles/SimulationPage.module.css';

interface SimResult {
  plot: string;
}
export default function P1D() {
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  // To take the form data, the async is now taking parameters from the form submission
  const simulatePoisson = async (formData : {domain: string; BC: string; numElements: number}) => {
  setLoading(true);
  try {
      const response = await fetch('http://localhost:8000/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          {
            domain: formData.domain.split(',').map(Number), // Convert string to array of numbers
            num_elements: formData.numElements,
            bc: formData.BC.split(',').map(Number)
          } as { domain: number[]; num_elements: number, bc: number[]; }   
        ),
      });
  
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);

      }
  
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Failed to simulate:", err);
      alert("Simulation failed. Is your backend running on port 8000?");
    } finally {
      setLoading(false);
    }
  };
    
    return (
      <>
      <Navbar />
      
      <div className={styles.simulationPage}>

        <main className={styles.pageContent}>
          <section className={styles.simCard}>
        
          <h1 className={styles.title}>Enginuity: FEM Simulation</h1>
          <Form onSubmit={simulatePoisson}>

            <div className={styles.btnWrapper}>
            <SimButton type = "submit" loading={loading} disabled={loading} color="#4f46e5">
            Run Solver
            </SimButton>
            </div> 
          </Form>
          
          
          
          {result?.plot && (
            <img
              src={`data:image/png;base64,${result.plot}`}
              alt="FEM plot"
              className="mt-4 border"
            />
          )}

          
        
        </section>
        </main>
      </div>
      </>
    );
}