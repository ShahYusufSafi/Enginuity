// 1. Import React (optional in React 17+ with JSX transform)
import { useState } from 'react';
import './App.css'; // Optional CSS

// 2. Define the component (TypeScript type safety)
function App() {
  const [count, setCount] = useState<number>(0); // Type annotation for state

  return (
    <div className="App">
      <h1>Vite + React + TypeScript</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          Count is {count}
        </button>
      </div>
    </div>
  );
}

// 3. Export the component
export default App;