"use server";

import { refresh } from "next/cache";
import { cardService, type Card, type UpdateCardResult } from "@/services/card-service";

export type UpdateCardState = { ok: true; card: Card } | { ok: false; error: Exclude<UpdateCardResult, { ok: true }>["error"] | "save_failed" };

export async function updateCardAction(id: string, patch: { title?: string; description?: string }): Promise<UpdateCardState> {
  let result: UpdateCardResult;
  try {
    result = await cardService.updateCard(id, patch);
  } catch (error) {
    console.error("Échec de l'enregistrement d'une carte", error);
    return { ok: false, error: "save_failed" };
  }
  // Carte disparue entre-temps : le tableau se remet à jour.
  if (result.ok || result.error === "not_found") refresh();
  return result;
}
