// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { AppSidebar } from "@/components/board/app-sidebar";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";

beforeAll(() => {
  // jsdom n'implémente pas matchMedia, utilisé par la barre latérale shadcn.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

afterEach(cleanup);

describe("AppSidebar", () => {
  // Critère 1 : la barre latérale est visible
  test("affiche le tableau, la création de carte et les colonnes avec leur nombre de cartes", () => {
    render(
      <ThemeProvider>
        <SidebarProvider>
          <AppSidebar counts={{ todo: 2, doing: 0, done: 1 }} />
        </SidebarProvider>
      </ThemeProvider>,
    );

    expect(screen.getByRole("link", { name: /Tableau/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Nouvelle carte/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /À faire\s*2/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /En cours\s*0/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /Terminé\s*1/ })).toBeDefined();
    // Issue #12 : le pied de la barre latérale propose le thème, plus l'état de l'enregistrement.
    expect(screen.getByRole("group", { name: "Thème" })).toBeDefined();
    expect(screen.queryByText("Tout est enregistré")).toBeNull();
  });
});
