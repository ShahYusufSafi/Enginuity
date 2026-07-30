import { Link } from 'react-router-dom';

import CanvasStage from '../components/CanvasStage';
import Navbar from '../components/NavBar2';
import styles from '../styles/DrawPage.module.css';

/**
 * DrawPage — Konva node/edge sketch prototype.
 *
 * @deprecated Superseded by /import. Frozen, not broken: the four tools (Pen,
 * Eraser, Line, Distance) do work here, because <DrawLayer> consumes
 * `useToolStore`. Drawing UX gets rebuilt on the canonical model when geometry
 * repair is needed, rather than extended here.
 */
export default function DrawPage() {
  return (
    <div className={styles.canvasContainer}>
      <Navbar />

      <div
        className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900"
        style={{ marginTop: 70 }}
      >
        <span>
          Sketch prototype — points and lines only, not connected to the solver.
        </span>
        <Link to="/import" className="font-medium underline">
          Work with a real drawing in Import
        </Link>
      </div>

      <CanvasStage />
    </div>
  );
}
