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
});
