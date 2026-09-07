import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  className?: string;
}

export default function ThemeToggle({
  isDarkMode,
  toggleDarkMode,
  className = "",
}: ThemeToggleProps) {
  return (
    <button
      onClick={toggleDarkMode}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary ${className}`}
      title={isDarkMode ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      <span className="text-xs font-medium">
        {isDarkMode ? "Claro" : "Escuro"}
      </span>
    </button>
  );
}
