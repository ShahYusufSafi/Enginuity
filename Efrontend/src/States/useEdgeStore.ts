import { create } from "zustand";

interface EdgeState {
    currentEdge: String | null;
    setCurrentEdge: (EdgeId: String|null) => void
}

export const useEdgeStore = create<EdgeState>((set) => (
    {
        currentEdge: null,
        setCurrentEdge: (edge) => set ({currentEdge:edge})
    }
));

