import "server-only";

import { cardStore, type Card, type CardPatch, type CardStatus, type CardStore } from "@/data/card-store";

export type { Card, CardStatus };

export type Board = Record<CardStatus, Card[]>;

export type CreateCardResult = { ok: true; card: Card } | { ok: false; error: "title_required" };

export type UpdateCardResult =
  | { ok: true; card: Card }
  | { ok: false; error: "title_required" | "invalid_description" | "not_found" };

// Un titre est un texte non vide une fois rogné ; sinon null.
function cleanTitle(title: unknown): string | null {
  const trimmed = typeof title === "string" ? title.trim() : "";
  return trimmed || null;
}

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
      const trimmed = cleanTitle(title);
      if (!trimmed) return { ok: false, error: "title_required" };
      const card = await store.appendCard({ title: trimmed, status: "todo" });
      return { ok: true, card };
    },

    // Seuls les champs fournis changent. Le titre reste obligatoire ; la
    // description est facultative (vide une fois rognée = effacée).
    async updateCard(id: string, patch: { title?: unknown; description?: unknown }): Promise<UpdateCardResult> {
      const changes: CardPatch = {};
      if (patch.title !== undefined) {
        const title = cleanTitle(patch.title);
        if (!title) return { ok: false, error: "title_required" };
        changes.title = title;
      }
      if (patch.description !== undefined) {
        if (typeof patch.description !== "string") return { ok: false, error: "invalid_description" };
        changes.description = patch.description.trim();
      }
      const card = await store.updateCard(id, changes);
      return card ? { ok: true, card } : { ok: false, error: "not_found" };
    },
  };
}

export const cardService = createCardService(cardStore);
