// src/components/DrawingTools/DrawNav.tsx
/**
 * @deprecated Part of the Konva sketch prototype (/draw). Frozen — see
 * pages/DrawPage.tsx.
 *
 * Only mount this alongside Konva's <DrawLayer>, which reads the same
 * `useToolStore`. On any other page the buttons highlight and do nothing.
 */
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
          <DrawingToolButton
            key={t.id}
            tool={t.id}
            label={t.name}
            currentTool={currentTool}
            setTool={setCurrentTool}
          >
            <Icon />
          </DrawingToolButton>
        );
      })}
    </nav>
  );
}
