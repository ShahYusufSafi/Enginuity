import { create } from 'zustand'; // Zustand for state management
import type { Node, Edge } from '../types/geometry';
import { nanoid } from 'nanoid'; // unique ID generator for nodes and edges

interface GeometryState {
  nodes: Node[];
  edges: Edge[];
  
  addNode: (x: number, y: number) => void;
  addEdge: (startNodeId: string, endNodeId: string) => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
}
export type GeometryStoreApi = GeometryState & {};


// create a Zustand store for managing geometry state
// This store will hold nodes and edges, and provide methods to manipulate them
export const useGeometryStore = create<GeometryState>((set) => ({
  nodes: [], // 3d (id, x, y) array of nodes, initially empty
  edges: [], // 3d (id, source, target) array of edges, initially empty
  
  // The following is simply a replacement using set for the existing nodes and edges, 
  // and we select all existing nodes and edges using spread 
  addNode: (x, y) => set((state) => ({
    // ...state.nodes, selects(shallow copy) all existing nodes
    // { id: nanoid(), x, y } creates a new node with a unique ID and specified coordinates
    nodes: [...state.nodes, { id: nanoid(), x, y }]
  })),
  addEdge: (source, target) => set((state) => ({
    edges: [...state.edges, { id: nanoid(), source , target}]
  })),
  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter((n) => n.id !== id),
    // Optionally, remove edges connected to the node being removed, which is 
    // already handled in drawLayer by setting !start || !end (undefined nodes) 
    // however, good practice to ensure edges are cleaned up  
    edges: state.edges.filter(
      (e) => e.source !== id && e.target !== id)
  })),
  removeEdge: (edgeId) =>
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== edgeId),
      })),

}));
