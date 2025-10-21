import { create } from 'zustand';

interface ToolState {
  currentTool: string;
  setCurrentTool: (tool: string) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  currentTool: 'pen', // Default tool
  setCurrentTool: (tool) => set({ currentTool: tool }),
}));
