// src/components/ThemeSwitcher.tsx
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
