import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeProvider';

/**
 * Icon button in the app header that flips between light and dark theme.
 * Shows a Sun icon in dark mode (click to go light) and a Moon icon in light mode (click to go dark),
 * i.e. the icon represents the theme you'll SWITCH TO, which is the common UX convention.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}
