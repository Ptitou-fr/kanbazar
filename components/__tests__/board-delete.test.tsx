// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { deleteCardAction, archiveCardAction, toastError } = vi.hoisted(() => ({
  deleteCardAction: vi.fn(),
  archiveCardAction: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/app/actions/create-card", () => ({ createCardAction: vi.fn() }));
vi.mock("@/app/actions/update-card", () => ({ updateCardAction: vi.fn() }));
vi.mock("@/app/actions/move-card", () => ({ moveCardAction: vi.fn() }));
vi.mock("@/app/actions/archive-card", () => ({ archiveCardAction }));
vi.mock("@/app/actions/delete-card", () => ({ deleteCardAction }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { BoardView } from "@/components/board/board-view";
import type { Board, Card } from "@/services/card-service";

function card(id: string, title: string): Card {
  return { id, title, description: "", status: "todo", position: 0 };
}

const board: Board = { todo: [card("a", "Confirmer la suppression"), card("b", "Garder")], doing: [], done: [] };

function todoTitles() {
  return within(screen.getByRole("region", { name: "À faire" }))
    .queryAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

// Résolu en fin de test : une transition jamais terminée bloquerait les suivantes.
const pendingSaves: (() => void)[] = [];
function keepSaving() {
  deleteCardAction.mockImplementation(() => new Promise((resolve) => pendingSaves.push(() => resolve({ ok: true }))));
}

async function askToDelete(title: string) {
  fireEvent.click(screen.getByRole("button", { name: `Actions pour « ${title} »` }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Supprimer" }));
  return screen.findByRole("alertdialog", { name: "Supprimer cette carte ?" });
}

beforeEach(() => {
  deleteCardAction.mockReset();
  archiveCardAction.mockReset();
  toastError.mockReset();
});
afterEach(() => {
  pendingSaves.splice(0).forEach((resolve) => resolve());
  cleanup();
});

describe("BoardView — supprimer une carte définitivement", () => {
  // Lot 6, critère 1 : la confirmation dit que c'est définitif et propose d'archiver
  test("« Supprimer » demande une confirmation qui annonce une suppression définitive et propose d'archiver", async () => {
    render(<BoardView board={board} />);

    const dialog = await askToDelete("Confirmer la suppression");

    expect(within(dialog).getByText(
      "« Confirmer la suppression » sera effacée définitivement. Pour la retirer du tableau sans la perdre, archivez-la plutôt.",
    )).toBeDefined();
    expect(within(dialog).getByRole("button", { name: "Annuler" })).toBeDefined();
    expect(within(dialog).getByRole("button", { name: "Supprimer définitivement" })).toBeDefined();
    expect(deleteCardAction).not.toHaveBeenCalled();
  });

  test("« Supprimer » du panneau d'édition demande aussi la confirmation", async () => {
    render(<BoardView board={board} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirmer la suppression" }));
    const sheet = screen.getByRole("dialog", { name: "Modifier la carte" });
    fireEvent.click(within(sheet).getByRole("button", { name: "Supprimer" }));

    expect(await screen.findByRole("alertdialog", { name: "Supprimer cette carte ?" })).toBeDefined();
  });

  // Lot 6, critère 2 : annuler laisse la carte inchangée
  test("« Annuler » ferme la confirmation et laisse la carte inchangée", async () => {
    render(<BoardView board={board} />);

    const dialog = await askToDelete("Confirmer la suppression");
    fireEvent.click(within(dialog).getByRole("button", { name: "Annuler" }));

    await vi.waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(todoTitles()).toEqual(["Confirmer la suppression", "Garder"]);
    expect(deleteCardAction).not.toHaveBeenCalled();
  });

  // Lot 6, critère 3 : confirmer retire la carte du tableau
  test("« Supprimer définitivement » retire la carte du tableau", async () => {
    keepSaving();
    render(<BoardView board={board} />);

    const dialog = await askToDelete("Confirmer la suppression");
    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer définitivement" }));

    await vi.waitFor(() => expect(deleteCardAction).toHaveBeenCalledWith("a"));
    expect(todoTitles()).toEqual(["Garder"]);
  });

  // Lot 6, critère 4 : échec signalé, la carte reste sur le tableau
  test("si l'enregistrement échoue, l'erreur est signalée et la carte reste sur le tableau", async () => {
    deleteCardAction.mockResolvedValue({ ok: false, error: "save_failed" });
    render(<BoardView board={board} />);

    const dialog = await askToDelete("Confirmer la suppression");
    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer définitivement" }));

    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Échec de l’enregistrement", expect.objectContaining({
        description: "« Confirmer la suppression » n’a pas été supprimée : elle reste sur le tableau.",
      })),
    );
    await vi.waitFor(() => expect(todoTitles()).toEqual(["Confirmer la suppression", "Garder"]));
  });
});
