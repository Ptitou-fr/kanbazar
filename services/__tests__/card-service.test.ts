import { describe, expect, test, vi } from "vitest";
import type { Card, CardStore } from "@/data/card-store";
import { createCardService } from "@/services/card-service";

function card(fields: Partial<Card> & Pick<Card, "id">): Card {
  return { title: fields.id.toUpperCase(), description: "", status: "todo", position: 1, ...fields };
}

function fakeStore(cards: Card[] = []) {
  const store = {
    listCards: vi.fn(async () => cards),
    appendCard: vi.fn(async (input: { title: string; status: Card["status"] }) => ({
      id: "id-1",
      description: "",
      position: 1,
      ...input,
    })),
    updateCard: vi.fn(async (id: string, patch: { title?: string; description?: string }): Promise<Card | null> => {
      const found = cards.find((existing) => existing.id === id);
      return found ? { ...found, ...patch } : null;
    }),
  } satisfies CardStore;
  return store;
}

describe("cardService.getBoard", () => {
  // Critère 1 : tableau vide
  test("renvoie trois colonnes vides quand il n'y a aucune carte", async () => {
    const service = createCardService(fakeStore());

    await expect(service.getBoard()).resolves.toEqual({ todo: [], doing: [], done: [] });
  });

  test("range les cartes par colonne, dans l'ordre de leur position", async () => {
    const service = createCardService(
      fakeStore([
        card({ id: "b", status: "todo", position: 2 }),
        card({ id: "c", status: "done", position: 1 }),
        card({ id: "a", status: "todo", position: 1 }),
      ]),
    );

    const board = await service.getBoard();

    expect(board.todo.map((card) => card.id)).toEqual(["a", "b"]);
    expect(board.doing).toEqual([]);
    expect(board.done.map((card) => card.id)).toEqual(["c"]);
  });
});

describe("cardService.createCard", () => {
  // Critère 2 : la carte est créée dans « À faire », titre rogné
  test("crée la carte dans « À faire » avec le titre sans espaces autour", async () => {
    const store = fakeStore();
    const service = createCardService(store);

    const result = await service.createCard("  Brancher Turso ");

    expect(store.appendCard).toHaveBeenCalledWith({ title: "Brancher Turso", status: "todo" });
    expect(result).toEqual({
      ok: true,
      card: { id: "id-1", position: 1, title: "Brancher Turso", description: "", status: "todo" },
    });
  });

  // Critère 3 : titre vide ou fait d'espaces refusé côté service
  test.each([[""], ["   "], [undefined], [42]])("refuse le titre %j sans rien enregistrer", async (title) => {
    const store = fakeStore();
    const service = createCardService(store);

    await expect(service.createCard(title)).resolves.toEqual({ ok: false, error: "title_required" });
    expect(store.appendCard).not.toHaveBeenCalled();
  });

  // Critère 5 : l'échec d'enregistrement n'est pas maquillé en succès
  test("laisse remonter l'échec de la couche données", async () => {
    const store = fakeStore();
    store.appendCard.mockRejectedValueOnce(new Error("base injoignable"));
    const service = createCardService(store);

    await expect(service.createCard("Titre")).rejects.toThrow("base injoignable");
  });
});

describe("cardService.updateCard", () => {
  const existing = card({ id: "a", title: "Ancien titre", description: "Ancienne description" });

  // Lot 2, critère 1 : nouveau titre enregistré, sans espaces autour
  test("enregistre le nouveau titre rogné et renvoie la carte modifiée", async () => {
    const store = fakeStore([existing]);
    const service = createCardService(store);

    const result = await service.updateCard("a", { title: "  Nouveau titre " });

    expect(store.updateCard).toHaveBeenCalledWith("a", { title: "Nouveau titre" });
    expect(result).toEqual({ ok: true, card: { ...existing, title: "Nouveau titre" } });
  });

  // Lot 2, critère 2 : description ajoutée ou effacée
  test.each([
    ["Une description ", "Une description"],
    ["", ""],
    ["   ", ""],
  ])("enregistre la description %j comme %j", async (description, saved) => {
    const store = fakeStore([existing]);
    const service = createCardService(store);

    const result = await service.updateCard("a", { description });

    expect(store.updateCard).toHaveBeenCalledWith("a", { description: saved });
    expect(result).toEqual({ ok: true, card: { ...existing, description: saved } });
  });

  // Lot 2, critère 3 : titre vidé refusé, rien n'est enregistré
  test.each([[""], ["   "], [42], [null]])("refuse le titre %j sans rien enregistrer", async (title) => {
    const store = fakeStore([existing]);
    const service = createCardService(store);

    await expect(service.updateCard("a", { title, description: "ignorée" })).resolves.toEqual({
      ok: false,
      error: "title_required",
    });
    expect(store.updateCard).not.toHaveBeenCalled();
  });

  test("refuse une description qui n'est pas du texte", async () => {
    const store = fakeStore([existing]);
    const service = createCardService(store);

    await expect(service.updateCard("a", { description: 42 })).resolves.toEqual({ ok: false, error: "invalid_description" });
    expect(store.updateCard).not.toHaveBeenCalled();
  });

  test("ne touche pas aux champs absents", async () => {
    const store = fakeStore([existing]);
    const service = createCardService(store);

    await expect(service.updateCard("a", {})).resolves.toEqual({ ok: true, card: existing });
    expect(store.updateCard).toHaveBeenCalledWith("a", {});
  });

  test("signale une carte inconnue", async () => {
    const service = createCardService(fakeStore([existing]));

    await expect(service.updateCard("inconnue", { title: "X" })).resolves.toEqual({ ok: false, error: "not_found" });
  });

  // Lot 2, critère 4 : l'échec d'enregistrement remonte
  test("laisse remonter l'échec de la couche données", async () => {
    const store = fakeStore([existing]);
    store.updateCard.mockRejectedValueOnce(new Error("base injoignable"));

    await expect(createCardService(store).updateCard("a", { title: "X" })).rejects.toThrow("base injoignable");
  });
});
