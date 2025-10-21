import type { ToolType } from "../types/NavBarTools"

export const tool:Record<string, ToolType> = {
    Simulation: {
        name: 'FEM Simulations',
        id: '1 F',
        action: () => {
            // Lets link to the /simulate route
            window.location.href = '/simulate';
        }
    },
    Drawer: {
        name: 'Drawer',
        id: 'D',    
        action: () => {
            window.location.href = '/draw';
        }
    }
}

