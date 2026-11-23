// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { THEME_STORAGE_KEY } from "@/components/theme/theme";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { installMatchMedia } from "./match-media";

function renderSwitcher() {
  render(
    <ThemeProvider>
      <ThemeSwitcher />
    </ThemeProvider>,
  );
  return screen.getByRole("group", { name: "Thème" });
}

function pressed(group: HTMLElement) {
  return within(group)
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-pressed") === "true")
    .map((button) => button.getAttribute("aria-label"));
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("ThemeSwitcher", () => {
  test("propose Clair, Sombre et Système, Système par défaut", () => {
    installMatchMedia(false);
    const group = renderSwitcher();

    expect(within(group).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Clair",
      "Sombre",
      "Système",
    ]);
    expect(pressed(group)).toEqual(["Système"]);
  });

  test("« Sombre » passe l'app en sombre et garde le choix", () => {
    installMatchMedia(false);
    const group = renderSwitcher();

    fireEvent.click(within(group).getByRole("button", { name: "Sombre" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(pressed(group)).toEqual(["Sombre"]);
  });

  test("après rechargement, le choix mémorisé est repris", () => {
    installMatchMedia(true);
    localStorage.setItem(THEME_STORAGE_KEY, "light");

    const group = renderSwitcher();

    expect(pressed(group)).toEqual(["Clair"]);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  test("en « Système », l'app suit un changement du réglage du système", () => {
    const media = installMatchMedia(false);
    renderSwitcher();
    expect(document.documentElement.dataset.theme).toBe("light");

    act(() => media.setDark(true));

    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
