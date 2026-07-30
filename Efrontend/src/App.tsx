/**
 * @deprecated Vite starter boilerplate. Unrouted; delete with `App.css`.
 */

import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState<number>(0);

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

export default App;