"use server";

import { refresh } from "next/cache";
import { cardService, type DeleteCardResult } from "@/services/card-service";

export type DeleteCardState = DeleteCardResult | { ok: false; error: "save_failed" };

export async function deleteCardAction(id: string): Promise<DeleteCardState> {
  let result: DeleteCardResult;
  try {
    result = await cardService.deleteCard(id);
  } catch (error) {
    console.error("Échec de la suppression d'une carte", error);
    return { ok: false, error: "save_failed" };
  }
  // Carte introuvable : le tableau se recale sur ce qui est enregistré.
  refresh();
  return result;
}
