import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/lib/theme";

const order: Theme[] = ["light", "dark", "system"];
const labels: Record<Theme, string> = {
  light: "Světlý",
  dark: "Tmavý",
  system: "Systém",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      title={`Téma: ${labels[theme]} (klik = ${labels[next]})`}
      aria-label={`Přepnout téma na ${labels[next]}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
