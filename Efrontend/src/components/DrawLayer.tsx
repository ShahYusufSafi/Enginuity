import { Circle, Line, Group, Rect } from 'react-konva';
import { useGeometryStore } from '../States/useGeometryStore';
import { useState } from 'react';
import { tools } from '../utils/DrawingTools';
//import { tools } from '../types/Drawingtools';
import { useToolStore } from '../States/useToolStore';
import DimTool from './DrawingTools/DimensioningTool';

interface DrawLayerProps {
  width: number;
  height: number;
  
}

/* We use arrow functions to define the component and its event handlers.
   This allows us to access the component's state and props directly without needing to bind them. 
*/ 
const DrawLayer = ({width, height}: DrawLayerProps) => {

  // Bellow is the magic of arrow functions, where we can use useGeometryStore without needing to bind it.
  // Similarly, we can use useState to manage the selected node state.
  const { nodes, edges, addNode, addEdge, removeNode, removeEdge } = useGeometryStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const currentTool = useToolStore((s) => s.currentTool);
  const [distance, setDistance] = useState<number | null>(null);

  const selectedEdge = selectedEdgeId ? edges.find(edge => edge.id === selectedEdgeId):null;
  
  
  const handleClick = (e: any) => {
    
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    
    console.log('Clicked at:', pointer, 'Current nodes:', nodes);
    if (!pointer) return;


    const tool = tools[currentTool];

    // If the tool is not defined, we do nothing
    if (!tool) return;
    const store = { nodes, edges, addNode, addEdge, removeNode, removeEdge };

    tool.action({
      pointer,
      nodes: store.nodes,
      edges: store.edges,
      store,
      selectedNodeId,
      setSelectedNodeId,
      selectedEdgeId,
      setSelectedEdgeId,
      setDistance,
    } );
  }
  console.log("dist: ",distance);
    return (
    <Group onClick={handleClick}>
      <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          stroke="red"
          //strokeWidth={1}
          //dash={[4, 4]} // Optional: dashed border
        />

      {edges.map((edge) => {
        const start = nodes.find(n => n.id === edge.source);
        const end = nodes.find(n => n.id === edge.target);
        if (!start || !end) return null;
        return (
          <Line
            key={edge.id}
            points={[start.x, start.y, end.x, end.y]}
            stroke= {edge.id === selectedEdgeId ? 'green' : 'black'}
            strokeWidth={2}
            onClick={() => setSelectedEdgeId(edge.id)}
          />
        );
      })}

      {nodes.map((node) => (
        <Circle
          key={node.id}
          x={node.x}
          y={node.y}
          radius={6}
          fill={node.id === selectedNodeId ? 'red' : 'blue'}
          onContextMenu={(e) => {
            e.evt.preventDefault(); 
            console.log('Right-clicked node:', node.id);
            removeNode(node.id);
          }}
        />
      ))}
    
    {/* Conditionally render DimTool only when an edge is selected */}
      {selectedEdge && (
        <DimTool 
          edge={selectedEdge}
          label={distance !== null ? distance.toFixed(2) : undefined}
        />
      )}
    </Group>
  );
};

export default DrawLayer;
