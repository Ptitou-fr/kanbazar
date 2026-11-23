import { beforeEach, describe, expect, test, vi } from "vitest";

const { archiveCard, refresh } = vi.hoisted(() => ({ archiveCard: vi.fn(), refresh: vi.fn() }));
vi.mock("@/services/card-service", () => ({ cardService: { archiveCard } }));
vi.mock("next/cache", () => ({ refresh }));

import { archiveCardAction } from "@/app/actions/archive-card";

describe("archiveCardAction", () => {
  beforeEach(() => {
    archiveCard.mockReset();
    refresh.mockReset();
  });

  // Lot 5, critère 1 : archivée, tableau rafraîchi
  test("archive la carte et rafraîchit le tableau", async () => {
    archiveCard.mockResolvedValue({ ok: true });

    await expect(archiveCardAction("a")).resolves.toEqual({ ok: true });
    expect(archiveCard).toHaveBeenCalledWith("a");
    expect(refresh).toHaveBeenCalledOnce();
  });

  test("relaie une carte introuvable en rafraîchissant le tableau", async () => {
    archiveCard.mockResolvedValue({ ok: false, error: "not_found" });

    await expect(archiveCardAction("a")).resolves.toEqual({ ok: false, error: "not_found" });
    expect(refresh).toHaveBeenCalledOnce();
  });

  // Lot 5, critère 4 : échec d'enregistrement
  test("signale un échec d'enregistrement quand le service échoue", async () => {
    archiveCard.mockRejectedValue(new Error("base injoignable"));

    await expect(archiveCardAction("a")).resolves.toEqual({ ok: false, error: "save_failed" });
    expect(refresh).not.toHaveBeenCalled();
  });
});
