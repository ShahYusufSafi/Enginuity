import React from "react";
import { useState } from 'react';
import styles from '../../styles/SimulationPage.module.css';


interface FormDataValues {
  domain: string; // Domain is a form input as a string
  numElements: number;    
  BC: string; // Boundary condition value
  state: string; // Optional state field
  dimensions: string; // Optional dimensions field
}

interface FormProps {
    onSubmit: (data: FormDataValues ) => void | Promise<void>; // onSubmit can be synchronous or asynchronous
    // Define the type for children to allow any valid React node
    // This allows the form to accept any React elements as children    
    children?: React.ReactNode;
  }

export default function Form({ onSubmit, children }: FormProps) {

  const [domain, setDomain] = useState('0,1');
  const [numElements, setNumElements] = useState(10);
  const [BC, setBC] = useState('0,1');
  const [state, setState] = useState('steady');
  const [dimensions, setDimensions] = useState('1D');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Let's validate before submitting
        if (isNaN(numElements) || numElements <= 0) {
            alert("Please enter a valid number of elements greater than 0.");
            return;
        }

        onSubmit({ domain, numElements, BC, state, dimensions });        
    };
        
    // Return the form with the provided children and onSubmit handler
    return (
     
      <form onSubmit={handleSubmit} className={styles.simulationForm}>
      <div className={styles.formGroup}>
        <label>
          Domain Interval:
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={styles.formInput}
          />
        </label>

        <label>
          Boundary Condition (BC):
          <input
            type="text"
            value={BC}
            onChange={(e)=> setBC(e.target.value)}
            className={styles.formInput}
          />
        </label>

        <label>
          Number of Elements:
          <input
            type="number"
            value={numElements}
            onChange={(e) => setNumElements(Number(e.target.value))}
            className={styles.formInput}
          />
        </label>

        <label>
          State:
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={styles.formSelect}
          >
            <option value="steady">Steady</option>
            <option value="instantaneous">Instantaneous</option>
          </select>
        </label>

        <label>
          Dimensions:
          <select
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            className={styles.formSelect}
          >
            <option value="1D">1D</option>
            <option value="2D">2D</option>
          </select>
        </label>
      </div>
      {children}
    </form>
    );
   
}