import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createClient, type Client, type InStatement } from "@libsql/client";
import { databaseConfigFromEnv, migrate, openDatabase, SCHEMA_VERSION } from "@/data/db";

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

// Base distante Turso : lire PRAGMA user_version est permis, l'écrire est refusé
// (« SQL_PARSE_ERROR: SQL not allowed statement »). Ce client reproduit ce refus.
function tursoLike(client: Client): Client {
  const refuse = (statement: InStatement) => {
    const sql = typeof statement === "string" ? statement : statement.sql;
    if (/PRAGMA\s+user_version\s*=/i.test(sql)) throw new Error(`SQL_PARSE_ERROR: SQL not allowed statement: ${sql}`);
  };
  return new Proxy(client, {
    get(target, property) {
      if (property === "execute") {
        return async (statement: InStatement) => {
          refuse(statement);
          return target.execute(statement);
        };
      }
      if (property === "batch") {
        return async (statements: InStatement[], mode?: "write" | "read" | "deferred") => {
          statements.forEach(refuse);
          return target.batch(statements, mode);
        };
      }
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

async function schemaVersion(client: Client) {
  const result = await client.execute("SELECT version FROM schema_version");
  return result.rows.map((row) => Number(row.version));
}

describe("migrate", () => {
  test("migre une base neuve sans écrire PRAGMA user_version, refusé par Turso", async () => {
    const client = tursoLike(createClient({ url: ":memory:" }));

    await migrate(client);

    const columns = await client.execute("SELECT name FROM pragma_table_info('cards')");
    expect(columns.rows.map((row) => row.name)).toEqual([
      "id",
      "title",
      "status",
      "position",
      "created_at",
      "description",
      "archived_at",
    ]);
    await expect(schemaVersion(client)).resolves.toEqual([SCHEMA_VERSION]);
    client.close();
  });

  test("rouvrir une base à jour ne rejoue aucune migration", async () => {
    const client = tursoLike(createClient({ url: ":memory:" }));

    await migrate(client);
    await migrate(client);

    await expect(schemaVersion(client)).resolves.toEqual([SCHEMA_VERSION]);
    client.close();
  });

  test("reprend la version d'une base locale déjà migrée par PRAGMA user_version", async () => {
    const client = createClient({ url: ":memory:" });
    await client.batch(
      [
        "CREATE TABLE cards (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')), position INTEGER NOT NULL, created_at TEXT NOT NULL)",
        "CREATE INDEX cards_status_position ON cards (status, position)",
        "ALTER TABLE cards ADD COLUMN description TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE cards ADD COLUMN archived_at TEXT",
        "INSERT INTO cards (id, title, status, position, created_at) VALUES ('a', 'Gardée', 'todo', 1, '2026-11-01T00:00:00.000Z')",
        "PRAGMA user_version = 3",
      ],
      "write",
    );

    await migrate(client);

    await expect(schemaVersion(client)).resolves.toEqual([SCHEMA_VERSION]);
    const cards = await client.execute("SELECT title FROM cards");
    expect(cards.rows.map((row) => row.title)).toEqual(["Gardée"]);
    client.close();
  });
});
