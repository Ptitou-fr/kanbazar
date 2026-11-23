import { beforeEach, describe, expect, test, vi } from "vitest";

const { moveCard, refresh } = vi.hoisted(() => ({ moveCard: vi.fn(), refresh: vi.fn() }));
vi.mock("@/services/card-service", () => ({ cardService: { moveCard } }));
vi.mock("next/cache", () => ({ refresh }));

import { moveCardAction } from "@/app/actions/move-card";

describe("moveCardAction", () => {
  beforeEach(() => {
    moveCard.mockReset();
    refresh.mockReset();
  });

  // Lot 3, critères 1 et 3 : déplacement transmis, tableau rafraîchi
  test("transmet le déplacement au service et rafraîchit le tableau", async () => {
    moveCard.mockResolvedValue({ ok: true });

    await expect(moveCardAction("a", "doing", 1)).resolves.toEqual({ ok: true });
    expect(moveCard).toHaveBeenCalledWith("a", "doing", 1);
    expect(refresh).toHaveBeenCalledOnce();
  });

  test("relaie un refus du service en rafraîchissant le tableau", async () => {
    moveCard.mockResolvedValue({ ok: false, error: "not_found" });

    await expect(moveCardAction("a", "doing", 1)).resolves.toEqual({ ok: false, error: "not_found" });
    expect(refresh).toHaveBeenCalledOnce();
  });

  // Lot 3, critère 4 : échec d'enregistrement
  test("signale un échec d'enregistrement quand le service échoue", async () => {
    moveCard.mockRejectedValue(new Error("base injoignable"));

    await expect(moveCardAction("a", "doing", 1)).resolves.toEqual({ ok: false, error: "save_failed" });
    expect(refresh).not.toHaveBeenCalled();
  });
});
