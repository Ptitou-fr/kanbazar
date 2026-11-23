// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { moveCardAction, toastError } = vi.hoisted(() => ({ moveCardAction: vi.fn(), toastError: vi.fn() }));
vi.mock("@/app/actions/create-card", () => ({ createCardAction: vi.fn() }));
vi.mock("@/app/actions/update-card", () => ({ updateCardAction: vi.fn() }));
vi.mock("@/app/actions/move-card", () => ({ moveCardAction }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { BoardView } from "@/components/board/board-view";
import type { Board, Card } from "@/services/card-service";

function card(id: string, status: Card["status"]): Card {
  return { id, title: id.toUpperCase(), description: "", status, position: 0 };
}

const board: Board = {
  todo: [card("a", "todo"), card("b", "todo")],
  doing: [card("c", "doing"), card("d", "doing")],
  done: [],
};

function column(name: string) {
  return screen.getByRole("region", { name });
}

function titles(name: string) {
  return within(column(name))
    .queryAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

function handle(title: string) {
  return screen.getByRole("button", { name: `Déplacer « ${title} »` });
}

function press(title: string, key: string) {
  fireEvent.keyDown(handle(title), { key });
}

function announcement() {
  return screen.getByRole("status").textContent;
}

function article(title: string) {
  return screen.getByRole("heading", { name: title }).closest("[data-card]")!;
}

// Enregistrement en attente pendant les assertions, résolu en fin de test :
// React enchevêtre les transitions asynchrones, une promesse jamais résolue
// bloquerait les tests suivants.
const pendingSaves: (() => void)[] = [];
function keepSaving() {
  moveCardAction.mockImplementation(() => new Promise((resolve) => pendingSaves.push(() => resolve({ ok: true }))));
}

beforeEach(() => {
  moveCardAction.mockReset();
  toastError.mockReset();
});
afterEach(() => {
  pendingSaves.splice(0).forEach((resolve) => resolve());
  cleanup();
});

describe("BoardView — déplacer une carte vers un autre état", () => {
  // Lot 3, critère 1 : dépôt à la souris, à l'endroit du dépôt
  test("une carte déposée dans « En cours » y apparaît à l'endroit du dépôt", async () => {
    keepSaving();
    render(<BoardView board={board} />);

    fireEvent.dragStart(article("A"), { dataTransfer: { setData: vi.fn(), effectAllowed: "" } });
    await vi.waitFor(() => expect(column("À faire").querySelector("[data-placeholder]")).not.toBeNull());
    // Survol de la moitié haute de « D » : le dépôt se fait au-dessus de D.
    fireEvent.dragOver(article("D"), { clientY: 0 });
    expect(column("En cours").querySelector("[data-placeholder]")).not.toBeNull();
    fireEvent.drop(column("En cours"));

    await vi.waitFor(() => expect(moveCardAction).toHaveBeenCalledWith("a", "doing", 1));
    expect(titles("En cours")).toEqual(["C", "A", "D"]);
    expect(titles("À faire")).toEqual(["B"]);
  });

  test("une carte déposée sous les autres arrive en bas de la colonne", async () => {
    keepSaving();
    render(<BoardView board={board} />);

    fireEvent.dragStart(article("A"), { dataTransfer: { setData: vi.fn(), effectAllowed: "" } });
    await vi.waitFor(() => expect(column("À faire").querySelector("[data-placeholder]")).not.toBeNull());
    fireEvent.dragOver(column("Terminé"));
    fireEvent.drop(column("Terminé"));

    await vi.waitFor(() => expect(moveCardAction).toHaveBeenCalledWith("a", "done", 0));
    expect(titles("Terminé")).toEqual(["A"]);
  });

  // Lot 3, critère 2 : au clavier, Espace, →, Espace : en bas de la colonne suivante, annoncé
  test("au clavier, Espace puis → puis Espace envoie la carte en bas de la colonne suivante et l'annonce", async () => {
    keepSaving();
    render(<BoardView board={board} />);

    press("A", " ");
    expect(handle("A").getAttribute("aria-pressed")).toBe("true");
    expect(announcement()).toContain("« A » saisie");

    press("A", "ArrowRight");
    expect(titles("En cours")).toEqual(["C", "D", "A"]);
    expect(announcement()).toBe("« A » — colonne En cours, position 3 sur 3.");
    expect(moveCardAction).not.toHaveBeenCalled();

    press("A", " ");
    await vi.waitFor(() => expect(moveCardAction).toHaveBeenCalledWith("a", "doing", 2));
    expect(announcement()).toBe("« A » déposée dans En cours, position 3 sur 3.");
    expect(titles("En cours")).toEqual(["C", "D", "A"]);
  });

  test("au clavier, Échap annule le déplacement sans rien enregistrer", () => {
    render(<BoardView board={board} />);

    press("A", " ");
    press("A", "ArrowRight");
    press("A", "Escape");

    expect(titles("À faire")).toEqual(["A", "B"]);
    expect(titles("En cours")).toEqual(["C", "D"]);
    expect(announcement()).toBe("Déplacement annulé.");
    expect(moveCardAction).not.toHaveBeenCalled();
  });

  test("au clavier, → depuis la dernière colonne ne bouge rien", () => {
    render(<BoardView board={{ ...board, done: [card("e", "done")] }} />);

    press("E", " ");
    press("E", "ArrowRight");

    expect(titles("Terminé")).toEqual(["E"]);
  });

  // Lot 3, critère 4 : échec signalé, la carte revient à son état enregistré
  test("si l'enregistrement échoue, l'erreur est signalée et la carte revient à sa place", async () => {
    moveCardAction.mockResolvedValue({ ok: false, error: "save_failed" });
    render(<BoardView board={board} />);

    press("A", " ");
    press("A", "ArrowRight");
    press("A", " ");

    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Échec de l’enregistrement", expect.objectContaining({
        description: "« A » n’a pas été déplacée : elle revient à sa place.",
      })),
    );
    await vi.waitFor(() => expect(titles("À faire")).toEqual(["A", "B"]));
    expect(titles("En cours")).toEqual(["C", "D"]);
  });
});

