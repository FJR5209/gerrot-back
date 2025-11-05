/* eslint react-refresh/only-export-components: off */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

export type ThemeMode = 'light' | 'dark';

type ThemeModeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'themeMode';

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark') {
        setModeState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // ignore
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const theme = useMemo(() => {
    const common = {
      palette: {
        primary: { main: '#667eea' },
        secondary: { main: '#764ba2' },
      },
      typography: {
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      },
    } as const;

    if (mode === 'dark') {
      return createTheme({
        ...common,
        palette: {
          ...common.palette,
          mode: 'dark',
          background: { default: '#0b0b0f', paper: '#121218' },
        },
      });
    }
    return createTheme({
      ...common,
      palette: {
        ...common.palette,
        mode: 'light',
        background: { default: '#fafafa', paper: '#ffffff' },
      },
    });
  }, [mode]);

  const value = useMemo(() => ({ mode, toggleMode, setMode }), [mode, toggleMode, setMode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode deve ser usado dentro de ThemeModeProvider');
  return ctx;
}
