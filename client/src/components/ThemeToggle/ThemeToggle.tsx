import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme, type ThemePreference } from '@/context/ThemeProvider';

const CYCLE: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const NEXT_LABEL: Record<ThemePreference, string> = {
  system: 'Switch to light mode',
  light: 'Switch to dark mode',
  dark: 'Switch to system theme',
};

const ICONS: Record<ThemePreference, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

/**
 * Header control cycling system → light → dark → system (PRD v4, Story 9.2), matching the
 * reference mockup's tri-state toggle: icon shows the current state, aria-label announces the
 * state the next click switches to, and the text label hides on narrow viewports.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const Icon = ICONS[preference];

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setPreference(CYCLE[preference])}
      aria-label={NEXT_LABEL[preference]}
      aria-live="polite"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="hidden capitalize sm:inline">{preference}</span>
    </Button>
  );
}
