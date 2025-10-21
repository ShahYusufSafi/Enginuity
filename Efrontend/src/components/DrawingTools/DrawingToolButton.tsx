import React from 'react';


interface DrawingToolButtonProps {
    tool: string;
    currentTool?: string;
    setTool: (tool: string) => void;
    children?: React.ReactNode;
}

export default function DrawingToolButton({ currentTool,
    tool, setTool, children }: DrawingToolButtonProps) {

    const isActive = currentTool === tool;

    return (
      <button
        type="button"
        onClick={() => setTool(tool)}
        className={`px-3 py-2 rounded ${isActive ? 'bg-indigo-600 text-white' : 'bg-white text-black'}`}
        title={tool}
      >
      {children}
    </button>

    );
}