// src/components/ThemeSwitcher.tsx
/**
 * @deprecated Unused. Theme switching in the app goes through
 * `components/mode-toggle.tsx` + `hooks/ThemeProvider.tsx`.
 *
 * This component reads a *different* hook (`hooks/useTheme.tsx`, also unused),
 * so it is a second, parallel theme implementation that is not connected to
 * the provider the app actually mounts. Delete both in the next pass.
 */
import { useTheme } from "../hooks/useTheme";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
