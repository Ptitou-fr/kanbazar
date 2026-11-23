"use server";

import { refresh } from "next/cache";
import { cardService } from "@/services/card-service";

export type CreateCardState = { ok: true } | { ok: false; error: "title_required" | "invalid_description" | "save_failed" };

export async function createCardAction(formData: FormData): Promise<CreateCardState> {
  let result;
  try {
    result = await cardService.createCard(formData.get("title"), formData.get("description"));
  } catch (error) {
    console.error("Échec de l'enregistrement d'une carte", error);
    return { ok: false, error: "save_failed" };
  }
  if (!result.ok) return result;
  refresh();
  return { ok: true };
}
