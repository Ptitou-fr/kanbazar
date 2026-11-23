import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { databaseConfigFromEnv, openDatabase } from "@/data/db";

describe("databaseConfigFromEnv", () => {
  const dirs: string[] = [];
  afterEach(() => {
    dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });

  test("utilise la base Turso quand son URL est fournie", () => {
    expect(
      databaseConfigFromEnv({ TURSO_DATABASE_URL: "libsql://kanbazar.turso.io", TURSO_AUTH_TOKEN: "jeton", NODE_ENV: "production" }),
    ).toEqual({ url: "libsql://kanbazar.turso.io", authToken: "jeton" });
  });

  test("refuse de démarrer en production sans base distante", () => {
    expect(() => databaseConfigFromEnv({ NODE_ENV: "production" })).toThrow(/TURSO_DATABASE_URL/);
  });

  test("hors production, crée le dossier de la base locale", () => {
    const root = mkdtempSync(join(tmpdir(), "kanbazar-"));
    dirs.push(root);

    const config = databaseConfigFromEnv({ NODE_ENV: "development" }, root);

    expect(config).toEqual({ url: `file:${join(root, ".data", "kanbazar.db")}` });
    expect(existsSync(join(root, ".data"))).toBe(true);
  });

  // Lot 2 : une base créée au lot 1 reçoit la colonne description, ses cartes gardent leur contenu
  test("migre une base du lot 1 en gardant ses cartes, description vide", async () => {
    const { createClient } = await import("@libsql/client");
    const dir = mkdtempSync(join(tmpdir(), "kanbazar-"));
    dirs.push(dir);
    const url = `file:${join(dir, "kanbazar.db")}`;
    const old = createClient({ url });
    await old.batch(
      [
        "CREATE TABLE cards (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')), position INTEGER NOT NULL, created_at TEXT NOT NULL)",
        "CREATE INDEX cards_status_position ON cards (status, position)",
        "INSERT INTO cards VALUES ('a', 'Ancienne', 'todo', 1, '2026-11-01T00:00:00.000Z')",
        "PRAGMA user_version = 1",
      ],
      "write",
    );
    old.close();

    const client = await openDatabase({ url });
    const result = await client.execute("SELECT id, title, description FROM cards");
    client.close();

    expect(result.rows.map((row) => ({ id: row.id, title: row.title, description: row.description }))).toEqual([{ id: "a", title: "Ancienne", description: "" }]);
  });
});