describe("BoardView — réordonner les cartes d'une colonne", () => {
  const abc: Board = { todo: [card("a", "todo"), card("b", "todo"), card("c", "todo")], doing: [], done: [] };

  // Lot 4, critère 1 : C déposée au-dessus de A
  test("C déposée au-dessus de A : l'ordre affiché devient C, A, B", async () => {
    keepSaving();
    render(<BoardView board={abc} />);

    fireEvent.dragStart(article("C"), { dataTransfer: { setData: vi.fn(), effectAllowed: "" } });
    await vi.waitFor(() => expect(column("À faire").querySelector("[data-placeholder]")).not.toBeNull());
    fireEvent.dragOver(article("A"), { clientY: 0 });
    fireEvent.drop(article("A"));

    await vi.waitFor(() => expect(moveCardAction).toHaveBeenCalledWith("c", "todo", 0));
    expect(titles("À faire")).toEqual(["C", "A", "B"]);
  });

  // Lot 4, critère 2 : ↑ et ↓ d'un rang, Échap rétablit l'ordre de départ
  test("au clavier, ↑ et ↓ changent la carte de rang et Échap rétablit l'ordre de départ", () => {
    render(<BoardView board={abc} />);

    press("A", " ");
    press("A", "ArrowDown");
    expect(titles("À faire")).toEqual(["B", "A", "C"]);
    expect(announcement()).toBe("« A » — colonne À faire, position 2 sur 3.");
    press("A", "ArrowDown");
    expect(titles("À faire")).toEqual(["B", "C", "A"]);
    press("A", "ArrowDown");
    expect(titles("À faire")).toEqual(["B", "C", "A"]);
    press("A", "ArrowUp");
    expect(titles("À faire")).toEqual(["B", "A", "C"]);

    press("A", "Escape");
    expect(titles("À faire")).toEqual(["A", "B", "C"]);
    expect(moveCardAction).not.toHaveBeenCalled();
  });

  test("au clavier, ↑ puis Espace enregistre le nouveau rang", async () => {
    keepSaving();
    render(<BoardView board={abc} />);

    press("C", " ");
    press("C", "ArrowUp");
    press("C", " ");

    await vi.waitFor(() => expect(moveCardAction).toHaveBeenCalledWith("c", "todo", 1));
    expect(titles("À faire")).toEqual(["A", "C", "B"]);
  });

  test("le bandeau clavier explique ↑ ↓", () => {
    render(<BoardView board={abc} />);

    press("A", " ");

    expect(screen.getByText(/changer de rang/)).toBeDefined();
  });

  // Lot 4, critère 4 : échec signalé, l'ordre enregistré est réaffiché
  test("si l'enregistrement échoue, l'erreur est signalée et l'ordre enregistré est réaffiché", async () => {
    moveCardAction.mockResolvedValue({ ok: false, error: "save_failed" });
    render(<BoardView board={abc} />);

    press("C", " ");
    press("C", "ArrowUp");
    press("C", "ArrowUp");
    press("C", " ");

    await vi.waitFor(() => expect(toastError).toHaveBeenCalled());
    await vi.waitFor(() => expect(titles("À faire")).toEqual(["A", "B", "C"]));
  });
});

describe("BoardView — déplacer depuis le menu « … » (écran tactile)", () => {
  // Alternative au glisser-déposer sur mobile : la carte arrive en bas de la colonne choisie.
  test("« Déplacer vers… » propose les autres colonnes et envoie la carte en bas de celle choisie", async () => {
    keepSaving();
    render(<BoardView board={board} />);

    fireEvent.click(screen.getByRole("button", { name: "Actions pour « A »" }));
    const group = await screen.findByRole("group", { name: "Déplacer vers…" });
    expect(within(group).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["En cours", "Terminé"]);

    fireEvent.click(within(group).getByRole("menuitem", { name: "En cours" }));

    await vi.waitFor(() => expect(moveCardAction).toHaveBeenCalledWith("a", "doing", 2));
    expect(titles("En cours")).toEqual(["C", "D", "A"]);
    expect(announcement()).toBe("« A » déposée dans En cours, position 3 sur 3.");
  });
});
