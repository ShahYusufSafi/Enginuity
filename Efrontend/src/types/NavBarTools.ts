import type { FC } from "react";

export interface ToolType{

    name: string | null;
    id: string | null;
    action: () => void;
    Component?: FC<any>;
}