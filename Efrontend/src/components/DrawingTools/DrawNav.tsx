// src/components/DrawingTools/DrawNav.tsx
import DrawingToolButton from './DrawingToolButton';
import { tools } from '../../utils/DrawingTools';
import { useToolStore } from '../../States/useToolStore';
import styles from '../../styles/DrawNav.module.css';

export default function DrawNav() {
  const currentTool = useToolStore((s) => s.currentTool);
  const setCurrentTool = useToolStore((s) => s.setCurrentTool);

  return (
    
    <nav className={styles.navContainer}>
      {Object.values(tools).map((t) => {
        const Icon = t.icon;
        return (
          <div className="flex flex-col gap-2">

          <DrawingToolButton key={t.id} tool={t.id} currentTool={currentTool} setTool={setCurrentTool}>
            <Icon />
          </DrawingToolButton>
          </div>
        );
      })}
    </nav>
    
  );
}
