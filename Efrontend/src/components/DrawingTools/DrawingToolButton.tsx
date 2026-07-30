import React from 'react';

/**
 * Icon button for the Konva sketch toolbar (deprecated stack — see DrawNav).
 *
 * Icon-only, so `label` carries the tooltip and the accessible name; without it
 * a screen reader gets nothing but the raw tool id. `aria-pressed` conveys the
 * active state, which is otherwise only a colour.
 */
interface DrawingToolButtonProps {
    tool: string;
    /** Human-readable name; falls back to the tool id. */
    label?: string;
    currentTool?: string;
    setTool: (tool: string) => void;
    children?: React.ReactNode;
}

export default function DrawingToolButton({
    currentTool,
    tool,
    label,
    setTool,
    children,
}: DrawingToolButtonProps) {
    const isActive = currentTool === tool;
    const name = label ?? tool;

    return (
        <button
            type="button"
            onClick={() => setTool(tool)}
            className={`rounded px-3 py-2 ${isActive ? 'bg-indigo-600 text-white' : 'bg-white text-black'}`}
            title={name}
            aria-label={name}
            aria-pressed={isActive}
        >
            {children}
        </button>
    );
}
