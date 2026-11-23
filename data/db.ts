import "server-only";

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";

export type DatabaseConfig = { url: string; authToken?: string };

// Chaque entrée fait passer le schéma à la version suivante (table schema_version).
const migrations: string[][] = [
  [
    `CREATE TABLE cards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`,
    "CREATE INDEX cards_status_position ON cards (status, position)",
  ],
  ["ALTER TABLE cards ADD COLUMN description TEXT NOT NULL DEFAULT ''"],
  // Carte archivée : date d'archivage ; NULL pour une carte active.
  ["ALTER TABLE cards ADD COLUMN archived_at TEXT"],
];

export const SCHEMA_VERSION = migrations.length;

// La version du schéma est rangée dans une table à une seule ligne : Turso
// refuse d'écrire PRAGMA user_version sur une base distante (il en permet la
// lecture). Les bases locales créées avant cette table gardent leur version
// dans PRAGMA user_version : elle sert de point de départ.
export async function migrate(client: Client) {
  await client.execute("CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)");
  const legacy = await client.execute("PRAGMA user_version");
  await client.execute({
    sql: "INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, ?)",
    args: [Number(legacy.rows[0]?.[0] ?? 0)],
  });
  const result = await client.execute("SELECT version FROM schema_version WHERE id = 1");
  const current = Number(result.rows[0]?.version ?? 0);
  for (let version = current; version < migrations.length; version++) {
    await client.batch(
      [...migrations[version], { sql: "UPDATE schema_version SET version = ? WHERE id = 1", args: [version + 1] }],
      "write",
    );
  }
}

export async function openDatabase(config: DatabaseConfig): Promise<Client> {
  const client = createClient(config);
  try {
    await migrate(client);
  } catch (error) {
    client.close();
    throw error;
  }
  return client;
}

export function databaseConfigFromEnv(
  env: Partial<Record<string, string>> = process.env,
  root: string = process.cwd(),
): DatabaseConfig {
  const url = env.TURSO_DATABASE_URL;
  if (url) return { url, authToken: env.TURSO_AUTH_TOKEN };
  if (env.NODE_ENV === "production") {
    throw new Error("TURSO_DATABASE_URL manquante : la base distante est obligatoire en production.");
  }
  // Hors production : base locale dans .data/ (ignoré par git).
  const dir = join(root, ".data");
  mkdirSync(dir, { recursive: true });
  return { url: `file:${join(dir, "kanbazar.db")}` };
}

let shared: Promise<Client> | undefined;

// Client partagé par l'application, ouvert à la première utilisation.
// Après un échec, la prochaine utilisation retente l'ouverture.
export function getDatabase(): Promise<Client> {
  if (!shared) {
    shared = Promise.resolve()
      .then(() => openDatabase(databaseConfigFromEnv()))
      .catch((error) => {
        shared = undefined;
        throw error;
      });
  }
  return shared;
}
