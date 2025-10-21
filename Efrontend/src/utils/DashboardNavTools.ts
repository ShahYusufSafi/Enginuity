import { SearchBar } from "../components/SearchBar";
import type { ToolType } from "../types/NavBarTools";

export const tool: Record<string, ToolType> = {
  Search: {
    name: "Search",
    id: "SearchTool",
    action: () => {
      // Search bar will handle action internally
    },
  
    Component: SearchBar,
  },
  
};