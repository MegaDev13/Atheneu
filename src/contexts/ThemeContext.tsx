import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as engine from '../theme/engine';

type Theme = 'light' | 'dark';

const ThemeCtx = createContext<{
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  refresh: () => void;
}>({ theme: 'light', toggle: () => {}, setTheme: () => {}, refresh: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  // boot do Theme Engine (tema salvo > preset do modo) — só escreve vars CSS
  useEffect(() => {
    engine.initTheme();
    setThemeState(engine.getApplied()?.mode === 'dark' ? 'dark' : 'light');
  }, []);

  const refresh = useCallback(() => {
    setThemeState(engine.getApplied()?.mode === 'dark' ? 'dark' : 'light');
  }, []);

  const toggle = useCallback(() => {
    engine.toggleMode();
    refresh();
  }, [refresh]);

  const setTheme = useCallback(
    (t: Theme) => {
      engine.applyTheme(engine.getPresetForMode(t));
      refresh();
    },
    [refresh]
  );

  return <ThemeCtx.Provider value={{ theme, toggle, setTheme, refresh }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
