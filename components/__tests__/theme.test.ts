// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { readPreference, resolveTheme, THEME_STORAGE_KEY, themeScript } from "@/components/theme/theme";
import { installMatchMedia } from "./match-media";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = "";
});

describe("readPreference", () => {
  test.each([["light"], ["dark"], ["system"]])("relit le choix %j", (stored) => {
    localStorage.setItem(THEME_STORAGE_KEY, stored);
    expect(readPreference(localStorage)).toBe(stored);
  });

  test("revient à « système » sans choix, avec une valeur inconnue ou sans stockage lisible", () => {
    expect(readPreference(localStorage)).toBe("system");
    localStorage.setItem(THEME_STORAGE_KEY, "violet");
    expect(readPreference(localStorage)).toBe("system");
    expect(readPreference({ getItem: () => { throw new Error("bloqué"); } })).toBe("system");
    expect(readPreference(undefined)).toBe("system");
  });
});

describe("resolveTheme", () => {
  test("un choix explicite l'emporte sur le système ; « système » suit le système", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

// Le script s'exécute avant le premier affichage : pas de flash du mauvais thème.
describe("themeScript", () => {
  const run = () => new Function(themeScript)();

  test("applique le choix mémorisé", () => {
    installMatchMedia(false);
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    run();

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  test("sans choix, suit le réglage du système", () => {
    installMatchMedia(true);

    run();

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  test("avec « clair » mémorisé, reste clair sur un système sombre", () => {
    installMatchMedia(true);
    localStorage.setItem(THEME_STORAGE_KEY, "light");

    run();

    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
