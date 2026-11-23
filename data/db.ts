import "server-only";

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";

export type DatabaseConfig = { url: string; authToken?: string };

// Chaque entrée fait passer le schéma à la version suivante (PRAGMA user_version).
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
];

async function migrate(client: Client) {
  const result = await client.execute("PRAGMA user_version");
  const current = Number(result.rows[0]?.[0] ?? 0);
  for (let version = current; version < migrations.length; version++) {
    await client.batch([...migrations[version], `PRAGMA user_version = ${version + 1}`], "write");
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
