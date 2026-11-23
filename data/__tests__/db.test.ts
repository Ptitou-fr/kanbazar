import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { databaseConfigFromEnv } from "@/data/db";

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
});
