import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Raw user preference as stored in localStorage (PRD v4, Story 9.1). */
export type ThemePreference = 'light' | 'dark' | 'system';
/** What actually gets applied to the document after resolving 'system'. */
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** The raw three-state preference: 'system' tracks the OS live. */
  preference: ThemePreference;
  /** Resolved light/dark currently applied — what consumers like the map should key off. */
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = 'taxi-fare-ui-theme';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  const theme: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  // Live OS tracking: subscribe only while the preference is 'system' (Story 9.1).
  useEffect(() => {
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [preference]);

  // Apply the resolved theme: always toggle the `.dark` class (Tailwind darkMode:'class' plus
  // the shared selector list in index.css), and set/remove `data-theme` so an explicit choice
  // overrides the OS while 'system' lets index.css's media block apply (Story 9.1).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
    localStorage.setItem(STORAGE_KEY, preference);
  }, [theme, preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Access the current theme preference, resolved theme, and its setter. Must be called from
 * within a ThemeProvider.
 * @throws if used outside ThemeProvider — fails loudly rather than silently defaulting,
 * so a missing provider is caught immediately during development.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
