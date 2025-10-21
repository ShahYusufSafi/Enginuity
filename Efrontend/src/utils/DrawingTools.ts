import type { ToolProps } from "../types/Drawingtools";

import { FaPen, FaEraser, FaMinus, FaRulerCombined } from 'react-icons/fa';
import { calculateDistancePtoL } from "./PointToLineDistance";
import { DistCalculatorLine } from "./LineDistance";

export const tools: Record<string, ToolProps> = {
    pen: {
        id: 'pen',
        name: 'Pen',
        icon: FaPen, 
        action: ({pointer, nodes, store, selectedNodeId, setSelectedNodeId }) => {
            // find the clicked node
            const clickedNode = nodes.find((n) =>         
                // can be done in 1 line as well
                Math.hypot(n.x - pointer.x, n.y - pointer.y) < 10 
                // which is equivalent to:
                // const dx = n.x - pointer.x;
                // const dy = n.y - pointer.y;
                // return Math.sqrt(dx * dx + dy * dy) < 10;
            );

            // if the conditon above is true, then we have clicked on a node whithin 10 pixels
            if (clickedNode) {
                // use selectedNodeId 2 times, since we can select a node and then connect it to another node
                if (selectedNodeId && selectedNodeId !== clickedNode.id) {
                    // if we have a selected node and it's not the same as the clicked node, then we connect them
                    store.addEdge(selectedNodeId, clickedNode.id);
                    // reset the selected node id
                    setSelectedNodeId(null);
                } else {
                    // else we select the clicked node
                    // this will allow us to connect it to another node later
                    setSelectedNodeId(clickedNode.id);
                }
            } else {
                // if we clicked on an empty space, then we add a new node
                store.addNode(pointer.x, pointer.y);
                }
            },
        },

    eraser: {
        id: 'eraser',
        name: 'Eraser',
        icon: FaEraser,
        action: ({pointer, nodes, store}) => {
            // find the clicked node
            const clickedNode = nodes.find((n) =>         
                Math.hypot(n.x - pointer.x, n.y - pointer.y) < 10 
            );

            if (clickedNode) {
                // remove the clicked node
                store.removeNode(clickedNode.id);
            }
        }
    },
    
    line: {
        id: 'line',
        name: 'Line',
        icon: FaMinus,
        action: ({pointer, nodes, store, selectedNodeId, setSelectedNodeId }) => {
            const clickedNode = nodes.find((n) =>
                Math.hypot(n.x - pointer.x, n.y - pointer.y) < 10 
            );
    
            if (clickedNode) {
                if (selectedNodeId && selectedNodeId !== clickedNode.id) {
                    store.addEdge(selectedNodeId, clickedNode.id);
                    setSelectedNodeId(null);
                } else {
                    setSelectedNodeId(clickedNode.id);
                }
            } 
        }
    },

    dist: {
        id: 'dist',
        name: 'Distance',
        icon: FaRulerCombined,
        action: ({edges, pointer, nodes, setSelectedEdgeId, setDistance}) => {
            //const { currentEdge, setCurrentEdge} = useEdgeStore();
            
            const clickedEdge = edges.find((e) => {
                const start = nodes.find(n => n.id === e.source);
                const end = nodes.find(n => n.id === e.target);
                if (!start || !end) return false;
                return calculateDistancePtoL(pointer.x, pointer.y, 
                    start.x, start.y, end.x, end.y) < 10;
            });
            if (clickedEdge) {
                // If an edge is clicked, set it as selected
                setSelectedEdgeId(clickedEdge.id);

                // lets now calculate the distance of segment itself
                const distance = DistCalculatorLine(
                    [nodes.find(n => n.id === clickedEdge.source)?.x || 0,
                    nodes.find(n => n.id === clickedEdge.source)?.y || 0],
                    [nodes.find(n => n.id === clickedEdge.target)?.x || 0,
                    nodes.find(n => n.id === clickedEdge.target)?.y || 0])
                    setDistance(distance);
                    return distance;
            } else {
                // If no edge is clicked, deselect any selected edge
                setSelectedEdgeId(null);
            }
            
        }
    }
};