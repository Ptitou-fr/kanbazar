"use server";

import { refresh } from "next/cache";
import { cardService, type ArchiveCardResult } from "@/services/card-service";

export type ArchiveCardState = ArchiveCardResult | { ok: false; error: "save_failed" };

export async function archiveCardAction(id: string): Promise<ArchiveCardState> {
  let result: ArchiveCardResult;
  try {
    result = await cardService.archiveCard(id);
  } catch (error) {
    console.error("Échec de l'archivage d'une carte", error);
    return { ok: false, error: "save_failed" };
  }
  // Carte introuvable : le tableau se recale sur ce qui est enregistré.
  refresh();
  return result;
}
