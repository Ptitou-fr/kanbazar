"use server";

import { refresh } from "next/cache";
import { cardService, type MoveCardResult } from "@/services/card-service";

export type MoveCardState = MoveCardResult | { ok: false; error: "save_failed" };

export async function moveCardAction(id: string, status: string, index: number): Promise<MoveCardState> {
  let result: MoveCardResult;
  try {
    result = await cardService.moveCard(id, status, index);
  } catch (error) {
    console.error("Échec de l'enregistrement d'un déplacement", error);
    return { ok: false, error: "save_failed" };
  }
  // Refus : le tableau se recale sur ce qui est enregistré.
  refresh();
  return result;
}
