// src/components/CanvasStage.tsx
import { useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import DrawLayer from './DrawLayer';
import DrawNav from './DrawingTools/DrawNav';
import CanvasSize from '../hooks/useWindowSize';


export default function CanvasStage() {
  const navRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = CanvasSize();

  const stageHeight = height - (navRef.current?.offsetHeight || 0); 
  
  return (
    <div className="flex flex-row" style={{ height: `calc(100vh - 64px)`, marginTop: '24px' }}>

    <div className="flex flex-col items-center p-2 bg-gray-100" ref={navRef} style={{ minWidth: 80 }}>
        <DrawNav />
    </div>
      <Stage 
      width={width} 
      height={stageHeight} 
      onContextMenu={(e) => e.evt.preventDefault()}
      >
        <Layer>
          <DrawLayer width={width} height={stageHeight} />
        </Layer>
      </Stage>
    
    </div>
  );
}
