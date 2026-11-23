import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { openDatabase } from "@/data/db";
import { createCardStore } from "@/data/card-store";

function memoryStore() {
  const db = openDatabase({ url: ":memory:" });
  return { db, store: createCardStore(() => db) };
}

describe("cardStore", () => {
  const dirs: string[] = [];
  afterEach(() => {
    dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });

  // Critère 1 : tableau vide
  test("listCards renvoie une liste vide sur une base neuve", async () => {
    const { store } = memoryStore();

    await expect(store.listCards()).resolves.toEqual([]);
  });

  // Critère 2 : la carte arrive en bas de la colonne
  test("appendCard place chaque nouvelle carte en bas de sa colonne", async () => {
    const { store } = memoryStore();

    const first = await store.appendCard({ title: "Première", status: "todo" });
    const second = await store.appendCard({ title: "Deuxième", status: "todo" });

    expect(first).toMatchObject({ title: "Première", status: "todo" });
    expect(typeof first.id).toBe("string");
    expect(second.position).toBeGreaterThan(first.position);
    const todo = (await store.listCards()).filter((card) => card.status === "todo");
    expect(todo.map((card) => card.title)).toEqual(["Première", "Deuxième"]);
  });

  test("les positions sont propres à chaque colonne", async () => {
    const { store } = memoryStore();

    await store.appendCard({ title: "A", status: "todo" });
    await store.appendCard({ title: "B", status: "todo" });
    const doing = await store.appendCard({ title: "C", status: "doing" });

    const cards = await store.listCards();
    expect(cards.map((card) => card.title)).toEqual(["A", "B", "C"]);
    expect(doing.position).toBe(cards.find((card) => card.title === "A")!.position);
  });

  // Critère 4 : conservée après redémarrage
  test("une carte enregistrée est relue par un nouveau client sur la même base", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kanbazar-"));
    dirs.push(dir);
    const url = `file:${join(dir, "kanbazar.db")}`;

    const firstDb = openDatabase({ url });
    const created = await createCardStore(() => firstDb).appendCard({ title: "Persistante", status: "todo" });
    (await firstDb).close();

    const secondDb = openDatabase({ url });
    const cards = await createCardStore(() => secondDb).listCards();
    (await secondDb).close();

    expect(cards).toEqual([created]);
  });

  // Critère 5 : base injoignable
  test("appendCard échoue quand la base est injoignable", async () => {
    const db = openDatabase({ url: "file:/kanbazar-dossier-inexistant/sous-dossier/kanbazar.db" });
    db.catch(() => {});
    const store = createCardStore(() => db);

    await expect(store.appendCard({ title: "Perdue", status: "todo" })).rejects.toThrow();
  });

  // Lot 2, critère 1 et 2 : titre et description modifiés, conservés après redémarrage
  test("updateCard modifie le titre et la description, relus par un nouveau client", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kanbazar-"));
    dirs.push(dir);
    const url = `file:${join(dir, "kanbazar.db")}`;

    const firstDb = openDatabase({ url });
    const store = createCardStore(() => firstDb);
    const card = await store.appendCard({ title: "Avant", status: "todo" });
    expect(card.description).toBe("");
    const renamed = await store.updateCard(card.id, { title: "Après" });
    const described = await store.updateCard(card.id, { description: "Détails" });
    (await firstDb).close();

    expect(renamed).toEqual({ ...card, title: "Après" });
    expect(described).toEqual({ ...card, title: "Après", description: "Détails" });
    const secondDb = openDatabase({ url });
    const cards = await createCardStore(() => secondDb).listCards();
    (await secondDb).close();
    expect(cards).toEqual([{ ...card, title: "Après", description: "Détails" }]);
  });

  test("updateCard efface la description sans toucher au titre", async () => {
    const { store } = memoryStore();
    const card = await store.appendCard({ title: "Titre", status: "todo" });
    await store.updateCard(card.id, { description: "À effacer" });

    await expect(store.updateCard(card.id, { description: "" })).resolves.toEqual({ ...card, description: "" });
  });

  test("updateCard renvoie null pour une carte inconnue", async () => {
    const { store } = memoryStore();

    await expect(store.updateCard("inconnue", { title: "X" })).resolves.toBeNull();
  });

  // Lot 2, critère 4 : base injoignable
  test("updateCard échoue quand la base est injoignable", async () => {
    const db = openDatabase({ url: "file:/kanbazar-dossier-inexistant/sous-dossier/kanbazar.db" });
    db.catch(() => {});

    await expect(createCardStore(() => db).updateCard("id", { title: "X" })).rejects.toThrow();
  });

  // Lot 3, critère 1 : la carte entre dans une autre colonne à la place voulue
  test("placeCards range une colonne dans l'ordre donné, y compris une carte venue d'une autre colonne", async () => {
    const { store } = memoryStore();
    const a = await store.appendCard({ title: "A", status: "todo" });
    await store.appendCard({ title: "B", status: "todo" });
    const c = await store.appendCard({ title: "C", status: "doing" });
    const d = await store.appendCard({ title: "D", status: "doing" });

    await store.placeCards("doing", [c.id, a.id, d.id]);

    const cards = await store.listCards();
    expect(cards.map((card) => [card.title, card.status])).toEqual([
      ["B", "todo"],
      ["C", "doing"],
      ["A", "doing"],
      ["D", "doing"],
    ]);
  });

  // Lot 3, critère 3 : nouvelle colonne et position conservées après redémarrage
  test("une carte déplacée est relue dans sa nouvelle colonne, à la même position, par un nouveau client", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kanbazar-"));
    dirs.push(dir);
    const url = `file:${join(dir, "kanbazar.db")}`;

    const firstDb = openDatabase({ url });
    const store = createCardStore(() => firstDb);
    const a = await store.appendCard({ title: "A", status: "todo" });
    const c = await store.appendCard({ title: "C", status: "done" });
    await store.placeCards("done", [a.id, c.id]);
    (await firstDb).close();

    const secondDb = openDatabase({ url });
    const cards = await createCardStore(() => secondDb).listCards();
    (await secondDb).close();
    expect(cards.map((card) => [card.title, card.status, card.position])).toEqual([
      ["A", "done", 1],
      ["C", "done", 2],
    ]);
  });

  // Lot 3, critère 4 : base injoignable
  test("placeCards échoue quand la base est injoignable", async () => {
    const db = openDatabase({ url: "file:/kanbazar-dossier-inexistant/sous-dossier/kanbazar.db" });
    db.catch(() => {});

    await expect(createCardStore(() => db).placeCards("todo", ["a"])).rejects.toThrow();
  });

  // Lot 4, critères 1 et 3 : nouvel ordre d'une colonne, conservé après redémarrage
  test("placeCards réordonne une colonne, relue dans le même ordre par un nouveau client", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kanbazar-"));
    dirs.push(dir);
    const url = `file:${join(dir, "kanbazar.db")}`;

    const firstDb = openDatabase({ url });
    const store = createCardStore(() => firstDb);
    const a = await store.appendCard({ title: "A", status: "todo" });
    const b = await store.appendCard({ title: "B", status: "todo" });
    const c = await store.appendCard({ title: "C", status: "todo" });
    await store.placeCards("todo", [c.id, a.id, b.id]);
    (await firstDb).close();

    const secondDb = openDatabase({ url });
    const cards = await createCardStore(() => secondDb).listCards();
    (await secondDb).close();
    expect(cards.map((card) => card.title)).toEqual(["C", "A", "B"]);
  });

  // Lot 5, critères 1 et 2 : une carte archivée quitte le tableau, aussi après redémarrage
  test("archiveCard retire la carte de listCards, y compris pour un nouveau client", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kanbazar-"));
    dirs.push(dir);
    const url = `file:${join(dir, "kanbazar.db")}`;

    const firstDb = openDatabase({ url });
    const store = createCardStore(() => firstDb);
    const a = await store.appendCard({ title: "A", status: "todo" });
    await store.appendCard({ title: "B", status: "todo" });
    await expect(store.archiveCard(a.id)).resolves.toBe(true);
    expect((await store.listCards()).map((card) => card.title)).toEqual(["B"]);
    (await firstDb).close();

    const secondDb = openDatabase({ url });
    const cards = await createCardStore(() => secondDb).listCards();
    (await secondDb).close();
    expect(cards.map((card) => card.title)).toEqual(["B"]);
  });

  // Lot 5, critère 3 : en base, la carte archivée garde contenu, état et position
  test("archiveCard garde la carte en base, marquée archivée, avec son contenu, son état et sa position", async () => {
    const { db, store } = memoryStore();
    await store.appendCard({ title: "Première", status: "doing" });
    const card = await store.appendCard({ title: "À archiver", status: "doing" });
    await store.updateCard(card.id, { description: "Détails" });

    await store.archiveCard(card.id);

    const result = await (await db).execute({
      sql: "SELECT title, description, status, position, archived_at FROM cards WHERE id = ?",
      args: [card.id],
    });
    const row = result.rows[0];
    expect({ title: row.title, description: row.description, status: row.status, position: Number(row.position) }).toEqual({
      title: "À archiver",
      description: "Détails",
      status: "doing",
      position: card.position,
    });
    expect(row.archived_at).toEqual(expect.any(String));
  });

  test("archiveCard renvoie false pour une carte inconnue ou déjà archivée", async () => {
    const { store } = memoryStore();
    const card = await store.appendCard({ title: "A", status: "todo" });
    await store.archiveCard(card.id);

    await expect(store.archiveCard(card.id)).resolves.toBe(false);
    await expect(store.archiveCard("inconnue")).resolves.toBe(false);
  });

  // Lot 5, critère 4 : base injoignable
  test("archiveCard échoue quand la base est injoignable", async () => {
    const db = openDatabase({ url: "file:/kanbazar-dossier-inexistant/sous-dossier/kanbazar.db" });
    db.catch(() => {});

    await expect(createCardStore(() => db).archiveCard("a")).rejects.toThrow();
  });

  // Lot 6, critère 3 : la carte n'existe plus en base, y compris après redémarrage
  test("deleteCard efface la carte de la base, aussi pour un nouveau client", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kanbazar-"));
    dirs.push(dir);
    const url = `file:${join(dir, "kanbazar.db")}`;

    const firstDb = openDatabase({ url });
    const store = createCardStore(() => firstDb);
    const a = await store.appendCard({ title: "A", status: "todo" });
    await store.appendCard({ title: "B", status: "todo" });
    await expect(store.deleteCard(a.id)).resolves.toBe(true);
    (await firstDb).close();

    const secondDb = openDatabase({ url });
    const cards = await createCardStore(() => secondDb).listCards();
    const rows = await (await secondDb).execute({ sql: "SELECT COUNT(*) AS n FROM cards WHERE id = ?", args: [a.id] });
    (await secondDb).close();
    expect(cards.map((card) => card.title)).toEqual(["B"]);
    expect(Number(rows.rows[0].n)).toBe(0);
  });

  test("deleteCard renvoie false pour une carte inconnue", async () => {
    const { store } = memoryStore();

    await expect(store.deleteCard("inconnue")).resolves.toBe(false);
  });

  // Lot 6, critère 4 : base injoignable
  test("deleteCard échoue quand la base est injoignable", async () => {
    const db = openDatabase({ url: "file:/kanbazar-dossier-inexistant/sous-dossier/kanbazar.db" });
    db.catch(() => {});

    await expect(createCardStore(() => db).deleteCard("a")).rejects.toThrow();
  });

  // Issue #17 : la description se saisit dès la création
  test("appendCard enregistre la description donnée à la création, vide par défaut", async () => {
    const { store } = memoryStore();

    const described = await store.appendCard({ title: "Avec", description: "Détails", status: "todo" });
    const bare = await store.appendCard({ title: "Sans", status: "todo" });

    expect(described.description).toBe("Détails");
    expect(bare.description).toBe("");
    expect((await store.listCards()).map((card) => card.description)).toEqual(["Détails", ""]);
  });
});
