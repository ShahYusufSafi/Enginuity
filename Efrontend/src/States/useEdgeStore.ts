/**
 * @deprecated Unused. The Konva prototype tracks the selected edge in
 * `DrawLayer`'s local state instead. Note `String` below should be `string`.
 */
import { create } from "zustand";

interface EdgeState {
    currentEdge: string | null;
    setCurrentEdge: (EdgeId: string | null) => void
}

export const useEdgeStore = create<EdgeState>((set) => (
    {
        currentEdge: null,
        setCurrentEdge: (edge) => set ({currentEdge:edge})
    }
));

