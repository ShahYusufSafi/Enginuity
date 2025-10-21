import { Group, Line, Text } from "react-konva";
import { useGeometryStore } from "../../States/useGeometryStore";

import type{ Edge } from "../../types/geometry";

interface DimensioningTool{
    edge: Edge
    label?: number | string | null
    
}

export default function DimTool({edge, label}:DimensioningTool){
    const { nodes} = useGeometryStore();

    const start = nodes.find(n => n.id === edge.source);
    const end = nodes.find(n => n.id === edge.target);

    // Guard against undefined
    if (!start || !end) return null

    // Midpoint coordinate for labels
    const midX = (start.x + end.x)/2
    const midY = (start.y + end.y)/2

    let angleDeg = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
    
    if (angleDeg > 90 || angleDeg < -90) {
                    angleDeg += 180; // flip upside-down text
        }

    return (
        <Group>
            <Line
            points={[start.x, start.y+10, end.x, end.y+10]}
            dash={[2,2]}
            stroke= "black"
            />

            {label && (
                <Text
                  x={midX - 10}
                  y={midY + 10}
                  text={label.toString()}

                  
                  fontSize={20}
                  rotation = {angleDeg}
                  offsetX={label.toString().length * 5}
                  offsetY={-20}

                  fill="black"
                />
            )}
        </Group>
    );
}
