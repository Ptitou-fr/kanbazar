import "server-only";

import { cardStore, type Card, type CardPatch, type CardStatus, type CardStore } from "@/data/card-store";

export type { Card, CardStatus };

export type Board = Record<CardStatus, Card[]>;

export type CreateCardResult = { ok: true; card: Card } | { ok: false; error: "title_required" };

export type UpdateCardResult =
  | { ok: true; card: Card }
  | { ok: false; error: "title_required" | "invalid_description" | "not_found" };

export type ArchiveCardResult = { ok: true } | { ok: false; error: "not_found" };

export type DeleteCardResult = { ok: true } | { ok: false; error: "not_found" };

export type MoveCardResult = { ok: true } | { ok: false; error: "invalid_status" | "invalid_position" | "not_found" };

const statuses: readonly CardStatus[] = ["todo", "doing", "done"];

function isStatus(value: unknown): value is CardStatus {
  return statuses.includes(value as CardStatus);
}

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

    // Place la carte au rang `index` de la colonne `status` (rang compté sans
    // elle, borné à la colonne : au-delà, elle arrive en bas).
    async moveCard(id: string, status: unknown, index: unknown): Promise<MoveCardResult> {
      if (!isStatus(status)) return { ok: false, error: "invalid_status" };
      if (!Number.isInteger(index)) return { ok: false, error: "invalid_position" };
      const cards = await store.listCards();
      if (!cards.some((card) => card.id === id)) return { ok: false, error: "not_found" };
      const column = cards
        .filter((card) => card.status === status && card.id !== id)
        .sort((a, b) => a.position - b.position)
        .map((card) => card.id);
      const at = Math.min(Math.max(index as number, 0), column.length);
      column.splice(at, 0, id);
      await store.placeCards(status, column);
      return { ok: true };
    },

    // L'archivage retire la carte du tableau sans la perdre.
    async archiveCard(id: string): Promise<ArchiveCardResult> {
      return (await store.archiveCard(id)) ? { ok: true } : { ok: false, error: "not_found" };
    },

    // Suppression définitive : la confirmation se fait dans l'interface.
    async deleteCard(id: string): Promise<DeleteCardResult> {
      return (await store.deleteCard(id)) ? { ok: true } : { ok: false, error: "not_found" };
    },
  };
}

export const cardService = createCardService(cardStore);
