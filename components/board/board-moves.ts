import type { Board, CardStatus } from "@/services/card-service";

// Aperçu côté interface d'un déplacement. Le service fait autorité : ce calcul
// sert seulement à afficher le tableau avant la réponse du serveur.

export type Slot = { status: CardStatus; index: number };

export function locateCard(board: Board, id: string): Slot | null {
  for (const status of Object.keys(board) as CardStatus[]) {
    const index = board[status].findIndex((card) => card.id === id);
    if (index !== -1) return { status, index };
  }
  return null;
}

// `index` est le rang dans la colonne cible sans la carte, borné à la colonne.
export function moveCardInBoard(board: Board, id: string, status: CardStatus, index: number): Board {
  const from = locateCard(board, id);
  if (!from) return board;
  const card = board[from.status][from.index];
  const next: Board = { todo: [...board.todo], doing: [...board.doing], done: [...board.done] };
  next[from.status].splice(from.index, 1);
  const at = Math.min(Math.max(index, 0), next[status].length);
  next[status].splice(at, 0, { ...card, status });
  return next;
}

export function removeCardFromBoard(board: Board, id: string): Board {
  return {
    todo: board.todo.filter((card) => card.id !== id),
    doing: board.doing.filter((card) => card.id !== id),
    done: board.done.filter((card) => card.id !== id),
  };
}
