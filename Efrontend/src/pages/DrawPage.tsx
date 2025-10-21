import CanvasStage from '../components/CanvasStage';
import Navbar from '../components/NavBar2';
import styles from '../styles/DrawPage.module.css';

export default function DrawPage() {
  return (
    <div className={styles.canvasContainer}>
      <div>
      <Navbar />
      </div>
      <div >
      <CanvasStage />
      </div>
    </div>
  );
}