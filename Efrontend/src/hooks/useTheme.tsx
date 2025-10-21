import React, { useState, createContext , useEffect, useContext} from "react";

type Theme = "dark" | "light" | "system"

interface ThemeContextProps {
    theme: Theme;
    setTheme: (ThemeId: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps| null>(null);

export const ThemeProviderCustom = ({children}:{children: React.ReactNode}) => {

    const [theme, setTheme] = useState<Theme>("system");
    
    useEffect(()=> {
        const root = document.documentElement;

        if (theme === "system"){
            // check if the system matches the dark theme 
            const sysThemeDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            root.setAttribute("data-theme", sysThemeDark ? "dark": "light")
        } else {
            root.setAttribute("data-theme", theme)
        }
        localStorage.setItem("theme", theme);
        
    }, [theme]);

    // to interact with browser
    useEffect(()=>{
        const saved = localStorage.getItem("theme") as Theme|null;
        
        if (saved) setTheme(saved);
    },[]);

    return (
        <ThemeContext.Provider value={{theme ,setTheme}}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  console.log("ThemeProvider theme:", context?.theme);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};