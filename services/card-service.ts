import "server-only";

import { cardStore, type Card, type CardPatch, type CardStatus, type CardStore } from "@/data/card-store";

export type { Card, CardStatus };

export type Board = Record<CardStatus, Card[]>;

// Longueurs maximales, en caractères, une fois les espaces autour retirés.
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 10_000;

type ContentError = "title_required" | "title_too_long" | "invalid_description" | "description_too_long";

export type CreateCardResult = { ok: true; card: Card } | { ok: false; error: ContentError };

export type UpdateCardResult = { ok: true; card: Card } | { ok: false; error: ContentError | "not_found" };

export type ArchiveCardResult = { ok: true } | { ok: false; error: "not_found" };

export type DeleteCardResult = { ok: true } | { ok: false; error: "not_found" };

export type MoveCardResult = { ok: true } | { ok: false; error: "invalid_status" | "invalid_position" | "not_found" };

const statuses: readonly CardStatus[] = ["todo", "doing", "done"];

function isStatus(value: unknown): value is CardStatus {
  return statuses.includes(value as CardStatus);
}

// Un identifiant de carte vient d'une Server Action : son type n'est pas
// garanti. Les identifiants de la base sont des UUID (36 caractères) ; la
// borne de 64 laisse de la marge sans accepter n'importe quoi.
const ID_MAX_LENGTH = 64;

function isCardId(id: unknown): id is string {
  return typeof id === "string" && id.trim() !== "" && id.length <= ID_MAX_LENGTH;
}

// Compte les caractères tels qu'on les voit : un emoji compte pour un.
function length(text: string) {
  return Array.from(text).length;
}

// Un titre est un texte non vide une fois rogné, d'au plus TITLE_MAX_LENGTH caractères.
function checkTitle(title: unknown): { title: string } | { error: "title_required" | "title_too_long" } {
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (!trimmed) return { error: "title_required" };
  if (length(trimmed) > TITLE_MAX_LENGTH) return { error: "title_too_long" };
  return { title: trimmed };
}

// Une description est un texte facultatif (absent = vide), d'au plus DESCRIPTION_MAX_LENGTH caractères.
function checkDescription(
  description: unknown,
): { description: string } | { error: "invalid_description" | "description_too_long" } {
  if (description == null) return { description: "" };
  if (typeof description !== "string") return { error: "invalid_description" };
  const trimmed = description.trim();
  if (length(trimmed) > DESCRIPTION_MAX_LENGTH) return { error: "description_too_long" };
  return { description: trimmed };
}

export function createCardService(store: CardStore) {
  return {
    async getBoard(): Promise<Board> {
      const board: Board = { todo: [], doing: [], done: [] };
      for (const card of await store.listCards()) board[card.status].push(card);
      for (const cards of Object.values(board)) cards.sort((a, b) => a.position - b.position);
      return board;
    },

    // Une carte a un titre non vide et une description facultative ; elle
    // naît en bas de « À faire ».
    async createCard(title: unknown, description?: unknown): Promise<CreateCardResult> {
      const checkedTitle = checkTitle(title);
      if ("error" in checkedTitle) return { ok: false, error: checkedTitle.error };
      const checkedDescription = checkDescription(description);
      if ("error" in checkedDescription) return { ok: false, error: checkedDescription.error };
      const card = await store.appendCard({
        title: checkedTitle.title,
        description: checkedDescription.description,
        status: "todo",
      });
      return { ok: true, card };
    },

    // Seuls les champs fournis changent. Le titre reste obligatoire ; la
    // description est facultative (vide une fois rognée = effacée).
    async updateCard(id: unknown, patch: { title?: unknown; description?: unknown }): Promise<UpdateCardResult> {
      if (!isCardId(id)) return { ok: false, error: "not_found" };
      const changes: CardPatch = {};
      if (patch.title !== undefined) {
        const checked = checkTitle(patch.title);
        if ("error" in checked) return { ok: false, error: checked.error };
        changes.title = checked.title;
      }
      if (patch.description !== undefined) {
        // null n'efface pas la description par erreur : seul un texte est accepté ici.
        if (typeof patch.description !== "string") return { ok: false, error: "invalid_description" };
        const checked = checkDescription(patch.description);
        if ("error" in checked) return { ok: false, error: checked.error };
        changes.description = checked.description;
      }
      const card = await store.updateCard(id, changes);
      return card ? { ok: true, card } : { ok: false, error: "not_found" };
    },

    // Place la carte au rang `index` de la colonne `status` (rang compté sans
    // elle, borné à la colonne : au-delà, elle arrive en bas).
    async moveCard(id: unknown, status: unknown, index: unknown): Promise<MoveCardResult> {
      if (!isCardId(id)) return { ok: false, error: "not_found" };
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
    async archiveCard(id: unknown): Promise<ArchiveCardResult> {
      if (!isCardId(id)) return { ok: false, error: "not_found" };
      return (await store.archiveCard(id)) ? { ok: true } : { ok: false, error: "not_found" };
    },

    // Suppression définitive : la confirmation se fait dans l'interface.
    async deleteCard(id: unknown): Promise<DeleteCardResult> {
      if (!isCardId(id)) return { ok: false, error: "not_found" };
      return (await store.deleteCard(id)) ? { ok: true } : { ok: false, error: "not_found" };
    },
  };
}

export const cardService = createCardService(cardStore);
