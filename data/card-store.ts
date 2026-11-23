import "server-only";

import type { Client, Row } from "@libsql/client";
import { getDatabase } from "./db";

export type CardStatus = "todo" | "doing" | "done";

export type Card = {
  id: string;
  title: string;
  status: CardStatus;
  position: number;
};

export type CardStore = {
  listCards(): Promise<Card[]>;
  appendCard(input: { title: string; status: CardStatus }): Promise<Card>;
};

function toCard(row: Row): Card {
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as CardStatus,
    position: Number(row.position),
  };
}

export function createCardStore(getClient: () => Promise<Client>): CardStore {
  return {
    async listCards() {
      const client = await getClient();
      const result = await client.execute(
        `SELECT id, title, status, position FROM cards
         ORDER BY CASE status WHEN 'todo' THEN 0 WHEN 'doing' THEN 1 ELSE 2 END, position`,
      );
      return result.rows.map(toCard);
    },

    async appendCard({ title, status }) {
      const client = await getClient();
      const id = crypto.randomUUID();
      // Position calculée et carte insérée dans la même instruction : pas de course.
      const result = await client.execute({
        sql: `INSERT INTO cards (id, title, status, position, created_at)
              VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM cards WHERE status = ?), ?)
              RETURNING id, title, status, position`,
        args: [id, title, status, status, new Date().toISOString()],
      });
      return toCard(result.rows[0]);
    },
  };
}

export const cardStore = createCardStore(getDatabase);
