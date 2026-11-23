// Thème de l'interface : clair, sombre, ou celui du système. Le choix est
// gardé par navigateur ; l'attribut data-theme de <html> porte le thème
// appliqué, que app/globals.css lit (variante `dark`).

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "kanbazar-theme";
export const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

const preferences: readonly ThemePreference[] = ["light", "dark", "system"];

export function readPreference(storage: Pick<Storage, "getItem"> | undefined): ThemePreference {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY);
    return preferences.includes(stored as ThemePreference) ? (stored as ThemePreference) : "system";
  } catch {
    // Stockage bloqué (navigation privée, réglages) : le système décide.
    return "system";
  }
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

export function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

// Exécuté dans <head>, avant le premier affichage : pose le bon thème sans
// attendre React, donc sans flash du mauvais thème. Autonome : il ne peut rien
// importer.
export const themeScript = `(function () {
  var preference = "system";
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (stored === "light" || stored === "dark" || stored === "system") preference = stored;
  } catch (error) {}
  var dark = preference === "dark" || (preference === "system" && window.matchMedia(${JSON.stringify(SYSTEM_DARK_QUERY)}).matches);
  var theme = dark ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();`;
