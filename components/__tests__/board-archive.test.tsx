// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { archiveCardAction, toastError } = vi.hoisted(() => ({ archiveCardAction: vi.fn(), toastError: vi.fn() }));
vi.mock("@/app/actions/create-card", () => ({ createCardAction: vi.fn() }));
vi.mock("@/app/actions/update-card", () => ({ updateCardAction: vi.fn() }));
vi.mock("@/app/actions/move-card", () => ({ moveCardAction: vi.fn() }));
vi.mock("@/app/actions/archive-card", () => ({ archiveCardAction }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { BoardView } from "@/components/board/board-view";
import type { Board, Card } from "@/services/card-service";

function card(id: string, title: string): Card {
  return { id, title, description: "", status: "todo", position: 0 };
}

const board: Board = { todo: [card("a", "Archiver une carte"), card("b", "Garder")], doing: [], done: [] };

function todoTitles() {
  return within(screen.getByRole("region", { name: "À faire" }))
    .queryAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

// Résolu en fin de test : une transition jamais terminée bloquerait les suivantes.
const pendingSaves: (() => void)[] = [];
function keepSaving() {
  archiveCardAction.mockImplementation(() => new Promise((resolve) => pendingSaves.push(() => resolve({ ok: true }))));
}

async function archiveFromMenu(title: string) {
  fireEvent.click(screen.getByRole("button", { name: `Actions pour « ${title} »` }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Archiver" }));
}

beforeEach(() => {
  archiveCardAction.mockReset();
  toastError.mockReset();
});
afterEach(() => {
  pendingSaves.splice(0).forEach((resolve) => resolve());
  cleanup();
});

describe("BoardView — archiver une carte", () => {
  // Lot 5, critère 1 : depuis le menu « … », la carte disparaît sans « Enregistrer »
  test("« Archiver » dans le menu de la carte la retire du tableau", async () => {
    keepSaving();
    render(<BoardView board={board} />);

    await archiveFromMenu("Archiver une carte");

    await vi.waitFor(() => expect(archiveCardAction).toHaveBeenCalledWith("a"));
    expect(todoTitles()).toEqual(["Garder"]);
    expect(screen.queryByRole("button", { name: /enregistrer/i })).toBeNull();
  });

  // Lot 5, critère 1 : depuis le panneau d'édition
  test("« Archiver » dans le panneau d'édition ferme le panneau et retire la carte", async () => {
    keepSaving();
    render(<BoardView board={board} />);

    fireEvent.click(screen.getByRole("button", { name: "Archiver une carte" }));
    const dialog = screen.getByRole("dialog", { name: "Modifier la carte" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Archiver" }));

    await vi.waitFor(() => expect(archiveCardAction).toHaveBeenCalledWith("a"));
    expect(todoTitles()).toEqual(["Garder"]);
    await vi.waitFor(() => expect(screen.queryByRole("dialog", { name: "Modifier la carte" })).toBeNull());
  });

  // Lot 5, critère 4 : échec signalé, la carte reste sur le tableau
  test("si l'enregistrement échoue, l'erreur est signalée et la carte reste sur le tableau", async () => {
    archiveCardAction.mockResolvedValue({ ok: false, error: "save_failed" });
    render(<BoardView board={board} />);

    await archiveFromMenu("Archiver une carte");

    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Échec de l’enregistrement", expect.objectContaining({
        description: "« Archiver une carte » n’a pas été archivée : elle reste sur le tableau.",
      })),
    );
    await vi.waitFor(() => expect(todoTitles()).toEqual(["Archiver une carte", "Garder"]));
  });
});
