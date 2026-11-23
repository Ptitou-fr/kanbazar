"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  applyTheme,
  readPreference,
  resolveTheme,
  SYSTEM_DARK_QUERY,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Au rendu serveur, le choix n'est pas connu : « système ». Le script de
  // <head> a déjà posé le bon thème ; l'état le rejoint au montage.
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    // Synchronisation avec le navigateur, une fois au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferenceState(readPreference(window.localStorage));
    setSystemDark(media.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme(preference, systemDark);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Stockage bloqué : le choix vaut pour cette page seulement.
    }
  }

  return <ThemeContext.Provider value={{ preference, resolved, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme doit être utilisé dans un ThemeProvider.");
  return value;
}
