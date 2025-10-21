//import { Line } from "react-konva";

import type { IconType } from "react-icons";
import {type GeometryStoreApi } from "../States/useGeometryStore";


export interface ToolProps {
    id: string;
    name: string;
    icon: IconType;
    // The action function that will be called when the tool is used
    // it has access to the pointer position, nodes, edges, and the store itself
    action: (params : {
        pointer: { x: number; y: number };
        nodes: GeometryStoreApi['nodes'];
        edges: GeometryStoreApi['edges'];
        store: GeometryStoreApi;
        selectedNodeId: string | null;
        setSelectedNodeId: (id: string | null) => void;
        selectedEdgeId?: string | null;
        setSelectedEdgeId: (id: string | null) => void;
        setDistance: (dist: number | null) => void;
    }) => void; // Function to handle tool action
}
