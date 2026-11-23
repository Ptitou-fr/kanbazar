import "server-only";

import type { Client, Row } from "@libsql/client";
import { getDatabase } from "./db";

export type CardStatus = "todo" | "doing" | "done";

export type Card = {
  id: string;
  title: string;
  description: string;
  status: CardStatus;
  position: number;
};

export type CardPatch = { title?: string; description?: string };

export type CardStore = {
  // Cartes actives seulement : les cartes archivées restent en base, hors tableau.
  listCards(): Promise<Card[]>;
  appendCard(input: { title: string; status: CardStatus }): Promise<Card>;
  // Renvoie la carte modifiée, ou null si elle n'existe pas.
  updateCard(id: string, patch: CardPatch): Promise<Card | null>;
  // Range la colonne : chaque carte prend cet état et la position de son rang.
  placeCards(status: CardStatus, ids: string[]): Promise<void>;
  // Marque la carte archivée sans toucher au reste ; false si elle n'est pas active.
  archiveCard(id: string): Promise<boolean>;
  // Efface la carte définitivement ; false si elle n'existe pas.
  deleteCard(id: string): Promise<boolean>;
};

const CARD_COLUMNS = "id, title, description, status, position";

function toCard(row: Row): Card {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    status: row.status as CardStatus,
    position: Number(row.position),
  };
}

export function createCardStore(getClient: () => Promise<Client>): CardStore {
  return {
    async listCards() {
      const client = await getClient();
      const result = await client.execute(
        `SELECT ${CARD_COLUMNS} FROM cards WHERE archived_at IS NULL
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
              RETURNING ${CARD_COLUMNS}`,
        args: [id, title, status, status, new Date().toISOString()],
      });
      return toCard(result.rows[0]);
    },

    async updateCard(id, { title, description }) {
      const client = await getClient();
      // Un champ absent (null) garde sa valeur.
      const result = await client.execute({
        sql: `UPDATE cards SET title = COALESCE(?, title), description = COALESCE(?, description)
              WHERE id = ?
              RETURNING ${CARD_COLUMNS}`,
        args: [title ?? null, description ?? null, id],
      });
      return result.rows[0] ? toCard(result.rows[0]) : null;
    },

    async placeCards(status, ids) {
      const client = await getClient();
      // Une seule transaction : la colonne est rangée en entier ou pas du tout.
      await client.batch(
        ids.map((id, index) => ({
          sql: "UPDATE cards SET status = ?, position = ? WHERE id = ?",
          args: [status, index + 1, id],
        })),
        "write",
      );
    },

    async archiveCard(id) {
      const client = await getClient();
      const result = await client.execute({
        sql: "UPDATE cards SET archived_at = ? WHERE id = ? AND archived_at IS NULL",
        args: [new Date().toISOString(), id],
      });
      return result.rowsAffected > 0;
    },

    async deleteCard(id) {
      const client = await getClient();
      const result = await client.execute({ sql: "DELETE FROM cards WHERE id = ?", args: [id] });
      return result.rowsAffected > 0;
    },
  };
}

export const cardStore = createCardStore(getDatabase);
