import { beforeEach, describe, expect, test, vi } from "vitest";

const { deleteCard, refresh } = vi.hoisted(() => ({ deleteCard: vi.fn(), refresh: vi.fn() }));
vi.mock("@/services/card-service", () => ({ cardService: { deleteCard } }));
vi.mock("next/cache", () => ({ refresh }));

import { deleteCardAction } from "@/app/actions/delete-card";

describe("deleteCardAction", () => {
  beforeEach(() => {
    deleteCard.mockReset();
    refresh.mockReset();
  });

  // Lot 6, critère 3 : supprimée, tableau rafraîchi
  test("supprime la carte et rafraîchit le tableau", async () => {
    deleteCard.mockResolvedValue({ ok: true });

    await expect(deleteCardAction("a")).resolves.toEqual({ ok: true });
    expect(deleteCard).toHaveBeenCalledWith("a");
    expect(refresh).toHaveBeenCalledOnce();
  });

  test("relaie une carte introuvable en rafraîchissant le tableau", async () => {
    deleteCard.mockResolvedValue({ ok: false, error: "not_found" });

    await expect(deleteCardAction("a")).resolves.toEqual({ ok: false, error: "not_found" });
    expect(refresh).toHaveBeenCalledOnce();
  });

  // Lot 6, critère 4 : échec d'enregistrement
  test("signale un échec d'enregistrement quand le service échoue", async () => {
    deleteCard.mockRejectedValue(new Error("base injoignable"));

    await expect(deleteCardAction("a")).resolves.toEqual({ ok: false, error: "save_failed" });
    expect(refresh).not.toHaveBeenCalled();
  });
});
