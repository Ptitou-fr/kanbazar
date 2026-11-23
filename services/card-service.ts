import "server-only";

import { cardStore, type Card, type CardStatus, type CardStore } from "@/data/card-store";

export type { Card, CardStatus };

export type Board = Record<CardStatus, Card[]>;

export type CreateCardResult = { ok: true; card: Card } | { ok: false; error: "title_required" };

export function createCardService(store: CardStore) {
  return {
    async getBoard(): Promise<Board> {
      const board: Board = { todo: [], doing: [], done: [] };
      for (const card of await store.listCards()) board[card.status].push(card);
      for (const cards of Object.values(board)) cards.sort((a, b) => a.position - b.position);
      return board;
    },

    // Une carte a un titre non vide ; elle naît en bas de « À faire ».
    async createCard(title: unknown): Promise<CreateCardResult> {
      const trimmed = typeof title === "string" ? title.trim() : "";
      if (!trimmed) return { ok: false, error: "title_required" };
      const card = await store.appendCard({ title: trimmed, status: "todo" });
      return { ok: true, card };
    },
  };
}

export const cardService = createCardService(cardStore);
