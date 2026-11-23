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
    placeCards: vi.fn<CardStore["placeCards"]>(async () => {}),
    archiveCard: vi.fn(async (id: string) => cards.some((existing) => existing.id === id)),
    deleteCard: vi.fn(async (id: string) => cards.some((existing) => existing.id === id)),
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

describe("cardService.moveCard", () => {
  const board = [
    card({ id: "a", status: "todo", position: 1 }),
    card({ id: "b", status: "todo", position: 2 }),
    card({ id: "c", status: "doing", position: 1 }),
    card({ id: "d", status: "doing", position: 2 }),
  ];

  // Lot 3, critère 1 : déposée dans « En cours » à l'endroit du dépôt
  test("place la carte dans la nouvelle colonne, à l'index demandé", async () => {
    const store = fakeStore(board);

    await expect(createCardService(store).moveCard("a", "doing", 1)).resolves.toEqual({ ok: true });
    expect(store.placeCards).toHaveBeenCalledWith("doing", ["c", "a", "d"]);
  });

  // Lot 3, critère 2 : vers une autre colonne au clavier, la carte arrive en bas
  test.each([[2], [99]])("place la carte en bas de la colonne pour l'index %j", async (index) => {
    const store = fakeStore(board);

    await createCardService(store).moveCard("b", "doing", index);
    expect(store.placeCards).toHaveBeenCalledWith("doing", ["c", "d", "b"]);
  });

  test("ramène un index négatif en haut de la colonne", async () => {
    const store = fakeStore(board);

    await createCardService(store).moveCard("d", "todo", -3);
    expect(store.placeCards).toHaveBeenCalledWith("todo", ["d", "a", "b"]);
  });

  test("refuse un état inconnu sans rien enregistrer", async () => {
    const store = fakeStore(board);

    await expect(createCardService(store).moveCard("a", "archived", 0)).resolves.toEqual({ ok: false, error: "invalid_status" });
    expect(store.placeCards).not.toHaveBeenCalled();
  });

  test.each([[1.5], ["1"], [null]])("refuse la position %j sans rien enregistrer", async (index) => {
    const store = fakeStore(board);

    await expect(createCardService(store).moveCard("a", "doing", index)).resolves.toEqual({ ok: false, error: "invalid_position" });
    expect(store.placeCards).not.toHaveBeenCalled();
  });

  test("signale une carte inconnue", async () => {
    const store = fakeStore(board);

    await expect(createCardService(store).moveCard("z", "doing", 0)).resolves.toEqual({ ok: false, error: "not_found" });
    expect(store.placeCards).not.toHaveBeenCalled();
  });

  // Lot 3, critère 4 : l'échec d'enregistrement remonte
  test("laisse remonter l'échec de la couche données", async () => {
    const store = fakeStore(board);
    store.placeCards.mockRejectedValueOnce(new Error("base injoignable"));

    await expect(createCardService(store).moveCard("a", "doing", 0)).rejects.toThrow("base injoignable");
  });
});

describe("cardService.moveCard dans une même colonne", () => {
  const column = [
    card({ id: "a", status: "todo", position: 1 }),
    card({ id: "b", status: "todo", position: 2 }),
    card({ id: "c", status: "todo", position: 3 }),
  ];

  // Lot 4, critère 1 : C déposée au-dessus de A
  test("place C au-dessus de A : l'ordre devient C, A, B", async () => {
    const store = fakeStore(column);

    await expect(createCardService(store).moveCard("c", "todo", 0)).resolves.toEqual({ ok: true });
    expect(store.placeCards).toHaveBeenCalledWith("todo", ["c", "a", "b"]);
  });

  // Lot 4, critère 2 : un rang plus bas
  test("descend A d'un rang : l'ordre devient B, A, C", async () => {
    const store = fakeStore(column);

    await createCardService(store).moveCard("a", "todo", 1);
    expect(store.placeCards).toHaveBeenCalledWith("todo", ["b", "a", "c"]);
  });
});

describe("cardService.archiveCard", () => {
  // Lot 5, critère 1 : la carte est archivée
  test("archive une carte active", async () => {
    const store = fakeStore([card({ id: "a" })]);

    await expect(createCardService(store).archiveCard("a")).resolves.toEqual({ ok: true });
    expect(store.archiveCard).toHaveBeenCalledWith("a");
  });

  test("signale une carte inconnue ou déjà archivée", async () => {
    const store = fakeStore([]);

    await expect(createCardService(store).archiveCard("a")).resolves.toEqual({ ok: false, error: "not_found" });
  });

  // Lot 5, critère 4 : l'échec d'enregistrement remonte
  test("laisse remonter l'échec de la couche données", async () => {
    const store = fakeStore([card({ id: "a" })]);
    store.archiveCard.mockRejectedValueOnce(new Error("base injoignable"));

    await expect(createCardService(store).archiveCard("a")).rejects.toThrow("base injoignable");
  });
});

describe("cardService.deleteCard", () => {
  // Lot 6, critère 3 : la carte est supprimée
  test("supprime la carte", async () => {
    const store = fakeStore([card({ id: "a" })]);

    await expect(createCardService(store).deleteCard("a")).resolves.toEqual({ ok: true });
    expect(store.deleteCard).toHaveBeenCalledWith("a");
  });

  test("signale une carte inconnue", async () => {
    await expect(createCardService(fakeStore([])).deleteCard("a")).resolves.toEqual({ ok: false, error: "not_found" });
  });

  // Lot 6, critère 4 : l'échec d'enregistrement remonte
  test("laisse remonter l'échec de la couche données", async () => {
    const store = fakeStore([card({ id: "a" })]);
    store.deleteCard.mockRejectedValueOnce(new Error("base injoignable"));

    await expect(createCardService(store).deleteCard("a")).rejects.toThrow("base injoignable");
  });
});
