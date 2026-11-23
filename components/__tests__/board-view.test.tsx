// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("@/app/actions/create-card", () => ({ createCardAction: vi.fn() }));
vi.mock("@/app/actions/update-card", () => ({ updateCardAction: vi.fn() }));

import { BoardView } from "@/components/board/board-view";
import type { Board } from "@/services/card-service";

const emptyBoard: Board = { todo: [], doing: [], done: [] };

afterEach(cleanup);

describe("BoardView", () => {
  // Critère 1 : tableau vide
  test("affiche les colonnes À faire, En cours et Terminé, sans carte", () => {
    render(<BoardView board={emptyBoard} />);

    for (const name of ["À faire", "En cours", "Terminé"]) {
      const column = screen.getByRole("region", { name });
      expect(within(column).queryAllByRole("listitem")).toHaveLength(0);
    }
  });

  // Critère 2 : les cartes apparaissent dans leur colonne, dans l'ordre reçu
  test("affiche les cartes de « À faire » dans l'ordre, la plus récente en bas", () => {
    const board: Board = {
      ...emptyBoard,
      todo: [
        { id: "a", title: "Première", description: "", status: "todo", position: 1 },
        { id: "b", title: "Nouvelle", description: "", status: "todo", position: 2 },
      ],
    };

    render(<BoardView board={board} />);

    const todo = screen.getByRole("region", { name: "À faire" });
    const titles = within(todo).getAllByRole("listitem").map((item) => within(item).getByRole("heading").textContent);
    expect(titles).toEqual(["Première", "Nouvelle"]);
    expect(within(todo).getByText("2")).toBeDefined();
  });

  // Critère 2 : pas d'action « Enregistrer »
  test("ne propose aucun bouton « Enregistrer »", () => {
    render(<BoardView board={emptyBoard} />);

    expect(screen.queryByRole("button", { name: /enregistrer/i })).toBeNull();
  });

  // Lot 2 : la carte affiche sa description et s'ouvre dans le panneau d'édition
  test("affiche la description d'une carte et l'ouvre en édition au clic", () => {
    const board: Board = {
      ...emptyBoard,
      doing: [{ id: "c", title: "Glisser-déposer", description: "Avec le clavier aussi.", status: "doing", position: 1 }],
    };
    render(<BoardView board={board} />);

    const doing = screen.getByRole("region", { name: "En cours" });
    expect(within(doing).getByText("Avec le clavier aussi.")).toBeDefined();

    fireEvent.click(within(doing).getByRole("button", { name: "Glisser-déposer" }));

    const dialog = screen.getByRole("dialog", { name: "Modifier la carte" });
    expect((within(dialog).getByLabelText("Titre") as HTMLInputElement).value).toBe("Glisser-déposer");
    expect((within(dialog).getByLabelText("Description") as HTMLTextAreaElement).value).toBe("Avec le clavier aussi.");
  });
});
