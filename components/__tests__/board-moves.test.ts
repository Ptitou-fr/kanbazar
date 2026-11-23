import { describe, expect, test } from "vitest";
import { locateCard, moveCardInBoard } from "@/components/board/board-moves";
import type { Board, Card } from "@/services/card-service";

function card(id: string, status: Card["status"]): Card {
  return { id, title: id.toUpperCase(), description: "", status, position: 0 };
}

const board: Board = {
  todo: [card("a", "todo"), card("b", "todo")],
  doing: [card("c", "doing"), card("d", "doing")],
  done: [],
};

const ids = (value: Board) => ({ todo: value.todo.map((c) => c.id), doing: value.doing.map((c) => c.id), done: value.done.map((c) => c.id) });

describe("board-moves", () => {
  test("locateCard donne la colonne et le rang d'une carte", () => {
    expect(locateCard(board, "d")).toEqual({ status: "doing", index: 1 });
    expect(locateCard(board, "z")).toBeNull();
  });

  // Lot 3, critère 1 : aperçu du dépôt dans une autre colonne
  test("moveCardInBoard insère la carte dans la colonne cible, à l'index donné, avec son nouvel état", () => {
    const next = moveCardInBoard(board, "a", "doing", 1);

    expect(ids(next)).toEqual({ todo: ["b"], doing: ["c", "a", "d"], done: [] });
    expect(next.doing[1].status).toBe("doing");
    expect(ids(board)).toEqual({ todo: ["a", "b"], doing: ["c", "d"], done: [] });
  });

  test("moveCardInBoard borne l'index à la colonne", () => {
    expect(ids(moveCardInBoard(board, "a", "done", 9))).toEqual({ todo: ["b"], doing: ["c", "d"], done: ["a"] });
  });
});
